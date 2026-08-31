/**
 * Resolves the canonical origin, defaulting to the live domain.
 *
 * NEXT_PUBLIC_SITE_URL exists so a staging or preview deployment can advertise
 * its own origin instead of claiming to be production. It is deliberately
 * NARROW: only a well-formed `https://` origin is honoured.
 *
 * That guard is the whole point. This variable is set to http://localhost:3000
 * in local .env files, and without the check a production build run from a
 * developer machine would ship `<link rel="canonical" href="http://localhost:3000/...">`
 * on every page — an error that builds green, deploys clean, and quietly tells
 * Google the whole site lives on a host it cannot reach. Anything that is not
 * an https origin falls back to the real domain, so the failure mode is
 * "ignored the override", never "published the wrong domain".
 */
function canonicalOrigin(): string {
  const PRODUCTION = "https://makrodevelopers.com";
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return PRODUCTION;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return PRODUCTION;
    // origin drops any path, query or trailing slash the variable carried.
    return url.origin;
  } catch {
    return PRODUCTION;
  }
}

export const SITE = {
  name: "Makro Developers",
  legal: "Makro Developers (Pvt) Ltd",
  parent: "Wheels Lanka Group",
  /**
   * The line the home page hero actually says. It is NOT decoration: it is the
   * Open Graph title on every share of this site, the Organization `slogan` in
   * structured data, and what the chat agent is told the company stands for.
   *
   * It read "The future built well." for a month after the hero had already
   * been rewritten to "The Future, Built to Endure." — so every link anyone
   * shared, and every card Google or WhatsApp rendered, quoted a strapline that
   * appeared nowhere on the site. Changing the hero means changing this, and
   * the footer reads it from here rather than repeating it for exactly that
   * reason.
   */
  tagline: "The Future, Built to Endure.",
  /**
   * ≤160 characters, because this is the meta description on every page that
   * does not write its own. Carries the hero's promise ("thoughtfully planned",
   * "lasting value") rather than a separate sentence written months apart from
   * it, plus the two things that have to be in it for search: where, and who
   * owns them.
   */
  description:
    "Thoughtfully planned residential and commercial developments in Colombo and across Sri Lanka, built for lasting value. A Wheels Lanka Group company.",
  email: "info@makrodevelopers.com",
  phone: "+94 707 21 21 21",
  address: "10, Esther Avenue, Park Road, Colombo 05",
  /**
   * Canonical origin. Everything SEO-facing derives from this one string —
   * canonical links, the sitemap, robots.txt, Open Graph URLs and every
   * schema.org @id — so it has to be the origin the site is actually served
   * from, with no trailing slash.
   */
  url: canonicalOrigin(),
};

export const NAV = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Projects", href: "/projects" },
  { label: "Blog", href: "/insights" },
  { label: "Contact", href: "/contact" },
];

/** Secondary pages surfaced in the footer rather than the main nav. */
export const NAV_SECONDARY = [
  { label: "Approach", href: "/approach" },
  { label: "Sustainability", href: "/sustainability" },
  { label: "FAQ", href: "/faq" },
  { label: "Careers", href: "/careers" },
];

export const NAV_LEGAL = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms of Use", href: "/terms-of-use" },
];

/**
 * `icon` names a glyph in components/brand/SocialIcon — the contact page
 * renders the mark rather than the label (client direction, Aug 2026:
 * "include icon and make it more graphic instead of just buttons"), while
 * the footer's Connect column still lists them by name.
 */
export const SOCIALS = [
  { label: "Instagram", href: "#", icon: "instagram" },
  { label: "LinkedIn", href: "#", icon: "linkedin" },
  { label: "Facebook", href: "#", icon: "facebook" },
] as const;

/** Section toggles — client-requested hides that may return. */
export const FEATURES = { statsBand: false };

/**
 * Agency credit — ARC AI designed & built this website. Surfaced as a
 * footer credit (logo + dofollow link) and as the WebSite schema's
 * `creator`, giving the agency an attributed backlink from every page.
 */
export const CREATOR = {
  name: "ARC AI",
  url: "https://www.arcai.agency",
  tagline: "AI web design & development agency",
};
