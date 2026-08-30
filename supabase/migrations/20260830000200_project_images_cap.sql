-- ============================================================================
-- 20260830000200_project_images_cap.sql
--
-- Raise the per-project gallery cap from 5 images to 8 (client, 2026-08-30).
--
-- The cap is enforced in THREE places and all three have to move together, or
-- the admin offers a slot the database refuses:
--
--   1. lib/supabase/config.ts   MAX_PROJECT_IMAGES — what the UI counts against
--   2. project_images_position_check — bounds `position`
--   3. guard_project_image_cap() — bounds the row COUNT, on insert
--
-- (1) is in the application commit alongside this file. (2) and (3) are here.
--
-- WHY BOTH (2) AND (3). The row-count trigger is the actual cap; the position
-- CHECK exists so a REORDER cannot park an image at an index the gallery never
-- renders. Raising only the trigger would let a ninth... eighth image insert
-- and then fail to be positioned; raising only the CHECK would leave the cap
-- at five with three unusable indexes above it. They are one rule expressed
-- twice, deliberately, and they move as a pair.
--
-- Nothing about the widening is destructive: every existing row has
-- position < 5, which is still < 8, so the re-added CHECK validates against
-- the current table without a rewrite and no gallery changes shape.
--
-- Depends on: 20260803000700_projects.sql
--   public.project_images, public.guard_project_image_cap()
--
-- Idempotent: safe to re-apply. Both statements are drop-then-create.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- A. POSITION BOUND
-- ---------------------------------------------------------------------------
-- `add constraint` has no `if not exists`, so this is a drop-then-add rather
-- than a guarded add — which also makes re-applying after a FUTURE change to
-- the number do the right thing instead of silently keeping the old bound.
--
-- The deferrable UNIQUE (project_id, position) from the original migration is
-- untouched: it is about collisions during a reorder, not about how many
-- images there are.
alter table public.project_images
  drop constraint if exists project_images_position_check;

alter table public.project_images
  add constraint project_images_position_check
  check (position >= 0 and position < 8);


-- ---------------------------------------------------------------------------
-- B. ROW-COUNT CAP
-- ---------------------------------------------------------------------------
-- app/api/admin/upload/route.ts pre-checks the same cap with a
-- `count: 'exact', head: true` query and returns a clean 409, so a user
-- normally never sees this exception — the trigger is the backstop for every
-- other write path (a second tab, a direct PostgREST call, a future action
-- that forgets the pre-check).
--
-- The message no longer has to carry an exact number for the app's benefit.
-- actions.ts used to do error.message.includes("at most 5 images"), which
-- would have quietly stopped matching the moment this line changed and handed
-- the admin a raw Postgres exception; it now matches /at most \d+ images/ and
-- prints its own copy from MAX_PROJECT_IMAGES. Keep the phrase in that shape.
--
-- The trigger itself is not re-created: `create or replace function` swaps the
-- body under the existing `project_images_cap` trigger, which references the
-- function by name.
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

  if image_count >= 8 then
    raise exception 'A project can have at most 8 images.';
  end if;

  return new;
end;
$$;
