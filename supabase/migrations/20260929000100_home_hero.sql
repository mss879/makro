-- ============================================================================
-- 20260929000100_home_hero.sql
--
-- Admin menu item — "Home Hero". The full-screen opening of the home page: the
-- video (or image) behind it, the headline, the line of copy under it and its
-- two buttons (client direction, Sep 2026: the home page hero should be
-- changeable from the backend). Until this file every one of those was a
-- literal in components/home/Hero.tsx.
--
-- Owns:
--   public.home_hero_settings — singleton: the hero's media and its copy.
--   storage bucket 'home-hero-media' — uploaded videos and still images.
--
-- Depends on: 20260803000100_foundation.sql
--   public.touch_updated_at(), public.assert_jsonb_array()
--
-- ORDER: either way round is safe. The new build reads this table with a
-- fallback — until it exists the home page renders the bundled hero it always
-- has — and the old build never reads it at all. Applying it first simply means
-- the new build never has to fall back.
--
-- Idempotent: safe on a fresh database and safe to re-apply. The seed is
-- guarded, so re-running it never overwrites a hero edited in the admin.
--
--
-- ONE ROW, NOT SLIDES
--
-- The /projects hero is a slideshow (projects_page_hero_slides). This one is a
-- single composition — one looping picture under one fixed block of copy — so
-- it is a singleton like selected_work_settings, and the home page reads the
-- whole thing with one `.maybeSingle()`.
--
--
-- THE SHAPE IS INFERRED, NOT STORED
--
-- There is no `kind` column saying "video" or "image". A video present means a
-- video hero, with `image` as the still painted under it while it buffers; no
-- video means `image` IS the hero. Same reasoning as the /projects slides: a
-- discriminator has to be kept in step with the fields by hand, and a row that
-- says "video" with no video in it is a black rectangle on the home page.
--
--
-- FOUR MEDIA COLUMNS, TWO PAIRS
--
--   video / video_mobile — the loop: landscape for desktop, portrait for phones
--   image / image_mobile — the still for each of them
--
-- Phones get their own pair for the reason the other two heroes do
-- (20260901000100_hero_mobile_images.sql): below md the hero's picture is a
-- tall frame above the copy, and a landscape file loses most of its width to
-- it. Each _mobile column is optional and falls back to its desktop partner —
-- and the other way round, so either half of a pair on its own is a complete,
-- working hero.
--
-- The still is the video's FIRST FRAME by design, so nothing jumps when
-- playback starts. The admin screen captures it from the video automatically
-- when one is uploaded.
--
-- All four hold a full public URL from getPublicUrl() or a bundled /public
-- path (which is what the seed uses) — never a bare storage key. `image` and
-- `image_mobile` also accept a bare Unsplash photo id, like every other image
-- column in this schema.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- A. SETTINGS (singleton)
-- ---------------------------------------------------------------------------
-- heading_lines is a jsonb string[] rather than one text column because each
-- line is its own node on the page: the headline rises into place one line at
-- a time, and the break between them is the client's, not the browser's. Same
-- storage as projects_page_settings.intro_body, for the same reason.
--
-- The copy columns default to the copy the hero ships with, exactly as
-- selected_work_settings' do, so a row created without them reads like the
-- live page rather than like a blank one.
create table if not exists public.home_hero_settings (
  id              uuid primary key default gen_random_uuid(),

  -- Media — see the header. NULL is "not set"; every one is optional on its
  -- own, and section C forbids only the row with none of the four.
  video           text,
  video_mobile    text,
  image           text,
  image_mobile    text,

  -- Read out by screen readers only when the image IS the hero. With a video
  -- the picture is decoration — the video and its still are aria-hidden and
  -- the headline says what the page is — so this is ignored. Empty marks an
  -- image hero as decorative too.
  alt             text not null default '',

  -- Copy
  heading_lines   jsonb not null default '["The Future,", "Built to Endure."]'::jsonb,
  body            text not null default 'Thoughtfully planned residential and commercial developments, built for lasting value.',

  -- The two buttons: the filled one, then the outlined one. An empty label
  -- hides that button, so the hero can carry two, one or none of them.
  primary_label   text not null default 'Explore Projects',
  primary_href    text not null default '/projects',
  secondary_label text not null default 'Book a Consultation',
  secondary_href  text not null default '/contact',

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- A unique index on a constant expression admits exactly one row, ever — the
-- same singleton trick selected_work_settings, projects_page_settings and
-- site_lock_settings use. It is what lets the home page read this with
-- `.maybeSingle()` and never defend against a second row.
create unique index if not exists home_hero_settings_singleton_idx
  on public.home_hero_settings ((true));

drop trigger if exists home_hero_settings_touch_updated_at on public.home_hero_settings;
create trigger home_hero_settings_touch_updated_at
  before update on public.home_hero_settings
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------------------
-- B. THE HEADLINE CANNOT BE EMPTY
-- ---------------------------------------------------------------------------
-- The hero's headline is the home page's only <h1>. An empty array would ship
-- a page with no heading at all — invisible to the person editing it, and the
-- first thing a search engine reads.
--
-- A CASE rather than `assert_jsonb_array(...) and jsonb_array_length(...)`:
-- Postgres does not promise to evaluate AND left to right, and
-- jsonb_array_length() RAISES on a scalar instead of returning false. The CASE
-- is what guarantees the length is only ever asked of an array.
--
-- Dropped and re-added so a re-run always leaves exactly this definition.
alter table public.home_hero_settings
  drop constraint if exists home_hero_settings_heading_lines_check;

alter table public.home_hero_settings
  add constraint home_hero_settings_heading_lines_check
    check (
      case
        when public.assert_jsonb_array(heading_lines)
          then jsonb_array_length(heading_lines) >= 1
        else false
      end
    );


-- ---------------------------------------------------------------------------
-- C. THE HERO NEEDS A PICTURE
-- ---------------------------------------------------------------------------
-- Any ONE of the four is enough — the fallbacks run both ways, so a single
-- phone-only still still renders at every width. None of them is a black
-- full-screen panel on the most-visited page of the site, which the admin form
-- refuses too; this is the same rule where a hand-written UPDATE cannot skip it.
alter table public.home_hero_settings
  drop constraint if exists home_hero_settings_has_media_check;

alter table public.home_hero_settings
  add constraint home_hero_settings_has_media_check
    check (
      coalesce(video, '') <> ''
      or coalesce(video_mobile, '') <> ''
      or coalesce(image, '') <> ''
      or coalesce(image_mobile, '') <> ''
    );


-- ---------------------------------------------------------------------------
-- D. RLS
-- ---------------------------------------------------------------------------
-- Any signed-in Supabase user is a full admin: admin users are created by hand
-- in the dashboard, there is no public sign-up and no role table.
alter table public.home_hero_settings enable row level security;

drop policy if exists "admin full access" on public.home_hero_settings;
create policy "admin full access"
  on public.home_hero_settings for all to authenticated
  using (true) with check (true);

-- Unconditional: the home page is rendered with the anon key and must read the
-- row to render at all. Nothing on it is a draft or a secret — it is the copy
-- and media already on the most public page of the site.
drop policy if exists "anon reads home hero" on public.home_hero_settings;
create policy "anon reads home hero"
  on public.home_hero_settings for select to anon using (true);

-- ---------------------------------------------------------------------------
-- Explicit anon revokes — defence in depth
--
-- Supabase's base image grants anon full DML on every new table in public, so
-- RLS would otherwise be the only thing between the anon key and the home
-- page's headline. With these gone, a future `disable row level security` or a
-- policy written without a role restriction degrades to "permission denied"
-- rather than a publicly writable hero. SELECT stays; nothing is revoked from
-- authenticated, and service_role bypasses RLS either way.
revoke insert, update, delete on public.home_hero_settings from anon;


-- ---------------------------------------------------------------------------
-- E. STORAGE
-- ---------------------------------------------------------------------------
-- Its own bucket, per the one-bucket-per-content-type rule every screen
-- follows, so hero media can be purged or re-permissioned without touching a
-- project gallery. The id is a contract with lib/supabase/config.ts
-- (HOME_HERO_MEDIA_BUCKET).
--
-- Key conventions:
--   home-hero/still/<uuid>.webp          — stills, via /api/admin/upload
--   home-hero/video-<desktop|mobile>/<uuid>.<mp4|webm>
--                                        — videos, via a signed upload URL
--
-- VIDEOS DO NOT GO THROUGH /api/admin/upload. That route re-encodes images
-- with sharp inside a serverless function, and a function's request body is
-- capped by the host (~6 MB on Netlify, ~4.5 MB on Vercel) — smaller than most
-- hero videos. So the admin asks /api/admin/video-upload for a signed upload
-- URL (minted with the service role, after it has checked the session) and the
-- browser PUTs the file straight into this bucket. Our server never sees those
-- bytes, which is why allowed_mime_types is set here: it is the one gate the
-- video passes through that can refuse a file that is not an MP4 or a WebM.
--
-- image/webp is the only image type because the upload route converts every
-- still to WebP before it lands here — including the first frame the admin
-- captures from a video.
--
-- file_size_limit stays NULL (the project's global limit), in line with
-- 20260829000200_remove_upload_size_limits.sql — the client asked for no
-- per-bucket ceilings. A heavy video still costs every visitor load time, so
-- the admin screen warns about one rather than refusing it.
--
-- `do update` re-asserts both settings in case the bucket was created by hand
-- in the dashboard first, as the catalogue bucket's migration does.
insert into storage.buckets (id, name, public, allowed_mime_types)
values (
  'home-hero-media',
  'home-hero-media',
  true,
  array['image/webp', 'video/mp4', 'video/webm']
)
on conflict (id) do update set
  public = true,
  allowed_mime_types = excluded.allowed_mime_types;

-- No `to` clause, so the read lands on role `public` — logged-out visitors are
-- the whole audience for the home page.
drop policy if exists "public reads home hero media" on storage.objects;
create policy "public reads home hero media"
  on storage.objects for select
  using (bucket_id = 'home-hero-media');

drop policy if exists "admin writes home hero media" on storage.objects;
create policy "admin writes home hero media"
  on storage.objects for all to authenticated
  using (bucket_id = 'home-hero-media')
  with check (bucket_id = 'home-hero-media');


-- ---------------------------------------------------------------------------
-- F. SEED
-- ---------------------------------------------------------------------------
-- The hero exactly as it ships today, so the home page renders identically the
-- moment this lands and the admin form opens on what visitors are seeing. The
-- two media paths are the bundled files in /public: the 1080p loop and its
-- first frame.
--
-- Guarded on "no row yet", never per column: once the client has edited the
-- hero, re-applying this file must not put the old one back.
insert into public.home_hero_settings (
  video, video_mobile, image, image_mobile, alt,
  heading_lines, body,
  primary_label, primary_href, secondary_label, secondary_href
)
select
  '/hero-architectural-1080.mp4',
  null,
  '/brand/hero-architectural-poster.webp',
  null,
  '',
  jsonb_build_array('The Future,', 'Built to Endure.'),
  'Thoughtfully planned residential and commercial developments, built for lasting value.',
  'Explore Projects', '/projects',
  'Book a Consultation', '/contact'
where not exists (select 1 from public.home_hero_settings);

-- Show the result, so running this in the SQL editor ends on the hero row and
-- the bucket rather than a bare "Success".
select
  h.heading_lines,
  h.video,
  h.image,
  b.id as bucket,
  b.public as bucket_is_public,
  b.allowed_mime_types
from public.home_hero_settings h
cross join storage.buckets b
where b.id = 'home-hero-media';
