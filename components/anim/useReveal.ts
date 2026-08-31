"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Marks an element revealed the first time it is on screen.
 *
 * Shared by Reveal and TextReveal, which differ only in what they park in CSS.
 * Deliberately an IntersectionObserver and nothing else:
 *
 *   - It needs no requestAnimationFrame, so it works in a tab that is not
 *     painting. A GSAP tween does not, which is how headings ended up parked
 *     and invisible.
 *   - It fires an initial callback for every element it observes, so anything
 *     already on screen is revealed on the spot — no "is it in the viewport"
 *     rect arithmetic at a moment when layout may not have settled, which is
 *     the other way the old implementation used to miss.
 *   - It needs no measurement against the document, so a client-side
 *     navigation cannot leave it holding stale positions.
 *
 * FAILS VISIBLE at every step. No IntersectionObserver, or a constructor that
 * throws, reveals immediately; the parked state itself only exists while the
 * `.anim` class is on <html>, which only an inline script puts there.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || revealed) return;

    let observer: IntersectionObserver | undefined;
    try {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            setRevealed(true);
            observer?.disconnect();
          }
        },
        // A little before the element's top edge arrives, so the transition is
        // already under way by the time it is properly in view rather than
        // starting the instant it appears.
        { rootMargin: "0px 0px -12% 0px" }
      );
      observer.observe(el);
    } catch {
      // No IntersectionObserver at all, or a constructor that threw. Reveal
      // rather than leave the content parked — on a timeout rather than
      // straight away, because setting state synchronously in an effect body
      // cascades a render.
      observer = undefined;
    }

    if (!observer) {
      const t = setTimeout(() => setRevealed(true), 0);
      return () => clearTimeout(t);
    }

    return () => observer.disconnect();
  }, [revealed]);

  return { ref, revealed };
}
