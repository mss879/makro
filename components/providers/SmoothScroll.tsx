"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";

/**
 * Lenis smooth scrolling wired into GSAP ScrollTrigger.
 * Respects prefers-reduced-motion by skipping the smoothing — and only the
 * smoothing: the font-swap refresh below runs for every visitor.
 */
/** Handle for the live instance, shared with the per-route effect below. */
type LenisWindow = { __lenis?: Lenis };

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const previousPath = useRef<string | null>(null);

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
    const isNavigation = previousPath.current !== null && previousPath.current !== pathname;
    previousPath.current = pathname;

    // PUT LENIS BACK AT THE TOP, not just the document.
    //
    // The bug this fixes: click a project card while the page is still
    // gliding and the development's page opens part-way down, around the
    // gallery. Next.js resets the DOCUMENT scroll to 0 on navigation, but
    // Lenis keeps its own `targetScroll` / `animatedScroll` — and this
    // provider lives in the persistent (site) layout, so the SAME instance
    // spans the navigation still holding the offset it was gliding towards.
    // Its rAF loop then writes that number back over Next's reset, on a page
    // that has nothing to do with it. Measured: mid-glide to 2100 on
    // /projects, the incoming detail page settled at exactly 2100.
    //
    // It only ever showed up mid-glide, which is why it looks intermittent —
    // scroll, pause, then click and Lenis is idle and writes nothing.
    //
    // Guarded twice. Not on first mount, so the browser's own scroll
    // restoration on a reload still works. Not when there is a hash, so a
    // deep link to a section is not yanked back to the top before it lands.
    if (isNavigation && !window.location.hash) {
      const lenis = (window as unknown as LenisWindow).__lenis;
      // immediate cancels the in-flight animation rather than easing to 0
      // from wherever it had got to; force scrolls even while stopped, which
      // is the state the preloader leaves it in on a cold load.
      lenis?.scrollTo(0, { immediate: true, force: true });
    }

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

    // ── The one dial for how the scroll FEELS ──────────────────────────
    // Not a performance setting: frame rate is fixed elsewhere (composited
    // reveals, no document-height blend layer, no stray promoted layers).
    // This is purely how long the page keeps travelling after the wheel
    // stops. It was 1.15s with an expo-out curve, whose long tail is what
    // read as the page being heavy — each wheel event restarts a fresh
    // 1.15s animation to a new target, so a run of events keeps extending
    // the glide and the page feels disconnected from the input.
    //
    // 0.9 keeps the smoothing unmistakably present but lets it settle.
    // If it still over-glides, the next step is not a smaller number here
    // but the other mode entirely: delete `duration` and `easing` and pass
    // `lerp: 0.1`. Lerp follows velocity per frame instead of animating to
    // a target over a fixed span, which feels immediate on the first notch
    // and settles fast — the usual answer for "I want it smooth but I want
    // it to stop when I stop".
    const SCROLL_GLIDE_SECONDS = 0.9;

    const lenis = new Lenis({
      duration: SCROLL_GLIDE_SECONDS,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
    });

    lenis.on("scroll", ScrollTrigger.update);

    // Lenis and ScrollTrigger are two independent measurement authorities and
    // only one of them was ever told the document changed. Lenis caches the
    // document height in Dimensions and clamps every wheel target to
    // `scrollHeight - height`; its only invalidation paths are a window
    // resize and a ResizeObserver on <html>. The observer watches the CONTENT
    // BOX, so while the root element carried `h-full` (height:100%) that box
    // was pinned to the viewport and the observer could never fire — the
    // ceiling was frozen at whatever the document measured when Lenis was
    // built. Because this provider lives in the persistent (site) layout, one
    // instance spans every client-side navigation, so a visitor entering on a
    // short route and clicking through to a taller one hit a hard wall
    // partway down the page with no way out but a reload.
    //
    // `h-full` is gone from app/layout.tsx, which restores the observer. This
    // is the belt to that pair of braces: every refresh site already in the
    // app — the per-route pair below, the fonts.ready pass, and GSAP's own
    // load/resize refreshes — now re-measures Lenis in the same beat, without
    // waiting on the observer's 250ms debounce.
    const syncLenisDimensions = () => lenis.resize();
    ScrollTrigger.addEventListener("refresh", syncLenisDimensions);

    const onRaf = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(onRaf);
    gsap.ticker.lagSmoothing(0);

    // expose for programmatic scrolling (e.g. anchor links) and for the
    // per-route reset above
    (window as unknown as LenisWindow).__lenis = lenis;

    return () => {
      cancelled = true;
      ScrollTrigger.removeEventListener("refresh", syncLenisDimensions);
      gsap.ticker.remove(onRaf);
      lenis.destroy();
      (window as unknown as LenisWindow).__lenis = undefined;
    };
  }, []);

  return <>{children}</>;
}
