import { BRAND } from "./images";

export type ProjectStatus = "Completed" | "Now Selling" | "Under Construction" | "In Planning";

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
    status: "In Planning",
    year: "2026",
    cover: BRAND.towersRender,
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
