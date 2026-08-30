"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { unsplash } from "@/lib/images";
import type { Project } from "@/lib/projects";

/**
 * The projects carousel (Projects → Carousel in the admin) — and, since the
 * status-grouped portfolio index was removed from /projects (client, Aug 2026),
 * the only place the page lists developments. See app/(site)/projects/page.tsx.
 *
 * ONE CARD AT A TIME, centred, portrait art on the left and the copy on the
 * right (client brief). It used to be a rail of 420px cards with the cover
 * across the top; the rail showed three half-projects at once and none of them
 * whole, which is the opposite of what a two-development portfolio needs. A
 * single card gets the full width of the page for one project.
 *
 * The admin curates WHICH projects appear and in what order; every visible
 * field is read from the project itself, so there is no second copy of a
 * development's details to go stale. The spec block is the project's own
 * `specs` — the same {label, value} pairs the detail page renders — which is
 * why one card can show "Starting from / Residences / Typologies" and the next
 * something else entirely with no per-card config.
 *
 * Scrolling is still native overflow-x with scroll-snap rather than a transform
 * track: it keeps swipe, trackpad and keyboard behaviour for free, survives a
 * resize without recalculating, and degrades to a plain scrollable row if the
 * arrow buttons never wire up. The arrows drive it by scrolling one full track
 * width, which is exactly one card.
 */
export default function ProjectsCarousel({
  eyebrow,
  heading,
  projects,
}: {
  eyebrow: string;
  heading: string;
  projects: Project[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  /** Which card is centred, derived from scrollLeft rather than stored — a
      swipe, a trackpad flick and an arrow click all move the same scroller, so
      reading the scroller is the only way the counter cannot drift out of step
      with what is on screen. */
  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el || !el.clientWidth) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  useEffect(() => {
    sync();
    const el = trackRef.current;
    if (!el) return;
    // A resize changes the width every slide is measured against, so the
    // counter has to be recomputed even though nothing scrolled.
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sync, projects.length]);

  /**
   * CLAMPS at both ends; it used to wrap. Wrapping kept both arrows alive at
   * all times, which seemed like the kinder default until the client saw it:
   * a back arrow on the first card points at nothing, and offering it invites
   * a click that jumps to the far end of the set instead of going back. The
   * arrows now describe what is actually there — see `atStart`/`atEnd` below,
   * which hide rather than grey out the one with nowhere to go.
   */
  const go = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el || !el.clientWidth) return;
    const count = projects.length;
    const current = Math.round(el.scrollLeft / el.clientWidth);
    const next = Math.min(Math.max(current + direction, 0), count - 1);
    el.scrollTo({
      left: next * el.clientWidth,
      // Smooth on a step, instant for someone who has asked for reduced motion.
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  if (!projects.length) return null;

  // Derived from the scroll position, not tracked separately, so a swipe and an
  // arrow click cannot disagree about which arrows should be showing.
  const atStart = index <= 0;
  const atEnd = index >= projects.length - 1;

  return (
    /* Tighter on top than underneath — the intro above is part of the same
       thought and was sitting 240px away. See ProjectsIntro. */
    <section className="section-light relative pb-20 pt-10 md:pb-28 md:pt-14">
      <div className="container-edge">
        {eyebrow && (
          <div className="flex items-center gap-4">
            <span className="line-hair w-12" />
            <span className="eyebrow text-rose-deep">{eyebrow}</span>
          </div>
        )}
        {heading && (
          <h2 className={`font-display display-md text-ink ${eyebrow ? "mt-6" : ""}`}>
            {heading}
          </h2>
        )}
      </div>

      <div
        className="relative mt-12 md:mt-16"
        aria-roledescription={projects.length > 1 ? "carousel" : undefined}
        aria-label={projects.length > 1 ? "Developments" : undefined}
      >
        {/* Card and controls are SIBLINGS in one row (client, Aug 2026 — the
            arrows belong beside the card, not on it). That is why the row is
            capped and centred rather than the card being capped inside a
            full-bleed track: the controls take their width out of the row
            first, and the card gets what is left, so the buttons can never
            collide with the artwork or spill past the page gutter at an
            awkward viewport. At the cap the card lands at roughly its old
            1024px and the arrows sit just outside its right edge.

            One block, not a desktop copy and a mobile copy — a second pair
            would be a second "Next project" for a screen reader to find and
            announce, for a control that does the same thing. Below lg the row
            is a column, so the same buttons fall underneath the card, which is
            where they have to go once the card is full width. */}
        <div className="container-edge">
          <div className="mx-auto flex max-w-[72.5rem] flex-col items-center gap-8 lg:flex-row lg:gap-6">
            <div
              ref={trackRef}
              onScroll={sync}
              /* No `scroll-smooth` class: it would also smooth the browser's own
                 scroll restoration and any anchor landing inside the track. The
                 arrows pass their own behaviour, which is the only case that
                 wants easing. */
              className="no-scrollbar flex w-full min-w-0 snap-x snap-mandatory overflow-x-auto lg:flex-1"
            >
              {projects.map((project) => (
                /* The track is a flex row, so every slide already stretches to
                   the tallest one. Passing that height down with lg:h-full is what
                   makes the cards MATCH (client, Aug 2026) at every width, even
                   when one project is given a longer summary than the next — the
                   3/4 frame below sets the height, this stops any card from
                   breaking rank. The extra height lands in the copy column, which
                   centres its contents, so a shorter card reads as more generously
                   set rather than as one with a gap at the bottom. */
                <div key={project.slug} className="w-full shrink-0 snap-center">
                  <article className="mx-auto grid h-full max-w-lg grid-cols-1 border border-hair bg-paper lg:max-w-none lg:grid-cols-2">
                    {/* PORTRAIT frame, left. ONE fixed 3/4 for every card, and
                        the crop taken off the BOTTOM.

                        This frame has been through both answers, so the reasoning
                        is worth keeping. It briefly measured each cover and
                        adopted its own ratio, the way ProjectGallery does — which
                        does guarantee nothing is cut, but it also lets the art
                        set the card's height, and the two covers in this
                        portfolio are 0.571 and 0.751 wide-over-tall. Makro
                        Heights therefore rendered a 512x897 card next to a
                        512x682 one: correct, uncropped, and a foot taller than
                        the card beside it. The client's call (Aug 2026) is that
                        the cards must MATCH, and that the bottom of the Makro
                        Heights render is expendable — it is the neighbouring
                        houses, the road and the parked cars, not the tower.

                        3/4 is 121 Residencies' own ratio to within a pixel, so
                        that cover is still effectively untouched; Makro Heights
                        loses ~215px, all of it from the bottom.

                        object-top is what makes "from the bottom" true. Under the
                        default centre position the same 215px would come off the
                        roofline and the street in equal halves, and decapitating
                        the tower is the one crop nobody asked for. Top-anchoring
                        is also the right default for whatever is uploaded next:
                        architecture is photographed with the subject up top and
                        its context below.

                        lg:h-full is what keeps the art flush to the card's
                        bottom edge. 3/4 alone left the frame at its own height
                        inside a row the copy column had made taller, and the
                        difference showed as a band of empty card under the
                        photograph. From lg up the frame takes the row's height
                        and the aspect only seeds it; below lg the card stacks and
                        3/4 is the whole story — which is why the stacked card is
                        capped at max-w-lg rather than running the full width. A
                        1023px-wide card would put a 1364px-tall portrait on a
                        tablet; capping the HEIGHT instead was worse, because at
                        that width 75vh turns a 3/4 frame landscape and crops a
                        tower down to a band of its upper floors. Capping the
                        width keeps the frame portrait and the whole building in
                        it.

                        SPLITS AT lg, NOT md. Two columns at 768px gave the copy a
                        256px measure; the summary set eight lines deep, drove the
                        card to 974px, and the frame stretched with it to 352x974
                        — a 0.36 slot, which crops a tower to a vertical sliver of
                        its middle floors. The side-by-side card needs about a
                        1024px viewport before both halves have room to be
                        themselves.

                        NOTE this is a deliberate exception to the never-crop rule
                        that governs ProjectGallery — a card is a fixed slot in a
                        row of equals, a gallery is not. */}
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-shell lg:h-full">
                      {/* Empty rather than a placeholder — see ProjectHero. */}
                      {project.cover && (
                        <Image
                          src={unsplash(project.cover, 1100)}
                          alt={project.name}
                          fill
                          /* Half of the 1024px card on desktop; the full
                             viewport once the card stacks at md. */
                          sizes="(max-width: 1024px) 100vw, 512px"
                          /* No img-warm — project imagery carries no filter.
                             See ProjectHero. */
                          className="object-cover object-top"
                        />
                      )}
                    </div>

                    {/* Copy, right. No min-height: the 3/4 frame opposite sets
                        the card's height, and a floor here would only stretch
                        that frame and crop the cover harder than it needs to be.

                        The reserved bottom padding that used to be here is gone
                        with the arrows: they sat in this corner of the card and
                        the copy had to stop short of them. They are outside the
                        card now, so the padding is even again.

                        justify-center, never justify-between: the spec block and
                        the link stay attached to the copy above them instead of
                        being flung to the card's bottom edge. */}
                    <div className="flex flex-col justify-center p-8 lg:p-12">
                      <div className="flex flex-wrap items-center gap-3">
                        {/* The stage a development is at, kept on the card now
                            that the status-grouped index that used to carry it
                            is gone. On the copy, not on the art — the image is
                            left completely clear, same rule as the detail hero. */}
                        <span className="inline-flex items-center gap-2 border border-hair-strong px-3 py-1.5 font-body text-xs text-ink">
                          <span className="h-1.5 w-1.5 bg-rose-deep" />
                          {project.status}
                        </span>
                        <span className="font-body text-xs uppercase tracking-[0.25em] text-rose-deep">
                          {project.type} · {project.city}
                        </span>
                      </div>

                      <h3 className="mt-6 font-display text-4xl leading-[1.05] text-ink md:text-5xl">
                        {project.name}
                      </h3>
                      <p className="mt-5 font-body text-base leading-relaxed text-mist">
                        {project.summary}
                      </p>

                      {/* Capped at four so a project with a long spec list cannot
                          stretch the card past the one beside it in the track. */}
                      {project.specs.length > 0 && (
                        <dl className="mt-8 grid grid-cols-2 gap-x-8 border-t border-hair">
                          {project.specs.slice(0, 4).map((spec) => (
                            <div key={spec.label} className="border-b border-hair py-4">
                              <dt className="font-body text-xs uppercase tracking-[0.18em] text-fog">
                                {spec.label}
                              </dt>
                              <dd className="mt-1.5 font-display text-xl text-ink">
                                {spec.value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}

                      <Link
                        href={`/projects/${project.slug}`}
                        className="group mt-8 inline-flex items-center gap-3 self-start font-body text-sm text-ink transition-colors hover:text-rose-deep"
                      >
                        View project
                        <span className="transition-transform duration-500 group-hover:translate-x-1">
                          →
                        </span>
                      </Link>
                    </div>
                  </article>
                </div>
              ))}
            </div>

          {projects.length > 1 && (
            /* CONTROL FIRST, folio second.
 
               Three passes to get here and the reasoning is worth keeping.
               Boxed 48px squares read as an admin widget left in the margin.
               Replacing them with quiet glyphs under a large page number fixed
               that but overcorrected: the numeral became the loudest thing in
               the column and the arrows — small, and set in fog — were easy to
               miss entirely, which is fatal for the one control that moves the
               section.
 
               So the order is inverted and the weights are swapped. The arrows
               lead: drawn as long strokes rather than typed as glyphs, set in
               ink, at a size that carries across the gutter. The numeral drops
               to a caption under the rule, where it labels the position
               instead of announcing it.
 
               A DRAWN arrow rather than the "←" character, because a glyph is
               sized by its font's metrics and the arrow in this body face is
               short, light and optically small next to display type. The path
               below is a 44px shaft with a head on it: it can be made as long
               and as heavy as the design needs without touching type size, and
               it is the same shape at every weight. */
            <div className="flex w-full shrink-0 flex-col items-center gap-4 lg:w-32 lg:items-start">
              {/* An arrow with nowhere to go is HIDDEN, not greyed (client,
                  Aug 2026: no back arrow while there is nothing behind you).
 
                  Faded to opacity-0 rather than unmounted. This column is the
                  shrink-0 half of a flex row whose other half is the card, so
                  a control that leaves the layout narrows the column and hands
                  those pixels to the card — which would change width every
                  time you paged. pointer-events-none and `disabled` between
                  them keep the invisible one unclickable in the moment before
                  state catches up with a fast scroll. */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous project"
                  disabled={atStart}
                  className={`group flex h-12 w-14 items-center justify-center text-ink transition-colors duration-300 hover:text-rose-deep ${
                    atStart ? "pointer-events-none opacity-0" : ""
                  }`}
                >
                  <svg
                    viewBox="0 0 44 12"
                    className="h-3 w-11 transition-transform duration-500 group-hover:-translate-x-1"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M44 6H2M8 1L2 6l6 5"
                      stroke="currentColor"
                      strokeWidth="1.4"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next project"
                  disabled={atEnd}
                  className={`group flex h-12 w-14 items-center justify-center text-ink transition-colors duration-300 hover:text-rose-deep ${
                    atEnd ? "pointer-events-none opacity-0" : ""
                  }`}
                >
                  <svg
                    viewBox="0 0 44 12"
                    className="h-3 w-11 transition-transform duration-500 group-hover:translate-x-1"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M0 6h42M36 1l6 5-6 5"
                      stroke="currentColor"
                      strokeWidth="1.4"
                    />
                  </svg>
                </button>
              </div>

              {/* Position, drawn. A hairline that fills in rose as you move
                  through the set — the same information the numeral carries,
                  in the register the rest of the page speaks in (line-hair
                  rules open every section on this site). Decorative rather
                  than semantic, hence aria-hidden: the numeral below already
                  states the position in words a screen reader can read, and
                  announcing it twice helps nobody. */}
              <div aria-hidden="true" className="relative h-px w-24 bg-hair-strong lg:w-full">
                <span
                  className="absolute inset-y-0 left-0 bg-rose-deep transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{
                    width: `${(Math.min(index + 1, projects.length) / projects.length) * 100}%`,
                  }}
                />
              </div>

              {/* A caption, not a headline. The set total is set smaller again
                  so the pair reads as one folio mark rather than two numbers
                  of equal weight. */}
              <p className="flex items-baseline gap-1 font-body text-xs tabular-nums text-fog">
                <span className="text-ink">
                  {String(Math.min(index + 1, projects.length)).padStart(2, "0")}
                </span>
                / {String(projects.length).padStart(2, "0")}
              </p>
            </div>
          )}
          </div>
        </div>
      </div>
    </section>
  );
}
