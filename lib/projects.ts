import { BRAND } from "./images";

export type ProjectStatus = "Upcoming" | "On-going" | "Delivered";

export interface Project {
  slug: string;
  name: string;
  tagline: string;
  /** Full address line for the detail hero (street, city, country). */
  location: string;
  /** City alone — grid cards and the home flagship card show city, not street. */
  city: string;
  type: "Residential" | "Commercial" | "Mixed-Use";
  status: ProjectStatus;
  year: string;
  cover: string;
  /**
   * Full-bleed art for the detail-page hero, set independently of the gallery
   * (client direction, Aug 2026). Falls back to `cover` when unset — the shot
   * that works behind a headline is rarely the one that works as a card.
   */
  heroImage: string;
  /**
   * Portrait art for the same hero on phones (client direction, Sep 2026). A
   * full-screen 16:9 master is cropped to about a third of its width on a
   * 390px phone, which is a different photograph rather than the same one
   * shifted — hence a second file. "" falls back to `heroImage`.
   */
  heroImageMobile: string;
  /** Catalogue PDF URL, or "" when the project has none. Empty hides the download. */
  catalogueUrl: string;
  /** Filename offered to the visitor. Empty falls back to a name built from the project. */
  catalogueName: string;
  gallery: string[];
  /** Short display heading for the detail page. */
  headline: string;
  /** Longer copy used for SEO meta descriptions. */
  summary: string;
  description: string[];
  specs: { label: string; value: string }[];
  /** Optional qualifier rendered under the At-a-glance spec list. */
  specsNote?: string;
  features: string[];
}

export const PROJECTS: Project[] = [
  {
    slug: "makro-heights",
    name: "Makro Heights",
    tagline: "The Standard Above, brought to Dehiwala.",
    location: "Rohini Place, Dehiwala, Sri Lanka",
    city: "Dehiwala",
    type: "Residential",
    status: "Upcoming",
    year: "2026",
    cover: BRAND.towersRender,
    heroImage: BRAND.towersRender,
    // No bundled portrait render exists, and inventing one by pointing at a
    // landscape asset would defeat the point. "" is the correct empty state.
    heroImageMobile: "",
    catalogueUrl: "",
    catalogueName: "",
    gallery: [BRAND.towersRender, BRAND.monoCorner, BRAND.lifestyleSuite],
    headline: "Approximately 120 residences. One uncompromising standard.",
    summary:
      "An upmarket, attainable condominium of approximately 120 two- and three-bedroom residences, planned around efficient layouts, premium specification and long-term value.",
    description: [
      "Makro Heights rises on Rohini Place in Dehiwala, moments from Colombo and positioned as the flagship demonstration of the Makro Developers philosophy — The Standard Above, applied without compromise. Set across approximately 41.8 perches with over 32 metres of frontage, the development is planned as G+15 storeys, with two levels of parking beneath and rooftop amenities above.",
      "The apartment mix is deliberately restrained: predominantly two-bedroom residences of around 1,150 sq. ft., supported by three-bedroom homes between 1,450 and 1,550 sq. ft. There are no studios and no one-bedroom units — a decision made for stronger end-user demand, greater family appeal and better long-term resale value.",
      "Every layout is planned to maximise saleable space and minimise wasted circulation, supported by reinforced concrete construction, disciplined parking provision and vertical transportation sized for genuine day-to-day comfort. Makro Heights is designed to be timeless rather than trend-led — a home whose value compounds over decades, not one that competes against the next new tower.",
    ],
    specs: [
      { label: "Residences", value: "~120" },
      { label: "Typologies", value: "2 & 3 Bed" },
      { label: "Floors", value: "G+15" },
      { label: "Completion", value: "TBC" },
    ],
    specsNote:
      "Approx. 3.5-year construction programme once commenced.",
    features: [
      "Rooftop amenity deck",
      "Grand ground-floor arrival lobby",
      "Three lifts, including a dedicated fire lift",
      "Large, usable private balconies",
      "Two levels of resident and visitor parking",
      "Efficient layouts, minimal wasted space",
    ],
  },
];

export function getProject(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}

export const PROJECT_SLUGS = PROJECTS.map((p) => p.slug);

/* ---------- Status grouping ----------
   The portfolio index is segregated by where a development sits in its
   life, not by its marketing status. The group is derived from
   `status` so a project never carries two sources of truth. */

/* THREE groups, one per status (client, Aug 2026 — supersedes the earlier
   two-group split).

   The index used to fold Upcoming and On-going together under "In Progress",
   on the reasoning that a buyer does not distinguish between a tower being
   built and one in planning. The client does distinguish, and the practical
   consequence was that the word "Upcoming" appeared nowhere on the site while
   the only development they have is upcoming — so the portfolio read as though
   it had nothing in it.

   The group IS the status now. There is no mapping table any more because
   there is nothing left to map: keeping an identity Record around would be a
   join waiting to drift out of step with the union beside it. */
export type ProjectGroup = ProjectStatus;

/** Render order — the lifecycle, in the order the client listed it. */
export const GROUP_ORDER: ProjectGroup[] = ["Upcoming", "On-going", "Delivered"];

/** Anchor ids for the in-page jump. Kept beside the group definition so a
    renamed group can never drift from the id the dropdown scrolls to. */
export const GROUP_SLUG: Record<ProjectGroup, string> = {
  "Upcoming": "upcoming",
  "On-going": "on-going",
  "Delivered": "delivered",
};

export function projectsInGroup(g: ProjectGroup, list: Project[] = PROJECTS): Project[] {
  return list.filter((p) => p.status === g);
}

/**
 * Named-but-unrevealed work. Deliberately NOT part of PROJECTS — a teaser
 * has no slug and no detail page, so it can never reach the sitemap, the
 * static params or the project JSON-LD.
 *
 * NOT CURRENTLY RENDERED. Its only consumer was the /projects index strip,
 * removed in Aug 2026 at the client's request. Kept because it is content, not
 * code — if a "more in motion" strip is wanted back, this is the data for it.
 */
export interface Teaser {
  name: string;
  type: Project["type"];
  city: string;
  note: string;
}

export const TEASERS: Teaser[] = [
  { name: "Colombo Residential", type: "Residential", city: "Colombo", note: "Details to be announced" },
  { name: "Commercial Development", type: "Commercial", city: "Colombo", note: "Details to be announced" },
];
