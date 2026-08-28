-- ============================================================================
-- 20260828000400_project_status_values.sql
--
-- Admin menu item 6 — "Projects". Replaces the four project statuses with the
-- three the client actually uses (Aug 2026):
--
--     Completed          ->  Delivered
--     Now Selling        ->  On-going
--     Under Construction ->  On-going
--     In Planning        ->  Upcoming
--
-- Depends on: 20260803000700_projects.sql (the projects table and its CHECK)
--
--
-- ORDER MATTERS HERE, AND IT IS THE WHOLE MIGRATION
--
-- The rows must be rewritten BEFORE the new constraint goes on, and the old
-- constraint must come off BEFORE the rows are rewritten. Any other order
-- fails: a live row saying 'Completed' violates a CHECK that only allows the
-- new three, and a row updated to 'Delivered' violates the old CHECK that only
-- allows the old four. So: drop, migrate, re-add.
--
-- The UPDATE is written as an explicit CASE over the four historical values
-- rather than a catch-all, so a value that is somehow neither — a row written
-- by hand, or by a future migration applied out of order — is left untouched
-- and makes the ADD CONSTRAINT fail loudly instead of being silently coerced
-- into a status nobody chose.
--
-- Two statuses collapse into On-going. That is deliberate and lossy: the client
-- does not distinguish between a tower being built and one being sold from, and
-- the public index already grouped them together. Nothing else in the schema
-- reads status, so nothing else needs backfilling.
--
-- Idempotent: safe to re-run. The UPDATE matches nothing on a second pass
-- (every row is already a new value) and the constraint is dropped-then-added.
-- ============================================================================

alter table public.projects
  drop constraint if exists projects_status_check;

update public.projects
   set status = case status
                  when 'Completed'          then 'Delivered'
                  when 'Now Selling'        then 'On-going'
                  when 'Under Construction' then 'On-going'
                  when 'In Planning'        then 'Upcoming'
                  else status
                end
 where status in ('Completed', 'Now Selling', 'Under Construction', 'In Planning');

alter table public.projects
  add constraint projects_status_check
  check (status in ('Upcoming', 'On-going', 'Delivered'));

comment on column public.projects.status is
  'Lifecycle stage: Upcoming, On-going or Delivered. The public index groups '
  'Upcoming and On-going together as "In Progress" — see STATUS_GROUP in '
  'lib/projects.ts.';
