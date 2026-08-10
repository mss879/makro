"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";

/**
 * Lenis smooth scrolling wired into GSAP ScrollTrigger.
 * Respects prefers-reduced-motion by skipping the smoothing — and only the
 * smoothing: the font-swap refresh below runs for every visitor.
 */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Client-side navigation leaves every reveal on the incoming page primed
  // but unplayed: its ScrollTrigger is created against measurements cached
  // from the page we just left, so a trigger the visitor is already past
  // never fires onEnter and the words stay parked at yPercent 150 — clipped
  // inside their masks, which is why hero headings came up blank when moving
  // between pages. The refresh below re-measures against the new document,
  // and the reveals' own onRefresh guards then seat anything already passed.
  //
  // This provider sits in the persistent (site) layout, so the fonts.ready
  // refresh in the effect underneath only ever runs once, on first mount —
  // it cannot cover later navigations. Hence a second, per-route effect.
  //
  // Two frames: children's effects (where the triggers are created) run
  // before this parent effect, but layout is not settled until the browser
  // has actually painted the new route.
  useEffect(() => {
    // Effects run child-first, so the incoming page's triggers already exist
    // by the time this parent effect runs — refresh straight away rather than
    // waiting on a frame. Deliberately NOT requestAnimationFrame: a tab that
    // is backgrounded during the navigation never runs rAF callbacks, and the
    // refresh would simply never happen. The timeout is a second pass once
    // images and late layout have settled.
    ScrollTrigger.refresh();
    const t = setTimeout(() => ScrollTrigger.refresh(), 250);
    return () => clearTimeout(t);
  }, [pathname]);

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
