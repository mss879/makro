-- ============================================================================
-- 20260803000800_email_list.sql
--
-- Admin menu item 7 — "Email List". Newsletter subscribers captured by the
-- footer signup form on the public site and managed from /admin/email-list.
--
-- Owns exactly one table: public.newsletter_subscribers. It is the smallest
-- file in the set and is kept separate purely so the one-file-per-menu-item
-- rule holds without exception — there is nothing to merge it into that would
-- not blur an ownership boundary.
--
-- Depends on: 20260803000100_foundation.sql
--   (the pgcrypto extension, for the gen_random_uuid() primary-key default)
--
-- No storage bucket, no seeds, no updated_at/touch trigger — a subscriber row
-- is write-once: the admin UI only ever inserts or deletes, never edits.
--
-- Idempotent: safe to re-run against a database where it has already been
-- applied.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

-- Three columns is the whole story. components/admin/SubscribersTable reads
-- id (row key + delete selection), email (search, copy-to-clipboard) and
-- created_at (sort + the `subscribed_at` column of the CSV export); nothing
-- else is ever selected, so nothing else is stored.
create table if not exists public.newsletter_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

-- The unique on email is load-bearing, not hygiene. Both write paths —
-- app/actions/newsletter.ts (anon, public form) and email-list/actions.ts
-- ::addSubscriber (admin) — treat SQLSTATE 23505 as SUCCESS and report
-- "already on the list". Drop the constraint and a re-signup stops raising,
-- silently creating a duplicate row that the UI then reports as a new
-- subscriber. Postgres names the column-level constraint
-- newsletter_subscribers_email_key, which is what any future error mapping
-- would key off.

-- Deliberately a plain unique on the raw column rather than unique(lower(email))
-- or citext: normalisation already happens upstream in the shared Zod pipeline
-- `z.string().trim().toLowerCase().pipe(z.email())`, so a functional index would
-- change nothing observable while making the constraint name — and therefore any
-- future error mapping — harder to reason about.

-- The list page is a single `order(created_at desc).limit(1000)`; this is the
-- index that keeps it a top-N scan once the list outgrows a page of memory.
create index if not exists newsletter_subscribers_created_at_idx
  on public.newsletter_subscribers (created_at desc);


-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

-- Written out in full rather than routed through a shared helper: a
-- SECURITY DEFINER function in schema public is reachable as a PostgREST RPC
-- by anon, so a helper that runs DDL hands unauthenticated callers privileged
-- DDL. Inlining also keeps this migration self-contained.
alter table public.newsletter_subscribers enable row level security;

drop policy if exists "admin full access" on public.newsletter_subscribers;
create policy "admin full access"
  on public.newsletter_subscribers for all to authenticated
  using (true) with check (true);

-- Required by the anon fallback in createPublicWriteSupabase(): a visitor using
-- the footer form has no session, so without this the public signup fails
-- whenever the service-role key is absent from the environment.
drop policy if exists "anon can subscribe" on public.newsletter_subscribers;
create policy "anon can subscribe"
  on public.newsletter_subscribers for insert to anon with check (true);

-- There is intentionally NO anon SELECT policy. Insert-only for anon means the
-- 23505 path above still works (the conflict is raised by the constraint, not
-- by a read), while the subscriber list itself — a plain-text mailing list —
-- stays reachable only through an authenticated admin session.


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
-- `authenticated` — it keeps full access on this table — and service_role has
-- BYPASSRLS, so it is unaffected either way.
--
-- This is the table where it matters most: the paragraph above is the whole
-- security argument for a plain-text mailing list, and it rests entirely on one
-- absent policy. INSERT is all the footer form needs.
revoke select, update, delete on public.newsletter_subscribers from anon;
