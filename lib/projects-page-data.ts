import "server-only";

import { createAnonSupabase } from "@/lib/supabase/server";
import { getProjects } from "@/lib/projects-data";
import type { Project } from "@/lib/projects";
import type {
  ProjectsPageHeroSlideRow,
  ProjectsPageSettingsRow,
} from "@/lib/supabase/types";

/**
 * Server-side accessor for the three admin-controlled sections that sit above
 * the portfolio index on /projects: the full-screen hero, the scroll-revealed
 * intro, and the curated carousel.
 *
 * Same contract as lib/projects-data.ts — the marketing site has to render
 * before Supabase credentials exist and keep rendering if the database is
 * unreachable, so every accessor here falls back to the bundled defaults below
 * rather than throwing or returning nothing.
 */

export type ProjectsPageHeroSlide = {
  id: string;
  image: string | null;
  alt: string;
  heading: string;
  body: string;
};

export type ProjectsPageContent = {
  hero: {
    enabled: boolean;
    autoplay: boolean;
    intervalMs: number;
    showDots: boolean;
    slides: ProjectsPageHeroSlide[];
  };
  intro: {
    enabled: boolean;
    eyebrow: string;
    body: string[];
  };
  carousel: {
    enabled: boolean;
    eyebrow: string;
    heading: string;
    /** Already ordered and filtered to published projects. */
    projects: Project[];
  };
};

/**
 * What /projects renders with no database behind it. Mirrors the seed in
 * 20260803000900_projects_page.sql, so a configured and an unconfigured install
 * open on the same page rather than diverging the moment credentials land.
 */
export const DEFAULT_PROJECTS_PAGE: Omit<ProjectsPageContent, "carousel"> & {
  carousel: Omit<ProjectsPageContent["carousel"], "projects">;
} = {
  hero: {
    enabled: true,
    autoplay: true,
    intervalMs: 6000,
    showDots: true,
    slides: [
      {
        id: "default-hero",
        // Landscape (1920x1080). towers-render.jpg is 819x1024 PORTRAIT and
        // was being upscaled ~1.8x and cropped to a band across this
        // full-screen panel, which read as an empty grey slab.
        image: "/brand/hero-architectural-poster.webp",
        alt: "A Makro development at dusk",
        heading: "Developments built to last.",
        body: "Residential and commercial projects across Sri Lanka — each delivered to a standard you can feel.",
      },
    ],
  },
  intro: {
    enabled: true,
    eyebrow: "Our Portfolio",
    body: [
      "Every Makro development begins the same way — with disciplined planning, a site studied properly, and a brief that refuses to trade long-term value for a faster launch.",
      "What follows is the portfolio that discipline produces: residential and commercial projects across Sri Lanka, each built to a standard you can feel long after handover.",
    ],
  },
  carousel: {
    // Off by default (client, Aug 2026). It sat directly above the portfolio
    // index showing the same developments a second time, which read as the
    // page repeating itself. The section is intact and switchable from
    // /admin/projects/carousel — this is the default a database that has never
    // been touched falls back to, not a deletion.
    enabled: false,
    eyebrow: "",
    heading: "Our Projects",
  },
};

function toSlide(row: ProjectsPageHeroSlideRow): ProjectsPageHeroSlide {
  return {
    id: row.id,
    // Normalised to null so the renderer's single `slide.image ?` branch covers
    // both "column is null" and "column is an empty string left by a cleared
    // upload field".
    image: row.image && row.image.trim() ? row.image : null,
    alt: row.alt,
    heading: row.heading,
    body: row.body,
  };
}

export async function getProjectsPageContent(): Promise<ProjectsPageContent> {
  const fallback: ProjectsPageContent = {
    ...DEFAULT_PROJECTS_PAGE,
    carousel: { ...DEFAULT_PROJECTS_PAGE.carousel, projects: [] },
  };

  const supabase = createAnonSupabase();
  if (!supabase) {
    // Unconfigured: show the bundled projects in the carousel so the section is
    // not an empty rail on a local run or a pre-backend client demo.
    return { ...fallback, carousel: { ...fallback.carousel, projects: await getProjects() } };
  }

  const [settingsRes, slidesRes, carouselRes, projects] = await Promise.all([
    supabase.from("projects_page_settings").select("*").maybeSingle(),
    supabase
      .from("projects_page_hero_slides")
      .select("*")
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    // Embedded select, not a bare project_id: getProjects() returns Project,
    // which is keyed by slug and carries no uuid, so the join has to hand back
    // something the two sides can actually be matched on. This is what the FK
    // Relationship tuple in lib/supabase/types.ts is declared for.
    supabase
      .from("projects_page_carousel_items")
      .select("sort_order, projects(slug)")
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    getProjects(),
  ]);

  if (settingsRes.error) {
    console.error("[makro] Falling back to bundled projects page:", settingsRes.error.message);
    return { ...fallback, carousel: { ...fallback.carousel, projects } };
  }

  const settings = settingsRes.data as ProjectsPageSettingsRow | null;

  // No settings row means the section has never been edited, so the seeded
  // copy is what the page should show — not a blank hero.
  const hero = {
    enabled: settings?.hero_enabled ?? DEFAULT_PROJECTS_PAGE.hero.enabled,
    autoplay: settings?.hero_autoplay ?? DEFAULT_PROJECTS_PAGE.hero.autoplay,
    intervalMs: settings?.hero_interval_ms ?? DEFAULT_PROJECTS_PAGE.hero.intervalMs,
    showDots: settings?.hero_show_dots ?? DEFAULT_PROJECTS_PAGE.hero.showDots,
    // An admin who deletes every slide has deliberately emptied the hero, so
    // once the query succeeds its result stands — same reasoning as
    // getProjects() refusing an empty-result fallback. The bundled slide is
    // only for the error and unconfigured paths above.
    slides: slidesRes.error
      ? DEFAULT_PROJECTS_PAGE.hero.slides
      : ((slidesRes.data ?? []) as ProjectsPageHeroSlideRow[]).map(toSlide),
  };

  const intro = {
    enabled: settings?.intro_enabled ?? DEFAULT_PROJECTS_PAGE.intro.enabled,
    eyebrow: settings?.intro_eyebrow ?? DEFAULT_PROJECTS_PAGE.intro.eyebrow,
    body: Array.isArray(settings?.intro_body)
      ? settings.intro_body
      : DEFAULT_PROJECTS_PAGE.intro.body,
  };

  // Resolve the curated order against getProjects(), so the carousel inherits
  // that function wholesale — gallery assembly, cover fallback, error handling
  // — instead of re-deriving a second, subtly different Project shape here.
  const bySlug = new Map(projects.map((p) => [p.slug, p]));
  const curated = carouselRes.error
    ? []
    : ((carouselRes.data ?? []) as { projects: { slug: string } | null }[])
        .map((row) => (row.projects ? bySlug.get(row.projects.slug) : undefined))
        // Drops entries whose project has since been unpublished. RLS already
        // hides most of them; this covers the rest, and `undefined` here would
        // otherwise render as a blank card.
        .filter((p): p is Project => Boolean(p));

  return {
    hero,
    intro,
    carousel: {
      enabled: settings?.carousel_enabled ?? DEFAULT_PROJECTS_PAGE.carousel.enabled,
      eyebrow: settings?.carousel_eyebrow ?? DEFAULT_PROJECTS_PAGE.carousel.eyebrow,
      heading: settings?.carousel_heading ?? DEFAULT_PROJECTS_PAGE.carousel.heading,
      // No empty-result fallback once the query succeeded: an admin who empties
      // the carousel must actually empty it, exactly as unpublishing every
      // project has to empty the portfolio index below.
      projects: carouselRes.error ? projects : curated,
    },
  };
}
