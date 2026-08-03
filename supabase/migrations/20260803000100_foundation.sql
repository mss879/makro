-- ============================================================================
-- 20260803000100_foundation.sql
--
-- Admin menu item: (none) — shared infrastructure behind all seven of them.
-- Depends on: nothing. This is the first file that runs.
--
-- Owns no tables, no policies, no storage buckets and no seeds. All this file
-- provides is the pgcrypto extension and two small pure helper functions.
--
-- Why there is no shared "grant admin access" / "create public bucket" helper:
-- a helper that runs DDL on a caller-supplied table or bucket has to be
-- security definer, and every function in schema public is published by
-- PostgREST as an RPC endpoint. Supabase's base image runs
--   alter default privileges ... grant all on functions
--     to postgres, anon, authenticated, service_role
-- so a new public function is executable by anon the moment it is created, and
-- `revoke all on function ... from public` does not undo that — it only strips
-- the PUBLIC pseudo-role entry, leaving the four explicit grants in place. An
-- unauthenticated caller holding nothing but the anon key could therefore
-- invoke such a helper and have it drop and recreate arbitrary storage
-- policies or create new public buckets.
--
-- So each menu-item migration declares its own RLS policies and storage
-- buckets inline instead. The repetition is deliberate: it is a handful of
-- lines per file, it keeps privileged DDL out of any anon-reachable surface,
-- and it makes each menu-item file self-contained and auditable on its own.
--
-- The two functions below stay shared because they are pure — no DDL, no
-- elevated rights, nothing an anon caller gains anything from — and because a
-- single definition is what keeps re-running one menu file from redefining
-- them out from under the other six.
--
-- Idempotent: safe on an empty database and safe to re-run at any time.
-- ============================================================================

-- gen_random_uuid() is the primary-key default on every table except
-- page_views, so the extension has to exist before any of them are created.
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Shared helper: keep updated_at honest
--
-- App code never sets updated_at itself (see the comment in
-- app/admin/(panel)/actions.ts) — a client that forgets, or lies, would make
-- the "last edited" column in the admin panel meaningless. The trigger is the
-- single writer.
--
-- Runs as the invoking role (the default); it touches one column on the row
-- the caller is already writing and needs no rights beyond theirs. The empty
-- search_path means the body can only reach pg_catalog, so no schema the
-- caller controls can shadow now().
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Shared helper: jsonb array assertion for CHECK constraints
--
-- Structured content (project description/specs/features, blog
-- keywords/sections/related) is stored as a jsonb array and read back with
-- array accessors. A scalar or object slipped into one of those columns breaks
-- the page at render time, not at write time, so the shape is pinned in the
-- database. Immutable + sql, which is what makes it legal inside a CHECK.
--
-- Empty search_path for the same reason as above: jsonb_typeof() must always
-- resolve to the pg_catalog builtin, never to something a caller planted.
-- ---------------------------------------------------------------------------
create or replace function public.assert_jsonb_array(v jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(v) = 'array'
$$;


-- ---------------------------------------------------------------------------
-- Schema-wide: take TRUNCATE away from anon and authenticated
--
-- TRUNCATE is the one DML verb that bypasses BOTH row triggers and RLS, so
-- every invariant in this schema is only as strong as this revoke.
--
--   * It fires only TRUNCATE-level statement triggers. There are none anywhere
--     in these eight files, so every BEFORE INSERT/UPDATE/DELETE row trigger —
--     guard_locked_stage, guard_default_pipeline, guard_default_pipeline_flag,
--     guard_pipeline_has_leads, guard_stage_has_leads, guard_stage_reparent,
--     reopen_orphaned_inquiry, every touch_updated_at — is simply not run.
--   * RLS does not apply to TRUNCATE at all. A `for all to authenticated
--     using (true)` policy is not what is granting this, and tightening the
--     policies would not take it away.
--
-- Supabase's base image runs
--   alter default privileges for role postgres in schema public
--     grant all on tables to postgres, anon, authenticated, service_role
-- and ALL includes TRUNCATE. The per-file revokes in the menu-item migrations
-- close this for `anon` on the tables they own, but every one of them leaves
-- `authenticated` — the role the ENTIRE admin surface runs as — holding it. A
-- single `truncate public.pipelines cascade` from an ordinary authenticated
-- PostgREST session took out the default pipeline, its locked intake stage and
-- every lead in the CRM, with all three invariants refusing nothing.
--
-- Two statements, because they cover two different sets of tables:
--   * the plain REVOKE fixes tables that already exist. On a fresh database
--     that is none (this file runs first and creates no tables); on a re-run
--     against a live database it is all of them, which is what makes the fix
--     self-healing rather than only correct for new deployments.
--   * ALTER DEFAULT PRIVILEGES is the load-bearing half: it rewrites the
--     default ACL so tables created by the LATER migrations (000200-000800)
--     never acquire TRUNCATE in the first place. Without it, ordering would
--     defeat the plain revoke entirely.
--
-- Deliberately NOT revoked from service_role (BYPASSRLS, trusted server-side
-- paths that are expected to be able to do this) or from postgres (the
-- migration role itself; taking it away would break its own DDL).
--
-- Idempotent: revoking a privilege that is already absent is a no-op, and the
-- ALTER simply restates the same default ACL.
-- ---------------------------------------------------------------------------

revoke truncate on all tables in schema public from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke truncate on tables from anon, authenticated;
