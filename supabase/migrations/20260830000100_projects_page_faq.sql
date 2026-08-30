-- ============================================================================
-- 20260830000100_projects_page_faq.sql
--
-- Admin menu item 6 — "Projects", fourth tab: FAQ.
--
-- The question-and-answer block at the bottom of /projects was hard-coded:
-- components/projects/Faq.tsx read HOME_FAQS out of lib/faqs.ts, and its
-- eyebrow, heading, standfirst and two links were literals in the JSX. Every
-- other section of that page has been editable since 20260803000900; this one
-- was the last thing on it that needed a deploy to change a word of. Client
-- direction, 2026-08-30: all of it editable, headings included.
--
-- Two changes:
--   public.projects_page_settings      — eight new faq_* columns (the section's
--                                        switch, its copy, and its two links).
--   public.projects_page_faq_items     — new table: one row per question,
--                                        reorderable and independently
--                                        publishable.
--
-- WHY THE COPY GOES ON THE EXISTING SETTINGS SINGLETON
-- Same reasoning as the hero, intro and carousel columns already there: the
-- admin edits these as tabs of one screen and the public page reads the lot
-- with a single `.select("*").maybeSingle()`. A fourth singleton table would be
-- a fourth round trip on every render of /projects to hold eight strings.
--
-- WHY THE ITEMS GET THEIR OWN TABLE AND NOT A jsonb COLUMN
-- intro_body is jsonb because it is a handful of paragraphs edited as one
-- textarea. A FAQ is a list the client adds to, reorders and retires entries
-- from one at a time, and each entry has two fields and a published flag. That
-- is a table — the same shape as projects_page_hero_slides, and it inherits
-- that table's sort_order + created_at ordering contract for the same reason.
--
-- DELIBERATELY NOT SHARED WITH lib/faqs.ts OR /faq. FAQ_GROUPS still backs the
-- /faq page and its FAQPage structured data, which is canonical and must stay
-- one source of truth for the schema. This block is the projects page's own
-- short list, which is why it was HOME_FAQS and not FAQ_GROUPS to begin with.
-- Merging them would put the same questions in two schema graphs.
--
-- Depends on: 20260803000100_foundation.sql  — public.touch_updated_at()
-- Depends on: 20260803000900_projects_page.sql — public.projects_page_settings
--
-- Idempotent: safe to re-apply. Creates nothing twice, seeds nothing twice.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- A. SETTINGS COLUMNS
-- ---------------------------------------------------------------------------
-- Defaults are the exact strings the component renders today, so applying this
-- migration changes nothing visible: the page keeps saying what it said, and
-- the admin opens on the live copy rather than on empty fields.
--
-- The two links are stored as label + href pairs rather than as booleans over
-- hard-coded destinations. The client asked for "everything" editable, and a
-- label they can change pointing at a route they cannot is the kind of half
-- measure that produces a support request six weeks later.
alter table public.projects_page_settings
  add column if not exists faq_enabled boolean not null default true;

alter table public.projects_page_settings
  add column if not exists faq_eyebrow text not null default 'Questions';

alter table public.projects_page_settings
  add column if not exists faq_heading text not null default 'Things people often ask.';

alter table public.projects_page_settings
  add column if not exists faq_body text not null
    default 'Can''t find what you''re looking for? Ask us directly, or browse the full FAQ.';

alter table public.projects_page_settings
  add column if not exists faq_primary_label text not null default 'Ask us directly';

alter table public.projects_page_settings
  add column if not exists faq_primary_href text not null default '/contact';

alter table public.projects_page_settings
  add column if not exists faq_secondary_label text not null default 'View all questions';

alter table public.projects_page_settings
  add column if not exists faq_secondary_href text not null default '/faq';


-- ---------------------------------------------------------------------------
-- B. FAQ ITEMS
-- ---------------------------------------------------------------------------
-- A question with no text is unrenderable — the accordion's trigger would be an
-- empty button the admin cannot see to delete, the same failure the hero slides
-- table guards against. An empty ANSWER is allowed: writing the question first
-- and the answer later is a normal way to work, and an open row with nothing
-- under it is visibly unfinished rather than invisible.
create table if not exists public.projects_page_faq_items (
  id          uuid primary key default gen_random_uuid(),
  question    text not null default '',
  answer      text not null default '',
  published   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint projects_page_faq_items_question_check check (question <> '')
);

-- Same composite as the hero slides: created_at is the tiebreaker so two
-- entries sharing a sort_order cannot swap places between requests and reorder
-- the accordion at random.
create index if not exists projects_page_faq_items_order_idx
  on public.projects_page_faq_items (published, sort_order, created_at);

drop trigger if exists projects_page_faq_items_touch_updated_at on public.projects_page_faq_items;
create trigger projects_page_faq_items_touch_updated_at
  before update on public.projects_page_faq_items
  for each row execute function public.touch_updated_at();

-- No uniqueness on sort_order, for the reason given in 20260803000900: the
-- order is presentational, the created_at tiebreaker resolves a tie, and a
-- unique constraint would force every reorder into one batched request.


-- ---------------------------------------------------------------------------
-- C. RLS
-- ---------------------------------------------------------------------------
-- projects_page_settings already has its policies from 20260803000900 and they
-- are column-agnostic, so the new columns are covered with no change here.
alter table public.projects_page_faq_items enable row level security;

drop policy if exists "admin full access" on public.projects_page_faq_items;
create policy "admin full access"
  on public.projects_page_faq_items for all to authenticated
  using (true) with check (true);

drop policy if exists "anon reads published faq items" on public.projects_page_faq_items;
create policy "anon reads published faq items"
  on public.projects_page_faq_items for select to anon using (published);

-- Defence in depth, matching the sibling tables: Supabase's base image grants
-- anon full DML on every new table in public, so stripping what anon does not
-- need means a future `disable row level security` degrades to "permission
-- denied" rather than public write access to the FAQ.
revoke insert, update, delete on public.projects_page_faq_items from anon;


-- ---------------------------------------------------------------------------
-- D. SEED
-- ---------------------------------------------------------------------------
-- The six questions the section renders today, lifted verbatim from HOME_FAQS
-- in lib/faqs.ts, so /projects is identical the moment this lands and before
-- anyone opens the admin.
--
-- Guarded on "the table is empty" rather than per-question: an admin who has
-- curated this list down to their own entries must not have these six silently
-- reinstated when the migration is re-applied.
insert into public.projects_page_faq_items (question, answer, published, sort_order)
select * from (values
  (
    'Where does Makro Developers build?',
    $a$Makro Developers is committed exclusively to Sri Lanka, with our current flagship development, Makro Heights, located on Rohini Place in Dehiwala — moments from Colombo.$a$,
    true, 0
  ),
  (
    'Is Makro part of a larger group?',
    $a$Yes. Makro Developers is a wholly owned subsidiary of the Wheels Lanka Group, giving every development financial strength, governance and long-term stability.$a$,
    true, 1
  ),
  (
    'Can I invest in a Makro development?',
    $a$Yes. Beyond owner-occupiers, our developments attract investors seeking long-term rental demand and capital appreciation — our sales team can advise on investment-focused unit types.$a$,
    true, 2
  ),
  (
    'How do I enquire about a specific project?',
    $a$Use our contact form and select the project you're interested in, including Makro Heights, and our team will follow up with detailed information and availability.$a$,
    true, 3
  ),
  (
    'What makes a Makro home different?',
    $a$Every Makro home is measured against The Standard Above — the same discipline in planning, engineering and construction, regardless of budget or market segment.$a$,
    true, 4
  ),
  (
    'Do you provide support after handover?',
    $a$Yes. Our responsibility doesn't end at handover — it's when a long-term relationship begins, backed by structured after-sales support.$a$,
    true, 5
  )
) as seed (question, answer, published, sort_order)
where not exists (select 1 from public.projects_page_faq_items);
