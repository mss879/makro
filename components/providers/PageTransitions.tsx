"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * The dissolve between pages (client, Sep 2026: "a better transition when
 * moving from one page to another so it's smooth"). Until this, every
 * navigation was a hard cut — one frame the old page, the next frame the new.
 *
 * THE WHOLE SCREEN DISSOLVES, NOT THE PAGE CONTENT. The View Transitions API
 * snapshots the viewport before the route changes and cross-fades it into the
 * live new page; the timing lives in globals.css. The pattern React's
 * <ViewTransition> and the Next.js guide use — snapshotting the page content
 * on its own — breaks three ways on this site:
 *
 *   - The navbar floats over the page, so a content snapshot is painted on
 *     top of it and the bar has to be lifted out with a name of its own. A
 *     named element is captured in isolation, which leaves its backdrop-blur
 *     nothing to blur for the length of every transition — and the frosted
 *     bar is a protected part of the design.
 *   - The old page is usually scrolled, and a content snapshot sits at its
 *     document position, so the new page slides in from wherever the old one
 *     had been scrolled to.
 *   - Anywhere the two snapshots do not cover shows the ink body, so light
 *     pages dip through black on the way.
 *
 * A viewport snapshot has none of that: no geometry to reconcile, and the
 * browser's plus-lighter cross-fade keeps identical pixels — the bar, the
 * floating buttons — perfectly still while everything around them changes.
 *
 * THE OLD FRAME MUST BE CAPTURED BEFORE NEXT SWAPS THE ROUTE, and next/link
 * starts the navigation inside the click. So a qualifying click is swallowed
 * here, the transition is started, and the same click is replayed on the same
 * anchor from inside the transition's update callback. next/link then handles
 * it exactly as it always did — prefetch cache, `replace` and `scroll` props,
 * link status — and the update resolves once the new pathname has committed.
 *
 * HOLDS ARE CAPPED. The browser shows the frozen old frame until the update
 * resolves, so a route slow to arrive (a cold dev compile, a bad connection)
 * is released after MAX_HOLD_MS and lands as the plain cut it always was,
 * rather than holding the screen.
 *
 * THE PAGE TAKES NO CLICKS WHILE IT DISSOLVES. With the whole screen in
 * transition, Chrome hit-tests every click to <html> from the moment the
 * transition starts until the fade ends — `::view-transition { pointer-events:
 * none }` does not change that when the root is what is animating (measured:
 * a mid-fade click on a navbar link landed on <html>). Measured on a
 * production build: ~0.75s from click to settled on a prefetched route, ~1.2s
 * when the incoming hero still had to download — which is why the fade and
 * both caps stay short.
 *
 * Left as instant navigations, deliberately: back/forward (the browser owns
 * those, and iOS already animates its swipe), same-page links (a hash jump or
 * a query change is not a new page), reduced motion, and browsers without the
 * API.
 */

/** Longest the old frame is held while the next route arrives. */
const MAX_HOLD_MS = 1000;

/**
 * Longest the dissolve waits for the incoming page's on-screen images, so it
 * lands on the hero photograph rather than on the empty well the photograph
 * pops into a moment later. Counted inside MAX_HOLD_MS, not on top of it.
 */
const IMAGE_WAIT_MS = 400;

/** "/about/" and "/about" are the same page. */
const normalisePath = (path: string) => (path.length > 1 ? path.replace(/\/+$/, "") : path);

/**
 * Settles once every eager image on screen has decoded. Lazy ones are skipped:
 * they only start loading once the browser renders again, which is exactly
 * what a held transition is not doing.
 */
function onScreenImagesDecoded(): Promise<unknown> {
  const pending = Array.from(document.images).filter((img) => {
    if (img.complete || img.loading === "lazy") return false;
    const r = img.getBoundingClientRect();
    return (
      r.width > 0 &&
      r.bottom > 0 &&
      r.right > 0 &&
      r.top < window.innerHeight &&
      r.left < window.innerWidth
    );
  });
  return Promise.all(pending.map((img) => img.decode().catch(() => undefined)));
}

export default function PageTransitions() {
  const pathname = usePathname();
  /** Lets go of the held old frame. Set only while a transition is waiting. */
  const release = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    const letGo = release.current;
    release.current = null;
    letGo?.();
  }, [pathname]);

  useEffect(() => {
    if (typeof document.startViewTransition !== "function") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let replaying = false;

    const onClick = (event: MouseEvent) => {
      if (replaying || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (reducedMotion.matches) return;

      const anchor = event.target instanceof Element ? event.target.closest("a") : null;
      if (!(anchor instanceof HTMLAnchorElement) || !anchor.href) return;
      if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href);
      if (url.origin !== window.location.origin) return;
      if (normalisePath(url.pathname) === normalisePath(window.location.pathname)) return;

      // Capture phase on window runs before React's listeners on the document,
      // so neither next/link nor the browser acts on this click; the replay
      // below is the only one anything downstream ever sees.
      event.preventDefault();
      event.stopPropagation();

      const replay = () => {
        replaying = true;
        try {
          anchor.click();
        } finally {
          replaying = false;
        }
      };

      try {
        document.startViewTransition(
          () =>
            new Promise<void>((resolve) => {
              const cap = window.setTimeout(resolve, MAX_HOLD_MS);

              release.current = () => {
                // A microtask, so the whole commit has finished first — this
                // layout effect can run ahead of the router's own scroll reset
                // further down the tree, and the image check needs the new
                // page where it will actually sit.
                queueMicrotask(() => {
                  Promise.race([
                    onScreenImagesDecoded(),
                    new Promise((wait) => window.setTimeout(wait, IMAGE_WAIT_MS)),
                  ]).then(() => {
                    window.clearTimeout(cap);
                    resolve();
                  });
                });
              };

              replay();
            })
        );
      } catch {
        // The click is already swallowed; it must still go somewhere.
        replay();
      }
    };

    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
