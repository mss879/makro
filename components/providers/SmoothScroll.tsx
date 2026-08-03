"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";

/**
 * Lenis smooth scrolling wired into GSAP ScrollTrigger.
 * Respects prefers-reduced-motion by skipping the smoothing — and only the
 * smoothing: the font-swap refresh below runs for every visitor.
 */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // The site is set in two self-hosted webfonts. ScrollTrigger measures
    // start positions at creation, which on a cold load is while the fallback
    // face is still rendering — every heading then reflows when Marcellus and
    // Manrope swap in, and every recorded position below that heading is off
    // by the difference. Triggers far down the page (the footer most of all)
    // can end up with a start they never cross, and because the reveals hide
    // their content first, a missed trigger means permanently invisible copy.
    // One refresh once the real faces are in fixes the whole page at once.
    // This must run BEFORE the reduced-motion early-out: reduced-motion
    // visitors keep the structural triggers (the Selected Work pin, the
    // scroll progress bar), whose positions go just as stale after the swap.
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });

    if (reduce) {
      return () => {
        cancelled = true;
      };
    }

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const onRaf = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(onRaf);
    gsap.ticker.lagSmoothing(0);

    // expose for programmatic scrolling (e.g. anchor links)
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

    return () => {
      cancelled = true;
      gsap.ticker.remove(onRaf);
      lenis.destroy();
      (window as unknown as { __lenis?: Lenis }).__lenis = undefined;
    };
  }, []);

  return <>{children}</>;
}
