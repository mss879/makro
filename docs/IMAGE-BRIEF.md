# Image regeneration brief — client feedback, July 2026

Covers client comments **8** (the About portrait), **10** (Wheels Lanka), and
**B** ("some abstract images make it look very templative — can we use more
related images?").

## How image swapping works

Every image on the site resolves through one manifest:
[`lib/images.ts`](../lib/images.ts).

- `BRAND.*` → local files in `public/brand/`
- `IMG.*` → bare Unsplash photo IDs, expanded by `unsplash()`
- `unsplash()` passes through anything starting with `/` or `http`, so an
  Unsplash ID can be replaced by a local path with **no component changes**

Two consequences:
1. **Overwriting a file in `public/brand/` needs no code edit at all.**
2. Replacing an `IMG.*` Unsplash slot means adding a `BRAND` key and updating
   the one line that references it (listed per row below).

Note that the site applies a CSS treatment to every image — `.img-warm`
(`saturate .82 / contrast 1.04 / brightness .94`) or `.img-mono` — so judge a
raw generation knowing it will be pulled toward the palette on the page.

## Shared prompt suffix

Append to every prompt below:

> Sri Lankan tropical-modernist architecture, warm terracotta and rose-gold
> (#E2A388) accents against cream and deep charcoal, cinematic golden-hour
> light, editorial architectural photography, restrained and premium, no text,
> no watermark, photorealistic.

---

## Priority 1 — explicitly flagged by the client

### 8. About page portrait
- **Replace:** `public/brand/lifestyle-pool.jpg` — overwrite in place, no code change
- **Size:** 3:2 landscape, ≥1600 × 1067 (rendered 4:5 on mobile, 3:2 on desktop — keep the subject centred)
- **Prompt:** Resident in modest, elegant attire — loose linen shirt and trousers — standing beside the pool terrace of a warm, architecturally crafted home, seen from behind or three-quarter, calm evening light.

### 10. "Backed by the Wheels Lanka Group"
- **Replace:** `IMG.skylineWarm` (a generic Unsplash skyline)
- **New file:** `public/brand/group-wheels.jpg` → add `groupWheels` to `BRAND` in `lib/images.ts`, then point `app/about/page.tsx` (the `ParallaxImage` in the "Our Foundation" section) at it
- **Size:** 4:3, ≥1600 × 1200
- **Prompt:** Established corporate headquarters building in Colombo, dignified modern facade with warm evening interior glow, conveying institutional strength and permanence.
- **Better still:** ask the client for a real Wheels Lanka Group photograph. A generated building for a named parent company is the weakest link on that page.

---

## Priority 2 — the "templative" abstracts (comment B)

| Slot | Replace | Target file | Aspect | Prompt |
|---|---|---|---|---|
| Approach hero **+ home OG image** | `brand/texture-ascent.jpg` | overwrite | 16:9, 2200×1259 | Low-angle detail of a rising terracotta-toned residential tower facade, strong diagonal composition |
| FAQ hero | `brand/texture-flow.jpg` | overwrite | 16:9, 2200×1259 | Sunlit architectural corridor with rhythmic columns and soft shadows |
| Careers hero | `brand/texture-waves.jpg` | overwrite | 16:9, 2200×1259 | Construction team silhouettes reviewing plans on a high-rise floor at golden hour, city beyond |
| Insight cover (Grade-A offices) | `brand/texture-peaks.jpg` | overwrite | 3:2, ≥1600×1067 | Grade-A office tower lobby, double-height glass, warm brass details, Colombo business district |
| Approach steps 01–04 | `IMG.concreteLines`, `staircase`, `angularGlass`, `duskHouse` | `brand/approach-plan.jpg`, `-design.jpg`, `-build.jpg`, `-endure.jpg`; update `app/approach/page.tsx` | 4:5, ≥1200×1500 | **Plan:** architect's hands over site drawings and material samples · **Design:** sculptural staircase detail, warm minimalism · **Build:** concrete high-rise under construction, crane, dusk · **Endure:** finished residential tower at dusk, lit balconies, lived-in warmth |
| Home group-backing background + Contact hero/OG | `IMG.cityNight` | `brand/city-dusk.jpg`; update `components/home/GroupBacking.tsx` and `app/contact/page.tsx` | 16:9, ≥2200×1259 | Colombo skyline at dusk from elevation, warm city lights, cinematic haze — *rendered mono at 40% opacity, so it needs strong tonal contrast* |
| Insight covers | `IMG.warmLiving`, `IMG.skylineWarm` | `brand/insight-*.jpg`; update `lib/insights.ts` | 3:2 | Match each article: Colombo apartment interior · investment skyline · developer site visit |
| OG-only / Sustainability | `IMG.towersUp`, `whiteVillaPool`, `penthouse`, `woodFacade` | replace opportunistically | 1200×630 safe area | Topic-matched |

---

## Video

**No regeneration needed** — no client comment targets the hero video, and the
optimisation work below is already done.

The hero loop now ships as `public/hero-1080.mp4`: 1920×1080, no audio,
H.264 CRF 26, `+faststart`. That is **2.8 MB, down from the original 7.5 MB**
(SSIM 0.977 against the source — visually indistinguishable behind the hero's
gradient scrims). `public/brand/hero-poster.webp` (110 KB) is the first frame
and carries the first paint.

Two earlier files, `hero.mp4` and `Luxury_property_video_Makro_Heights_…mp4`,
were unreferenced and have been deleted (5.2 MB).

If the loop is ever re-exported, run it back through the same encode rather
than shipping the raw render:

```bash
ffmpeg -i SOURCE.mp4 -an -c:v libx264 -crf 26 -preset slow \
  -pix_fmt yuv420p -movflags +faststart public/hero-1080.mp4
ffmpeg -i public/hero-1080.mp4 -frames:v 1 -q:v 3 public/brand/hero-poster.jpg
cwebp -q 72 public/brand/hero-poster.jpg -o public/brand/hero-poster.webp
```

---

## Goal state

No Unsplash dependencies left in visible slots. Once that is true, the six
already-unused IDs in `lib/images.ts` (`darkVilla`, `poolVilla`,
`terracottaVilla`, `brightLiving`, `kitchen`, `doubleHeight`) can be deleted,
and the `images.remotePatterns` entry for `images.unsplash.com` in
`next.config.ts` can go with them.

## Project imagery from here on

Images for **projects** no longer belong in this manifest — they are uploaded
through the admin panel (`/admin/projects`), converted to WebP automatically,
and stored in Supabase. See [BACKEND.md](./BACKEND.md).
