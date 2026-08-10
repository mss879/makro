"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { ProjectsPageHeroSlide } from "@/lib/projects-page-data";

/**
 * The full-screen hero at the top of /projects, driven entirely from the admin
 * (Projects → Hero).
 *
 * A slide is any of three shapes and the component infers which from the data
 * rather than from a stored flag: image only, image with copy along the bottom,
 * or copy on the brand's ink with no image at all. That is the client's brief,
 * and it is why `image`, `heading` and `body` are each optional.
 *
 * Crossfade is plain CSS opacity on stacked absolutely-positioned panels, not
 * GSAP: the transition has no scroll dependency, and a tween whose ScrollTrigger
 * fails to fire would leave the hero blank — the exact failure mode the reveals
 * elsewhere in this codebase carry guards against. Nothing here can strand the
 * first slide, because slide 0 is opaque with no JavaScript at all.
 */
export default function ProjectsPageHero({
  slides,
  autoplay,
  intervalMs,
  showDots,
}: {
  slides: ProjectsPageHeroSlide[];
  autoplay: boolean;
  intervalMs: number;
  showDots: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const rootRef = useRef<HTMLElement>(null);

  const count = slides.length;
  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  // A single slide has nothing to advance to, and a visitor who has asked for
  // reduced motion should not have the page changing under them on a timer.
  useEffect(() => {
    if (!autoplay || paused || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => window.clearInterval(id);
  }, [autoplay, paused, count, intervalMs]);

  // Nothing to show. Rendering an empty full-screen panel would leave the admin
  // staring at a blank viewport with no clue why, so collapse instead.
  if (count === 0) return null;

  return (
    <section
      ref={rootRef}
      aria-roledescription={count > 1 ? "carousel" : undefined}
      aria-label={count > 1 ? "Project highlights" : undefined}
      // Not 100svh: unlike the home page, where the bar is fixed and the hero
      // runs the full viewport beneath it, the navbar is sticky and therefore
      // IN FLOW on inner pages — so a full-viewport hero here starts below the
      // bar and overflows by exactly its height. Underscores are Tailwind's
      // escape for the spaces calc() requires around the minus; without them
      // the declaration is invalid CSS and the height silently falls back to
      // auto.
      // The extra 1px is the navbar's own bottom hairline: --nav-h sizes the
      // bar's inner row, and the border sits outside it, so the header actually
      // occupies var(--nav-h) + 1px of flow. Subtracting only --nav-h leaves the
      // hero exactly one pixel too tall and the page scrolls.
      className="relative h-[calc(100svh_-_var(--nav-h)_-_1px)] overflow-hidden bg-ink"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {slides.map((slide, i) => {
        const active = i === index;
        return (
          <div
            key={slide.id}
            // aria-hidden on the inactive panels rather than display:none —
            // they have to stay in the layout to crossfade, but a screen reader
            // should not read three headings in a row.
            aria-hidden={!active}
            className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
              active ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            {slide.image && (
              <>
                <Image
                  src={slide.image}
                  alt={slide.alt}
                  fill
                  // The first slide is the LCP element on this route.
                  priority={i === 0}
                  sizes="100vw"
                  className="img-warm object-cover"
                />
                {/* Scrim only where the copy sits, so an image-only slide is
                    not needlessly darkened across its whole height. */}
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
              </>
            )}

            {(slide.heading || slide.body) && (
              <div className="absolute inset-x-0 bottom-0 pb-16 md:pb-20">
                <div className="container-edge">
                  {slide.heading && (
                    <h1 className="max-w-4xl font-display display-lg text-bone">
                      {slide.heading}
                    </h1>
                  )}
                  {slide.body && (
                    <p className="mt-6 max-w-xl font-body text-base leading-relaxed text-bone/80 sm:text-lg">
                      {slide.body}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {showDots && count > 1 && (
        <div className="absolute inset-x-0 bottom-6 z-10">
          <div className="container-edge flex items-center gap-3">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1} of ${count}`}
                aria-current={i === index}
                // Sharp, not round — the same edge language as the hero frame
                // and the Contact button.
                className={`h-[3px] w-8 transition-colors duration-500 ${
                  i === index ? "bg-rose" : "bg-bone/30 hover:bg-bone/60"
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
