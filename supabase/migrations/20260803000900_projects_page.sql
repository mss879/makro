-- ============================================================================
-- 20260803000900_projects_page.sql
--
-- Admin menu item 6 — "Projects", second half.
--
-- 20260803000700_projects.sql backs the *portfolio*: one row per development,
-- rendered as the grouped index (On-going / Upcoming / Past) and the detail
-- pages. This file backs the *page around it* — everything the client asked to
-- control above that index on /projects:
--
--   1. a full-screen hero of reorderable slides,
--   2. a short scroll-revealed intro paragraph beneath it,
--   3. a curated carousel of projects to feature.
--
-- Three tables:
--   public.projects_page_settings       — singleton: the switches and copy for
--                                         the three sections above.
--   public.projects_page_hero_slides    — the hero's slides, reorderable.
--   public.projects_page_carousel_items — which projects the carousel shows,
--                                         and in what order.
-- Plus its own public storage bucket, 'projects-page-images', for hero art.
--
-- WHY THE CAROUSEL IS A JOIN AND NOT A CARD TABLE
-- Selected Work (20260803000500) is deliberately standalone because it is
-- curated marketing copy that must survive a project being deleted. This
-- carousel is the opposite: it advertises real developments, and every field on
-- the card — cover, name, city, the four stat rows — already exists on
-- public.projects. Duplicating them here would create a second source of truth
-- that silently goes stale the day someone edits a project. So this table
-- carries ONLY the curation: which project, what order, shown or not. Delete a
-- project and its carousel entry goes with it (ON DELETE CASCADE), which is the
-- correct outcome — a card pointing at a development that no longer exists is
-- worse than one fewer card.
--
-- Depends on: 20260803000100_foundation.sql
--   public.touch_updated_at(), public.assert_jsonb_array()
-- Depends on: 20260803000700_projects.sql
--   public.projects (FK target for the carousel)
--
-- Idempotent: safe to re-apply. Creates nothing twice, seeds nothing twice.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- A. SETTINGS (singleton)
-- ---------------------------------------------------------------------------
-- One row holds the configuration for all three sections rather than three
-- singleton tables, because the admin edits them as three tabs of one screen
-- and a single `.select("*").maybeSingle()` then serves the whole page. Columns
-- are prefixed by section so the grouping survives without nesting.
--
-- hero_interval_ms is milliseconds, not seconds: it is passed straight to the
-- slideshow timer, and storing seconds would put a ×1000 in the component where
-- a future reader would have to go looking for it. The CHECK floor of 2000 is
-- not arbitrary — below roughly two seconds the crossfade has not finished
-- before the next slide starts, and the hero visibly stutters.
--
-- intro_body is a jsonb string[] of paragraphs, matching projects.description,
-- because the reveal animates one paragraph at a time and needs them as
-- separate nodes. A single TEXT column with newlines would push the splitting
-- into the renderer and lose the client's own paragraph breaks on round-trip.
create table if not exists public.projects_page_settings (
  id                 uuid primary key default gen_random_uuid(),

  -- Hero
  hero_enabled       boolean not null default true,
  hero_autoplay      boolean not null default true,
  hero_interval_ms   integer not null default 6000
                       constraint projects_page_settings_interval_check
                       check (hero_interval_ms >= 2000 and hero_interval_ms <= 30000),
  hero_show_dots     boolean not null default true,

  -- Intro (the scroll-revealed paragraph between hero and carousel)
  intro_enabled      boolean not null default true,
  intro_eyebrow      text not null default 'Our Projects',
  intro_body         jsonb not null default '[]'::jsonb
                       constraint projects_page_settings_intro_body_check
                       check (public.assert_jsonb_array(intro_body)),

  -- Carousel
  carousel_enabled   boolean not null default true,
  carousel_eyebrow   text not null default '',
  carousel_heading   text not null default 'Our Projects',

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- A unique index on a constant expression admits exactly one row, ever — the
-- same trick selected_work_settings uses, and what lets callers read this with
-- `.maybeSingle()` and never defend against a second row appearing.
create unique index if not exists projects_page_settings_singleton_idx
  on public.projects_page_settings ((true));

drop trigger if exists projects_page_settings_touch_updated_at on public.projects_page_settings;
create trigger projects_page_settings_touch_updated_at
  before update on public.projects_page_settings
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------------------
-- B. HERO SLIDES
-- ---------------------------------------------------------------------------
-- The client's brief was explicit that a slide may be any of three shapes:
-- image only, image with text at the bottom, or text with no image at all. So
-- `image`, `heading` and `body` are all independently optional and the shape is
-- inferred at render time rather than stored as a `kind` discriminator — a
-- discriminator would have to be kept in step with the fields by hand, and the
-- admin would be able to save "kind: image" with no image.
--
-- What is NOT allowed is a slide that is empty in all three, which would render
-- as a blank full-screen panel the client could not see to delete. That is the
-- CHECK below, and it is the only shape rule in the table.
--
-- `image` holds the FULL public URL from getPublicUrl(), never a bare storage
-- key — same contract as project_images.path, so the shared upload route and
-- the delete-on-replace helper work here unchanged.
create table if not exists public.projects_page_hero_slides (
  id          uuid primary key default gen_random_uuid(),
  image       text,
  -- Empty when the slide is decorative; next/image still needs the prop, so the
  -- renderer falls back to '' and the slide is treated as presentational.
  alt         text not null default '',
  heading     text not null default '',
  body        text not null default '',
  published   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint projects_page_hero_slides_not_empty_check
    check (
      coalesce(image, '') <> ''
      or heading <> ''
      or body <> ''
    )
);

-- The public read and the admin list both sort `.order("sort_order").order("created_at")`,
-- so created_at is the tiebreaker: without it two slides sharing a sort_order
-- swap places between requests and the hero reorders itself at random.
create index if not exists projects_page_hero_slides_order_idx
  on public.projects_page_hero_slides (published, sort_order, created_at);

drop trigger if exists projects_page_hero_slides_touch_updated_at on public.projects_page_hero_slides;
create trigger projects_page_hero_slides_touch_updated_at
  before update on public.projects_page_hero_slides
  for each row execute function public.touch_updated_at();

-- No uniqueness on sort_order, deliberately. project_images needs a deferrable
-- unique because its position doubles as the gallery index and the cover pick;
-- here the order is presentational only, so a tie is a cosmetic problem the
-- created_at tiebreaker already resolves — and a unique constraint would force
-- every reorder into a single batched request for no benefit.


-- ---------------------------------------------------------------------------
-- C. CAROUSEL ITEMS
-- ---------------------------------------------------------------------------
-- Curation only — see the header. The card's content is read from the joined
-- project, so this table has no copy of its own to drift.
--
-- ON DELETE CASCADE, not SET NULL: an entry whose project is gone has nothing
-- left to render.
--
-- UNIQUE (project_id) because the carousel is a pick-list. Without it the admin
-- can add the same development twice, and React then renders two siblings with
-- the same natural key.
create table if not exists public.projects_page_carousel_items (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null
                constraint projects_page_carousel_items_project_id_fkey
                references public.projects (id) on delete cascade,
  published   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint projects_page_carousel_items_project_key unique (project_id)
);

create index if not exists projects_page_carousel_items_order_idx
  on public.projects_page_carousel_items (published, sort_order, created_at);

drop trigger if exists projects_page_carousel_items_touch_updated_at on public.projects_page_carousel_items;
create trigger projects_page_carousel_items_touch_updated_at
  before update on public.projects_page_carousel_items
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------------------
-- D. RLS
-- ---------------------------------------------------------------------------
alter table public.projects_page_settings enable row level security;

drop policy if exists "admin full access" on public.projects_page_settings;
create policy "admin full access"
  on public.projects_page_settings for all to authenticated
  using (true) with check (true);

-- The settings row carries no drafts — it is switches and copy that are live
-- the moment they are saved — so anon reads it unconditionally. The per-section
-- `*_enabled` flags are read by the renderer, not enforced here: hiding the row
-- from anon would leave the page unable to tell "disabled" from "not
-- configured", and both would silently render the fallback.
drop policy if exists "anon reads projects page settings" on public.projects_page_settings;
create policy "anon reads projects page settings"
  on public.projects_page_settings for select to anon using (true);

alter table public.projects_page_hero_slides enable row level security;

drop policy if exists "admin full access" on public.projects_page_hero_slides;
create policy "admin full access"
  on public.projects_page_hero_slides for all to authenticated
  using (true) with check (true);

drop policy if exists "anon reads published hero slides" on public.projects_page_hero_slides;
create policy "anon reads published hero slides"
  on public.projects_page_hero_slides for select to anon using (published);

alter table public.projects_page_carousel_items enable row level security;

drop policy if exists "admin full access" on public.projects_page_carousel_items;
create policy "admin full access"
  on public.projects_page_carousel_items for all to authenticated
  using (true) with check (true);

-- Two gates, both required. `published` is this entry's own switch; the EXISTS
-- is the parent project's. Without the second, unpublishing a project would
-- pull it from the portfolio index below while leaving it advertised in the
-- carousel above — the draft leak the projects migration's own policy exists to
-- prevent, reintroduced one section higher up the same page.
drop policy if exists "anon reads published carousel items" on public.projects_page_carousel_items;
create policy "anon reads published carousel items"
  on public.projects_page_carousel_items for select to anon
  using (
    published
    and exists (
      select 1 from public.projects p
       where p.id = projects_page_carousel_items.project_id and p.published
    )
  );

-- ---------------------------------------------------------------------------
-- Explicit anon revokes — defence in depth
--
-- Supabase's base image grants anon full DML on every new table in public, so
-- RLS is otherwise the only thing between the anon key and these rows. Stripping
-- what anon does not need means a future `disable row level security`, or a
-- policy written without a role restriction, degrades to "permission denied"
-- rather than public write access to the projects page.
--
-- SELECT stays so the anon-rendered page keeps working; the predicates above
-- remain the only thing hiding unpublished slides and draft projects.
revoke insert, update, delete on public.projects_page_settings from anon;
revoke insert, update, delete on public.projects_page_hero_slides from anon;
revoke insert, update, delete on public.projects_page_carousel_items from anon;


-- ---------------------------------------------------------------------------
-- E. STORAGE
-- ---------------------------------------------------------------------------
-- Its own bucket rather than reusing 'project-images', so hero art can be
-- purged or re-permissioned without touching a single project gallery — the
-- same one-bucket-per-content-type rule the other migrations follow. The id is
-- a contract with lib/supabase/config.ts (PROJECTS_PAGE_IMAGE_BUCKET) and with
-- removeStorageObjects(), which splits stored URLs on
--   /storage/v1/object/public/projects-page-images/
--
-- Key convention, matching the upload route:
--   projects-page/hero/<uuid>.webp
insert into storage.buckets (id, name, public)
values ('projects-page-images', 'projects-page-images', true)
on conflict (id) do update set public = true;

drop policy if exists "public reads projects page images" on storage.objects;
create policy "public reads projects page images"
  on storage.objects for select
  using (bucket_id = 'projects-page-images');

drop policy if exists "admin writes projects page images" on storage.objects;
create policy "admin writes projects page images"
  on storage.objects for all to authenticated
  using (bucket_id = 'projects-page-images')
  with check (bucket_id = 'projects-page-images');


-- ---------------------------------------------------------------------------
-- F. SEED
-- ---------------------------------------------------------------------------
-- The settings singleton, carrying the copy the page ships with today so
-- /projects renders identically the moment this migration lands and before
-- anyone opens the admin.
insert into public.projects_page_settings (
  hero_enabled, hero_autoplay, hero_interval_ms, hero_show_dots,
  intro_enabled, intro_eyebrow, intro_body,
  carousel_enabled, carousel_eyebrow, carousel_heading
)
select
  true, true, 6000, true,
  true,
  'Our Portfolio',
  to_jsonb(array[
    $para$Every Makro development begins the same way — with disciplined planning, a site studied properly, and a brief that refuses to trade long-term value for a faster launch.$para$,
    $para$What follows is the portfolio that discipline produces: residential and commercial projects across Sri Lanka, each built to a standard you can feel long after handover.$para$
  ]),
  true,
  '',
  'Our Projects'
where not exists (select 1 from public.projects_page_settings);

-- One hero slide, mirroring the PageHero this section replaces, so the top of
-- /projects is never a blank full-screen panel on first run. Guarded on "the
-- table is empty" rather than per-image: an admin who curates the hero down to
-- their own slides must not have this one silently reinstated on re-apply.
insert into public.projects_page_hero_slides (
  image, alt, heading, body, published, sort_order
)
select
  -- Landscape source (1920x1080). towers-render.jpg is 819x1024 portrait and
  -- upscales badly across a full-screen panel.
  '/brand/hero-architectural-poster.webp',
  'A Makro development at dusk',
  'Developments built to last.',
  'Residential and commercial projects across Sri Lanka — each delivered to a standard you can feel.',
  true,
  0
where not exists (select 1 from public.projects_page_hero_slides);

-- Seed the carousel with whatever is already published, newest sort order
-- first, so the section has something to show immediately. Same empty-table
-- guard: once the client has curated the list, re-applying must not re-add a
-- project they deliberately removed.
insert into public.projects_page_carousel_items (project_id, published, sort_order)
select p.id, true, (row_number() over (order by p.sort_order, p.name) - 1)::int
  from public.projects p
 where p.published
   and not exists (select 1 from public.projects_page_carousel_items);
