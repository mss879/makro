import "server-only";

import { createAnonSupabase } from "@/lib/supabase/server";
import { BRAND, unsplash } from "@/lib/images";
import type { SelectedWorkCardRow, SelectedWorkKind, SelectedWorkSettingsRow } from "@/lib/supabase/types";

/**
 * Server-side accessor for the home page "Selected Work" rail.
 *
 * The section is admin-managed (settings singleton + reorderable cards), but the
 * bundled defaults below reproduce the hardcoded component character-for-
 * character, so the marketing site renders identically before credentials exist
 * — and keeps rendering if the database is ever unreachable. They are the same
 * literals the migration seeds, so a configured project and an unconfigured one
 * show the same rail.
 *
 * Server Components import from here and pass the result to the client
 * component as props; `import type` erases at compile time, so the types below
 * are safe to name from a "use client" file even though this module is
 * server-only.
 */

export type { SelectedWorkKind };

/** Intro-panel and end-cap copy. The on/off toggle is hoisted out, onto the payload. */
export interface SelectedWorkSettings {
  indexLabel: string;
  eyebrow: string;
  /** The heading is stored in three parts because the highlight sits mid-sentence. */
  headingBefore: string;
  headingHighlight: string;
  headingAfter: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  scrollHint: string;
  endcapHeading: string;
  endcapLinkLabel: string;
  endcapHref: string;
}

export interface SelectedWorkCard {
  id: string;
  /** 'cover' draws the status pill, index numeral, kicker, title and hover caption; 'gallery' draws only the caption. */
  kind: SelectedWorkKind;
  /** Already resolved to a usable src — never a bare Unsplash id, never empty. */
  image: string;
  alt: string;
  indexLabel: string;
  statusBadge: string;
  kicker: string;
  title: string;
  caption: string;
  /** Effective link, already resolved from href/project_slug. Empty means render unlinked. */
  href: string;
}

export interface SelectedWorkSection {
  /** The client's on/off switch. False means the home page renders nothing here. */
  enabled: boolean;
  settings: SelectedWorkSettings;
  cards: SelectedWorkCard[];
}

/** Copy as the component hardcodes it today, matching the migration's settings seed. */
export const DEFAULT_SELECTED_WORK_SETTINGS: SelectedWorkSettings = {
  indexLabel: "02",
  eyebrow: "Selected Work",
  headingBefore: "A portfolio built on ",
  headingHighlight: "discipline",
  headingAfter: ", not haste.",
  body: "Every Makro project, regardless of scale or location, is measured against the same discipline in planning, engineering and execution. Makro Heights, our flagship residential development, is the first public demonstration of that standard.",
  ctaLabel: "View all projects",
  ctaHref: "/projects",
  scrollHint: "Scroll to explore →",
  endcapHeading: "See the full portfolio",
  endcapLinkLabel: "All projects →",
  endcapHref: "/projects",
};

/**
 * The three panels the rail renders today: the Makro Heights cover card plus two
 * gallery panels. Alt text is spelled out rather than derived — a gallery card
 * carries no title of its own, so nothing here could reconstruct the strings a
 * screen reader announces today.
 *
 * Ids are stable synthetic strings, not uuids: these rows have no database
 * identity, and React needs a key.
 */
export const FALLBACK_SELECTED_WORK_CARDS: SelectedWorkCard[] = [
  {
    id: "fallback-cover",
    kind: "cover",
    image: BRAND.swTower,
    alt: "Makro Heights",
    indexLabel: "01",
    statusBadge: "In Planning",
    kicker: "Residential · Dehiwala",
    title: "Makro Heights",
    caption: "The Standard Above, brought to Dehiwala.",
    href: "/projects/makro-heights",
  },
  {
    id: "fallback-rooftop",
    kind: "gallery",
    image: BRAND.swRooftop,
    alt: "Makro Heights — Rooftop amenity deck",
    indexLabel: "",
    statusBadge: "",
    kicker: "",
    title: "",
    caption: "Rooftop amenity deck",
    href: "/projects/makro-heights",
  },
  {
    id: "fallback-balcony",
    kind: "gallery",
    image: BRAND.swBalcony,
    alt: "Makro Heights — Large, usable private balconies",
    indexLabel: "",
    statusBadge: "",
    kicker: "",
    title: "",
    caption: "Large, usable private balconies",
    href: "/projects/makro-heights",
  },
];

/** The whole section as it renders with no database behind it. */
export const SELECTED_WORK_FALLBACK: SelectedWorkSection = {
  enabled: true,
  settings: DEFAULT_SELECTED_WORK_SETTINGS,
  cards: FALLBACK_SELECTED_WORK_CARDS,
};

function toSettings(row: SelectedWorkSettingsRow): SelectedWorkSettings {
  return {
    indexLabel: row.index_label,
    eyebrow: row.eyebrow,
    headingBefore: row.heading_before,
    headingHighlight: row.heading_highlight,
    headingAfter: row.heading_after,
    body: row.body,
    ctaLabel: row.cta_label,
    ctaHref: row.cta_href,
    scrollHint: row.scroll_hint,
    endcapHeading: row.endcap_heading,
    endcapLinkLabel: row.endcap_link_label,
    endcapHref: row.endcap_href,
  };
}

function toCard(row: SelectedWorkCardRow): SelectedWorkCard {
  // An explicit href wins; otherwise the soft project reference builds the link.
  // Both empty is legitimate — a purely decorative panel — and the component
  // renders it without a <Link>.
  const href = row.href.trim() || (row.project_slug.trim() ? `/projects/${row.project_slug.trim()}` : "");

  return {
    id: row.id,
    kind: row.kind,
    // Resolved here so the component never has to know whether the admin pasted
    // an Unsplash id, a /brand path or a Storage URL. An unset image resolves to
    // the placeholder rather than throwing inside next/image.
    image: unsplash(row.image),
    alt: row.alt,
    indexLabel: row.index_label,
    statusBadge: row.status_badge,
    kicker: row.kicker,
    title: row.title,
    caption: row.caption,
    href,
  };
}

/** The home page rail: the toggle, its copy, and the published cards in admin order. */
export async function getSelectedWork(): Promise<SelectedWorkSection> {
  const supabase = createAnonSupabase();
  if (!supabase) return SELECTED_WORK_FALLBACK;

  const [settingsRes, cardsRes] = await Promise.all([
    supabase.from("selected_work_settings").select("*").maybeSingle(),
    supabase
      .from("selected_work_cards")
      .select("*")
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  // The toggle outranks every fallback. Checked before the error branch on
  // purpose: if the cards query fails while the section is switched off, falling
  // back would put back on the home page exactly what the client just took down.
  if (!settingsRes.error && settingsRes.data && !settingsRes.data.enabled) {
    return { enabled: false, settings: toSettings(settingsRes.data), cards: [] };
  }

  if (settingsRes.error || cardsRes.error) {
    const message = settingsRes.error?.message ?? cardsRes.error?.message;
    console.error("[makro] Falling back to bundled selected work:", message);
    return SELECTED_WORK_FALLBACK;
  }

  // No settings row is not an error — the section has simply never been edited,
  // so it runs on the seeded copy, still enabled.
  const settings = settingsRes.data ? toSettings(settingsRes.data) : DEFAULT_SELECTED_WORK_SETTINGS;

  // No empty-result fallback for the cards, matching getProjects(). Once Supabase
  // is answering it is the source of truth, and unpublishing every card has to
  // actually empty the rail — otherwise the admin panel would say "0 published"
  // while the live site kept showing the seeded flagship, with no way to remove
  // it short of switching the whole section off.
  return { enabled: true, settings, cards: (cardsRes.data ?? []).map(toCard) };
}
