/**
 * Central image manifest.
 * Photography is curated to the Makro Developers imagery guideline:
 * precision, craftsmanship, premium quality — warm golden-hour architecture
 * and dramatic monochrome structural detail.
 */

/**
 * Fallback for an image that has no source yet — a project published from the
 * admin panel before its first upload. Without it, an empty id would build the
 * URL `…/photo-?…`, which 404s, and an undefined id would throw inside
 * next/image during server rendering.
 */
const PLACEHOLDER = "/brand/towers-render.jpg";

/** Already a usable URL: a local `/brand/…` path, or an uploaded asset's full URL. */
function isResolved(id: string): boolean {
  return id.startsWith("/") || id.startsWith("http");
}

export function unsplash(id: string | null | undefined, w = 1600, q = 90): string {
  if (!id) return PLACEHOLDER;
  if (isResolved(id)) return id;
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=${q}`;
}

/** 1200×630 crop for Open Graph / Twitter cards and structured-data images. */
export function ogImage(id: string | null | undefined): string {
  if (!id) return PLACEHOLDER;
  if (isResolved(id)) return id; // local brand asset (resolved via metadataBase)
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&h=630&q=80`;
}

/**
 * Client-supplied brand imagery (from `Branding-images/`, optimised into
 * public/brand). Each asset has an assigned editorial role — keep these
 * pairings when reusing:
 *  - mono*      dramatic B&W architecture (guideline "mono" treatment)
 *  - texture*   abstract rose-gold/copper brand visuals for concept pages
 *  - lifestyle* warm golden-hour interiors/exteriors (guideline "warm")
 */
export const BRAND = {
  monoCorner: "/brand/mono-corner.jpg", // upward building corner — ascent motif
  monoGrid: "/brand/mono-grid.jpg", // gridded façade — discipline, precision
  towersRender: "/brand/towers-render.jpg", // residential towers render
  texturePeaks: "/brand/texture-peaks.jpg", // peak-grid relief texture
  textureAscent: "/brand/texture-ascent.jpg", // ascending copper folds
  textureFlow: "/brand/texture-flow.jpg", // flowing copper lines
  textureWaves: "/brand/texture-waves.jpg", // rising layered curves
  lifestyleLoft: "/brand/lifestyle-loft.jpg", // warm loft living room
  lifestylePool: "/brand/lifestyle-pool.jpg", // poolside architecture, terracotta
  lifestyleSuite: "/brand/lifestyle-suite.jpg", // golden-hour suite, skyline view
  // Landscape 3:2 (1539×1022) — unlike the portrait lifestyle-* plates, so any
  // frame it sits in wants a landscape aspect. The subject sits left of centre,
  // which a narrow centre-crop would cut out entirely.
  aboutLifestyle: "/brand/about-lifestyle.webp", // client-supplied — About page editorial plate
  // Landscape 3:2 (1536×1024). The tower model is dead-centre, so the 4:3 frame
  // it sits in crops ~5% off each side without touching the subject.
  aboutFoundation: "/brand/about-foundation.webp", // client-supplied — About "Our Foundation"
  interludeFacade: "/brand/interlude-facade.jpg", // AI-generated (Higgsfield, July 2026) golden-hour facade — home interlude
  serviceResidential: "/brand/service-residential.jpg", // AI-generated (Higgsfield) terracotta residence — services card 01
  serviceCommercial: "/brand/service-commercial.jpg", // AI-generated (Higgsfield) dusk tower — services card 02
  serviceValue: "/brand/service-value.jpg", // AI-generated (Higgsfield) ascending facade steps — services card 03
  statementCorner: "/brand/statement-corner.jpg", // AI-generated (Higgsfield) terracotta corner rising like the twin peaks — home brand statement
  swTower: "/brand/sw-tower.jpg", // AI-generated (Higgsfield) golden-hour condominium tower — Selected Work cover panel
  swRooftop: "/brand/sw-rooftop.jpg", // AI-generated (Higgsfield) dusk rooftop amenity deck — Selected Work panel
  swBalcony: "/brand/sw-balcony.jpg", // AI-generated (Higgsfield) golden-hour private balcony — Selected Work panel
  whyCourtyard: "/brand/why-courtyard.jpg", // AI-generated (Higgsfield) terracotta courtyard — Why Makro still image
  /**
   * THE SHARE CARD. What WhatsApp, LinkedIn, Facebook, Slack and Google render
   * beside a link to this site — for most people the first Makro image they
   * ever see, before they have decided whether to click.
   *
   * It used to be textureAscent: abstract copper folds, beautiful in place on a
   * concept page and completely mute as a link preview. Somebody forwarding a
   * development to a buyer was sending them a picture of nothing. This is Makro
   * Heights, the flagship, with its own signage in frame — a property developer
   * should lead with a property.
   *
   * Cut from hero-architectural-poster.webp, which is frame 0 of the home hero
   * video, so the card and the page a visitor lands on are the same building at
   * the same hour.
   *
   * Deliberately 1200x630 and JPEG, neither of which is an accident:
   *   - 1.91:1 is the ratio every one of those scrapers crops to, so supplying
   *     it exactly means none of them chooses the crop for us.
   *   - JPEG, not the WebP the poster ships as. WhatsApp is how property links
   *     are actually passed around here, and its preview fetcher has never been
   *     reliable on WebP.
   *   - Cropped from the BOTTOM (podium and forecourt), never the top, which
   *     is the site's standing rule for cropping a building.
   */
  ogCard: "/brand/og-makro-heights.jpg", // 1200x630 — Makro Heights, the default share card
} as const;

export const IMG = {
  // Architectural exteriors
  angularGlass: "1487958449943-2429e8be8625",
  darkVilla: "1600585154340-be6161a56a0c",
  poolVilla: "1600596542815-ffad4c1539a9",
  terracottaVilla: "1580587771525-78b9dba3b914",
  whiteVillaPool: "1613490493576-7fde63acd811",
  woodFacade: "1600047509807-ba8f99d2cdde",
  duskHouse: "1494526585095-c41746248156",
  concreteLines: "1481253127861-534498168948",

  // Skyline / commercial
  skylineWarm: "1480714378408-67cf0d13bc1b",
  towersUp: "1486406146926-c627a92ad1ab",
  cityNight: "1470723710355-95304d8aece4",

  // Interiors / lifestyle
  warmLiving: "1600607687939-ce8a6c25118c",
  brightLiving: "1600566753086-00f18fb6b3ea",
  kitchen: "1600585152220-90363fe7e115",
  staircase: "1502005229762-cf1b2da7c5d6",
  doubleHeight: "1600210492486-724fe5c67fb0",
  penthouse: "1503174971373-b1f69850bded",
} as const;
