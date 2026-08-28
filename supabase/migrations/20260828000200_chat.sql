-- ============================================================================
-- 20260828000200_chat.sql
--
-- Admin menu item 8 — "Chat". The site's AI sales agent: every conversation a
-- visitor has with the widget, the per-conversation switch that hands the
-- conversation over to a human, and the link to the CRM lead the agent
-- captured.
--
-- Owns two tables: public.chat_sessions and public.chat_messages.
--
-- Depends on:
--   20260803000100_foundation.sql  (pgcrypto for gen_random_uuid, and
--                                   touch_updated_at() for chat_sessions)
--   20260803000300_crm.sql         (public.leads — chat_sessions.lead_id
--                                   references it)
--
-- No storage bucket, no seeds.
--
-- Idempotent: safe to re-run against a database where it has already been
-- applied.
--
--
-- SECURITY MODEL — read this before adding a policy
--
-- anon gets NOTHING on either table. Not insert, not select.
--
-- That is a deliberate departure from inquiries / newsletter_subscribers,
-- which do grant anon INSERT so the public forms keep working when the
-- service-role key is absent. A chat transcript is different from a form
-- submission in one decisive way: the widget has to READ ITS OWN MESSAGES BACK
-- (that is how a human's reply reaches the visitor once the AI is switched
-- off). Any anon SELECT policy broad enough to serve that is also broad enough
-- to hand anyone holding the publishable anon key every conversation every
-- visitor has ever had — including the names and phone numbers the agent
-- collects.
--
-- So the widget never touches PostgREST. It talks to /api/chat and
-- /api/chat/poll, which run server-side on the service-role client and scope
-- every query to one session. Authorisation is the (id, token) pair in
-- chat_sessions: the id is public (it appears in admin URLs), the token is the
-- bearer secret held only by that visitor's browser. The route requires both.
--
-- Consequence, and it is intentional: without SUPABASE_SERVICE_ROLE_KEY the
-- chat does not degrade to a less private mode — it turns off. The widget is
-- not rendered and the API returns 503. See lib/chat/config.ts.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- Sessions
-- ---------------------------------------------------------------------------

create table if not exists public.chat_sessions (
  id              uuid primary key default gen_random_uuid(),

  -- The visitor's bearer secret for this conversation, minted here rather than
  -- by the application so it never exists outside the database until the row
  -- is returned. Separate from the primary key on purpose: the id is shown in
  -- the admin panel and lives in its URLs, so it must not also be the
  -- credential that authorises reading the transcript.
  token           uuid not null default gen_random_uuid(),

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Denormalised from chat_messages so the admin list can sort by recency and
  -- show a "last active" column without an aggregate over every message. Set
  -- by the API on each write.
  last_message_at timestamptz not null default now(),

  -- THE AI OFF SWITCH. Per conversation, not global: the client wants to drop
  -- into one chat while the agent keeps handling the rest. When false,
  -- /api/chat stops calling the model entirely and the visitor's messages just
  -- queue for a human, who answers from /admin/chat as role 'agent'.
  ai_enabled      boolean not null default true,

  -- Same salted hash the page_views table stores. Enough to tell two
  -- conversations apart in the admin list without holding a raw IP.
  visitor         text,

  -- Where the conversation started, e.g. '/projects/makro-heights'. The single
  -- most useful piece of context when reading a transcript cold.
  started_path    text,

  -- Captured by the agent's captureLead tool. Mirrored onto the session (as
  -- well as onto the lead) so the admin list can show who it is talking to
  -- without joining through to the CRM on every row.
  name            text,
  phone           text,
  email           text,

  -- The CRM lead this conversation produced, once it has produced one.
  -- ON DELETE SET NULL, never CASCADE: deleting a lead from the pipeline must
  -- not silently destroy the conversation that generated it.
  lead_id         uuid references public.leads (id) on delete set null
);

-- The admin list is `order(last_message_at desc).limit(...)` — this keeps it a
-- top-N scan rather than a sort of the whole table.
create index if not exists chat_sessions_last_message_at_idx
  on public.chat_sessions (last_message_at desc);

-- Every authorised read of a session is by (id, token). The primary key alone
-- would serve, but including the token keeps the check an index-only lookup.
create index if not exists chat_sessions_id_token_idx
  on public.chat_sessions (id, token);

drop trigger if exists chat_sessions_touch on public.chat_sessions;
create trigger chat_sessions_touch
  before update on public.chat_sessions
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------------------
-- Messages
-- ---------------------------------------------------------------------------

create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),

  -- CASCADE here is right where it was wrong on lead_id above: a message has
  -- no meaning without its conversation, so deleting a session must take its
  -- transcript with it.
  session_id uuid not null references public.chat_sessions (id) on delete cascade,

  -- Three roles, not two. 'assistant' is the AI; 'agent' is a human admin who
  -- has taken the conversation over. They are stored distinctly because the
  -- transcript has to show which one answered — and because the model's
  -- message history maps 'agent' onto an assistant turn when the AI is
  -- switched back on, so it can read what the human already said.
  role       text not null check (role in ('user', 'assistant', 'agent')),

  content    text not null check (length(content) between 1 and 8000),
  created_at timestamptz not null default now()
);

-- Both hot paths — rendering a transcript, and polling for messages after a
-- known timestamp — are (session_id, created_at asc).
create index if not exists chat_messages_session_created_idx
  on public.chat_messages (session_id, created_at asc);


-- ---------------------------------------------------------------------------
-- Row level security
--
-- Written out in full rather than routed through a shared helper: a
-- SECURITY DEFINER function in schema public is reachable as a PostgREST RPC
-- by anon, so a helper that runs DDL hands unauthenticated callers privileged
-- DDL. Inlining also keeps this migration self-contained.
-- ---------------------------------------------------------------------------

alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "admin full access" on public.chat_sessions;
create policy "admin full access"
  on public.chat_sessions for all to authenticated
  using (true) with check (true);

drop policy if exists "admin full access" on public.chat_messages;
create policy "admin full access"
  on public.chat_messages for all to authenticated
  using (true) with check (true);

-- There is intentionally NO anon policy of any kind on either table. See the
-- security model at the top of this file. If a future change appears to need
-- one, the answer is a server route on the service-role client, not a policy.


-- ---------------------------------------------------------------------------
-- Explicit anon revokes — defence in depth
--
-- Supabase's base image ships
--   alter default privileges ... grant all on tables to anon
-- so anon holds SELECT/INSERT/UPDATE/DELETE on every new table in public the
-- moment it is created, and RLS is the ONLY thing standing between the anon
-- key and the data. Stripping the privileges anon does not need means a future
-- `alter table ... disable row level security`, or a policy written without a
-- role restriction, degrades to "permission denied" instead of full read/write.
--
-- These two tables hold the names and phone numbers of people who have not yet
-- become customers, alongside the free text of what they said. Everything is
-- revoked, because anon needs none of it.
-- ---------------------------------------------------------------------------
revoke select, insert, update, delete on public.chat_sessions from anon;
revoke select, insert, update, delete on public.chat_messages from anon;
