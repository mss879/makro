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
    <section className="section-light relative section-y md:pb-28 md:pt-14">
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
        {/* AN ARROW EITHER SIDE, and the card centred between them (client,
            Aug 2026). Both arrows sat in one column to the right before, which
            pushed the card left of centre by the width of that column —
            noticeable on a page whose every other section is symmetrical. A
            slot on each side, of equal width, puts the card back on the page's
            centre line and back to its old ~1024px at the cap.

            Both slots are always present. The back arrow is HIDDEN on the
            first card rather than unmounted, so its side keeps its width and
            the card does not shift sideways the moment you page — which would
            undo the centring at the exact moment the client looked at it.

            One pair of buttons, not a desktop set and a mobile set: a second
            pair would be a second "Next project" for a screen reader to find
            and announce, for a control that does the same thing. Below lg the
            row WRAPS instead — the track is w-full so it takes a line to
            itself and the two arrows fall underneath it, centred, which is
            where they have to go once the card is the full width of the
            page. */}
        <div className="container-edge">
          <div className="mx-auto flex max-w-[72.5rem] flex-wrap items-center justify-center gap-x-4 gap-y-8 lg:flex-nowrap lg:gap-x-6">
            <div
              ref={trackRef}
              onScroll={sync}
              /* No `scroll-smooth` class: it would also smooth the browser's own
                 scroll restoration and any anchor landing inside the track. The
                 arrows pass their own behaviour, which is the only case that
                 wants easing. */
              className="no-scrollbar order-1 flex w-full min-w-0 snap-x snap-mandatory overflow-x-auto lg:order-2 lg:w-auto lg:flex-1"
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
                  {/* `relative` is load-bearing: it is what the stretched link
                    at the bottom of the copy column anchors to. */}
                <article className="relative mx-auto grid h-full max-w-lg grid-cols-1 border border-hair bg-paper lg:max-w-none lg:grid-cols-2">
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
                      <p className="mt-6 font-body text-base leading-relaxed text-mist">
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

                      {/* THE WHOLE CARD IS THE LINK (client, Aug 2026 —
                          having to find "View project" was a needless step
                          when the entire card plainly means "this
                          development").

                          Done by stretching this one anchor over the card with
                          an empty ::after, rather than by wrapping the article
                          in a <Link>. Wrapping would put the image, the status
                          chip, the name and all four spec rows inside the
                          anchor's accessible name, so a screen reader would
                          announce the whole card as the link text, and
                          selecting any of that copy would start a drag
                          instead. This way there is still exactly one link,
                          reading "View project", whose hit area happens to be
                          the card.

                          The card holds no other interactive element, so there
                          is nothing for the pseudo-element to swallow. */}
                      <Link
                        href={`/projects/${project.slug}`}
                        className="group mt-8 inline-flex items-center gap-3 self-start font-body text-sm text-ink transition-colors after:absolute after:inset-0 after:content-[''] hover:text-rose-deep"
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

          {/* BACK — left of the card, and only once there is something behind
              you. Drawn as a stroke rather than typed as the "←" glyph: a
              glyph is sized by the body face's metrics, and the arrow in this
              one is short and optically small. A path can be given whatever
              length and weight the design needs and is the same shape at every
              size. Smaller than it was (client: "a bit smaller but visible"),
              still ink rather than fog so it cannot be missed.

              opacity-0, not unmounted — see the note on the row above for why
              the slot has to keep its width. visibility is untouched so the
              transition can play; pointer-events-none and `disabled` keep it
              unclickable meanwhile. */}
          {projects.length > 1 && (
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous project"
              disabled={atStart}
              className={`group order-2 flex h-11 w-11 shrink-0 items-center justify-center text-ink transition-opacity duration-300 hover:text-rose-deep lg:order-1 ${
                atStart ? "pointer-events-none opacity-0" : ""
              }`}
            >
              <svg
                viewBox="0 0 32 12"
                className="h-3 w-8 transition-transform duration-500 group-hover:-translate-x-1"
                fill="none"
                aria-hidden="true"
              >
                <path d="M32 6H2M8 1L2 6l6 5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          )}

          {/* FORWARD — right of the card, and the mirror of the one above in
              every respect including when it disappears: on the last card
              there is nothing ahead, so it goes and its slot stays. */}
          {projects.length > 1 && (
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next project"
              disabled={atEnd}
              className={`group order-3 flex h-11 w-11 shrink-0 items-center justify-center text-ink transition-opacity duration-300 hover:text-rose-deep ${
                atEnd ? "pointer-events-none opacity-0" : ""
              }`}
            >
              <svg
                viewBox="0 0 32 12"
                className="h-3 w-8 transition-transform duration-500 group-hover:translate-x-1"
                fill="none"
                aria-hidden="true"
              >
                <path d="M0 6h30M24 1l6 5-6 5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          )}
          </div>

          {/* The folio, under the card and on the same centre line. It used to
              sit in the right-hand column with the arrows; that column is gone
              now that they flank the card, and centring it here keeps the
              section symmetrical rather than hanging the position marker off
              one side.

              The rule is decorative and aria-hidden — the numerals under it
              already state the position in something a screen reader can
              read, and saying it twice helps nobody. */}
          {projects.length > 1 && (
            <div className="mx-auto mt-10 flex w-24 flex-col items-center gap-3">
              <div aria-hidden="true" className="relative h-px w-full bg-hair-strong">
                <span
                  className="absolute inset-y-0 left-0 bg-rose-deep transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{
                    width: `${(Math.min(index + 1, projects.length) / projects.length) * 100}%`,
                  }}
                />
              </div>
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
    </section>
  );
}
