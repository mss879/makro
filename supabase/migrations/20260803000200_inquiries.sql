-- ============================================================================
-- 20260803000200_inquiries.sql
--
-- Admin menu item: 2. Inquiries
--
-- The public contact form's intake table. Every submission from the website
-- lands here first and stays here forever; the CRM works on copies (leads),
-- so archiving or transferring an inquiry never destroys the original record.
--
-- Depends on: 20260803000100_foundation.sql
--   (the pgcrypto extension, for the gen_random_uuid() primary-key default)
--
-- Idempotent: safe to re-run against a database where it has already applied.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.inquiries (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  email       text not null,
  -- phone / interest / project stay nullable: the contact form only requires
  -- name, email and message, and the admin table + drawer render a literal
  -- em dash for whatever is missing. Do not give these a '' default — the UI
  -- distinguishes "not supplied" from "supplied empty".
  phone       text,
  interest    text,
  project     text,
  message     text not null,
  -- Which form the submission came from. Displayed raw in InquiryDrawer and
  -- deliberately free text so per-project landing-page forms can write their
  -- own value later without a migration.
  source      text not null default 'contact',
  -- Consumed as the TS union InquiryStatus = "new" | "transferred" | "archived"
  -- and drives STATUS_TONE. The 'new' default is load-bearing: the dashboard
  -- StatCard counts rows with .eq("status", "new").
  status      text not null default 'new'
                constraint inquiries_status_check
                check (status in ('new', 'transferred', 'archived'))
);

-- No updated_at and no touch trigger: an inquiry is an immutable record of what
-- a visitor sent. `status` is the only column the admin panel ever changes, and
-- when it moved is tracked by the CRM lead the transfer creates, not here.

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- /admin/inquiries reads `order created_at desc limit 200` and the dashboard
-- takes the newest 5 off the same ordering.
create index if not exists inquiries_created_at_idx on public.inquiries (created_at desc);

-- Backs the `count(*) where status = 'new'` StatCard and the per-status counts
-- the inquiries filter chips show.
create index if not exists inquiries_status_idx on public.inquiries (status);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
-- With RLS on and no matching policy, every read is denied — so the admin
-- policy below is what lets components/admin/crm/LeadDrawer.tsx fetch a lead's
-- source inquiry straight from the browser: the browser Supabase client uses
-- the anon key but runs as role `authenticated` once an admin session exists.
alter table public.inquiries enable row level security;

drop policy if exists "admin full access" on public.inquiries;
create policy "admin full access"
  on public.inquiries for all to authenticated
  using (true) with check (true);

-- The public contact form is write-only. createPublicWriteSupabase() falls back
-- to the anon key when SUPABASE_SERVICE_ROLE_KEY is not set, so anon must be
-- able to insert. There is deliberately NO anon select policy — nobody should
-- be able to read other people's submissions back out.
drop policy if exists "anon can submit inquiries" on public.inquiries;
create policy "anon can submit inquiries"
  on public.inquiries for insert to anon with check (true);

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
-- `authenticated` — it keeps full access on every table — and service_role has
-- BYPASSRLS, so it is unaffected either way.
--
-- anon needs exactly one privilege here: INSERT, for the public contact form.
revoke select, update, delete on public.inquiries from anon;

-- ---------------------------------------------------------------------------
-- Cross-file contract
-- ---------------------------------------------------------------------------
-- `lead_id` is deliberately absent from this file: public.leads does not exist
-- yet, and no migration may forward-reference a higher-numbered file.
-- 20260803000300_crm.sql completes this table by adding
--   * column     inquiries.lead_id uuid
--   * constraint inquiries_lead_id_fkey -> public.leads (id) on delete set null
--   * trigger    inquiries_reopen_orphaned  (flips a transferred inquiry back to
--                'new' when its lead is deleted and lead_id is nulled out)
-- Nothing here may assume that column exists.
-- ---------------------------------------------------------------------------
