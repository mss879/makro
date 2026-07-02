# Makro Developers — Website

A high-end, animated marketing website for **Makro Developers**, a Sri Lankan
property developer and subsidiary of the Wheels Lanka Group.

Built strictly to the official **Makro Developers Brand Identity Guide**:

- **Palette** — Pure Black `#050203`, Pure White `#FFFFFF`, Rose Gold `#E2A388`, applied at the guideline's 70 / 20 / 10 ratio.
- **Type** — Cormorant Garamond (a refined, high-contrast serif in the spirit of the brand's *TAN Garland*) for display, **Rosario** for body — exactly as specified.
- **Logomark** — the twin-peaks "M" is recreated as clean SVG and used throughout (nav, preloader, 3D hero, watermarks, bullets, favicon).
- **Voice** — expertise, quiet confidence and assurance, per the guideline.
- **Imagery** — warm golden-hour and dramatic monochrome architecture, tonally unified with a brand image treatment.

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS v4** (brand design tokens in `app/globals.css`)
- **GSAP + ScrollTrigger** (`@gsap/react`) — reveals, pinned horizontal gallery, counters, marquee, preloader
- **Three.js + React Three Fiber + drei** — the metallic twin-peak WebGL hero
- **Lenis** — smooth scrolling

## Pages

| Route | Description |
| --- | --- |
| `/` | Home — 9 sections incl. WebGL hero, pinned project gallery, differentiators, testimonials |
| `/about` | Company story, values, Wheels Lanka Group, timeline |
| `/projects` | Filterable portfolio grid |
| `/projects/[slug]` | Individual development pages (6, statically generated) |
| `/approach` | Process, services and standards |
| `/sustainability` | Commitments and practices |
| `/contact` | Enquiry form with validation and success state |

## Getting started

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm run start   # serve the production build
```

## Notes

- Photography is loaded from the Unsplash CDN (configured in `next.config.ts`).
  Swap the IDs in `lib/images.ts` for Makro's own project photography when available.
- Copy for every page lives in `lib/site.ts`, `lib/projects.ts` and within each page.
- The intro preloader shows once per browser session.
