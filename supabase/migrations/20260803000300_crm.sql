-- ============================================================================
-- 20260803000300_crm.sql
--
-- Admin menu item: 3. CRM (/admin/crm)
--
-- Creates the kanban backend — public.pipelines, public.pipeline_stages,
-- public.leads — together with the whole stage-locking regime, and closes the
-- circular dependency between inquiries and leads by ALTERing public.inquiries
-- to carry the lead_id back-reference.
--
-- Depends on:
--   20260803000100_foundation.sql — public.touch_updated_at()
--   20260803000200_inquiries.sql  — public.inquiries must already exist, since
--                                   leads.inquiry_id points at it and this file
--                                   adds the matching inquiries.lead_id.
--
-- Idempotent: every object is created with `if not exists` / `or replace`, every
-- trigger is dropped before it is created, and the seeds are guarded by
-- `where not exists`. Re-running this file on a live database is a no-op.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- A. Tables
--
-- pipelines and pipeline_stages deliberately carry no updated_at column and no
-- touch trigger — nothing reads or sorts by one — the same omission 20260803000400
-- documents for page_views and 20260803000800 for newsletter_subscribers. Only
-- public.leads is edited in place often enough to warrant it.
-- ---------------------------------------------------------------------------

create table if not exists public.pipelines (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Exactly one default pipeline. This is load-bearing, not decorative:
-- getIntakeStage() reads it with .eq("is_default", true).maybeSingle(), which
-- throws outright the moment a second default row exists — the whole Inquiries
-- "Transfer to CRM" flow would break rather than pick a winner at random.
create unique index if not exists pipelines_single_default_idx
  on public.pipelines (is_default) where is_default;


create table if not exists public.pipeline_stages (
  id          uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.pipelines (id) on delete cascade,
  name        text not null,
  position    integer not null default 0,
  -- The pipeline's intake stage. Protected by guard_locked_stage() below;
  -- every pipeline gets exactly one, created by pipelines_ensure_intake.
  is_locked   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Serves reading one pipeline's stages in board order: the pipeline_id filter
-- plus the (position, created_at) tiebreak come straight off the index, so
-- rendering a single pipeline never sorts. created_at is the tiebreak because
-- position is deliberately non-unique (see below).
create index if not exists pipeline_stages_pipeline_idx
  on public.pipeline_stages (pipeline_id, position, created_at);

-- Deliberately NOT unique on (pipeline_id, position): reorderStage renumbers the
-- column one row at a time, so the intermediate states legitimately collide.


create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  name        text not null,
  email       text,
  phone       text,
  interest    text,
  project     text,
  notes       text,
  -- nullable on purpose: crm/actions.ts::numeric() strips commas and hands us
  -- null for anything that is not a finite number, rather than coercing to 0.
  value       numeric,
  pipeline_id uuid not null references public.pipelines (id) on delete cascade,
  stage_id    uuid not null references public.pipeline_stages (id) on delete cascade,
  -- Fractional ordering, and it MUST stay numeric. lib/crm.ts::positionFor()
  -- returns the midpoint (before + after) / 2 of the two neighbours, and
  -- after - POSITION_STEP when a card is dropped at the top — which goes
  -- negative after enough top-drops. There is no compaction job to rescue an
  -- integer column, so a card dropped between 1000 and 2000 must be able to
  -- land on 1500, and a card dropped above 0 must be able to land on -1000.
  position    numeric not null default 1000,
  -- on delete set null: deleteInquiries documents that the lead outlives the
  -- inquiry it came from.
  inquiry_id  uuid references public.inquiries (id) on delete set null
);

create index if not exists leads_board_idx    on public.leads (stage_id, position);
create index if not exists leads_pipeline_idx on public.leads (pipeline_id);
-- Serves the Inquiry/Manual badge lookup and keeps the SET NULL cascade from
-- inquiries deletion off a sequential scan.
create index if not exists leads_inquiry_idx  on public.leads (inquiry_id);

drop trigger if exists leads_touch_updated_at on public.leads;
create trigger leads_touch_updated_at
  before update on public.leads
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------------------
-- B. Closing the inquiries <-> leads circle
--
-- inquiries is created before leads (a lead can be born from an inquiry), so
-- the back-reference can only be attached here. The mutual FK pair cannot
-- deadlock a delete: both sides are ON DELETE SET NULL and neither column is
-- NOT NULL, so neither row is required for the other to exist.
-- ---------------------------------------------------------------------------

alter table public.inquiries add column if not exists lead_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'inquiries_lead_id_fkey'
  ) then
    alter table public.inquiries
      add constraint inquiries_lead_id_fkey
      foreign key (lead_id) references public.leads (id) on delete set null;
  end if;
end;
$$;

create index if not exists inquiries_lead_idx on public.inquiries (lead_id);

-- Deleting a lead must not strand its inquiry. Without this the inquiry keeps
-- status 'transferred' plus a now-null lead_id, and because transferToCrm
-- decides with `isTransferred = status === 'transferred' || Boolean(lead_id)`
-- it would skip that inquiry forever — the row could never be pushed into the
-- CRM again. Hand it back to the "new" queue instead.
create or replace function public.reopen_orphaned_inquiry()
returns trigger
language plpgsql
as $$
begin
  if new.lead_id is null and old.lead_id is not null and new.status = 'transferred' then
    new.status := 'new';
  end if;
  return new;
end;
$$;

drop trigger if exists inquiries_reopen_orphaned on public.inquiries;
create trigger inquiries_reopen_orphaned
  before update on public.inquiries
  for each row execute function public.reopen_orphaned_inquiry();


-- ---------------------------------------------------------------------------
-- C. Lead / stage integrity
-- ---------------------------------------------------------------------------

-- A lead belongs to whichever pipeline owns its stage — always. moveLead
-- already writes stage_id and pipeline_id consistently; deriving one from the
-- other makes a card that says "pipeline A, stage of pipeline B" unrepresentable
-- rather than merely unlikely.
--
-- That "always" holds only because of guard_stage_reparent (D2a). This trigger
-- fires on the LEAD, so it can only re-derive pipeline_id when the lead moves;
-- it is blind to the stage moving out from under a lead that is sitting still.
-- Re-parenting a stage used to desynchronise every lead in it in one UPDATE,
-- and because both delete guards key off leads.pipeline_id / the owning
-- pipeline's existence, the stage and its leads could then be cascaded away
-- without a refusal from either. Making a stage's pipeline immutable is what
-- turns the invariant below into an invariant instead of a convention — the
-- two triggers are a pair, do not remove one and keep the other.
create or replace function public.sync_lead_pipeline()
returns trigger
language plpgsql
as $$
declare
  owner uuid;
begin
  select s.pipeline_id into owner
    from public.pipeline_stages s
   where s.id = new.stage_id;

  if owner is null then
    raise exception 'Stage % does not exist.', new.stage_id;
  end if;

  new.pipeline_id := owner;
  return new;
end;
$$;

drop trigger if exists leads_sync_pipeline on public.leads;
create trigger leads_sync_pipeline
  before insert or update of stage_id, pipeline_id on public.leads
  for each row execute function public.sync_lead_pipeline();


-- ---------------------------------------------------------------------------
-- D. Stage locking
--
-- Every pipeline owns exactly one protected first stage. The lock forbids
-- rename, reorder, unlock, reassignment to another pipeline, and delete. Every
-- other stage in every pipeline stays fully editable and deletable.
--
-- Pipeline delete semantics, in one place:
--   * default pipeline            -> always refused by guard_default_pipeline,
--                                    which also refuses to let the flag be
--                                    cleared first (see D1a).
--   * non-default holding leads   -> refused by guard_pipeline_has_leads (D1b),
--                                    and by crm/actions.ts::deletePipeline's count
--                                    check before any SQL is issued. The app check
--                                    supplies the friendly copy; the trigger is what
--                                    makes it an invariant, because a raw PostgREST
--                                    `DELETE /pipelines?id=eq.<uuid>` never runs it.
--   * non-default and lead-free   -> cascades cleanly, locked intake stage included.
--
-- Both stage guards below need to tell a cascade from a direct delete, and they
-- do it STRUCTURALLY rather than with a session flag:
--
--   not exists (select 1 from public.pipelines where id = old.pipeline_id)
--
-- ON DELETE CASCADE runs the child delete after the parent row is already gone,
-- so the parent being absent is the cascade — nothing to arm, nothing to disarm,
-- and no way for one legal pipeline delete to disable the guards for the rest of
-- the transaction. A direct delete always sees its pipeline still there.
-- ---------------------------------------------------------------------------

-- D1. The default pipeline is permanent: getIntakeStage() and the "Transfer to
-- CRM" flow both assume a default row exists, and nothing recreates it.
create or replace function public.guard_default_pipeline()
returns trigger
language plpgsql
as $$
begin
  if old.is_default then
    raise exception 'The default pipeline cannot be deleted.';
  end if;

  return old;
end;
$$;

drop trigger if exists pipelines_guard_default on public.pipelines;
create trigger pipelines_guard_default
  before delete on public.pipelines
  for each row execute function public.guard_default_pipeline();


-- D1a. …and the flag itself is permanent, not just the row.
--
-- guard_default_pipeline only ever sees OLD.is_default at DELETE time, and
-- pipelines_single_default_idx is a PARTIAL unique index (WHERE is_default): it
-- forbids TWO defaults but is perfectly happy with ZERO. Without this trigger an
-- ordinary authenticated PostgREST session could run
--
--   update public.pipelines set is_default = false;
--   delete from public.pipelines;
--
-- and the delete guard would see is_default = false on every row and wave the
-- whole CRM through. Even the bare UPDATE on its own breaks the product:
-- lib/crm.ts::getIntakeStage() reads .eq("is_default", true).maybeSingle() and
-- gets null, and crm/actions.ts::deletePipeline's is_default refusal stops
-- firing. Nothing recreates the default either — the seed at the bottom of this
-- file is guarded by `where not exists` and migrations do not re-run in prod.
--
-- Demoting the default is never a legitimate operation: no code path in the app
-- writes is_default at all (createPipeline hardcodes `is_default: false`), so
-- there is nothing to accommodate here.
create or replace function public.guard_default_pipeline_flag()
returns trigger
language plpgsql
as $$
begin
  if old.is_default and not new.is_default then
    raise exception 'The default pipeline cannot be demoted.';
  end if;

  return new;
end;
$$;

drop trigger if exists pipelines_guard_default_flag on public.pipelines;
create trigger pipelines_guard_default_flag
  before update on public.pipelines
  for each row execute function public.guard_default_pipeline_flag();


-- …and a backstop that does not care HOW the last default went missing.
--
-- The two row triggers above cover the two known routes (demote, delete). This
-- deferred constraint trigger closes the category: it runs at COMMIT and refuses
-- any transaction that ends with zero default pipelines, whatever combination of
-- statements got it there.
--
-- Three details make it safe rather than merely strict:
--   * DEFERRABLE INITIALLY DEFERRED — the check runs once, at COMMIT, so a
--     transaction is free to pass through a transient zero-default state.
--   * AFTER UPDATE OR DELETE only, never INSERT. An INSERT cannot remove the
--     last default, and firing on INSERT would make the very first pipeline row
--     ever written fail its own transaction on an empty table — including the
--     seed's own recovery path.
--   * The seed is `insert … where not exists`, so on a fresh database it fires
--     no UPDATE/DELETE event at all and this trigger never queues; on a re-run it
--     inserts zero rows. Either way there is nothing to fire spuriously.
--
-- It cannot deadlock the legitimate "delete a non-default pipeline" flow: the
-- body is a plain EXISTS read against public.pipelines, taking no lock beyond the
-- ACCESS SHARE the deleting transaction already holds on that same table.
create or replace function public.guard_default_pipeline_exists()
returns trigger
language plpgsql
as $$
begin
  if not exists (select 1 from public.pipelines where is_default) then
    raise exception 'There must always be exactly one default pipeline.';
  end if;

  return null;
end;
$$;

drop trigger if exists pipelines_require_default on public.pipelines;
create constraint trigger pipelines_require_default
  after update or delete on public.pipelines
  deferrable initially deferred
  for each row execute function public.guard_default_pipeline_exists();


-- D1b. Deleting a pipeline must not silently destroy the leads inside it.
--
-- leads.pipeline_id and leads.stage_id are both ON DELETE CASCADE, and BOTH
-- stage guards below deliberately stand down once the owning pipeline row is
-- gone (that is how they tell a cascade from a direct delete). The net effect
-- before this trigger existed: the schema refused to delete a STAGE holding one
-- lead, but happily deleted the PIPELINE containing that stage and took the lead
-- with it without a word. crm/actions.ts::deletePipeline's count pre-check was
-- the only thing in the way, and a direct PostgREST
-- `DELETE /pipelines?id=eq.<uuid>` from any authenticated session skips it.
--
-- Wording mirrors guard_stage_has_leads on purpose — same refusal, same shape,
-- one level up.
--
-- Trigger ORDER matters and is alphabetical among BEFORE DELETE triggers:
-- pipelines_guard_default (…_d) fires before pipelines_guard_leads (…_l), so
-- deleting the default pipeline still reports "cannot be deleted" rather than a
-- lead count, exactly as it did before.
create or replace function public.guard_pipeline_has_leads()
returns trigger
language plpgsql
as $$
declare
  n integer;
begin
  select count(*) into n from public.leads where pipeline_id = old.id;

  if n > 0 then
    raise exception 'Pipeline "%" still holds % lead(s). Move them before deleting it.', old.name, n;
  end if;

  return old;
end;
$$;

drop trigger if exists pipelines_guard_leads on public.pipelines;
create trigger pipelines_guard_leads
  before delete on public.pipelines
  for each row execute function public.guard_pipeline_has_leads();


-- D2. The lock itself. This is the ONLY thing standing between a locked intake
-- stage and a rename: crm/actions.ts::renameStage has no is_locked check of its
-- own and its comment names guard_locked_stage as the enforcement point. Do not
-- remove it in favour of an app-level check.
create or replace function public.guard_locked_stage()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    -- Deleting a non-default pipeline must be able to take its locked intake
    -- stage with it, so the lock only bites while the owning pipeline is still
    -- there. If it is already gone this row is being removed by the FK cascade.
    if old.is_locked
       and exists (select 1 from public.pipelines where id = old.pipeline_id) then
      raise exception 'The intake stage "%" is locked and cannot be deleted.', old.name;
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    -- One intake stage per pipeline, or getIntakeStage() stops being a single
    -- answer and transferred inquiries land somewhere non-deterministic.
    if new.is_locked and exists (
      select 1 from public.pipeline_stages s
       where s.pipeline_id = new.pipeline_id and s.is_locked
    ) then
      raise exception 'This pipeline already has a locked intake stage.';
    end if;
    return new;
  end if;

  -- UPDATE
  if old.is_locked and (
       new.name        is distinct from old.name
    or new.is_locked   is distinct from old.is_locked
    or new.position    is distinct from old.position
    or new.pipeline_id is distinct from old.pipeline_id
  ) then
    raise exception 'The intake stage "%" is locked and cannot be renamed, moved or unlocked.', old.name;
  end if;

  -- Promotion is blocked too, otherwise a second stage could be locked into
  -- place and the "exactly one intake stage" invariant would only hold at insert.
  if not old.is_locked and new.is_locked then
    raise exception 'A stage cannot be promoted to the intake stage.';
  end if;

  return new;
end;
$$;

drop trigger if exists pipeline_stages_guard_locked on public.pipeline_stages;
create trigger pipeline_stages_guard_locked
  before insert or update or delete on public.pipeline_stages
  for each row execute function public.guard_locked_stage();


-- D2a. A stage's pipeline is immutable — for EVERY stage, not just locked ones.
--
-- guard_locked_stage above already refuses a pipeline_id change on a LOCKED
-- stage. Nothing guarded it on an unlocked one, and that gap was not cosmetic:
-- leads_sync_pipeline is a trigger on public.leads, so moving the STAGE never
-- fires it. The leads keep the OLD pipeline_id while their stage lives in the
-- new one, which is exactly the "pipeline A, stage of pipeline B" card section C
-- calls unrepresentable. Worse, it defeats both delete guards at once:
--
--   leads sit in stage S of pipeline B  ->  leads.pipeline_id = B
--   update S set pipeline_id = A        ->  leads.pipeline_id is STILL B
--   delete from pipelines where id = A  ->  guard_pipeline_has_leads counts
--     leads where pipeline_id = A and finds ZERO, so it waves the delete
--     through; guard_stage_has_leads then stands down on S because the owning
--     pipeline genuinely is gone (that is how it tells a cascade from a direct
--     delete); both FK cascades fire and the stage AND its leads are destroyed
--     in silence.
--
-- There is nothing to accommodate: no application path re-parents a stage.
-- moveLead moves LEADS between stages; crm/actions.ts has no "move stage to
-- another pipeline" action at all. So refuse the write outright rather than
-- trying to repair the leads behind it — a re-parent that also rewrote every
-- lead's pipeline_id would still be a silent bulk mutation nobody asked for.
--
-- Trigger ORDER is deliberate and, as everywhere else in this file, alphabetical
-- among the BEFORE UPDATE triggers: pipeline_stages_guard_locked (…_l) fires
-- ahead of pipeline_stages_guard_reparent (…_r). So re-parenting a LOCKED stage
-- keeps reporting the lock — 'The intake stage "…" is locked and cannot be
-- renamed, moved or unlocked.' — which is the message the admin UI and the
-- existing copy already quote, and only an UNLOCKED stage reaches the message
-- below. Both refuse; one action never produces two different exceptions.
create or replace function public.guard_stage_reparent()
returns trigger
language plpgsql
as $$
begin
  if new.pipeline_id is distinct from old.pipeline_id then
    raise exception 'Stage "%" cannot be moved to another pipeline.', old.name;
  end if;

  return new;
end;
$$;

drop trigger if exists pipeline_stages_guard_reparent on public.pipeline_stages;
create trigger pipeline_stages_guard_reparent
  before update on public.pipeline_stages
  for each row execute function public.guard_stage_reparent();


-- D3. Every pipeline gets its intake stage for free, so createPipeline in
-- crm/actions.ts needs no changes to satisfy the "every pipeline has a protected
-- first stage" rule. The name is 'New Leads' for every pipeline — that pins the
-- default pipeline's locked stage to the name inquiries/actions.ts::NO_PIPELINE
-- and the PipelineControls copy both quote, and since the guard above forbids
-- renaming a locked stage, the name can never drift.
--
-- Firing AFTER INSERT on pipelines puts the stage in the same transaction as the
-- pipeline row, so by the time createPipeline issues its follow-up
-- pipeline_stages.insert(...) as a separate statement, the intake stage is
-- already visible to that statement's snapshot.
create or replace function public.ensure_pipeline_intake_stage()
returns trigger
language plpgsql
as $$
begin
  -- Unconditional on purpose. A "skip if the pipeline already has stages" guard
  -- looks harmless but is not: this is an AFTER ROW trigger, so it fires at the
  -- end of the statement, and a data-modifying CTE that inserts the pipeline and
  -- its stages in ONE statement would make the guard true and leave the pipeline
  -- permanently without an intake stage. A row that was just inserted cannot
  -- legitimately own stages already, so there is nothing for a guard to catch.
  --
  -- The position is CLAIMED rather than hardcoded to 0. Being AFTER INSERT, this
  -- trigger runs at the end of the statement, so a data-modifying CTE that
  -- inserts the pipeline AND its stages in one statement has already written the
  -- app stages by the time we get here — and shift_stage_after_intake could not
  -- have bumped them, because the intake stage it looks for did not exist yet.
  -- Hardcoding 0 put the intake stage level with the first app stage, and since
  -- both rows are written in the same transaction their created_at tiebreak is
  -- identical too, so pipeline_stages_pipeline_idx could return them in either
  -- order. Taking min(position) - 1 makes the intake stage strictly first no
  -- matter what is already there. Positions need not be contiguous — ordering is
  -- by position, not by the values themselves.
  insert into public.pipeline_stages (pipeline_id, name, position, is_locked)
  values (
    new.id,
    'New Leads',
    coalesce(
      (select min(position) from public.pipeline_stages where pipeline_id = new.id) - 1,
      0
    ),
    true
  );
  return new;
end;
$$;

drop trigger if exists pipelines_ensure_intake on public.pipelines;
create trigger pipelines_ensure_intake
  after insert on public.pipelines
  for each row execute function public.ensure_pipeline_intake_stage();


-- D4. Keep app-supplied stages behind the intake stage.
--
-- The shift is unconditional rather than a conditional collision fix because
-- createPipeline writes all of its stages in ONE multi-row INSERT, and a
-- BEFORE ROW trigger cannot see rows inserted earlier in the same statement —
-- there is no command-counter increment between them. Any rule that counts
-- sibling rows mid-statement is therefore unreliable. This rule only reads the
-- LOCKED stage, which was written by the previous statement (the pipelines
-- insert), so it is always visible.
--
-- Result on the normal two-statement path: createPipeline(['A','B','C']) ->
-- intake 0, A 1, B 2, C 3, no ties.
-- createStage computes max(position) + 1 and so lands at max + 2 — a harmless
-- gap that is still strictly last, and the next reorderStage normalises the
-- column back to 0..n-1.
--
-- This shift is only HALF of the no-ties story, and it is the half that cannot
-- cover the single-statement case: in a data-modifying CTE the app stages are
-- written before the intake stage exists, so the EXISTS above is false and
-- nothing is shifted. The other half lives in ensure_pipeline_intake_stage,
-- which claims min(position) - 1 for the intake stage and therefore ends up at
-- -1 on that path. Ties are impossible either way; contiguous positions are not
-- guaranteed on the CTE path, and nothing needs them to be.
--
-- Note that the locked stage's position is IMMUTABLE once written —
-- guard_locked_stage raises on any UPDATE that changes it — so an admin reorder
-- path must skip the locked row rather than renumber it. reorderStage in
-- crm/actions.ts already does: it refuses outright rather than writing a new
-- position onto a locked stage, which is why a non-zero intake position is
-- something to leave alone rather than something to normalise away.
--
-- Attachment order matters and is alphabetical among BEFORE INSERT triggers:
-- pipeline_stages_guard_locked (g) runs before pipeline_stages_shift_after_intake
-- (s), so a duplicate lock is rejected before anything bothers to shift it.
create or replace function public.shift_stage_after_intake()
returns trigger
language plpgsql
as $$
begin
  if not new.is_locked and exists (
    select 1 from public.pipeline_stages s
     where s.pipeline_id = new.pipeline_id and s.is_locked
  ) then
    new.position := greatest(new.position, 0) + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists pipeline_stages_shift_after_intake on public.pipeline_stages;
create trigger pipeline_stages_shift_after_intake
  before insert on public.pipeline_stages
  for each row execute function public.shift_stage_after_intake();


-- D5. Deleting a stage that still holds leads is refused, not silently repaired.
--
-- leads.stage_id is ON DELETE CASCADE, so without this trigger dropping a column
-- would quietly destroy every card in it. crm/actions.ts::deleteStage already
-- refuses and shows the user a message; this turns that convention into an
-- invariant. Auto-relocating the leads to the intake stage was considered and
-- rejected: it moves the user's cards without being asked and quietly rewrites
-- what the pipeline means. A refusal the user can act on beats a mutation they
-- did not request. The CASCADE FK is kept purely so that deleting a lead-free
-- pipeline still tears its stages down cleanly.
--
-- Alphabetical ordering again: among the BEFORE DELETE triggers this one (…guard_leads)
-- fires ahead of …guard_locked, so deleting a locked stage that still holds cards
-- reports the lead count rather than the lock. Both refuse; only the wording differs.
create or replace function public.guard_stage_has_leads()
returns trigger
language plpgsql
as $$
declare
  n integer;
begin
  -- The owning pipeline is already gone, so this row is going out with the FK
  -- cascade and the leads in it are cascading too. deletePipeline refuses up
  -- front when the pipeline still holds leads, which is what keeps that from
  -- being a silent data loss.
  if not exists (select 1 from public.pipelines where id = old.pipeline_id) then
    return old;
  end if;

  select count(*) into n from public.leads where stage_id = old.id;

  if n > 0 then
    raise exception 'Stage "%" still holds % lead(s). Move them before deleting it.', old.name, n;
  end if;

  return old;
end;
$$;

drop trigger if exists pipeline_stages_guard_leads on public.pipeline_stages;
create trigger pipeline_stages_guard_leads
  before delete on public.pipeline_stages
  for each row execute function public.guard_stage_has_leads();


-- ---------------------------------------------------------------------------
-- E. RLS — the CRM is admin-only. No anon policy on any of the three tables:
-- nothing here is ever read by the public site.
-- ---------------------------------------------------------------------------

alter table public.pipelines enable row level security;

drop policy if exists "admin full access" on public.pipelines;
create policy "admin full access"
  on public.pipelines for all to authenticated
  using (true) with check (true);


alter table public.pipeline_stages enable row level security;

drop policy if exists "admin full access" on public.pipeline_stages;
create policy "admin full access"
  on public.pipeline_stages for all to authenticated
  using (true) with check (true);


alter table public.leads enable row level security;

drop policy if exists "admin full access" on public.leads;
create policy "admin full access"
  on public.leads for all to authenticated
  using (true) with check (true);


-- Defence in depth. Supabase's default privileges hand `anon` full table-level
-- INSERT/SELECT/UPDATE/DELETE on everything created in `public`, so today every
-- CRM table answers `true` to has_table_privilege('anon', …) and RLS is the only
-- thing standing between the anon key and the whole sales board. That is one
-- mistake deep: a future `alter table … disable row level security`, or a policy
-- written `for all using (true)` without a `to authenticated` restriction, turns
-- straight into public read/write on the CRM.
--
-- anon has no business here at all. The anon key needs INSERT on inquiries,
-- page_views and newsletter_subscribers, and SELECT on the public-site content
-- tables (projects, project_images, blog_posts, selected_work_*) — nothing else.
-- So take the grants away rather than relying on RLS to keep refusing.
--
-- Only the three tables THIS file owns are listed. public.notes is the
-- dashboard migration's table and is revoked there, not here.
-- `authenticated` keeps full access; `service_role` is unaffected either way
-- because it is BYPASSRLS and holds its own grants.
revoke all on public.leads, public.pipelines, public.pipeline_stages from anon;


-- ---------------------------------------------------------------------------
-- F. Seeds — the board the product ships with.
-- ---------------------------------------------------------------------------

-- pipelines_ensure_intake creates the locked 'New Leads' stage at position 0
-- as part of this statement, so it is not listed below.
insert into public.pipelines (name, is_default)
select 'Sales Pipeline', true
 where not exists (select 1 from public.pipelines where is_default);

-- Positions are supplied 0-based; shift_stage_after_intake bumps them to 1..4
-- so they sit behind the intake stage.
insert into public.pipeline_stages (pipeline_id, name, position, is_locked)
select p.id, s.name, s.position, false
  from public.pipelines p
 cross join (values
    ('Contacted',         0),
    ('Viewing Scheduled', 1),
    ('Negotiation',       2),
    ('Closed',            3)
 ) as s(name, position)
 where p.is_default
   and not exists (
     select 1 from public.pipeline_stages ps
      where ps.pipeline_id = p.id and not ps.is_locked
   );

-- Seeded board: New Leads (0, locked) | Contacted (1) | Viewing Scheduled (2)
-- | Negotiation (3) | Closed (4).
