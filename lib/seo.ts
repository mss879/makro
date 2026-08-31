import type { Metadata } from "next";
import { SITE, CREATOR } from "./site";
import { BRAND, ogImage } from "./images";
import type { Project } from "./projects";
import type { Insight } from "./insights";

/* ============================================================
   MAKRO DEVELOPERS — SEO utilities
   Central home for structured data (schema.org JSON-LD) and
   metadata builders so every page stays consistent and the
   client handover documentation maps 1:1 to this file.
   ============================================================ */

export function absoluteUrl(path = "/"): string {
  return `${SITE.url}${path === "/" ? "" : path}`;
}

/**
 * Whether this id is known to resolve to exactly 1200×630.
 *
 * Two ways it can be. A raw Unsplash id, because ogImage() asks for that crop
 * explicitly. Or BRAND.ogCard, which was cut to those pixels and committed at
 * that size — everything else under "/brand/…", and every uploaded asset URL,
 * passes through at whatever shape it happens to be.
 *
 * It matters because declaring og:image:width / :height lets a scraper lay the
 * card out from the tags alone; declaring them for an image that is NOT that
 * size is worse than declaring nothing, because the preview is then built
 * around a lie and the picture arrives letterboxed inside it.
 */
function hasCardDimensions(id: string): boolean {
  if (id === BRAND.ogCard) return true;
  return !id.startsWith("/") && !id.startsWith("http");
}

/** ogImage() resolved to an absolute URL for JSON-LD, where there is no
    metadataBase to resolve a local "/brand/…" path against. */
function absoluteOgImage(id: string): string {
  const src = ogImage(id);
  return src.startsWith("/") ? absoluteUrl(src) : src;
}

/**
 * Shared metadata builder — gives every page the same shape of
 * canonical URL, Open Graph and Twitter card data.
 */
export function pageMetadata({
  title,
  description,
  path,
  imageId,
  keywords,
  ogType = "website",
}: {
  title: string;
  description: string;
  path: string;
  imageId?: string;
  keywords?: string[];
  ogType?: "website" | "article";
}): Metadata {
  const url = absoluteUrl(path);
  // Every page ships a card image — pages without their own art fall back to
  // the Makro Heights card so link previews never render blank, and never
  // render an abstraction either.
  const id = imageId ?? BRAND.ogCard;
  const image = ogImage(id);
  const images = [
    hasCardDimensions(id) ? { url: image, width: 1200, height: 630 } : { url: image },
  ];
  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} · ${SITE.name}`,
      description,
      url,
      type: ogType,
      siteName: SITE.name,
      locale: "en_LK",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · ${SITE.name}`,
      description,
      images: [image],
    },
  };
}

/* ---------- schema.org builders ---------- */

const ORG_ID = `${SITE.url}/#organization`;
const SITE_ID = `${SITE.url}/#website`;

/** Organization — emitted once, site-wide, from the root layout. */
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE.name,
    legalName: SITE.legal,
    url: SITE.url,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/logo-black.png"),
    },
    slogan: SITE.tagline,
    description: SITE.description,
    email: SITE.email,
    telephone: SITE.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: "10, Esther Avenue, Park Road",
      addressLocality: "Colombo 05",
      addressCountry: "LK",
    },
    parentOrganization: {
      "@type": "Organization",
      name: SITE.parent,
    },
    areaServed: {
      "@type": "Country",
      name: "Sri Lanka",
    },
    knowsAbout: [
      "Property development",
      "Residential real estate",
      "Commercial real estate",
      "Luxury apartments",
      "Real estate investment",
    ],
  };
}

/** WebSite — emitted once, site-wide, from the root layout. */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": SITE_ID,
    name: SITE.name,
    url: SITE.url,
    publisher: { "@id": ORG_ID },
    // Attributes authorship of the site to the agency that built it.
    creator: { "@id": CREATOR_ID },
    inLanguage: "en",
  };
}

const CREATOR_ID = `${CREATOR.url}/#organization`;

/**
 * Organization node for ARC AI — the agency that designed & built this
 * site. Emitted site-wide from the root layout so the WebSite `creator`
 * reference resolves and the agency earns a schema-level attributed link.
 */
export function creatorSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": CREATOR_ID,
    name: CREATOR.name,
    url: CREATOR.url,
    description: CREATOR.tagline,
  };
}

/** LocalBusiness — contact page only, powers local search / map results. */
export function localBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "RealEstateAgent"],
    "@id": `${SITE.url}/#localbusiness`,
    name: SITE.name,
    url: SITE.url,
    image: absoluteUrl("/logo-black.png"),
    email: SITE.email,
    telephone: SITE.phone,
    priceRange: "$$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: "10, Esther Avenue, Park Road",
      addressLocality: "Colombo 05",
      addressCountry: "LK",
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "17:00",
    },
    parentOrganization: { "@id": ORG_ID },
  };
}

/** BreadcrumbList — every inner page. Pass ordered trail incl. current page. */
export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
      ...items.map((it, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: it.name,
        item: absoluteUrl(it.path),
      })),
    ],
  };
}

/** WebPage variants (AboutPage, ContactPage, CollectionPage…). */
export function webPageSchema({
  type = "WebPage",
  name,
  description,
  path,
}: {
  type?: "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage";
  name: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": type,
    name,
    description,
    url: absoluteUrl(path),
    isPartOf: { "@id": SITE_ID },
    about: { "@id": ORG_ID },
    inLanguage: "en",
  };
}

/** FAQPage — FAQ page (and any page with a Q&A block worth indexing). */
export function faqSchema(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/** ItemList of projects — the /projects collection page. */
export function projectListSchema(projects: Project[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Makro Developers — Property Developments in Sri Lanka",
    itemListElement: projects.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.name,
      url: absoluteUrl(`/projects/${p.slug}`),
    })),
  };
}

/** RealEstateListing — individual project pages. */
export function projectSchema(project: Project) {
  const url = absoluteUrl(`/projects/${project.slug}`);
  const isResidential = project.type !== "Commercial";
  /* The unit count lives in the admin-edited specs — find it by label rather
     than position, and only emit the property when the value actually holds
     a number ("~120" → 120; a "TBC" or missing spec is omitted). */
  const unitsSpec = project.specs.find((s) => /residence|unit/i.test(s.label));
  const units = Number(unitsSpec?.value.match(/\d+(?:\.\d+)?/)?.[0]);
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "@id": `${url}#listing`,
    name: project.name,
    description: project.summary,
    url,
    // Same empty-string trap as the page's openGraph image: a project with no
    // art must not advertise the shared placeholder as its own photograph in
    // structured data. Falls back to the site's share card.
    image: absoluteOgImage(project.cover || BRAND.ogCard),
    datePosted: `${project.year}-01-01`,
    provider: { "@id": ORG_ID },
    about: {
      "@type": isResidential ? "ApartmentComplex" : "Place",
      name: project.name,
      description: project.tagline,
      address: {
        "@type": "PostalAddress",
        streetAddress: project.location.split(",")[0].trim(),
        addressLocality: project.city,
        addressCountry: "LK",
      },
      ...(isResidential && Number.isFinite(units)
        ? { numberOfAccommodationUnits: { "@type": "QuantitativeValue", value: units } }
        : {}),
      amenityFeature: project.features.map((f) => ({
        "@type": "LocationFeatureSpecification",
        name: f,
        value: true,
      })),
    },
  };
}

/** Article — insight / guide pages. */
export function articleSchema(insight: Insight) {
  const url = absoluteUrl(`/insights/${insight.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: insight.title,
    description: insight.metaDescription,
    image: absoluteOgImage(insight.cover),
    url,
    datePublished: insight.date,
    dateModified: insight.date,
    inLanguage: "en",
    author: { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    articleSection: insight.category,
    keywords: insight.keywords.join(", "),
  };
}
