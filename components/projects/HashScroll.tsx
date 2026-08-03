"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { scrollToSection } from "@/lib/scroll-to-section";

/**
 * Lands a deep link like /projects#in-progress on the right section.
 *
 * The browser's own anchor jump is not usable here: the navbar links pass
 * scroll={false} precisely so Next does not fight Lenis, and a native jump
 * would park the heading underneath the sticky bar anyway. This runs after the
 * route mounts and applies the same offset the navbar and the on-page jump use.
 */
export default function HashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const run = () => {
      const slug = decodeURIComponent(window.location.hash.replace("#", ""));
      if (!slug) return;

      // Arriving from another route, the section can be a frame or two behind
      // the effect — and images above it are still settling, which moves the
      // target. Retry briefly rather than landing short on a cold navigation.
      let tries = 0;
      const attempt = () => {
        if (scrollToSection(slug)) return;
        if (++tries < 20) window.setTimeout(attempt, 50);
      };
      attempt();
    };

    run();
    // Covers a hash change while already on the page (browser back/forward).
    window.addEventListener("hashchange", run);
    return () => window.removeEventListener("hashchange", run);
  }, [pathname]);

  return null;
}
