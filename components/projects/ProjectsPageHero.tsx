"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ArtDirectedImage from "@/components/ui/ArtDirectedImage";
import type { ProjectsPageHeroSlide } from "@/lib/projects-page-data";

/**
 * The full-screen hero at the top of /projects, driven entirely from the admin
 * (Projects → Hero).
 *
 * A slide is any of three shapes and the component infers which from the data
 * rather than from a stored flag: image only, image with copy over a fade,
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
      // The floating buttons keep off whatever carries this — lib/stow-over-hero.ts.
      data-hero
      aria-roledescription={count > 1 ? "carousel" : undefined}
      aria-label={count > 1 ? "Project highlights" : undefined}
      // Full viewport height so the hero fills the screen completely under the floating navbar
      className="relative h-[100svh] overflow-hidden bg-ink"
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
            {/* The image, as uploaded: no colour grade (client, Aug 2026 —
                nothing added over project imagery). The one exception is the
                fade below, from md up only. */}
            {(slide.image || slide.imageMobile) && (
              <ArtDirectedImage
                desktop={slide.image}
                // Portrait file for phones, uploaded per slide in the admin
                // (client, Sep 2026). Either one alone is a complete slide —
                // the fallback runs both ways, which is why the guard above
                // tests for both rather than for `slide.image`.
                mobile={slide.imageMobile}
                alt={slide.alt}
                // The first slide is the LCP element on this route.
                priority={i === 0}
                sizes="100vw"
                className="object-cover"
              />
            )}

            {/* THE FADE, md and up, on every image slide (client, Oct 2026):
                the same ink fade as the home hero, in from the left and gone
                by half the width — see .hero-fade. It runs whether or not the
                slide carries copy: the client wants the two heroes to match,
                and an image-only slide without it read as the fade missing. A
                text-only slide is already on ink, so it gets none. Phones keep
                the slide exactly as it was — no fade (client: the change is
                for desktop and medium screens only). */}
            {(slide.image || slide.imageMobile) && (
              <div aria-hidden="true" className="hero-fade pointer-events-none absolute inset-0 hidden md:block" />
            )}

            {/* THE COPY, TWICE — one for phones, one from md, each hidden at
                the other's widths. The phone keeps the glass plate it always
                had (`.hero-plate`, shared with every other hero); from md the
                copy sits bottom-left over the fade with no plate. Two blocks
                rather than one with responsive classes because the plate is a
                hand-written class in globals.css, and those take no `md:`
                variant. display:none keeps the hidden one out of the
                accessibility tree, so a screen reader still meets one h1. */}
            {(slide.heading || slide.body) && (
              <>
                {/* Phones — exactly as before Oct 2026. */}
                <div className="absolute inset-x-0 bottom-0 [text-shadow:0_2px_20px_rgba(5,2,3,0.55)] md:hidden">
                  <div className="hero-plate-anchor">
                    <div className="hero-plate w-fit max-w-3xl">
                      {slide.heading && (
                        <h1 className="font-display display-lg text-bone">
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
                </div>

                {/* md and up — where the home hero's copy is: bottom-left, in
                    a column capped so it ends inside the fade. The bottom
                    padding clears the slide dots. */}
                <div className="absolute inset-0 hidden items-end md:flex">
                  <div className="container-edge w-full pb-20">
                    <div className="max-w-[min(34rem,40vw)] [text-shadow:0_2px_20px_rgba(5,2,3,0.55)] lg:max-w-[min(34rem,36vw)]">
                      {slide.heading && (
                        <h1 className="font-display text-[clamp(2rem,4.2vw,3.8rem)] leading-[1.12] text-bone">
                          {slide.heading}
                        </h1>
                      )}
                      {slide.body && (
                        <p className={`max-w-[min(26rem,34vw)] text-pretty font-body text-lg leading-relaxed text-bone/85 lg:max-w-[min(26rem,28vw)] ${slide.heading ? "mt-6" : ""}`}>
                          {slide.body}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
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
