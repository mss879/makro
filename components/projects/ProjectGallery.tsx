"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";

/**
 * The project gallery — a slideshow of every uploaded image, with a filmstrip
 * of previews under it (client, Aug 2026). Advances on its own every 3s, and
 * the arrows either side of the strip move it by hand.
 *
 * WHAT THIS REPLACED, TWICE OVER.
 *
 * First it was three hard-coded frames (16/10, 3/4, 16/10) filled by
 * `object-cover`, which cropped every image to a shape chosen before anyone
 * knew what the photograph was, and rendered exactly three of them however
 * many had been uploaded. Then it was a masonry column of every image at its
 * own measured aspect — correct, but a long scroll of stacked pictures rather
 * than a presentation. This is the client's brief for the third version: one
 * image at a time, previews beneath, timed, with manual control.
 *
 * NOTHING IS CROPPED, which is the standing rule for this surface and the
 * reason the stage is built the way it is. A slideshow wants one frame for
 * every slide, but these images do not share a shape — Makro Heights' two are
 * 0.571 and 0.75 wide-over-tall — so a fixed frame filled edge to edge would
 * cut the tall one to fit the short one. Instead the stage fixes only its
 * HEIGHT and the image is contained inside it: every slide is shown whole, at
 * its own proportions, and the width it does not use is left as air. On a
 * light section that reads as margin rather than as letterboxing, which is why
 * the stage carries no background or border of its own — a visible box around
 * the picture would turn the same empty space into a defect.
 *
 * Fixing the height rather than the width is also what keeps the page still.
 * Letting the stage take each image's own height instead would move everything
 * below it by ~370px between those two slides, every three seconds.
 *
 * THE NEIGHBOURS PEEK. The images either side of the current one sit behind
 * it, scaled back and faded, sliding across as it changes (client, Aug 2026 —
 * "show like a faded next image that's about to come to the centre and the
 * previous as well"). They are decorative and inert: aria-hidden, no pointer
 * events, and the arrows and the strip are what actually move the gallery.
 *
 * THE ARROWS SIT ON THE IMAGE, which is a deliberate exception to the rule
 * that nothing is laid over project imagery on this site, made at the client's
 * explicit request. They carry a paper-tinted backing because the stage may
 * hold a dark photograph or a light one and a bare glyph would be legible on
 * one and invisible on the other. Square rather than round: nothing in this
 * brand is round.
 *
 * The strip beneath is the same rule at a smaller size: each preview is the
 * height of the row and as wide as its own image wants to be, so the strip is
 * a row of true shapes rather than uniform tiles with the pictures cropped
 * into them. That needs each image's ratio, which `project_images` does not
 * store — it holds a path and nothing about the raster. Rather than add a
 * column and leave every already-uploaded image wrong until someone re-uploads
 * it, each preview measures itself on load and adopts its own ratio, which
 * works for everything already in the bucket with no migration and no
 * backfill. Ratios are keyed by src, not by index, so reordering in the admin
 * cannot hand a measurement to the wrong photograph.
 */
export default function ProjectGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [ratios, setRatios] = useState<Record<string, number>>({});

  const count = images.length;

  // Modulo both ways so the arrows wrap. A gallery that advances on a timer
  // already loops; an arrow that dies at the last image would contradict the
  // thing the visitor has just watched it do.
  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count]
  );

  useEffect(() => {
    // Nothing to advance to, or the visitor is reading a particular image and
    // has the pointer on it, or they have asked for reduced motion — in which
    // case the arrows are the only way it moves.
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), 3000);
    return () => window.clearInterval(id);
  }, [count, paused]);

  if (count === 0) return null;

  /**
   * Where an image sits relative to the current one, as a signed number of
   * steps around the ring: 0 is centre, -1 and +1 are the two peeking
   * neighbours, anything further is off-stage.
   *
   * Wrapped to the SHORTEST way round so the last image is "one back" from the
   * first rather than seven forward. With exactly two images that resolves to
   * a single neighbour which changes sides as you move — +1 when you are on
   * the first, -1 when you are on the second — instead of the same photograph
   * appearing on both sides at once, which is what a naive prev/next would do.
   */
  const relative = (i: number) => {
    const half = Math.floor(count / 2);
    let d = i - index;
    while (d > half) d -= count;
    while (d < -half) d += count;
    return d;
  };

  const measure = (src: string) => (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!img.naturalWidth || !img.naturalHeight) return;
    const ratio = img.naturalWidth / img.naturalHeight;
    setRatios((prev) => (prev[src] === ratio ? prev : { ...prev, [src]: ratio }));
  };

  return (
    <div
      className="mt-10"
      aria-roledescription={count > 1 ? "carousel" : undefined}
      aria-label={count > 1 ? `${name} gallery` : undefined}
      // Hovering is reading. Stop the timer rather than pulling the image away
      // from under the pointer three seconds in.
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* THE STAGE. Height fixed, width free, image contained — see the note
          above. No background and no border: the space either side of a
          portrait image is meant to read as air on the section's own ground,
          not as a frame the picture fails to fill.

          overflow-hidden is what lets the neighbours run off the edges rather
          than spilling into the page gutter. */}
      <div className="relative h-[380px] overflow-hidden sm:h-[520px] lg:h-[640px]">
        {images.map((src, i) => {
          const d = relative(i);
          const centre = d === 0;
          const peek = Math.abs(d) === 1;
          return (
            <div
              key={src}
              // The inactive slides stay in the layout to slide and fade, but
              // a screen reader should not be offered every image at once —
              // and the peeking ones are scenery, not content.
              aria-hidden={!centre}
              // motion-reduce:!transition-none, with the important modifier,
              // because the transition below is an inline style and a plain
              // utility could not override it. Autoplay is already off for
              // these visitors; this stops the manual arrows from sliding a
              // picture across the stage as well.
              className={`pointer-events-none absolute inset-0 motion-reduce:!transition-none ${
                centre ? "opacity-100" : peek ? "opacity-30" : "opacity-0"
              }`}
              style={{
                // 42% of the stage, not of the image: the images have
                // different widths, so anything measured off the picture would
                // put the neighbours at a different distance on every slide.
                // They pass BEHIND the centre image, which is the point — the
                // overlap is what makes it read as a stack rather than as
                // three pictures in a row.
                transform: `translateX(${d * 42}%) scale(${centre ? 1 : 0.82})`,
                zIndex: 20 - Math.min(Math.abs(d), 2) * 10,
                // The z-index swap is HELD until the fade is half done, which
                // is why the transition is written out here rather than left to
                // utility classes. z-index is discrete and would otherwise
                // change the instant the index does: the incoming slide would
                // be lifted above the outgoing one while it was still at 0.3
                // and the outgoing one still at 1, so for a third of a second
                // a ghost sits on top of a solid picture across the band where
                // the two overlap. Measured exactly that: opacity 1 at z 10
                // under opacity 0.3 at z 20. Delaying the swap to the crossover
                // means whichever slide is currently the more opaque is always
                // the one on top.
                transition:
                  "transform 700ms cubic-bezier(0.16,1,0.3,1), opacity 700ms cubic-bezier(0.16,1,0.3,1), z-index 0s linear 350ms",
              }}
            >
              <Image
                src={src}
                alt={`${name} — view ${i + 1}`}
                fill
                // contain, never cover: this is the whole reason the stage
                // fixes its height instead of its shape.
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 80vw"
                // The first slide is what the visitor sees when they arrive at
                // this section; the rest can wait for the timer.
                priority={i === 0}
                onLoad={measure(src)}
              />
            </div>
          );
        })}

        {/* The arrows, over the image at the client's request — see the header
            note. Pinned to the stage's own edges so they clear the centre
            picture at any aspect and land on the peeking neighbours instead. */}
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous image"
              className="group absolute left-0 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center border border-hair-strong bg-paper/85 text-ink backdrop-blur-sm transition-colors duration-300 hover:bg-ink hover:text-paper"
            >
              <svg
                viewBox="0 0 32 12"
                className="h-3 w-7 transition-transform duration-500 group-hover:-translate-x-1"
                fill="none"
                aria-hidden="true"
              >
                <path d="M32 6H2M8 1L2 6l6 5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next image"
              className="group absolute right-0 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center border border-hair-strong bg-paper/85 text-ink backdrop-blur-sm transition-colors duration-300 hover:bg-ink hover:text-paper"
            >
              <svg
                viewBox="0 0 32 12"
                className="h-3 w-7 transition-transform duration-500 group-hover:translate-x-1"
                fill="none"
                aria-hidden="true"
              >
                <path d="M0 6h30M24 1l6 5-6 5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* THE PREVIEWS — under the image and centred on it, nothing else in
          the row. The arrows used to flank them here; they are on the stage
          now, which leaves this as a plain strip of previews on the same
          centre line as the picture above it. */}
      {count > 1 && (
        <ul className="no-scrollbar mt-6 flex min-w-0 items-end justify-center gap-3 overflow-x-auto">
          {images.map((src, i) => {
            const active = i === index;
            return (
              <li key={src} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show image ${i + 1} of ${count}`}
                  aria-current={active ? "true" : undefined}
                  // The active preview is marked by a rule under it, not by
                  // dimming the others: fading back an image to say "not this
                  // one" is still a treatment applied to the client's
                  // photography, and this surface does not do that.
                  className={`block border-b-2 pb-2 transition-colors duration-300 ${
                    active ? "border-rose-deep" : "border-transparent hover:border-hair-strong"
                  }`}
                >
                  <span
                    className="relative block h-14 sm:h-16"
                    // Square until the real ratio is known — a neutral
                    // placeholder rather than a guess at the content, and
                    // object-contain means nothing is cut off inside it
                    // either way.
                    style={{ aspectRatio: ratios[src] ?? 1 }}
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      className="object-contain"
                      sizes="120px"
                      onLoad={measure(src)}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
