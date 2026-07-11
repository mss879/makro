import type { Metadata } from "next";
import { SITE, CREATOR } from "./site";
import { ogImage } from "./images";
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
  const images = imageId ? [{ url: ogImage(imageId), width: 1200, height: 630 }] : undefined;
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
      images: imageId ? [ogImage(imageId)] : undefined,
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
      addressLocality: "Colombo 07",
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
      addressLocality: "Colombo 07",
      addressCountry: "LK",
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00",
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
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "@id": `${url}#listing`,
    name: project.name,
    description: project.summary,
    url,
    image: ogImage(project.cover),
    datePosted: `${project.year}-01-01`,
    provider: { "@id": ORG_ID },
    about: {
      "@type": isResidential ? "ApartmentComplex" : "Place",
      name: project.name,
      description: project.tagline,
      address: {
        "@type": "PostalAddress",
        addressLocality: project.location.split(",")[0].trim(),
        addressCountry: "LK",
      },
      ...(isResidential
        ? { numberOfAccommodationUnits: { "@type": "QuantitativeValue", value: project.specs[0]?.value } }
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
    image: ogImage(insight.cover),
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
