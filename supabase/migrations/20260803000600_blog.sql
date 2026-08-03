-- ============================================================================
-- 20260803000600_blog.sql
--
-- Admin menu item 5 — Blogs.
-- WILL back the public /insights index, the /insights/[slug] article pages and
-- the admin CRUD that maintains them, and WILL replace lib/insights.ts as the
-- source of truth — once the data layer lands. That has NOT happened yet:
-- app/(site)/insights/page.tsx, app/(site)/insights/[slug]/page.tsx,
-- app/sitemap.ts and components/home/BlogPreview.tsx all still import INSIGHTS
-- from lib/insights.ts, there is no lib/blog-data.ts for them to read instead,
-- and there is no /admin/blog route. lib/insights.ts is the live source of
-- truth today; this file provisions the schema that will supersede it. The four
-- articles that shipped in that array are seeded verbatim at the bottom of this
-- file so the public pages render identically after the cut.
--
-- Owns:       public.blog_posts, storage bucket 'blog-images'.
-- Depends on: 20260803000100_foundation.sql — public.touch_updated_at(),
--             public.assert_jsonb_array().
--
-- Idempotent: safe to re-run. Every object is guarded and each seeded article
-- is inserted only when its slug is absent.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- blog_posts — one row per /insights article
--
-- The column set is a one-to-one mapping of the old `Insight` interface, plus
-- `published` and `sort_order`, which the hard-coded array had no need for.
-- ---------------------------------------------------------------------------
create table if not exists public.blog_posts (
  id               uuid primary key default gen_random_uuid(),

  -- Unique so a duplicate slug surfaces as SQLSTATE 23505 and the admin form
  -- can turn it into friendly copy, exactly as projects.slug does. These slugs
  -- are also referenced from outside the table — app/(site)/projects/[slug]
  -- and app/(site)/projects both hard-code article slugs in their sidebars —
  -- so a renamed slug silently breaks a cross-link rather than 404ing loudly.
  slug             text not null unique,

  title            text not null default '',
  -- Short hero/card heading; the brand copy rule keeps it far shorter than the
  -- keyword-bearing `title`, which is what search engines read.
  display_title    text not null default '',

  -- Mirrors the TS union exactly. The value is rendered as the card eyebrow and
  -- as JSON-LD `articleSection`, so adding a value here means touching the UI.
  category         text not null default 'Guides'
                     constraint blog_posts_category_check
                     check (category in ('Buying', 'Investing', 'Commercial', 'Guides')),

  -- `date`, not `timestamptz`: articleSchema feeds this value to both
  -- datePublished and dateModified, and the page prints it as "15 June 2026".
  -- A timestamptz would drag a timezone offset into that rendered date.
  published_on     date not null default current_date,
  read_time        text not null default '',

  -- One text column carrying all three shapes lib/images.ts::unsplash() accepts:
  -- a bare Unsplash id, a local /brand/*.jpg path, or a full Storage public URL.
  -- Three seeds are bare ids, one is a brand asset, uploads are URLs. Never a
  -- bare storage key — unsplash() would treat it as an Unsplash id.
  cover            text not null default '',

  excerpt          text not null default '',
  meta_description text not null default '',
  keywords         jsonb not null default '[]'::jsonb
                     constraint blog_posts_keywords_check
                     check (public.assert_jsonb_array(keywords)),

  intro            text not null default '',

  -- [{ heading, paras[], points? }] — jsonb rather than child tables because the
  -- whole list is written atomically by one admin form (the getAll() rebuild
  -- pattern already used for projects.description/specs/features) and read in
  -- order by one renderer. Nothing filters, joins or aggregates on a section, so
  -- modelling it relationally would cost three tables to serve one form field.
  --
  -- `points` is deliberately SPARSE — it exists on some sections and not others,
  -- because the renderer guards on `section.points && <ul>`. Do not normalise a
  -- missing points key to [], or every section grows an empty bullet list.
  --
  -- Two invariants the admin form must enforce, unenforceable here because they
  -- live inside the jsonb: `heading` is the React key within an article, so
  -- headings must be unique per post; each `points[]` entry is a React key, so
  -- points must be unique within a section.
  sections         jsonb not null default '[]'::jsonb
                     constraint blog_posts_sections_check
                     check (public.assert_jsonb_array(sections)),

  -- Soft references, no FKs by design: `related` holds blog slugs and
  -- `related_projects` holds project slugs. A dangling slug degrades to the
  -- article sidebar falling back to the whole portfolio, which is the existing
  -- behaviour and far better than a cascade delete taking an article's tail off.
  related          jsonb not null default '[]'::jsonb
                     constraint blog_posts_related_check
                     check (public.assert_jsonb_array(related)),
  related_projects jsonb not null default '[]'::jsonb
                     constraint blog_posts_related_projects_check
                     check (public.assert_jsonb_array(related_projects)),

  -- New posts start as drafts and the admin opts in; the four seeds are live
  -- because the array they came from had no draft concept.
  published        boolean not null default false,

  -- Load-bearing, not cosmetic. The /insights grid alternates its card
  -- treatment on the row index (warm / mono / warm / mono) and BlogPreview
  -- takes the first three, so reordering here changes the home page.
  sort_order       integer not null default 0,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Matches the canonical read: .order("sort_order").order("published_on", desc)
-- filtered to published rows.
create index if not exists blog_posts_published_idx
  on public.blog_posts (published, sort_order, published_on desc);

-- App code never writes updated_at; the admin list column reads it.
drop trigger if exists blog_posts_touch_updated_at on public.blog_posts;
create trigger blog_posts_touch_updated_at
  before update on public.blog_posts
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.blog_posts enable row level security;

drop policy if exists "admin full access" on public.blog_posts;
create policy "admin full access"
  on public.blog_posts for all to authenticated
  using (true) with check (true);

-- Drafts must stay invisible to the public site, which reads with the anon key.
-- There is no anon write path — articles are authored in the admin panel only.
drop policy if exists "anon reads published blog posts" on public.blog_posts;
create policy "anon reads published blog posts"
  on public.blog_posts for select to anon using (published);

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
-- SELECT stays (the public site reads with the anon key); "there is no anon
-- write path" above is now a privilege, not just an absent policy.
revoke insert, update, delete on public.blog_posts from anon;


-- ---------------------------------------------------------------------------
-- Storage — cover art for articles
--
-- A bucket of its own so blog art can be purged or re-permissioned without
-- touching project photography. Keys are 'blog/<post-slug>/<uuid>.webp'; the
-- column stores the full public URL, and delete-on-replace recognises an
-- uploaded cover by the '/storage/v1/object/public/blog-images/' marker.
-- Public reads mean no next.config.ts remote-pattern change is needed beyond
-- the Supabase host already allowed for project images.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do update set public = true;

drop policy if exists "public reads blog images" on storage.objects;
create policy "public reads blog images"
  on storage.objects for select
  using (bucket_id = 'blog-images');

drop policy if exists "admin writes blog images" on storage.objects;
create policy "admin writes blog images"
  on storage.objects for all to authenticated
  using (bucket_id = 'blog-images')
  with check (bucket_id = 'blog-images');


-- ============================================================================
-- Seeds — the four articles that shipped in lib/insights.ts, verbatim.
--
-- Prose is dollar-quoted so the apostrophes in the copy need no escaping, and
-- `sections` is a dollar-quoted JSON literal rather than an array constructor
-- because the section objects are heterogeneous: only some carry `points`.
-- Each insert is guarded on slug, so re-running never duplicates an article and
-- never overwrites edits made in the admin panel after the first run.
-- ============================================================================

-- 1 / 4 — Buying — buying-an-apartment-in-colombo-guide
insert into public.blog_posts (
  slug, title, display_title, category, published_on, read_time, cover,
  excerpt, meta_description, keywords, intro, sections, related,
  related_projects, published, sort_order
)
select
  $mk$buying-an-apartment-in-colombo-guide$mk$,
  $mk$Buying an Apartment in Colombo: The Complete Guide$mk$,
  $mk$Buying an apartment in Colombo.$mk$,
  $mk$Buying$mk$,
  $mk$2026-06-15$mk$::date,
  $mk$7 min read$mk$,
  $mk$1600607687939-ce8a6c25118c$mk$,
  $mk$Location, developer track record, build quality and paperwork — what actually matters when buying an apartment in Colombo.$mk$,
  $mk$A practical guide to buying an apartment in Colombo, Sri Lanka — how to judge location, developer track record, construction quality, payment plans and legal due diligence before you commit.$mk$,
  to_jsonb(array[
    $mk$buying an apartment in Colombo$mk$,
    $mk$apartments for sale Colombo$mk$,
    $mk$luxury apartments Colombo$mk$,
    $mk$Colombo property guide$mk$,
    $mk$Sri Lanka apartment buying process$mk$
  ]::text[]),
  $mk$Colombo's apartment market rewards buyers who look past the brochure. This guide covers what to evaluate — location fundamentals, the developer behind the tower, construction quality and the paperwork — before you sign.$mk$,
  $json$[
    {
      "heading": "Location is a decade-long decision.",
      "paras": [
        "In Colombo, micro-location matters more than the city itself. Colombo 07's established streets, Colombo 05's connectivity and emerging corridors such as Rajagiriya and Battaramulla each behave differently as investments. Ask how the neighbourhood will look in ten years, not how it photographs today.",
        "Proximity to schools, hospitals and daily conveniences drives both liveability and resale demand for apartments in Colombo — and unlike finishes, location can never be renovated."
      ]
    },
    {
      "heading": "The developer matters more than the render.",
      "paras": [
        "Any render can look spectacular. What separates a safe purchase from a risky one is the property developer's record of finishing what they start — on schedule, to specification, with owners who would buy again.",
        "Look for completed, occupied projects you can walk through, corporate backing that guarantees staying power, and after-handover support. A developer backed by an established group, as Makro Developers is by the Wheels Lanka Group, carries a different risk profile from a single-project company."
      ],
      "points": [
        "Visit a completed project — occupied buildings tell the truth",
        "Check the corporate structure behind the brand",
        "Ask who handles defects after handover, and for how long"
      ]
    },
    {
      "heading": "Judge the build, not the finishes.",
      "paras": [
        "Marble lobbies date; structure and services endure. In a tropical climate, cross-ventilation, shading, glazing quality and waterproofing decide what an apartment costs to run and how it ages. Ask about floor-to-ceiling heights, natural light, backup power and water, and lift capacity at peak hours.",
        "Quality you feel years after handover — not just on the day you receive the keys — is the standard worth paying for."
      ]
    },
    {
      "heading": "Paperwork, payments and due diligence.",
      "paras": [
        "Confirm clear title to the land, approved building plans and, for apartments, the condominium plan registration. Payment schedules tied to construction milestones protect you; heavy upfront payments to thinly capitalised developers do not.",
        "Engage your own lawyer early. A reputable developer will welcome scrutiny — hesitation to share documentation is itself an answer."
      ]
    }
  ]$json$::jsonb,
  to_jsonb(array[
    $mk$how-to-choose-a-property-developer-in-sri-lanka$mk$,
    $mk$sri-lanka-real-estate-investment-guide$mk$
  ]::text[]),
  to_jsonb(array[
    $mk$makro-heights$mk$
  ]::text[]),
  true,
  0
where not exists (
  select 1 from public.blog_posts
  where slug = $mk$buying-an-apartment-in-colombo-guide$mk$
);

-- 2 / 4 — Investing — sri-lanka-real-estate-investment-guide
insert into public.blog_posts (
  slug, title, display_title, category, published_on, read_time, cover,
  excerpt, meta_description, keywords, intro, sections, related,
  related_projects, published, sort_order
)
select
  $mk$sri-lanka-real-estate-investment-guide$mk$,
  $mk$Investing in Sri Lanka Real Estate: What to Know$mk$,
  $mk$Investing in Sri Lankan real estate.$mk$,
  $mk$Investing$mk$,
  $mk$2026-06-01$mk$::date,
  $mk$8 min read$mk$,
  $mk$1480714378408-67cf0d13bc1b$mk$,
  $mk$Why disciplined investors are looking at Sri Lankan property — and how to separate durable value from speculation.$mk$,
  $mk$An investor's guide to Sri Lanka real estate — market fundamentals, residential vs commercial property returns, what foreign buyers should know, and how to evaluate long-term value in Colombo and beyond.$mk$,
  to_jsonb(array[
    $mk$Sri Lanka real estate investment$mk$,
    $mk$property investment Sri Lanka$mk$,
    $mk$invest in Colombo property$mk$,
    $mk$Sri Lanka commercial property$mk$,
    $mk$foreigners buying property in Sri Lanka$mk$
  ]::text[]),
  $mk$Sri Lankan real estate rewards patience and punishes speculation. Here is how disciplined investors evaluate the market — residential and commercial — and where durable value is actually created.$mk$,
  $json$[
    {
      "heading": "The fundamentals favour the long view.",
      "paras": [
        "Urbanising demographics, a growing professional class and constrained supply of well-built stock in prime Colombo underpin the market's long-term case. Land in established districts is finite; quality construction is scarcer still.",
        "The investors who do well in Sri Lankan property buy assets they would be comfortable holding for a decade — because the compounding happens in the holding, not the flipping."
      ]
    },
    {
      "heading": "Residential or commercial?",
      "paras": [
        "Prime residential property in Colombo offers steady rental demand from professionals and expatriates, with capital appreciation concentrated in well-located, well-built projects. Waterfront and boutique developments in destinations like Galle add a lifestyle-asset dimension with strong holiday-let potential.",
        "Grade-A commercial space is a different instrument: longer leases, corporate tenants and returns driven by specification and location. Colombo's supply of genuinely Grade-A office space remains thin — which is precisely the opportunity."
      ]
    },
    {
      "heading": "What foreign investors should know.",
      "paras": [
        "Foreign nationals can freely purchase condominium apartments in Sri Lanka (freehold land carries restrictions), which makes well-structured apartment and mixed-use projects the natural entry point for international capital.",
        "Work with developers who understand cross-border transactions and can evidence clean title, approvals and a compliant payment structure. Professional advice on tax and repatriation is essential — and cheap relative to the asset."
      ]
    },
    {
      "heading": "Judging durable value.",
      "paras": [
        "The same tests apply to a villa and a tower: the land's ten-year trajectory, the developer's completed track record, construction quality that controls running costs, and an exit story that doesn't rely on a greater fool.",
        "Our own investment discipline is simple — we only build what we would be content to hold. That filter is available to investors too."
      ],
      "points": [
        "Buy the location's future, not its present",
        "Underwrite the developer before the deal",
        "Prefer quality that lowers lifetime cost",
        "Model the hold, not the flip"
      ]
    }
  ]$json$::jsonb,
  to_jsonb(array[
    $mk$buying-an-apartment-in-colombo-guide$mk$,
    $mk$grade-a-office-space-colombo$mk$
  ]::text[]),
  to_jsonb(array[
    $mk$makro-heights$mk$
  ]::text[]),
  true,
  1
where not exists (
  select 1 from public.blog_posts
  where slug = $mk$sri-lanka-real-estate-investment-guide$mk$
);

-- 3 / 4 — Commercial — grade-a-office-space-colombo
insert into public.blog_posts (
  slug, title, display_title, category, published_on, read_time, cover,
  excerpt, meta_description, keywords, intro, sections, related,
  related_projects, published, sort_order
)
select
  $mk$grade-a-office-space-colombo$mk$,
  $mk$What Grade-A Office Space Means in Colombo$mk$,
  $mk$What Grade-A really means.$mk$,
  $mk$Commercial$mk$,
  $mk$2026-05-18$mk$::date,
  $mk$6 min read$mk$,
  $mk$/brand/texture-peaks.jpg$mk$,
  $mk$'Grade A' is Colombo's most overused label. Here is the specification the term is supposed to guarantee.$mk$,
  $mk$What qualifies as Grade-A office space in Colombo, Sri Lanka — floor plates, ceilings, lifts, power redundancy, façade performance and the specification checklist occupiers and investors should demand.$mk$,
  to_jsonb(array[
    $mk$Grade A office space Colombo$mk$,
    $mk$commercial property Colombo$mk$,
    $mk$office space Sri Lanka$mk$,
    $mk$Grade A building specification$mk$,
    $mk$commercial real estate Sri Lanka$mk$
  ]::text[]),
  $mk$Every second tower in Colombo calls itself Grade A. The label has a real meaning — a specification that determines what a building costs to occupy, how it performs and what it is worth in fifteen years.$mk$,
  $json$[
    {
      "heading": "The specification, not the lobby.",
      "paras": [
        "Grade-A is a technical standard, not an aesthetic one. It lives in the floor plates, the cores, the services and the façade — the parts of a commercial building that cannot be refurbished later."
      ],
      "points": [
        "Column-light floor plates of 10,000+ sq ft for flexible fit-outs",
        "Finished ceilings of 2.7m or higher",
        "Destination-control lifts sized for peak loads",
        "N+1 backup power and independent water reserves",
        "High-performance glazing that controls solar gain",
        "Efficient net-to-gross ratios — you pay for usable space"
      ]
    },
    {
      "heading": "Why it matters to occupiers.",
      "paras": [
        "For a business, the difference between genuine Grade-A office space and a well-dressed Grade B building shows up monthly: cooling loads, downtime, churn costs when teams grow, and the talent question of whether people actually want to be in the building.",
        "Multinationals and their auditors increasingly require certified, resilient space — which keeps genuine Grade-A stock in Colombo structurally under-supplied."
      ]
    },
    {
      "heading": "Why it matters to investors.",
      "paras": [
        "Specification is what separates assets that re-let quickly at premium rents from those that discount every cycle. A commercial building engineered to international standards holds tenants, holds rents and holds value.",
        "It is why every commercial space Makro plans is engineered around column-light plates, redundant services and a high-performance façade from the first feasibility study — the specification global occupiers audit for, held to the same standard that governs every Makro development."
      ]
    }
  ]$json$::jsonb,
  to_jsonb(array[
    $mk$sri-lanka-real-estate-investment-guide$mk$,
    $mk$how-to-choose-a-property-developer-in-sri-lanka$mk$
  ]::text[]),
  to_jsonb(array[
    $mk$makro-heights$mk$
  ]::text[]),
  true,
  2
where not exists (
  select 1 from public.blog_posts
  where slug = $mk$grade-a-office-space-colombo$mk$
);

-- 4 / 4 — Guides — how-to-choose-a-property-developer-in-sri-lanka
insert into public.blog_posts (
  slug, title, display_title, category, published_on, read_time, cover,
  excerpt, meta_description, keywords, intro, sections, related,
  related_projects, published, sort_order
)
select
  $mk$how-to-choose-a-property-developer-in-sri-lanka$mk$,
  $mk$How to Choose a Property Developer in Sri Lanka$mk$,
  $mk$Choosing a developer you can trust.$mk$,
  $mk$Guides$mk$,
  $mk$2026-05-02$mk$::date,
  $mk$6 min read$mk$,
  $mk$1481253127861-534498168948$mk$,
  $mk$The developer is the single biggest variable in any purchase. Five tests that separate reliable builders from marketing.$mk$,
  $mk$How to evaluate property developers in Sri Lanka before you buy — track record, financial backing, construction standards, transparency and after-sales support. Five tests every buyer should apply.$mk$,
  to_jsonb(array[
    $mk$property developers in Sri Lanka$mk$,
    $mk$best property developer Colombo$mk$,
    $mk$how to choose a property developer$mk$,
    $mk$trusted developers Sri Lanka$mk$,
    $mk$real estate developer track record$mk$
  ]::text[]),
  $mk$In property, you never really buy a building — you buy the organisation that promises to deliver it. These five tests tell you whether that promise will hold.$mk$,
  $json$[
    {
      "heading": "One — a track record you can walk through.",
      "paras": [
        "Completed, occupied, ageing-well buildings are the only evidence that matters. Visit a project the developer handed over years ago and look at how it has weathered. And where a developer's flagship is still in planning — as Makro Heights is — scrutinise what you can verify instead: the group behind it, the professionals it has appointed and the standards it publishes. Substance you can check beats any promise."
      ]
    },
    {
      "heading": "Two — the strength behind the brand.",
      "paras": [
        "Construction is capital-hungry, and half-finished towers are usually financing failures, not engineering ones. A developer backed by an established group — as Makro Developers is by the Wheels Lanka Group — can hold its schedule and its standards through market cycles."
      ]
    },
    {
      "heading": "Three — standards you can inspect.",
      "paras": [
        "Ask what standard the structure is engineered to, who supervises quality on site, and how materials are selected. Specific answers signal a real process; vague reassurance signals its absence. Our four-stage approach — plan, design, build, endure — exists precisely so the answer is never vague."
      ]
    },
    {
      "heading": "Four — transparency before you commit.",
      "paras": [
        "Title documents, approvals, specifications and payment structures should be offered, not extracted. Developers with nothing to hide behave that way."
      ]
    },
    {
      "heading": "Five — presence after handover.",
      "paras": [
        "The keys are the midpoint of the relationship, not the end. Ask how defects are handled, who maintains common property, and whether earlier buyers would purchase again. After-sales behaviour is where a developer's real character shows."
      ]
    }
  ]$json$::jsonb,
  to_jsonb(array[
    $mk$buying-an-apartment-in-colombo-guide$mk$,
    $mk$grade-a-office-space-colombo$mk$
  ]::text[]),
  to_jsonb(array[
    $mk$makro-heights$mk$
  ]::text[]),
  true,
  3
where not exists (
  select 1 from public.blog_posts
  where slug = $mk$how-to-choose-a-property-developer-in-sri-lanka$mk$
);
