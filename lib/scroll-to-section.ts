"use client";

type Lenis = {
  scrollTo: (target: number, opts?: { duration?: number; immediate?: boolean }) => void;
};

/** Air left below the sticky navbar so a section heading never sits flush under it. */
const GAP = 24;

/**
 * How far a section must clear the top of the viewport. --nav-h is authored in
 * rem and steps up at md, so it is resolved against the root font size rather
 * than assumed to be a fixed pixel value.
 */
export function navOffsetPx(): number {
  const rs = getComputedStyle(document.documentElement);
  const raw = rs.getPropertyValue("--nav-h").trim();
  const rootFont = parseFloat(rs.fontSize) || 16;
  const navPx = raw.endsWith("rem") ? parseFloat(raw) * rootFont : parseFloat(raw) || 64;
  return navPx + GAP;
}

/**
 * Scroll a section id under the navbar. Shared by the navbar dropdown, the
 * on-page jump control and the deep-link handler so all three land in exactly
 * the same place — three copies of this maths would drift the first time
 * --nav-h changed.
 *
 * Returns false when the id is not on the page yet, which is what lets the
 * deep-link handler retry while the route is still mounting.
 */
export function scrollToSection(slug: string, opts: { immediate?: boolean } = {}): boolean {
  const target = document.getElementById(slug);
  if (!target) return false;

  // Resolved here as a number rather than handing Lenis the element: Lenis
  // locates an element through the offsetParent chain, which disagrees with
  // the document position once the section sits inside a positioned ancestor
  // (measured 112px adrift on /projects).
  const destination = target.getBoundingClientRect().top + window.scrollY - navOffsetPx();

  const lenis = (window as unknown as { __lenis?: Lenis }).__lenis;
  if (lenis?.scrollTo && !opts.immediate) {
    lenis.scrollTo(destination, { duration: 1.1 });
  } else {
    // No Lenis means prefers-reduced-motion, where an instant jump is correct.
    window.scrollTo({ top: destination });
  }
  return true;
}
