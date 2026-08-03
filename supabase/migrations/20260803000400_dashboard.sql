-- ============================================================================
-- 20260803000400_dashboard.sql
--
-- Admin menu item: 1. Dashboard
--
-- The Dashboard is mostly a window onto other people's tables — inquiry counts,
-- lead counts, subscriber counts, preview cards — so only the two tables it
-- OWNS live here:
--   * public.notes      — the notes panel
--   * public.page_views — the cookieless analytics behind the Views StatCards
--                         and the ViewsChart
-- Everything else the Dashboard renders is a count or a preview over a table
-- created by another migration, so it does not belong in this file.
--
-- Depends on: 20260803000100_foundation.sql
--   (public.touch_updated_at)
--
-- Idempotent: safe to re-apply. Creates nothing conditionally-named, drops
-- triggers/policies before recreating them, and ships no seed data — the notes
-- panel is meant to start empty.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- Notes — the free-form panel at the top of the Dashboard.
-- ---------------------------------------------------------------------------
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  -- `title` is never null so the hand-authored NoteRow type stays free of
  -- `| null`; length limits (1..160 title, 8000 body) are enforced by the Zod
  -- schema in app/admin/(panel)/actions.ts so the user gets friendly copy
  -- instead of a raw Postgres check-constraint error.
  title       text not null default '',
  -- Nullable on purpose: createNote/updateNote write `body: body || null`, so
  -- an empty body is stored as NULL rather than ''.
  body        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- The dashboard reads every note with `.order("updated_at", desc)` and no
-- limit, so the sort should never fall back to an in-memory sort.
create index if not exists notes_updated_at_idx
  on public.notes (updated_at desc);

-- Named exactly `notes_touch_updated_at` — app/admin/(panel)/actions.ts cites
-- this trigger by name to explain why it never writes updated_at itself.
drop trigger if exists notes_touch_updated_at on public.notes;
create trigger notes_touch_updated_at
  before update on public.notes
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------------------
-- Page views — cookieless. `visitor` is a daily salted hash, not an identity.
--
-- app/api/track/route.ts hashes IP + user-agent + salt + today's date, so views
-- can be grouped into rough daily uniques while yesterday's hash cannot be
-- linked to today's. Nothing here identifies a person; keep it that way.
-- ---------------------------------------------------------------------------
create table if not exists public.page_views (
  -- The one non-uuid PK in the schema: PageViewRow.id in lib/supabase/types.ts
  -- is `number`, and this table is append-only high-volume telemetry where a
  -- monotonic identity is cheaper than a random uuid. Do not "normalise" it.
  id          bigint generated always as identity primary key,
  path        text not null,
  referrer    text,
  visitor     text not null,
  created_at  timestamptz not null default now()
);

-- Backs per-path lookups.
create index if not exists page_views_path_idx
  on public.page_views (path);

-- The only created_at index this table needs. `created_at desc` leads, so it
-- serves both readers: the three `count(*) where created_at >= …` StatCards
-- (range scan on the leading column alone) and the 30-day chart / top-pages
-- list, which select (path, created_at) ordered by created_at desc — with
-- `path` in the index the planner answers that one index-only instead of
-- hitting the heap for up to 20k rows. A narrower (created_at desc) index
-- would be a strict prefix of this one and buy nothing, while costing a second
-- b-tree write on every tracked page view — the highest-insert table here.
create index if not exists page_views_path_created_idx
  on public.page_views (created_at desc, path);

-- No updated_at and no touch trigger: page views are append-only facts. A view
-- that could be edited after the fact would not be a view.


-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.notes enable row level security;

drop policy if exists "admin full access" on public.notes;
create policy "admin full access"
  on public.notes for all to authenticated
  using (true) with check (true);

alter table public.page_views enable row level security;

drop policy if exists "admin full access" on public.page_views;
create policy "admin full access"
  on public.page_views for all to authenticated
  using (true) with check (true);

-- The public site records its own views. createPublicWriteSupabase() falls back
-- to the anon key when the service-role key is absent, so the tracker needs an
-- explicit anon INSERT grant to work in that configuration.
drop policy if exists "anon can record page views" on public.page_views;
create policy "anon can record page views"
  on public.page_views for insert to anon with check (true);

-- Deliberately no anon SELECT on page_views: the site may write analytics but
-- must never read them back. And no anon policy of any kind on notes — the
-- notes panel is admin-only, and RLS with zero matching policies denies by
-- default.


-- ---------------------------------------------------------------------------
-- Explicit anon revokes — defence in depth
--
-- Supabase's base image ships
--   alter default privileges ... grant all on tables to anon
-- so anon holds SELECT/INSERT/UPDATE/DELETE on every new table in public the
-- moment it is created, and RLS is the ONLY thing standing between the anon key
-- and the data. Stripping the privileges anon does not need means a future
-- `alter table ... disable row level security`, or a policy written without a
-- role restriction, degrades to "permission denied" instead of full read/write.
--
-- The grant is the floor, RLS is the gate. Nothing is ever revoked from
-- `authenticated` — it keeps full access on every table — and service_role has
-- BYPASSRLS, so it is unaffected either way.
--
-- page_views: INSERT only, for the tracker. notes: nothing at all — "denies by
-- default" above is a statement about policies, and this makes it true about
-- privileges too, so the notes panel does not become world-readable the moment
-- someone toggles RLS off to debug something.
revoke select, update, delete on public.page_views from anon;
revoke all on public.notes from anon;
