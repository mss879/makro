export const SITE = {
  name: "Makro Developers",
  legal: "Makro Developers (Pvt) Ltd",
  parent: "Wheels Lanka Group",
  tagline: "The future built well.",
  description:
    "Makro Developers is a Sri Lankan property developer delivering premium residential and commercial developments, backed by the Wheels Lanka Group.",
  email: "info@makrodevelopers.com",
  phone: "+94 707 21 21 21",
  address: "10, Esther Avenue, Park Road, Colombo 05",
  url: "https://makrodevelopers.lk",
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
