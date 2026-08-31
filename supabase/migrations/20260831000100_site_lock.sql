-- ============================================================================
-- 20260831000100_site_lock.sql
--
-- Admin menu item 9 — "Settings". The public site's on/off switch: when the
-- lock is on, every marketing page is replaced by a "Coming soon" gate, and
-- only visitors holding the access code get through.
--
-- Owns one table: public.site_lock_settings (singleton).
--
-- Depends on:
--   20260803000100_foundation.sql  (pgcrypto for gen_random_uuid,
--                                   touch_updated_at() for the trigger)
--
-- No storage bucket. Seeds one row so the gate has copy from the moment the
-- migration lands — the client turning the lock on for the first time must not
-- be shown a blank page they then have to write from scratch.
--
-- Idempotent: safe on a fresh database and safe to re-apply.
--
--
-- SECURITY MODEL — read this before adding a policy or a column
--
-- This table holds ONE secret (access_code) and one thing derived from it
-- (token_salt). Everything else on the row is marketing copy.
--
-- anon must never read either secret. That is not a soft preference: the anon
-- key is published in the browser bundle of every page on this site, so any
-- column anon can SELECT is a column the whole internet can SELECT. An
-- anon-readable access_code is an access code that unlocks nothing, and an
-- anon-readable token_salt lets anyone mint the unlock cookie without ever
-- knowing the code.
--
-- Hashing the code instead of storing it would NOT fix that. These are short,
-- human, shareable codes ("MAKRO2026") — a published hash of one falls to a
-- wordlist in seconds, and the client has to be able to read the code back off
-- the admin screen in order to give it to anybody.
--
-- So the split is enforced with COLUMN-LEVEL privileges, not just RLS:
--
--   * anon holds SELECT on the copy columns ONLY. The gate page reads them
--     with the ordinary anon client, naming each column explicitly (a bare
--     select * is a permission error for anon, by design — that is the point:
--     a future caller cannot accidentally widen the payload to include the
--     code, because the widened query simply fails).
--   * anon holds NO privilege at all on access_code / token_salt. The proxy
--     reads those with the SERVICE-ROLE key, server side, and they never reach
--     a browser.
--   * anon holds no INSERT/UPDATE/DELETE. Only an authenticated admin writes.
--
-- Two independent gates, same as everywhere else in this schema: the grant is
-- the floor, RLS is the door. Taking RLS off this table by accident would
-- still not hand anon the code.
--
-- CONSEQUENCE, and it is intentional: without SUPABASE_SERVICE_ROLE_KEY the
-- proxy cannot read the lock state, so THE LOCK IS NOT ENFORCED and the site
-- stays public. The lock fails OPEN, never closed. A marketing gate that can
-- take a live site down because an environment variable went missing is a
-- worse failure than one that occasionally forgets to hide an unlaunched page,
-- and /admin/settings says so on screen when the key is absent.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- A. SETTINGS (singleton)
-- ---------------------------------------------------------------------------
create table if not exists public.site_lock_settings (
  id uuid primary key default gen_random_uuid(),

  -- THE SWITCH. True means every public page is replaced by the gate.
  -- /admin is deliberately never gated — it is how the lock gets turned back
  -- off, and locking yourself out of the only control that undoes the lock is
  -- not a state this table is allowed to reach.
  enabled boolean not null default false,

  -- The shared code that gets a visitor past the gate. Free text so the client
  -- can use something sayable over the phone; compared case-insensitively and
  -- trimmed by the application, so 'Makro2026' and ' makro2026 ' are one code.
  --
  -- EMPTY STRING IS MEANINGFUL: it means there is no code, so nobody can let
  -- themselves in. The lock becomes absolute for the public, and the only way
  -- through is the "Preview the live site" button on /admin/settings, which is
  -- authenticated and mints the cookie directly.
  --
  -- The 4-character floor keeps a one-keystroke code — trivially brute-forced
  -- against a public endpoint — from being set by accident. '' is exempt
  -- because it is the deliberate no-code state, not a weak code.
  access_code text not null default ''
    constraint site_lock_settings_access_code_length
    check (access_code = '' or char_length(access_code) between 4 and 64),

  -- Mixed into the unlock cookie's hash so the cookie cannot be derived from
  -- the code alone by anyone who happens to guess it, and — more usefully —
  -- so access can be REVOKED without changing the code the client has already
  -- printed on something. Rotating this value invalidates every unlock cookie
  -- in existence on the next request; the admin screen exposes that as
  -- "Sign everyone out".
  --
  -- Never leaves the server. See the security model above.
  token_salt uuid not null default gen_random_uuid(),

  -- ----- Gate copy -----
  -- Seeded with real sentences rather than left empty: the first time the
  -- client flips the switch, whatever is in these columns is instantly the
  -- entire public face of the company. A blank page is not an acceptable
  -- default for that.
  eyebrow  text not null default 'Makro Developers',
  heading  text not null default 'Coming soon.',
  body     text not null default '',

  -- The small line above the access-code field. Empty hides the whole unlock
  -- affordance, which is how the client shows a gate that nobody — not even a
  -- code holder — is invited to try to open.
  note     text not null default '',

  -- Whether the gate prints the contact email and phone. The values themselves
  -- come from lib/site.ts, which is already the single source for them
  -- everywhere else on the site; duplicating them into this table would create
  -- a second copy to forget to update.
  show_contact boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A unique index on a constant expression admits exactly one row, ever — the
-- same singleton trick selected_work_settings and projects_page_settings use.
-- It is what lets every caller read this with `.maybeSingle()` and never
-- defend against a second row appearing behind its back, which for THIS table
-- would mean two disagreeing answers to "is the site locked".
create unique index if not exists site_lock_settings_singleton_idx
  on public.site_lock_settings ((true));

drop trigger if exists site_lock_settings_touch_updated_at on public.site_lock_settings;
create trigger site_lock_settings_touch_updated_at
  before update on public.site_lock_settings
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------------------
-- B. RLS
-- ---------------------------------------------------------------------------
-- Any signed-in Supabase user is a full admin: admin users are created by hand
-- in the dashboard, there is no public sign-up and no role table.
alter table public.site_lock_settings enable row level security;

drop policy if exists "admin full access" on public.site_lock_settings;
create policy "admin full access"
  on public.site_lock_settings for all to authenticated
  using (true) with check (true);

-- The predicate is `using (true)`, NOT `using (enabled)`, for the same reason
-- selected_work_settings' is: the gate page has to be able to read a row that
-- says enabled = false in order to know it should send the visitor back to the
-- real site. `using (enabled)` would return zero rows exactly when the site is
-- unlocked, which is indistinguishable from "never configured".
--
-- What keeps this policy safe is NOT the predicate, it is the column grant
-- below: this policy exposes only the columns anon has been granted, and anon
-- has not been granted the two secret ones.
drop policy if exists "anon reads site lock copy" on public.site_lock_settings;
create policy "anon reads site lock copy"
  on public.site_lock_settings for select to anon using (true);


-- ---------------------------------------------------------------------------
-- C. GRANTS — the column split that makes the code a secret
-- ---------------------------------------------------------------------------
-- Supabase's base image ships
--   alter default privileges ... grant all on tables to anon
-- so at this point anon holds SELECT on EVERY column of this table, including
-- access_code and token_salt. The revoke below is therefore load-bearing, not
-- decorative — without it the RLS policy above publishes the access code.
--
-- Order matters: revoke the table-wide SELECT first, then grant back the
-- narrow column list. Postgres tracks table-level and column-level privileges
-- separately, and a table-level SELECT would satisfy any column read on its
-- own, making the column grant meaningless.
--
-- `id` is granted because the gate page keys its React state on it and it is
-- not a credential — it is not the salt, and the salt is what the cookie hash
-- is built from.
revoke select, insert, update, delete on public.site_lock_settings from anon;

grant select (
  id,
  enabled,
  eyebrow,
  heading,
  body,
  note,
  show_contact,
  updated_at
) on public.site_lock_settings to anon;

-- Nothing is revoked from `authenticated` — the admin screen edits every
-- column, including the code it has to display. service_role has BYPASSRLS and
-- is unaffected either way; it is the role the proxy reads the secrets with.


-- ---------------------------------------------------------------------------
-- D. SEED
-- ---------------------------------------------------------------------------
-- enabled = FALSE. Applying a migration must never take a live site down, and
-- this one runs against a site that is already published. The switch is the
-- client's to throw, from /admin/settings, when they decide to.
--
-- No access_code is seeded either: a code shipped in a migration file is a code
-- in the repository, which is not a code. The admin screen asks for one the
-- first time the lock is turned on.
insert into public.site_lock_settings (
  enabled, eyebrow, heading, body, note, show_contact)
select
  false,
  'Makro Developers',
  'Something considered is on its way.',
  'Our new website is being finished with the same care we bring to everything we build. It will be here shortly. In the meantime, we are still very much open — get in touch and we will be glad to talk.',
  'Have an access code?',
  true
 where not exists (select 1 from public.site_lock_settings);
