import { IMG } from "./images";

export type ProjectStatus = "Completed" | "Now Selling" | "Under Construction" | "In Planning";

export interface Project {
  slug: string;
  name: string;
  tagline: string;
  location: string;
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
  features: string[];
}

export const PROJECTS: Project[] = [
  {
    slug: "the-ridgeline-residences",
    name: "The Ridgeline Residences",
    tagline: "Elevated living above the city line",
    location: "Colombo 07, Sri Lanka",
    type: "Residential",
    status: "Now Selling",
    year: "2026",
    cover: IMG.darkVilla,
    gallery: [IMG.darkVilla, IMG.doubleHeight, IMG.staircase, IMG.warmLiving],
    headline: "48 residences. One private address.",
    summary:
      "A collection of 48 architect-designed residences where structural clarity meets the quiet luxury of a private address.",
    description: [
      "The Ridgeline Residences rise from one of Colombo's most established neighbourhoods, offering 48 homes that treat space, light and privacy as the true measures of luxury.",
      "Every residence is planned around a double-height living volume, floor-to-ceiling glazing and cross-ventilation engineered for the tropical climate — comfort that is designed in, not added on.",
      "Delivered to international standards of construction and finished with materials chosen to age gracefully, Ridgeline is built for the way its owners will live for decades to come.",
    ],
    specs: [
      { label: "Residences", value: "48" },
      { label: "Typologies", value: "2 · 3 · 4 Bed" },
      { label: "Floors", value: "22" },
      { label: "Completion", value: "Q4 2026" },
    ],
    features: [
      "Double-height living volumes",
      "Private residents' sky lounge",
      "24-hour concierge & security",
      "Climate-tuned cross ventilation",
      "Landscaped podium gardens",
      "Two-level residents' parking",
    ],
  },
  {
    slug: "serein-waterfront",
    name: "Serein Waterfront",
    tagline: "Where the coastline becomes an address",
    location: "Galle, Southern Province",
    type: "Residential",
    status: "Under Construction",
    year: "2027",
    cover: IMG.terracottaVilla,
    gallery: [IMG.terracottaVilla, IMG.poolVilla, IMG.brightLiving, IMG.penthouse],
    headline: "Villas that frame the ocean.",
    summary:
      "Limited-edition waterfront villas that frame the Indian Ocean and the warmth of the southern light.",
    description: [
      "Serein is a private enclave of 16 waterfront villas on Sri Lanka's southern coast, designed for those who measure success in mornings, not square feet.",
      "Warm masonry, deep shaded terraces and infinity edges dissolve the line between the home and the ocean beyond, while a considered material palette holds its own against sun and salt air.",
      "Each villa is a long-term asset — thoughtfully planned, robustly built and positioned on a coastline where good land is finite.",
    ],
    specs: [
      { label: "Villas", value: "16" },
      { label: "Plot Sizes", value: "18 – 32 perch" },
      { label: "Frontage", value: "Direct waterfront" },
      { label: "Completion", value: "2027" },
    ],
    features: [
      "Private infinity pools",
      "Direct ocean frontage",
      "Shaded coastal terraces",
      "Solar-assisted services",
      "Gated private enclave",
      "Rainwater harvesting",
    ],
  },
  {
    slug: "altair-commercial-tower",
    name: "Altair Commercial Tower",
    tagline: "A vertical address for ambitious businesses",
    location: "Colombo 02, Sri Lanka",
    type: "Commercial",
    status: "Under Construction",
    year: "2027",
    cover: IMG.towersUp,
    gallery: [IMG.towersUp, IMG.angularGlass, IMG.skylineWarm, IMG.brightLiving],
    headline: "Grade-A space, built to perform.",
    summary:
      "Grade-A office floors engineered for performance, wellbeing and the businesses shaping Sri Lanka's next decade.",
    description: [
      "Altair delivers 26 floors of Grade-A commercial space in the heart of Colombo's business district, built to the specifications global occupiers expect.",
      "Column-light floor plates, efficient cores and generous natural light give tenants flexibility today and adaptability tomorrow, while high-performance glazing keeps running costs measured.",
      "For owners and occupiers alike, Altair is an investment in a location that only grows more valuable.",
    ],
    specs: [
      { label: "Floors", value: "26" },
      { label: "Floor Plate", value: "12,400 sq ft" },
      { label: "Rating", value: "Grade A" },
      { label: "Completion", value: "2027" },
    ],
    features: [
      "Column-light floor plates",
      "High-performance façade",
      "Destination-control lifts",
      "Backup power & water",
      "Ground-floor retail arcade",
      "EV-ready parking levels",
    ],
  },
  {
    slug: "meridian-park-homes",
    name: "Meridian Park Homes",
    tagline: "Family life, thoughtfully planned",
    location: "Battaramulla, Sri Lanka",
    type: "Residential",
    status: "Completed",
    year: "2023",
    cover: IMG.whiteVillaPool,
    gallery: [IMG.whiteVillaPool, IMG.kitchen, IMG.doubleHeight, IMG.woodFacade],
    headline: "Family homes, delivered as promised.",
    summary:
      "A completed community of 32 family homes proving that quality construction and everyday comfort belong together.",
    description: [
      "Meridian Park is a completed gated community of 32 homes designed around family life — generous kitchens, flexible rooms and shared green space that neighbours actually use.",
      "Handed over on schedule and to specification, Meridian is the kind of project that quietly makes the case for Makro: it does what it promised, and it lasts.",
      "Today it stands fully occupied — a working reference for how we plan, build and deliver.",
    ],
    specs: [
      { label: "Homes", value: "32" },
      { label: "Typologies", value: "3 · 4 Bed" },
      { label: "Status", value: "Handed over" },
      { label: "Delivered", value: "2023" },
    ],
    features: [
      "Gated family community",
      "Shared landscaped parkland",
      "Solar-ready rooftops",
      "Dedicated children's play area",
      "Fibre-ready connectivity",
      "Covered household parking",
    ],
  },
  {
    slug: "the-atelier-lofts",
    name: "The Atelier Lofts",
    tagline: "Design-led homes for the way you work now",
    location: "Colombo 05, Sri Lanka",
    type: "Mixed-Use",
    status: "Now Selling",
    year: "2026",
    cover: IMG.duskHouse,
    gallery: [IMG.duskHouse, IMG.staircase, IMG.warmLiving, IMG.penthouse],
    headline: "A vertical neighbourhood.",
    summary:
      "Loft-style residences above a curated ground floor of studios, cafés and workspace — a small vertical neighbourhood.",
    description: [
      "The Atelier Lofts reimagines the mixed-use building as a neighbourhood in miniature: flexible loft residences above a curated ground plane of studios, cafés and shared workspace.",
      "Raw-but-refined interiors, tall windows and adaptable layouts suit founders, creatives and anyone who no longer separates where they live from where they work.",
      "It is compact, considered and characteristic of a developer that plans for how people actually live.",
    ],
    specs: [
      { label: "Lofts", value: "38" },
      { label: "Ground Floor", value: "Retail & studio" },
      { label: "Ceilings", value: "Up to 3.6m" },
      { label: "Completion", value: "Q2 2026" },
    ],
    features: [
      "Double-volume loft layouts",
      "Ground-floor café & studios",
      "Shared co-working lounge",
      "Oversized industrial glazing",
      "Secure bicycle storage",
      "Rooftop residents' terrace",
    ],
  },
  {
    slug: "horizon-business-quarter",
    name: "Horizon Business Quarter",
    tagline: "A landmark for a growing capital",
    location: "Rajagiriya, Sri Lanka",
    type: "Commercial",
    status: "In Planning",
    year: "2028",
    cover: IMG.skylineWarm,
    gallery: [IMG.skylineWarm, IMG.cityNight, IMG.towersUp, IMG.angularGlass],
    headline: "A masterplanned city gateway.",
    summary:
      "A masterplanned commercial quarter combining office, retail and public realm at one of Colombo's key gateways.",
    description: [
      "Horizon Business Quarter is Makro's most ambitious undertaking — a masterplanned destination bringing office, retail and generous public realm to a strategic gateway into Colombo.",
      "Planned in phases, it is designed to grow with the city: pedestrian-first streets, shaded plazas and buildings that hold a long-term view of value.",
      "It is the clearest expression of our purpose — to shape how Sri Lanka lives and works, and to build it well.",
    ],
    specs: [
      { label: "Site", value: "4.2 acres" },
      { label: "Programme", value: "Office · Retail" },
      { label: "Phases", value: "3" },
      { label: "First Phase", value: "2028" },
    ],
    features: [
      "Masterplanned public realm",
      "Pedestrian-first streets",
      "Mixed office & retail",
      "Structured shared parking",
      "Green plazas & shade",
      "Phased, future-ready delivery",
    ],
  },
];

export function getProject(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}

export const PROJECT_SLUGS = PROJECTS.map((p) => p.slug);
