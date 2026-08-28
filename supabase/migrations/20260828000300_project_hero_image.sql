-- ============================================================================
-- 20260828000300_project_hero_image.sql
--
-- Admin menu item 6 — "Projects". Gives each project a hero image that is
-- independent of its gallery (client direction, Aug 2026: "separate the image
-- for the hero of that project and the gallery, it's better that way").
--
-- Owns exactly one new column: public.projects.hero_image.
--
-- Depends on: 20260803000700_projects.sql (the projects table itself)
--
--
-- WHY A COLUMN AND NOT A project_images ROW
--
-- Until now the hero, the home-page card and the index card all read
-- `projects.cover`, which is maintained as "whatever is first in the gallery".
-- One image doing three jobs is why the client asked for the split: the shot
-- that works full-bleed behind a headline is rarely the shot you want as a
-- 16:10 card, and reordering the gallery silently changed both.
--
-- hero_image is therefore a plain nullable column rather than another row in
-- project_images. It is a SINGLE value with no ordering and no cap, it must not
-- be swept up by the five-image gallery limit, and it must not move when the
-- gallery is reordered. Modelling it as a gallery row with a magic position
-- would reintroduce exactly the coupling this removes.
--
-- `cover` keeps its existing meaning and its existing job (cards and thumbnails)
-- and is still driven by the gallery. Nothing that reads `cover` changes.
--
-- NULL means "fall back to cover, then to the first gallery image", which is
-- what every project has today — so this migration is a no-op for existing
-- content and nothing needs backfilling.
--
-- Storage: reuses the existing `project-images` bucket created by
-- 20260803000700_projects.sql. No new bucket, no new policies — the upload
-- route already writes there under the `projects/<slug>/` prefix.
--
-- Idempotent: safe to re-run against a database where it has already been
-- applied.
-- ============================================================================

alter table public.projects
  add column if not exists hero_image text;

comment on column public.projects.hero_image is
  'Full-bleed hero art for the project detail page. Independent of the gallery '
  'and of `cover` (which drives cards). NULL falls back to cover, then to the '
  'first gallery image.';

-- No index: hero_image is only ever selected alongside the row it belongs to,
-- never filtered or sorted on.

-- No RLS or grant changes. The column inherits the policies already on
-- public.projects from 20260803000700_projects.sql — "admin full access" for
-- authenticated, public SELECT of published rows for anon — which is exactly
-- right: the hero is public content, and only an admin may set it.
