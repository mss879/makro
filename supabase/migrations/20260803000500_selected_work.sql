-- ============================================================================
-- 20260803000500_selected_work.sql
--
-- Admin menu item 4 — "Selected Work".
--
-- WILL back the black, pinned, side-scrolling rail on the home page
-- (components/home/FeaturedProjects.tsx) once the data layer lands. That has
-- NOT happened yet: FeaturedProjects.tsx still hardcodes every string and image,
-- there is no lib/selected-work-data.ts for it to read from, and there is no
-- /admin/selected-work screen. Until those arrive the hardcoded component copy
-- is what the home page renders, and this file only provisions the schema and
-- the storage bucket the cutover will need.
--
-- Two tables:
--   public.selected_work_settings — singleton row: the on/off toggle plus every
--                                   piece of copy that is hardcoded in the
--                                   component today (intro panel + end cap).
--   public.selected_work_cards    — the reorderable panels in the rail.
-- Plus its own public storage bucket, 'selected-work-images'.
--
-- This is DELIBERATELY separate from public.projects. Selected Work is a
-- curated marketing section; /projects is the portfolio index. They share no
-- rows, so the client can re-cut the home page rail without touching a
-- published project — and can delete a project without gutting the home page.
--
-- Depends on: 20260803000100_foundation.sql
--   public.touch_updated_at()
--
-- Idempotent: safe to re-apply. Creates nothing twice, seeds nothing twice.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- A. SETTINGS (singleton)
-- ---------------------------------------------------------------------------
-- HEADING SPLIT RATIONALE: the live heading is
--     A portfolio built on <span class="metal-rose">discipline</span>, not haste.
-- — an inline highlight MID-SENTENCE. One plain-text column cannot round-trip
-- that, and storing raw HTML would hand an injection surface to an admin-edited
-- field. Three columns reproduce it exactly, keep the admin form to three plain
-- inputs, and leave the `metal-rose` class in the component where it belongs.
create table if not exists public.selected_work_settings (
  id                 uuid primary key default gen_random_uuid(),
  enabled            boolean not null default true,
  index_label        text not null default '02',
  eyebrow            text not null default 'Selected Work',
  heading_before     text not null default 'A portfolio built on ',
  heading_highlight  text not null default 'discipline',
  heading_after      text not null default ', not haste.',
  body               text not null default '',
  cta_label          text not null default 'View all projects',
  cta_href           text not null default '/projects',
  scroll_hint        text not null default 'Scroll to explore →',
  endcap_heading     text not null default 'See the full portfolio',
  endcap_link_label  text not null default 'All projects →',
  endcap_href        text not null default '/projects',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- A unique index on a constant expression admits exactly one row, ever. That
-- lets the app read the section config with `.select("*").maybeSingle()` and
-- never defend against a second row appearing behind its back.
create unique index if not exists selected_work_settings_singleton_idx
  on public.selected_work_settings ((true));

drop trigger if exists selected_work_settings_touch_updated_at on public.selected_work_settings;
create trigger selected_work_settings_touch_updated_at
  before update on public.selected_work_settings
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------------------
-- B. CARDS
-- ---------------------------------------------------------------------------
-- `kind` is a real discriminator rather than nullable-field sniffing because the
-- two panels are genuinely different renders: 'cover' draws the status pill,
-- index numeral, kicker, h3 and a hover-reveal caption over a `from-ink
-- via-ink/10` gradient; 'gallery' draws only the bottom caption over a
-- `from-ink/80` gradient.
--
-- `status_badge` is FREE TEXT, not the projects.status CHECK union. This is
-- display copy on a marketing rail — forcing the union would break the day the
-- client wants 'Launching soon'.
--
-- `kicker` stores the `${type} · ${city}` line already composed, because the
-- card is decoupled from any project row and must not depend on one existing.
--
-- `caption` is dual-role: the hover-reveal paragraph on a 'cover' card, the
-- bottom caption on a 'gallery' card. One column, because the two treatments
-- never coexist on a single panel.
--
-- `project_slug` is a SOFT reference with NO foreign key — same convention as
-- insights.relatedProjects. It lets a card point at a project that has not been
-- created yet, and stops a project delete from silently emptying the home page.
--
-- WHY ONE `image` COLUMN AND NOT A CHILD IMAGES TABLE: every panel renders
-- exactly one aspect-[4/5] image. No gallery-within-a-card, no reorder-within-
-- card, no cover derivation, no cap to enforce. A child table would drag in the
-- whole project_images apparatus (position column, cascade FK, cap trigger,
-- syncCover equivalent) to model a strict 1:1. A single text column matches
-- projects.cover semantics and keeps the upload flow a one-shot save.
create table if not exists public.selected_work_cards (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null default 'gallery'
                 constraint selected_work_cards_kind_check
                 check (kind in ('cover', 'gallery')),
  -- Tolerates all three shapes lib/images.ts::unsplash() accepts: a bare
  -- Unsplash photo id, a local /brand/* path, or a full Supabase Storage public
  -- URL. Never a bare storage key.
  image        text not null default '',
  -- Authored per card, never derived. Today's alt text is built from the
  -- PROJECT name (`Makro Heights`, `Makro Heights — Rooftop amenity deck`), and
  -- a card deliberately stores no project row — `title` is empty on a gallery
  -- panel — so no client-side fallback can reconstruct the current strings.
  -- The seeds below therefore set alt explicitly on all three cards.
  alt          text not null default '',
  -- The '01' printed top-right on the cover card. Empty string hides it.
  index_label  text not null default '',
  status_badge text not null default '',
  kicker       text not null default '',
  title        text not null default '',
  caption      text not null default '',
  project_slug text not null default '',
  -- Explicit link override. Effective link is
  --   coalesce(nullif(href, ''), '/projects/' || project_slug)
  -- and the card renders unlinked when both are empty.
  href         text not null default '',
  published    boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists selected_work_cards_order_idx
  on public.selected_work_cards (published, sort_order, created_at);

-- FeaturedProjects.tsx keys the gallery panels on the caption, so two identical
-- captions collide as React keys. This promotes that render-time invariant to a
-- DB invariant, and yields SQLSTATE 23505 so the admin form can message it the
-- same way it messages a duplicate project slug.
--
-- Scoped to `published` because only published cards are ever rendered, so only
-- they can collide. Without that predicate an admin cannot stage an unpublished
-- replacement alongside the live card it is meant to succeed — a draft that is
-- invisible to React still trips a uniqueness error. `caption <> ''` keeps any
-- number of caption-less cards legal.
--
-- Named _idx, not _key: the _key suffix is what Postgres auto-generates for a
-- real UNIQUE CONSTRAINT, and this is a bare index. A misleading name invites
-- an `on conflict on constraint selected_work_cards_caption_key` write path
-- that parses fine in review and fails at runtime.
create unique index if not exists selected_work_cards_caption_idx
  on public.selected_work_cards (caption) where caption <> '' and published;

drop trigger if exists selected_work_cards_touch_updated_at on public.selected_work_cards;
create trigger selected_work_cards_touch_updated_at
  before update on public.selected_work_cards
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------------------
-- C. RLS
-- ---------------------------------------------------------------------------
-- Any signed-in Supabase user is a full admin. Admin users are created by hand
-- in the dashboard, there is no public sign-up and no role table, so
-- "authenticated" and "admin" are the same set of people.
--
-- RLS is enabled in the same breath as the policy it guards: a table that ends
-- up created-with-policies-but-RLS-off is silently readable and writable by
-- anon, and nothing in the app would notice.
alter table public.selected_work_settings enable row level security;

drop policy if exists "admin full access" on public.selected_work_settings;
create policy "admin full access"
  on public.selected_work_settings for all to authenticated
  using (true) with check (true);

alter table public.selected_work_cards enable row level security;

drop policy if exists "admin full access" on public.selected_work_cards;
create policy "admin full access"
  on public.selected_work_cards for all to authenticated
  using (true) with check (true);

-- The predicate is `using (true)`, NOT `using (enabled)`, and that is
-- load-bearing. The home page is rendered by the ANON client and has to be able
-- to read `enabled = false` in order to know to HIDE the section. `using
-- (enabled)` would return zero rows when the toggle is off, which is
-- indistinguishable from "never configured" and would make the component fall
-- back to rendering the section it was just told to hide. The row holds nothing
-- but marketing copy, so unconditional anon read costs nothing.
drop policy if exists "anon reads selected work settings" on public.selected_work_settings;
create policy "anon reads selected work settings"
  on public.selected_work_settings for select to anon using (true);

drop policy if exists "anon reads published selected work" on public.selected_work_cards;
create policy "anon reads published selected work"
  on public.selected_work_cards for select to anon using (published);

-- No anon INSERT/UPDATE/DELETE on either table: nothing here is public-writable.

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
-- `authenticated` — it keeps full access on both tables — and service_role has
-- BYPASSRLS, so it is unaffected either way.
--
-- SELECT is the one privilege anon keeps here, so the read policies above are
-- the only thing that stays load-bearing; the "nothing here is public-writable"
-- line is now enforced twice.
revoke insert, update, delete on public.selected_work_settings from anon;
revoke insert, update, delete on public.selected_work_cards from anon;


-- ---------------------------------------------------------------------------
-- D. STORAGE
-- ---------------------------------------------------------------------------
-- Its own bucket rather than sharing 'project-images': Selected Work art is
-- picked for the rail, not for a project detail page (today's three panels are
-- deliberately independent of Makro Heights' own cover), so lifecycle and
-- cleanup belong to this table alone.
--
-- Key convention for the upload route:
--   selected-work/<card-id-or-'unsorted'>/<uuid>.webp
-- The DB stores the FULL public URL from getPublicUrl(), matching
-- project_images.path. The deletion helper's marker substring is
--   /storage/v1/object/public/selected-work-images/
--
-- Policy names are global per storage.objects, hence the bucket-specific names.
-- No next.config.ts change needed: public bucket on *.supabase.co under
-- /storage/v1/object/public/**, which is already allowed.
--
-- `public = true` is what makes getPublicUrl() return a URL that resolves with
-- no signed token; the `do update` re-asserts it in case the bucket was created
-- by hand in the dashboard with the flag off.
insert into storage.buckets (id, name, public)
values ('selected-work-images', 'selected-work-images', true)
on conflict (id) do update set public = true;

-- No `to` clause, so the read policy lands on role `public` (anon and
-- authenticated alike) — logged-out visitors are the primary audience for the
-- home page rail.
drop policy if exists "public reads selected work images" on storage.objects;
create policy "public reads selected work images"
  on storage.objects for select
  using (bucket_id = 'selected-work-images');

drop policy if exists "admin writes selected work images" on storage.objects;
create policy "admin writes selected work images"
  on storage.objects for all to authenticated
  using (bucket_id = 'selected-work-images')
  with check (bucket_id = 'selected-work-images');


-- ---------------------------------------------------------------------------
-- E. SEEDS
-- ---------------------------------------------------------------------------
-- These reproduce today's hardcoded home page character-for-character, so that
-- the day FeaturedProjects.tsx starts reading this table it renders an
-- identical rail. Nothing reads them yet — see the file header.

insert into public.selected_work_settings (
  enabled, index_label, eyebrow,
  heading_before, heading_highlight, heading_after,
  body, cta_label, cta_href, scroll_hint,
  endcap_heading, endcap_link_label, endcap_href)
select
  true, '02', 'Selected Work',
  'A portfolio built on ', 'discipline', ', not haste.',
  'Every Makro project, regardless of scale or location, is measured against the same discipline in planning, engineering and execution. Makro Heights, our flagship residential development, is the first public demonstration of that standard.',
  'View all projects', '/projects', 'Scroll to explore →',
  'See the full portfolio', 'All projects →', '/projects'
 where not exists (select 1 from public.selected_work_settings);

-- Card 1's caption is Makro Heights' tagline; cards 2 and 3 are features[0] and
-- features[3] of the seeded project — the exact strings FeaturedProjects.tsx
-- prints today.
--
-- `alt` is spelled out rather than left empty: the component's cover card uses
-- the bare project name and its gallery panels use `${name} — ${caption}`, so
-- these three literals are what a screen reader announces today. Anything
-- derived from this table's own columns would announce " — Rooftop amenity
-- deck" instead, because a gallery card has no title of its own.
insert into public.selected_work_cards (
  kind, image, alt, index_label, status_badge,
  kicker, title, caption, project_slug, href,
  published, sort_order)
select
  c.kind, c.image, c.alt, c.index_label, c.status_badge,
  c.kicker, c.title, c.caption, c.project_slug, c.href,
  c.published, c.sort_order
  from (values
    ('cover',   '/brand/sw-tower.jpg',
     'Makro Heights', '01', 'In Planning',
     'Residential · Dehiwala', 'Makro Heights',
     'The Standard Above, brought to Dehiwala.', 'makro-heights', '', true, 0),
    ('gallery', '/brand/sw-rooftop.jpg',
     'Makro Heights — Rooftop amenity deck', '',   '',
     '', '',
     'Rooftop amenity deck', 'makro-heights', '', true, 1),
    ('gallery', '/brand/sw-balcony.jpg',
     'Makro Heights — Large, usable private balconies', '',   '',
     '', '',
     'Large, usable private balconies', 'makro-heights', '', true, 2)
  ) as c (kind, image, alt, index_label, status_badge,
          kicker, title, caption, project_slug, href,
          published, sort_order)
 where not exists (select 1 from public.selected_work_cards);
