# Makro Developers — Website SEO & Architecture Handover

**Site:** https://makrodevelopers.lk
**Prepared:** July 2026
**Stack:** Next.js 16 (App Router) · React 19 · Statically generated (all pages pre-rendered as HTML)

This document is the complete reference for the website's structure, search-engine optimisation, structured data (schemas), and internal-linking architecture. It is written to be handed to any future developer, SEO agency, or marketing team — everything they need is here.

---

## 1. Site Architecture & Sitemap Structure

The site is organised into **three content pillars, one conversion point**:

```
makrodevelopers.lk
│
├── TRUST PILLAR — who we are and how we work
│   ├── /about               About Us
│   ├── /approach            Our four-stage development process
│   ├── /sustainability      Responsible building commitments
│   └── /careers             Careers & open application
│
├── PORTFOLIO PILLAR — the commercial heart of the site
│   ├── /projects            All developments (hub)
│   │   ├── /projects/the-ridgeline-residences     Residential · Colombo 07
│   │   ├── /projects/serein-waterfront            Residential · Galle
│   │   ├── /projects/altair-commercial-tower      Commercial · Colombo 02
│   │   ├── /projects/meridian-park-homes          Residential · Battaramulla
│   │   ├── /projects/the-atelier-lofts            Mixed-Use · Colombo 05
│   │   └── /projects/horizon-business-quarter     Commercial · Rajagiriya
│
├── KNOWLEDGE PILLAR — search-traffic engine
│   ├── /insights            Guides hub
│   │   ├── /insights/buying-an-apartment-in-colombo-guide
│   │   ├── /insights/sri-lanka-real-estate-investment-guide
│   │   ├── /insights/grade-a-office-space-colombo
│   │   └── /insights/how-to-choose-a-property-developer-in-sri-lanka
│   └── /faq                 13 structured Q&As (rich-result eligible)
│
├── CONVERSION POINT
│   └── /contact             Enquiry form + office details
│
└── LEGAL
    ├── /privacy-policy
    └── /terms-of-use
```

**Total indexable pages: 21.**

### 1.1 XML Sitemap (`/sitemap.xml`)

Generated automatically at build time from `app/sitemap.ts`. Every page carries a priority that mirrors its commercial importance and a change frequency that tells crawlers how often to revisit:

| URL | Priority | Change freq | Reasoning |
|---|---|---|---|
| `/` | 1.0 | weekly | Front door; highest crawl priority |
| `/projects` | 0.9 | weekly | Primary commercial hub |
| `/projects/*` (Now Selling) | 0.9 | monthly | Active sales pages |
| `/projects/*` (others) | 0.8 | monthly | Portfolio evidence |
| `/about` | 0.8 | monthly | Trust anchor |
| `/contact` | 0.8 | yearly | Conversion page (content is stable) |
| `/approach` | 0.7 | monthly | Differentiator content |
| `/insights` | 0.7 | weekly | Editorial hub; signal freshness |
| `/insights/*` | 0.6 | yearly | Evergreen guides (lastModified = publish date) |
| `/sustainability` | 0.6 | monthly | Supporting content |
| `/faq` | 0.6 | monthly | Rich-result surface |
| `/careers` | 0.5 | monthly | Secondary audience |
| `/privacy-policy`, `/terms-of-use` | 0.2 | yearly | Legal; lowest priority |

**Adding a page to the sitemap:** new projects and insights are picked up automatically from `lib/projects.ts` / `lib/insights.ts`. A brand-new static page must be added to the `staticPages` array in `app/sitemap.ts`.

### 1.2 Robots (`/robots.txt`)

Generated from `app/robots.ts`:

```
User-Agent: *
Allow: /

Host: https://makrodevelopers.lk
Sitemap: https://makrodevelopers.lk/sitemap.xml
```

All pages are open to all crawlers; the sitemap is declared so search engines discover every URL immediately.

---

## 2. Meta Titles & Descriptions — Every Page

Titles follow the pattern `Page Title · Makro Developers` (the suffix is applied automatically by the root layout template). The homepage carries an absolute title. Every page also declares a **canonical URL**, an **Open Graph image** (1200×630), and a **Twitter summary_large_image card**.

### Core pages

| Page | Meta title | Meta description |
|---|---|---|
| `/` | **Makro Developers — Luxury Property Developer in Colombo, Sri Lanka** | Makro Developers builds premium residential and commercial properties in Colombo and across Sri Lanka. A Wheels Lanka Group company delivering luxury apartments, villas and Grade-A offices — the future built well. |
| `/about` | **About Us — A Sri Lankan Property Developer** | Makro Developers is a Sri Lankan property developer and a fully owned subsidiary of the Wheels Lanka Group — combining corporate strength with a focused approach to residential and commercial development in Colombo and beyond. |
| `/projects` | **Property Developments in Sri Lanka** | Explore Makro Developers' portfolio of residential and commercial property developments across Sri Lanka — luxury apartments, waterfront villas and Grade-A offices, completed, selling and in planning. |
| `/approach` | **Our Approach to Property Development** | How Makro Developers creates lasting value in Sri Lankan real estate — a four-stage development process of thoughtful planning, climate-aware design, disciplined construction and after-handover care. |
| `/sustainability` | **Sustainable Property Development** | Sustainable property development in Sri Lanka — Makro Developers builds climate-conscious residential and commercial projects with passive cooling, solar-ready services and durable materials for lasting value. |
| `/contact` | **Contact a Property Developer in Colombo** | Contact Makro Developers in Colombo, Sri Lanka — enquire about luxury apartments, villas, Grade-A commercial space or investment opportunities. Call, email or visit our Colombo 07 office. |
| `/faq` | **Frequently Asked Questions — Buying & Investing** | Answers to common questions about buying, investing and living in a Makro development — from apartment purchases in Colombo and foreign ownership in Sri Lanka to payment plans and after-handover support. |
| `/insights` | **Property Insights & Buying Guides** | Guides and insights on Sri Lankan property — buying an apartment in Colombo, investing in real estate, Grade-A commercial space and how to choose a developer you can trust. |
| `/careers` | **Careers in Property Development** | Build a career with Makro Developers — a growing Sri Lankan property developer backed by the Wheels Lanka Group. Opportunities across engineering, design management, sales and operations in Colombo. |
| `/privacy-policy` | **Privacy Policy** | How Makro Developers collects, uses and protects the personal information you share with us — including enquiries made through this website. |
| `/terms-of-use` | **Terms of Use** | The terms that govern your use of the Makro Developers website — including how project information, imagery and specifications on this site should be read. |

### Project pages (generated per project)

Title pattern: **`{Project Name} — {Type keyword} in {Location}`**, where the type keyword is:
- Residential → *Luxury Residences*
- Commercial → *Grade-A Commercial Space*
- Mixed-Use → *Mixed-Use Development*

| Page | Meta title |
|---|---|
| `/projects/the-ridgeline-residences` | The Ridgeline Residences — Luxury Residences in Colombo 07 |
| `/projects/serein-waterfront` | Serein Waterfront — Luxury Residences in Galle |
| `/projects/altair-commercial-tower` | Altair Commercial Tower — Grade-A Commercial Space in Colombo 02 |
| `/projects/meridian-park-homes` | Meridian Park Homes — Luxury Residences in Battaramulla |
| `/projects/the-atelier-lofts` | The Atelier Lofts — Mixed-Use Development in Colombo 05 |
| `/projects/horizon-business-quarter` | Horizon Business Quarter — Grade-A Commercial Space in Rajagiriya |

Descriptions are the project's `summary` field plus status and location — edit them in `lib/projects.ts`.

### Insight articles

| Page | Meta title | Primary keyword target |
|---|---|---|
| `/insights/buying-an-apartment-in-colombo-guide` | Buying an Apartment in Colombo: The Complete Guide | *buying an apartment in Colombo* |
| `/insights/sri-lanka-real-estate-investment-guide` | Investing in Sri Lanka Real Estate: What to Know | *Sri Lanka real estate investment* |
| `/insights/grade-a-office-space-colombo` | What Grade-A Office Space Means in Colombo | *Grade A office space Colombo* |
| `/insights/how-to-choose-a-property-developer-in-sri-lanka` | How to Choose a Property Developer in Sri Lanka | *property developers in Sri Lanka* |

---

## 3. Keyword Strategy

**Primary site-wide keywords** (woven through titles, headings, body copy and metadata — never stuffed):

- property developer Sri Lanka / Colombo
- luxury apartments Colombo
- residential developments Sri Lanka
- commercial real estate / Grade-A office space Colombo
- Wheels Lanka Group
- villas for sale Sri Lanka
- Sri Lanka real estate investment
- foreigners buying property in Sri Lanka

**Placement logic** (matches the client's "less text, more visuals" direction):

- Display headings stay short and brand-led (≤ ~7 words).
- The long, keyword-rich copy lives where it counts for search but not for design: **meta descriptions, FAQ answers, insight article bodies, and project description paragraphs**.
- Each insight article owns **one** primary search topic and supports it with 4–5 secondary phrases (declared per-article in `lib/insights.ts` → `keywords`).
- Location keywords (Colombo 02/05/07, Galle, Battaramulla, Rajagiriya) are carried by project titles and schema addresses.

---

## 4. Structured Data (Schema.org JSON-LD)

Every schema is emitted as JSON-LD `<script>` tags — the format Google explicitly recommends. All builders live in one file: **`lib/seo.ts`**. The table shows exactly which page carries which schema:

| Schema type | Where | What it does |
|---|---|---|
| `Organization` | Every page (root layout) | Establishes the company entity: legal name, logo, contact details, Colombo address, parent organisation (Wheels Lanka Group), areas served. Feeds Google's Knowledge Panel. |
| `WebSite` | Every page (root layout) | Declares the site entity and publisher, links it to the Organization. |
| `BreadcrumbList` | Every inner page | Gives Google the page's position in the site hierarchy; enables breadcrumb display in search results. |
| `AboutPage` | `/about` | Typed page identity tied to the Organization. |
| `CollectionPage` | `/projects`, `/insights` | Marks hub pages as curated collections. |
| `ItemList` | `/projects` | Lists all six developments in order — helps Google understand and index the full portfolio. |
| `RealEstateListing` | Each `/projects/*` page | The money schema: name, description, image, provider, and an `about` entity (`ApartmentComplex` for residential/mixed-use, `Place` for commercial) with postal address, unit counts and amenity features. |
| `Article` | Each `/insights/*` page | Headline, description, image, publish date, author/publisher (the Organization), section and keywords — qualifies articles for rich article results. |
| `FAQPage` | `/faq` | All 13 Q&As marked up as Question/Answer pairs — eligible for FAQ rich results and heavily used by AI search. |
| `ContactPage` | `/contact` | Typed page identity. |
| `LocalBusiness` + `RealEstateAgent` | `/contact` | Local-SEO anchor: address, phone, email, opening hours (Mon–Fri 9:00–18:00), price range. Supports Google Business Profile and map-pack visibility. |
| `WebPage` | `/approach`, `/sustainability`, `/careers`, legal pages | Baseline typed identity connected to the site entity. |

**Entity linking:** the Organization is declared once with the stable ID `https://makrodevelopers.lk/#organization`; every other schema references it (`@id`), so Google sees one coherent entity rather than fragments.

**Validation:** paste any page URL into https://search.google.com/test/rich-results after launch.

---

## 5. Internal Linking Architecture

Every page is linked to and from other pages **by editorial intent, not randomly**. The model is hub-and-spoke with three deliberate flows:

### Flow 1 — Trust loop (company pages reinforce each other)
- **About → Approach** (in-copy link on "thoughtful planning and quality execution" + "How we build" button)
- **About → Projects** ("Explore our projects") and **About → developer-selection guide**
- **Approach → Projects** ("See the results") and **Approach → Sustainability** ("Building responsibly")
- **Sustainability → Approach** ("Part of how we build") and **Sustainability → Projects**
- **Careers → About** (values) and **Careers → Approach** (way of working)

### Flow 2 — Commercial funnel (everything drains toward projects and contact)
- **Projects hub → each project** (grid) **→ Approach** + **buying guide** (cross-link strip)
- **Project detail → Contact** (enquire CTA), **→ all projects**, **→ next project** (circular chain through the whole portfolio), **→ the guide matching its type**:
  - Residential projects → *Buying an Apartment in Colombo*
  - Commercial projects → *What Grade-A Office Space Means*
  - Mixed-use projects → *Investing in Sri Lankan Real Estate*
- **Contact → Projects + FAQ** ("prefer to browse first?")

### Flow 3 — Knowledge engine (editorial passes authority to commercial pages)
- **Insights hub → all 4 articles → Projects / FAQ**
- **Each article → 2 hand-picked related articles** (`related` field), **→ 2 relevant developments** (sidebar, `relatedProjects` field), **→ Contact** (in-article CTA)
- **FAQ → Projects, Contact, Insights**
- **Homepage FAQ section → /faq** ("View all questions")

### Global links (every page)
- **Navbar:** Home, About, Projects, Approach, Sustainability, Insights, Contact (+ Enquire CTA)
- **Footer:** Explore (6 main pages), Discover (FAQ, Careers, Insights), Connect (socials), Visit (contact details), legal row (Privacy, Terms), and a site-wide contact CTA

**Why it matters:** internal links are how search engines discover pages and decide which ones matter. This structure guarantees (a) no page is more than two clicks from the homepage, (b) the highest-value pages (projects, contact) receive the most links, and (c) editorial pages pass topical authority to the commercial pages they support.

**Maintaining it:** when adding a new project or article, set its `relatedProjects` / `related` fields in the data file and it is automatically woven into the mesh.

---

## 6. Technical SEO Features (already in place)

- **Static generation** — every page is pre-rendered to HTML at build time; crawlers get full content with zero JavaScript execution required.
- **Canonical URLs** on every page (prevents duplicate-content issues).
- **Open Graph + Twitter cards** with 1200×630 images on every page — links shared on WhatsApp, LinkedIn, Facebook and X unfurl with rich previews.
- **`metadataBase`** set to the production domain; all URLs resolve absolute.
- **Robots meta**: `index, follow`, `max-image-preview:large`, unlimited snippets — maximum SERP real estate.
- **Locale** declared as `en_LK`.
- **next/image** optimisation: responsive sizes, lazy loading below the fold, priority loading for hero images.
- **Self-hosted licensed fonts** — both brand faces (TAN Garland display + Rosario body, from the client's licensed files) are served from the site itself with `display: swap`: no Google Fonts requests, no render-blocking, no third-party font tracking.
- **Client brand imagery** — the supplied brand photographs and textures live in `public/brand/` (optimised to web-weight JPEG) and are placed by editorial role, not at random: mono architecture on About and the homepage statement, the residential render on Projects, rose-gold textures on Approach/FAQ/Careers and the Grade-A guide, warm lifestyle imagery on Insights, About and Sustainability. Remaining slots use curated Unsplash photography treated to the brand palette.
- **Semantic HTML**: one `h1` per page, ordered heading hierarchy, `<address>`, `<article>`, ARIA-labelled interactive elements.

---

## 7. Post-Launch Checklist (for the client)

1. **Google Search Console** — verify the domain, submit `https://makrodevelopers.lk/sitemap.xml`.
2. **Google Business Profile** — create/claim the Colombo 07 listing; keep name, address, phone identical to the site (the LocalBusiness schema mirrors these).
3. **Analytics** — add GA4 (or equivalent) before launch.
4. **Social profiles** — the footer's Instagram/LinkedIn/Facebook links are placeholders (`#`). Once live profiles exist, update `SOCIALS` in `lib/site.ts` and add the profile URLs to a `sameAs` array in `organizationSchema()` (`lib/seo.ts`).
5. **Phone number** — `+94 11 234 5678` in `lib/site.ts` is a placeholder; replace with the real line (updates site-wide, including schemas).
6. **Rich-results test** — run the homepage, one project page, one article and the FAQ page through Google's Rich Results Test after launch.
7. **Legal review** — have a lawyer confirm the Privacy Policy and Terms of Use meet current Sri Lankan requirements (including PDPA obligations).
8. **Keep publishing** — the Insights section is the growth engine. One well-targeted guide a month compounds; each new article automatically joins the sitemap and link mesh.

---

## 8. Where Everything Lives (for developers)

| Concern | File |
|---|---|
| Site identity (name, contacts, URL, nav) | `lib/site.ts` |
| All schema builders + metadata helper | `lib/seo.ts` |
| JSON-LD render component | `components/seo/JsonLd.tsx` |
| XML sitemap | `app/sitemap.ts` |
| robots.txt | `app/robots.ts` |
| Project data (incl. SEO summaries) | `lib/projects.ts` |
| Insight articles (incl. keywords, related links) | `lib/insights.ts` |
| FAQ content (page + homepage + schema) | `lib/faqs.ts` |
| Global metadata defaults + Organization/WebSite schema | `app/layout.tsx` |
| Brand image manifest (roles per asset) | `lib/images.ts` (`BRAND`) + `public/brand/` |
| Self-hosted brand fonts | `app/fonts/` (TAN Garland + Rosario woff2) |
