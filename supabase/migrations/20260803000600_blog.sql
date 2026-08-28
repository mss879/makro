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
  $mk$Investing in an apartment in Colombo.$mk$,
  $mk$Buying$mk$,
  $mk$2026-06-15$mk$::date,
  $mk$7 min read$mk$,
  $mk$1600607687939-ce8a6c25118c$mk$,
  $mk$What matters when choosing an apartment to live in or invest in — from location and the developer to build quality and documentation.$mk$,
  $mk$A practical guide to buying an apartment in Colombo, Sri Lanka — how to judge location, developer track record, construction quality, payment plans and legal due diligence before you commit.$mk$,
  to_jsonb(array[
    $mk$buying an apartment in Colombo$mk$,
    $mk$apartments for sale Colombo$mk$,
    $mk$luxury apartments Colombo$mk$,
    $mk$Colombo property guide$mk$,
    $mk$Sri Lanka apartment buying process$mk$
  ]::text[]),
  $mk$Whether you are buying a home or an investment, an apartment is a decision with lasting implications. Look beyond the brochure to the fundamentals that shape both the experience of living there and the value it can hold over time — location, the developer, build quality and the documentation behind it.$mk$,
  $json$[
      {
          "heading": "Location is more than an address.",
          "paras": [
              "The right location should work for both the life you lead today and the value you may need tomorrow. Look beyond the address to the neighbourhood’s connectivity, amenities, infrastructure and potential for growth — because while an apartment can be renovated, its location cannot."
          ]
      },
      {
          "heading": "The developer matters as much as the property.",
          "paras": [
              "A compelling design is only as valuable as the developer’s ability to deliver it. Look beyond the render to completed projects, delivery standards, financial strength and what happens after handover. A developer’s track record tells you far more about what you are buying than a promise on a page."
          ],
          "points": [
              "Visit a completed project — occupied buildings tell the truth",
              "Check the corporate structure behind the brand",
              "Ask who handles defects after handover, and for how long"
          ]
      },
      {
          "heading": "Look beyond the finishes.",
          "paras": [
              "What matters most is often what you cannot see. Consider the structure, services, ventilation, natural light, waterproofing, glazing, backup systems and the quality of the spaces themselves — the elements that determine how a home performs, what it costs to run and how well it ages. Good finishes create an impression; good construction creates lasting value."
          ]
      },
      {
          "heading": "Know what you are buying.",
          "paras": [
              "Before committing, make sure the fundamentals are in order. Confirm clear title, approved plans, condominium registration and a payment structure aligned with the progress of construction. Independent legal advice is worth taking early — and a developer willing to provide clear documentation should have nothing to hide."
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
  $mk$A considered look at the fundamentals that shape property value — and how to distinguish durable opportunities from speculation.$mk$,
  $mk$An investor's guide to Sri Lanka real estate — market fundamentals, residential vs commercial property returns, what foreign buyers should know, and how to evaluate long-term value in Colombo and beyond.$mk$,
  to_jsonb(array[
    $mk$Sri Lanka real estate investment$mk$,
    $mk$property investment Sri Lanka$mk$,
    $mk$invest in Colombo property$mk$,
    $mk$Sri Lanka commercial property$mk$,
    $mk$foreigners buying property in Sri Lanka$mk$
  ]::text[]),
  $mk$Property rewards investors who look beyond the immediate. Understanding the fundamentals — from location and market demand to quality, ownership structure and the developer behind the asset — is essential to identifying opportunities with durable value.$mk$,
  $json$[
      {
          "heading": "The fundamentals favour a longer view.",
          "paras": [
              "Strong property investments are built on fundamentals, not short-term momentum. In established parts of Colombo, finite land, growing demand and limited supply of well-built property support a longer investment horizon. The focus should be on assets with the quality, location and underlying demand to remain relevant through the cycle."
          ]
      },
      {
          "heading": "Residential or commercial? Different assets, different dynamics.",
          "paras": [
              "Residential and commercial property serve different investment objectives. Residential value is shaped by location, liveability, rental demand and quality, while commercial assets depend more heavily on specification, tenant demand, lease strength and location. The right choice comes down to the asset, the market it serves and the investment horizon behind it."
          ]
      },
      {
          "heading": "Investing across borders.",
          "paras": [
              "Sri Lankan condominium property can provide a practical entry point for international investors, but cross-border ownership requires careful due diligence. Consider the title, approvals, ownership structure and payment arrangements, and seek professional advice on taxation and the repatriation of funds before committing."
          ]
      },
      {
          "heading": "Value that holds over time.",
          "paras": [
              "Durable value comes from fundamentals that remain relevant beyond the purchase. Consider the location’s future, the developer’s track record, the quality and efficiency of the asset, its ongoing costs and the depth of future demand. The strongest investments are those that remain desirable to live in, operate and own — not simply sell."
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
  $mk$Beyond the label: what specification, performance and resilience really mean in Grade-A office space.$mk$,
  $mk$What qualifies as Grade-A office space in Colombo, Sri Lanka — floor plates, ceilings, lifts, power redundancy, façade performance and the specification checklist occupiers and investors should demand.$mk$,
  to_jsonb(array[
    $mk$Grade A office space Colombo$mk$,
    $mk$commercial property Colombo$mk$,
    $mk$office space Sri Lanka$mk$,
    $mk$Grade A building specification$mk$,
    $mk$commercial real estate Sri Lanka$mk$
  ]::text[]),
  $mk$Grade-A is more than a polished lobby or a premium address. It is a measurable standard of specification, performance and resilience — one that affects how efficiently a building operates, what it costs to occupy and how well its value holds over time.$mk$,
  $json$[
      {
          "heading": "The specification matters more than the finish.",
          "paras": [
              "Genuine Grade-A quality is defined by what sits behind the finishes. Floor plates, ceiling heights, lift capacity, power resilience, water reserves, glazing and net-to-gross efficiency all shape how a building performs for its occupiers and remains competitive over time."
          ],
          "points": [
              "Function spaces aligned with everyday living",
              "Finished ceilings of 2.7m or higher",
              "Destination-control lifts sized for peak loads",
              "N+1 backup power and independent water reserves",
              "Efficient net-to-gross ratios — you pay for usable space"
          ]
      },
      {
          "heading": "Performance is felt every day.",
          "paras": [
              "For occupiers, specification translates directly into the working environment and the cost of operating it. Efficient cooling, reliable power and water, flexible floor plates and resilient building systems reduce disruption, support changing business needs and create a workplace people want to be in."
          ]
      },
      {
          "heading": "Specification protects value.",
          "paras": [
              "For investors, quality specification is a commercial advantage. Buildings that perform well attract stronger occupiers, support rental resilience and remain competitive through market cycles. That is why specification should be considered from the earliest feasibility decisions — not added as an upgrade once the building is already designed."
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
  $mk$Five things to look beyond the brochure for when assessing a developer — from track record and financial strength to standards, transparency and what happens after handover.$mk$,
  $mk$How to evaluate property developers in Sri Lanka before you buy — track record, financial backing, construction standards, transparency and after-sales support. Five tests every buyer should apply.$mk$,
  to_jsonb(array[
    $mk$property developers in Sri Lanka$mk$,
    $mk$best property developer Colombo$mk$,
    $mk$how to choose a property developer$mk$,
    $mk$trusted developers Sri Lanka$mk$,
    $mk$real estate developer track record$mk$
  ]::text[]),
  $mk$A property purchase is also a decision about who you trust to deliver it. Look beyond the project to the organisation behind it — its track record, financial strength, standards, transparency and commitment beyond handover. These are the things worth examining before you commit.$mk$,
  $json$[
      {
          "heading": "A track record you can see.",
          "paras": [
              "Past performance is best judged by what has actually been delivered. Look beyond completed projects to how they have performed over time — how they have aged, how they are maintained and how owners experience them. Where a developer is still establishing its own portfolio, examine what can be verified: the people behind it, the professionals appointed and the standards it commits to."
          ]
      },
      {
          "heading": "The strength behind the brand.",
          "paras": [
              "Property development requires substantial capital and the ability to remain committed through changing market conditions. Consider who stands behind the developer, the strength of its financial backing and whether it has the stability to maintain its commitments, standards and delivery throughout the development cycle."
          ]
      },
      {
          "heading": "Standards you can inspect.",
          "paras": [
              "Quality should be more than a promise. Ask what standards the building is designed and constructed to, who is responsible for quality on site and how materials and systems are selected. The more clearly a developer can explain its standards and processes, the more confidently you can assess what is being delivered."
          ]
      },
      {
          "heading": "Transparency before you commit.",
          "paras": [
              "The information behind a property should be clear before you commit. Title documents, approvals, specifications and payment structures should be readily available for review, with the developer prepared to answer questions openly and provide the information needed to make an informed decision."
          ]
      },
      {
          "heading": "Presence after handover.",
          "paras": [
              "The relationship with a developer should not end when the keys are handed over. Understand how defects are addressed, how common property is maintained and who remains responsible after completion. The way a developer stands behind what it delivers is as important as what it promises before purchase."
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
