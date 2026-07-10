/**
 * Central image manifest.
 * Photography is curated to the Makro Developers imagery guideline:
 * precision, craftsmanship, premium quality — warm golden-hour architecture
 * and dramatic monochrome structural detail.
 */

export function unsplash(id: string, w = 1600, q = 80): string {
  if (id.startsWith("/")) return id; // local brand asset — serve as-is
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=${q}`;
}

/** 1200×630 crop for Open Graph / Twitter cards and structured-data images. */
export function ogImage(id: string): string {
  if (id.startsWith("/")) return id; // local brand asset (resolved via metadataBase)
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
