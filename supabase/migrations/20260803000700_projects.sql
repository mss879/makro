-- ============================================================================
-- 20260803000700_projects.sql
--
-- Admin menu item 6 — "Projects".
--
-- Backs the public portfolio: /projects (index, grouped by status) and
-- /projects/[slug] (detail page, JSON-LD, sitemap). Two tables:
--   public.projects       — one row per development; mirrors the Project
--                           interface in lib/projects.ts field for field.
--   public.project_images — the ordered gallery, hard-capped at 5 per project.
-- Plus the 'project-images' storage bucket that both the upload route and the
-- public gallery read from.
--
-- This is NOT the home page rail. That is public.selected_work_cards
-- (20260803000500), a separately curated table that shares no rows with this
-- one — deleting a project here cannot empty the home page.
--
-- Depends on: 20260803000100_foundation.sql
--   public.touch_updated_at(), public.assert_jsonb_array()
--
-- Idempotent: safe to re-apply.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- A. PROJECTS
-- ---------------------------------------------------------------------------
-- `type` and `status` are CHECK unions rather than free text because both are
-- duplicated as TS consts (projects/actions.ts, ProjectForm.tsx) and as the
-- ProjectTypeRow / ProjectStatusRow unions. `status` additionally drives the
-- public grouping — Under Construction + Now Selling → On-going, In Planning →
-- Upcoming, Completed → Past — and the sitemap priority bump. A value outside
-- this list would silently drop the project out of every group on /projects.
-- Do not add or rename members without changing all four places.
--
-- `year` is TEXT, not integer, but must still hold a 4-digit year: projectSchema
-- builds the JSON-LD `datePosted` as `${year}-01-01`.
--
-- `specs_note` and `cover` are the only nullable columns here, deliberately.
-- Everything else the UI treats as "always a string" is `not null default ''`,
-- which keeps the hand-authored row types in lib/supabase/types.ts free of
-- `| null` churn. toProject() maps specs_note null → undefined.
--
-- `cover` is nullable because no form field posts it: it is written only by
-- syncCover() as `images[0]?.path ?? null`, so it is derived state, not input.
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  tagline     text not null default '',
  location    text not null default '',
  city        text not null default '',
  type        text not null default 'Residential'
                constraint projects_type_check
                check (type in ('Residential', 'Commercial', 'Mixed-Use')),
  status      text not null default 'In Planning'
                constraint projects_status_check
                check (status in ('Completed', 'Now Selling', 'Under Construction', 'In Planning')),
  year        text not null default '',
  headline    text not null default '',
  summary     text not null default '',
  -- string[] — paragraphs, rendered in order.
  description jsonb not null default '[]'::jsonb
                constraint projects_description_check
                check (public.assert_jsonb_array(description)),
  -- { label, value }[] — specStrip() reads the first three, and the JSON-LD
  -- numberOfAccommodationUnits reads specs[0].value.
  specs       jsonb not null default '[]'::jsonb
                constraint projects_specs_check
                check (public.assert_jsonb_array(specs)),
  specs_note  text,
  -- string[] — each entry is used as a React key, so entries must be unique
  -- within a project. Enforced by the admin form, not by the database: a
  -- cross-row constraint on array members is not worth the trigger.
  features    jsonb not null default '[]'::jsonb
                constraint projects_features_check
                check (public.assert_jsonb_array(features)),
  -- Tolerates all three shapes lib/images.ts::unsplash() accepts: a bare
  -- Unsplash photo id, a local /brand/* path, or a full Supabase Storage public
  -- URL. Never a bare storage key.
  cover       text,
  published   boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Both the admin table and getProjects() sort `.order("sort_order").order("name")`,
-- so `name` is the third key: without it the index feeds a re-sort instead of
-- covering the one the callers actually ask for.
create index if not exists projects_published_idx
  on public.projects (published, sort_order, name);

drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------------------
-- B. PROJECT IMAGES
-- ---------------------------------------------------------------------------
-- THE FK NAME IS LOAD-BEARING. lib/supabase/types.ts asserts
-- "project_images_project_id_fkey" verbatim in the Relationship tuple, and that
-- string is what makes the embedded select in lib/projects-data.ts
--     .select("*, project_images(path, position)")
-- resolve to a typed shape instead of `never`. Postgres would generate this
-- exact name implicitly, but it is spelled out so a future rename has to be a
-- deliberate act in both files.
--
-- `path` holds the FULL public URL from getPublicUrl(), not the storage key:
-- ImageManager feeds it straight into next/image, and removeStorageObjects()
-- recovers the key by splitting on
--   /storage/v1/object/public/project-images/
--
-- The `position < 5` CHECK mirrors the row cap below; together they mean a
-- reorder can never park an image at an index the gallery does not render.
create table if not exists public.project_images (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null
               constraint project_images_project_id_fkey
               references public.projects (id) on delete cascade,
  path       text not null,
  position   integer not null default 0
               constraint project_images_position_check
               check (position >= 0 and position < 5),
  created_at timestamptz not null default now()
);

-- No updated_at and no touch trigger: a gallery row is a pointer to an
-- immutable uploaded object. Replacing an image means inserting a new row and
-- deleting the old one, so a "last edited" timestamp would never move.

create index if not exists project_images_project_idx
  on public.project_images (project_id, position);

-- The CHECK bounds `position` but nothing stopped every row in a gallery from
-- sharing one — `update project_images set position = 0` succeeded on the seeded
-- three-image gallery, which makes both the render order and the syncCover()
-- pick (images[0]) arbitrary. Unique per project fixes the order.
--
-- DEFERRABLE INITIALLY DEFERRED because a reorder is a permutation: swapping two
-- images necessarily collides part-way through. The check runs at COMMIT, so the
-- admin reorder path MUST write every affected row in a SINGLE request —
-- PostgREST wraps each request in its own transaction, so one PATCH per image
-- would trip on the first intermediate collision.
--
-- Guarded because `add constraint` has no `if not exists` and this file re-runs.
do $$
begin
  if not exists (select 1 from pg_constraint
                  where conname = 'project_images_project_position_key') then
    alter table public.project_images
      add constraint project_images_project_position_key
      unique (project_id, position) deferrable initially deferred;
  end if;
end;
$$;


-- ---------------------------------------------------------------------------
-- C. THE 5-IMAGE CAP
-- ---------------------------------------------------------------------------
-- A hard client requirement, enforced in the database so the UI cannot drift
-- out of sync with it. app/api/admin/upload/route.ts pre-checks the same cap
-- with a `count: 'exact', head: true` query and returns a clean 409, so a user
-- normally never sees this exception — the trigger is the backstop for every
-- other write path (a second tab, a direct PostgREST call, a future action that
-- forgets the pre-check).
--
-- The message must keep the substring "at most 5 images": actions.ts:156 does
-- error.message.includes("at most 5 images") to turn it into friendly copy.
create or replace function public.guard_project_image_cap()
returns trigger
language plpgsql
as $$
declare
  image_count integer;
begin
  select count(*) into image_count
    from public.project_images
   where project_id = new.project_id;

  if image_count >= 5 then
    raise exception 'A project can have at most 5 images.';
  end if;

  return new;
end;
$$;

drop trigger if exists project_images_cap on public.project_images;
create trigger project_images_cap
  before insert on public.project_images
  for each row execute function public.guard_project_image_cap();


-- ---------------------------------------------------------------------------
-- D. RLS
-- ---------------------------------------------------------------------------
alter table public.projects enable row level security;

drop policy if exists "admin full access" on public.projects;
create policy "admin full access"
  on public.projects for all to authenticated
  using (true) with check (true);

alter table public.project_images enable row level security;

drop policy if exists "admin full access" on public.project_images;
create policy "admin full access"
  on public.project_images for all to authenticated
  using (true) with check (true);

-- Unpublished projects are drafts. The anon client is what renders /projects
-- and /projects/[slug], so `using (published)` is the only thing standing
-- between a half-written draft and the public site.
drop policy if exists "anon reads published projects" on public.projects;
create policy "anon reads published projects"
  on public.projects for select to anon using (published);

-- Images inherit their parent's visibility rather than carrying a flag of their
-- own: a gallery row is meaningless without the project, and a `published`
-- column here would be a second source of truth to keep in step.
drop policy if exists "anon reads published project images" on public.project_images;
create policy "anon reads published project images"
  on public.project_images for select to anon
  using (exists (
    select 1 from public.projects p
     where p.id = project_images.project_id and p.published
  ));

-- No anon INSERT/UPDATE/DELETE on either table. Uploads go through the
-- service-role route handler, never the browser client.

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
-- SELECT stays on both so the anon-rendered public pages keep working; the
-- `using (published)` predicates above remain the only thing hiding drafts.
revoke insert, update, delete on public.projects from anon;
revoke insert, update, delete on public.project_images from anon;


-- ---------------------------------------------------------------------------
-- E. STORAGE
-- ---------------------------------------------------------------------------
-- Public read, authenticated write. The bucket id is what PROJECT_IMAGE_BUCKET
-- in lib/supabase/config.ts resolves to, and removeStorageObjects() splits
-- stored URLs on /storage/v1/object/public/project-images/ — so the id is a
-- contract with the app, not a free choice.
--
-- Key convention set by the upload route:
--   projects/<slug>/<uuid>.webp
insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict (id) do update set public = true;

drop policy if exists "public reads project images" on storage.objects;
create policy "public reads project images"
  on storage.objects for select
  using (bucket_id = 'project-images');

drop policy if exists "admin writes project images" on storage.objects;
create policy "admin writes project images"
  on storage.objects for all to authenticated
  using (bucket_id = 'project-images')
  with check (bucket_id = 'project-images');


-- ---------------------------------------------------------------------------
-- F. SEED — MAKRO HEIGHTS
-- ---------------------------------------------------------------------------
-- The one real development, and the only project the live site ships with.
-- Every field below matches lib/projects.ts verbatim, so /projects and
-- /projects/makro-heights render identically on the first run after this
-- migration.
--
-- Dollar-quoted paragraphs: the copy contains em-dashes and typographic
-- punctuation, and dollar quoting removes any question of escaping.
insert into public.projects (
  slug, name, tagline, location, city, type, status, year,
  headline, summary, description, specs, specs_note, features,
  cover, published, sort_order
)
select
  'makro-heights',
  'Makro Heights',
  'The Standard Above, brought to Dehiwala.',
  'Rohini Place, Dehiwala, Sri Lanka',
  'Dehiwala',
  'Residential',
  'In Planning',
  '2026',
  'Approximately 120 residences. One uncompromising standard.',
  'An upmarket, attainable condominium of approximately 120 two- and three-bedroom residences, planned around efficient layouts, premium specification and long-term value.',
  to_jsonb(array[
    $para$Makro Heights rises on Rohini Place in Dehiwala, moments from Colombo and positioned as the flagship demonstration of the Makro Developers philosophy — The Standard Above, applied without compromise. Set across approximately 41.8 perches with over 32 metres of frontage, the development is planned as G+15 storeys, with two levels of parking beneath and rooftop amenities above.$para$,
    $para$The apartment mix is deliberately restrained: predominantly two-bedroom residences of around 1,150 sq. ft., supported by three-bedroom homes between 1,450 and 1,550 sq. ft. There are no studios and no one-bedroom units — a decision made for stronger end-user demand, greater family appeal and better long-term resale value.$para$,
    $para$Every layout is planned to maximise saleable space and minimise wasted circulation, supported by reinforced concrete construction, disciplined parking provision and vertical transportation sized for genuine day-to-day comfort. Makro Heights is designed to be timeless rather than trend-led — a home whose value compounds over decades, not one that competes against the next new tower.$para$
  ]),
  '[{"label":"Residences","value":"~120"},{"label":"Typologies","value":"2 & 3 Bed"},{"label":"Floors","value":"G+15"},{"label":"Completion","value":"TBC"}]'::jsonb,
  'Approx. 3.5-year construction programme once commenced.',
  -- ORDER IS LOAD-BEARING: the seeded Selected Work cards reuse features[0]
  -- ('Rooftop amenity deck') and features[3] ('Large, usable private balconies')
  -- as their captions, matching today's FeaturedProjects fallback chain.
  -- Reordering this array desynchronises the home page rail from the project.
  to_jsonb(array[
    'Rooftop amenity deck',
    'Grand ground-floor arrival lobby',
    'Three lifts, including a dedicated fire lift',
    'Large, usable private balconies',
    'Two levels of resident and visitor parking',
    'Efficient layouts, minimal wasted space'
  ]),
  '/brand/towers-render.jpg',
  true,
  0
where not exists (select 1 from public.projects where slug = 'makro-heights');

-- Guarded on "this project has no images at all" rather than per-path, so that
-- an admin who curates the gallery down to two images does not get the third
-- silently reinstated on the next apply.
insert into public.project_images (project_id, path, position)
select p.id, img.path, img.position
  from public.projects p
 cross join (values
    ('/brand/towers-render.jpg',   0),
    ('/brand/mono-corner.jpg',     1),
    ('/brand/lifestyle-suite.jpg', 2)
 ) as img(path, position)
 where p.slug = 'makro-heights'
   and not exists (
     select 1 from public.project_images pi where pi.project_id = p.id
   );
