import "server-only";

import { createAnonSupabase } from "@/lib/supabase/server";
import { unsplash } from "@/lib/images";
import type { HomeHeroSettingsRow } from "@/lib/supabase/types";

/**
 * Server-side accessor for the home page hero — admin-managed since Sep 2026
 * (Home Hero in the panel; 20260929000100_home_hero.sql).
 *
 * Same contract as lib/selected-work-data.ts: the bundled default below is the
 * hero exactly as it shipped while it was hard-coded, and the migration seeds
 * the same values, so the page renders identically with no credentials, with
 * an unreachable database, and on a freshly migrated one.
 *
 * Server Components import from here and hand the result to the client
 * component as a prop; `import type` erases at compile time, so the types are
 * safe to name from a "use client" file even though this module is server-only.
 */

export type HomeHeroButton = { label: string; href: string };

export type HomeHero = {
  /** One entry per line of the <h1>. Never empty. */
  headingLines: string[];
  /** Empty hides the paragraph. */
  body: string;
  /** The filled button. Null when its label or link is empty. */
  primary: HomeHeroButton | null;
  /** The outlined button. Null when its label or link is empty. */
  secondary: HomeHeroButton | null;
  /** Landscape loop. With videoMobile also null, this is an image hero. */
  video: string | null;
  /** Portrait loop for phones. Falls back to `video`, and the other way round. */
  videoMobile: string | null;
  /** Already resolved to a usable src: the still under the video, or the hero itself. */
  image: string | null;
  imageMobile: string | null;
  /** Read only when the image IS the hero. */
  alt: string;
  /**
   * Whether the site's warm grade (.img-warm) goes over the picture. True only
   * while every file in use is one of the bundled ones below: that loop was
   * generated for the site and graded against the filter. Anything uploaded is
   * the client's own footage, which arrives graded — the rule every other hero
   * on the site follows (client, Aug 2026: nothing is added over project
   * imagery). Computed for the whole hero, never per file, so the still and
   * the video it hands over to can never disagree and jump at playback.
   */
  warm: boolean;
};

/** The loop and its first frame, as shipped in /public. */
export const BUNDLED_HERO_VIDEO = "/hero-architectural-1080.mp4";
export const BUNDLED_HERO_STILL = "/brand/hero-architectural-poster.webp";

const BUNDLED_MEDIA = new Set([BUNDLED_HERO_VIDEO, BUNDLED_HERO_STILL]);

/** The hero as it was hard-coded, matching the migration's seed. */
export const DEFAULT_HOME_HERO: HomeHero = {
  headingLines: ["The Future,", "Built to Endure."],
  body: "Thoughtfully planned residential and commercial developments, built for lasting value.",
  primary: { label: "Explore Projects", href: "/projects" },
  secondary: { label: "Book a Consultation", href: "/contact" },
  video: BUNDLED_HERO_VIDEO,
  videoMobile: null,
  image: BUNDLED_HERO_STILL,
  imageMobile: null,
  alt: "",
  warm: true,
};

/** Empty strings and whitespace become null, so the renderer tests one thing. */
function present(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * A button needs both halves. A label with no link would render as a button
 * to the page the visitor is already on; a link with no label is invisible.
 */
function button(label: string, href: string): HomeHeroButton | null {
  const l = label.trim();
  const h = href.trim();
  return l && h ? { label: l, href: h } : null;
}

function toHero(row: HomeHeroSettingsRow): HomeHero {
  const video = present(row.video);
  const videoMobile = present(row.video_mobile);
  const image = present(row.image);
  const imageMobile = present(row.image_mobile);

  const lines = (Array.isArray(row.heading_lines) ? row.heading_lines : [])
    .map((line) => (typeof line === "string" ? line.trim() : ""))
    .filter(Boolean);

  const media = [video, videoMobile, image, imageMobile].filter(
    (url): url is string => url !== null
  );

  return {
    // The database refuses an empty array but not an array of blanks, which
    // only a hand-written UPDATE could produce. The page's only <h1> is not
    // worth risking on that, so it falls back rather than rendering empty.
    headingLines: lines.length ? lines : DEFAULT_HOME_HERO.headingLines,
    body: row.body.trim(),
    primary: button(row.primary_label, row.primary_href),
    secondary: button(row.secondary_label, row.secondary_href),
    video,
    videoMobile,
    // Resolved here so the component never has to know whether the admin
    // pasted an Unsplash id, a /brand path or a Storage URL.
    image: image ? unsplash(image) : null,
    imageMobile: imageMobile ? unsplash(imageMobile) : null,
    alt: row.alt.trim(),
    warm: media.length > 0 && media.every((url) => BUNDLED_MEDIA.has(url)),
  };
}

/** The home page hero. Never throws; falls back to the shipped hero. */
export async function getHomeHero(): Promise<HomeHero> {
  const supabase = createAnonSupabase();
  if (!supabase) return DEFAULT_HOME_HERO;

  const { data, error } = await supabase.from("home_hero_settings").select("*").maybeSingle();

  if (error) {
    console.error("[makro] Falling back to the bundled home hero:", error.message);
    return DEFAULT_HOME_HERO;
  }

  // No row is not an error: the hero has never been saved (or the row was
  // deleted by hand), so it runs on the shipped copy.
  return data ? toHero(data) : DEFAULT_HOME_HERO;
}
