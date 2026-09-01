-- ============================================================================
-- 20260901000100_hero_mobile_images.sql
--
-- Admin menu item 6 — "Projects". Gives every admin-editable HERO a second,
-- portrait image for phones (client direction, Sep 2026: "for those hero
-- images in the backend we need 2 types — one image for desktop view which is
-- horizontal, and another portrait image for mobile").
--
-- Owns exactly two new columns:
--   public.projects.hero_image_mobile
--   public.projects_page_hero_slides.image_mobile
--
-- and widens one existing CHECK — see section C.
--
-- Depends on: 20260803000700_projects.sql          (public.projects)
-- Depends on: 20260803000900_projects_page.sql     (public.projects_page_hero_slides)
-- Depends on: 20260828000300_project_hero_image.sql (projects.hero_image, the
--             landscape half of the pair this completes)
--
--
-- WHY A SECOND COLUMN AND NOT A CROP HINT
--
-- The obvious cheaper fix is a focal point — store "keep the subject at 30%
-- from the left" and let object-position do the rest. It does not work here.
-- Both of these slots are FULL-SCREEN: a 16:9 master on a 390x844 phone is
-- cropped to roughly a third of its width, so the composition the photographer
-- framed is gone whatever point you anchor it to. A tall render is a different
-- photograph, not the same photograph nudged sideways. The client asked for a
-- portrait image because that is genuinely what the slot needs.
--
-- These are the ONLY two image slots that get this treatment, and that is
-- deliberate rather than an oversight. Every other admin-editable image is
-- either a fixed-aspect card (Selected Work is 4:5 at every width, the project
-- cover is 16:9/4:3) or is shown uncropped (the project gallery). A second
-- file would buy those nothing.
--
--
-- NULL IS THE WHOLE MIGRATION PLAN
--
-- NULL means "no portrait variant — use the landscape one on phones too",
-- which is exactly what every existing row does today. So there is no
-- backfill, no data migration, and no window where the site renders
-- differently from how it rendered a minute ago. The renderer's fallback is
-- symmetric on purpose (see components/ui/ArtDirectedImage.tsx): landscape
-- falls back to portrait as well, so a row carrying only a portrait image
-- still renders on desktop rather than showing an empty frame.
--
-- Idempotent: safe to re-apply.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- A. PROJECT DETAIL HERO
-- ---------------------------------------------------------------------------
-- The partner column to hero_image, added by 20260828000300. Same contract:
-- a full public URL from getPublicUrl(), never a bare storage key, so
-- removeStorageObjects() and the shared upload route work here unchanged.
--
-- Reuses the existing `project-images` bucket — no new bucket and no new
-- policies. The upload route already writes there under `projects/<slug>/`,
-- and the portrait hero belongs to the same project as the landscape one.
alter table public.projects
  add column if not exists hero_image_mobile text;

comment on column public.projects.hero_image_mobile is
  'Portrait hero art for the project detail page on phones (below 768px). '
  'NULL falls back to hero_image, then to cover, then to the first gallery '
  'image — so a project with no portrait variant renders exactly as before.';


-- ---------------------------------------------------------------------------
-- B. /projects HERO SLIDES
-- ---------------------------------------------------------------------------
-- Per slide, not per slideshow: the client picks the art one slide at a time,
-- and a deck where slide 1 has a portrait variant and slide 2 does not is a
-- perfectly reasonable half-finished state that must render correctly.
--
-- Storage is the 'projects-page-images' bucket from 20260803000900, again
-- unchanged — key convention `projects-page/hero/<uuid>.webp`.
alter table public.projects_page_hero_slides
  add column if not exists image_mobile text;

comment on column public.projects_page_hero_slides.image_mobile is
  'Portrait art for this slide on phones (below 768px). NULL falls back to '
  '`image`. Full public URL, never a bare storage key.';


-- ---------------------------------------------------------------------------
-- C. THE "NOT EMPTY" CHECK HAS TO LEARN ABOUT THE NEW COLUMN
-- ---------------------------------------------------------------------------
-- 20260803000900 forbids a slide that is empty in all of image / heading /
-- body, because such a slide renders as a blank full-screen panel the client
-- cannot see in order to delete it. That reasoning is unchanged — but there
-- are four fields now, and a slide carrying ONLY a portrait image is not
-- blank. It renders on every phone, and on desktop it renders too, because
-- the component falls back the other way.
--
-- Left as-is, that slide would be rejected by a constraint whose name means
-- nothing to the person typing into the admin. Dropped and recreated rather
-- than added alongside: two overlapping CHECKs on the same emptiness question
-- is how you end up with the stricter one silently winning.
alter table public.projects_page_hero_slides
  drop constraint if exists projects_page_hero_slides_not_empty_check;

alter table public.projects_page_hero_slides
  add constraint projects_page_hero_slides_not_empty_check
    check (
      coalesce(image, '') <> ''
      or coalesce(image_mobile, '') <> ''
      or heading <> ''
      or body <> ''
    );


-- ---------------------------------------------------------------------------
-- D. NO RLS, GRANT OR INDEX CHANGES
-- ---------------------------------------------------------------------------
-- Both columns inherit the policies already on their tables:
--   public.projects                    — 20260803000700
--   public.projects_page_hero_slides   — 20260803000900
-- "admin full access" for authenticated, public SELECT of published rows for
-- anon. That is exactly right for both: hero art is public content, and only
-- an admin may set it.
--
-- No index on either. Both are selected alongside the row they belong to and
-- are never filtered or sorted on — the same reasoning as hero_image.
--
-- No seed. The bundled portrait art would have to be a real second photograph,
-- and there is not one to point at; NULL is the correct starting state and it
-- is what the fallback is written for.
