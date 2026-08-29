# Makro Developers — Website

Marketing website and admin panel for **Makro Developers**, a Sri Lankan
property developer and subsidiary of the Wheels Lanka Group.

Built to the official **Makro Developers Brand Identity Guide**:

- **Palette** — Pure Black `#050203`, Pure White `#FFFFFF`, Rose Gold `#E2A388`, over off-white grey light surfaces (`paper` `#F5F4F2`, deepened to `#DCD9D4` across `/projects`), applied at the guideline's 70 / 20 / 10 ratio.
- **Type** — **Marcellus** for display, **Manrope** for body. Both self-hosted from `app/fonts/`.
- **Logomark** — the twin-peaks "M" as clean SVG (`components/brand/PeakMark.tsx`), used throughout: nav lockup, preloader, section accents, watermarks, favicon.
- **Voice** — expertise, quiet confidence and assurance, per the guideline.
- **Imagery** — warm golden-hour and dramatic monochrome architecture, tonally unified by a CSS image treatment (`.img-warm` / `.img-mono`).

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS v4** — brand design tokens in `app/globals.css`
- **GSAP + ScrollTrigger** (`@gsap/react`) — reveals, the pinned Selected Work gallery, the pinned "line that builds" approach sequence, the preloader
- **Lenis** — smooth scrolling
- **Supabase** — Postgres, Auth and Storage behind the admin panel

## Pages

| Route | Description |
| --- | --- |
| `/` | Home — video hero, brand statement, services, Selected Work, why Makro, the approach sequence, group backing, blog preview |
| `/about` | Company story, traits, Wheels Lanka Group, why Makro, timeline |
| `/projects` | Portfolio — index ledger, then On-going / Upcoming / Past groups, plus the FAQ |
| `/projects/[slug]` | Individual development pages |
| `/insights`, `/insights/[slug]` | Blog and buying guides |
| `/approach` · `/sustainability` · `/careers` · `/faq` | Supporting pages |
| `/contact` | Enquiry form — submissions land in the admin panel |
| `/admin` | Dashboard, CRM, Inquiries, Projects, Email List (sign-in required) |

## Getting started

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm run start   # serve the production build
```

The site runs without a backend — public pages fall back to the bundled
project data and form submissions are not stored. To enable the admin panel
and persist inquiries, follow [`docs/BACKEND.md`](docs/BACKEND.md).

## Where the content lives

| What | Where |
| --- | --- |
| Site name, nav, contact details, feature flags | `lib/site.ts` |
| Projects — fallback data, status→group mapping, teasers | `lib/projects.ts` |
| Projects — live, admin-managed | Supabase, read via `lib/projects-data.ts` |
| Blog posts | `lib/insights.ts` |
| FAQs | `lib/faqs.ts` |
| Image manifest | `lib/images.ts` |
| SEO helpers and JSON-LD | `lib/seo.ts` |

## Docs

- [`docs/BACKEND.md`](docs/BACKEND.md) — Supabase setup, the admin panel, security model
- [`docs/IMAGE-BRIEF.md`](docs/IMAGE-BRIEF.md) — outstanding image regeneration work
- [`docs/SEO-HANDOVER.md`](docs/SEO-HANDOVER.md) — SEO implementation notes

## Notes

- Remaining stock photography loads from the Unsplash CDN (allowed in
  `next.config.ts`). Replace the IDs in `lib/images.ts` with Makro's own
  photography as it becomes available.
- Project imagery is uploaded through `/admin/projects`, converted to WebP
  automatically, and served from Supabase Storage.
- The intro preloader runs on every full page load, doubling as cover while
  the hero video buffers.
