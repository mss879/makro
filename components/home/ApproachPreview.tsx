"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap, useGSAP } from "@/lib/gsap";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";
import { PeakMark } from "@/components/brand/PeakMark";

/* Bodies deliberately short — client wants max two rows per card; the
   full step descriptions live on the Approach page. */
const STEPS = [
  {
    n: "01",
    title: "Plan",
    body: "Make the right development decision before committing capital.",
  },
  {
    n: "02",
    title: "Design",
    body: "Make every square foot work harder, through integrated design and expertise.",
  },
  {
    n: "03",
    title: "Compliance",
    body: "Protect completion, ownership and value through disciplined conformity.",
  },
  {
    n: "04",
    title: "Build",
    body: "QAQC, efficient project programming and precise execution working in harmony through every stage of delivery.",
  },
  {
    n: "05",
    title: "Endure",
    body: "Create performance and value that extend well beyond completion.",
  },
];

/* Each cell sits one 20px riser higher than the one before it, so the five
   treads read as a staircase climbing left to right. Exposed as a custom
   property because the hairline geometry is pure CSS below — a media query
   can drop the stair at <1024px without JS knowing about it. */
const stairFor = (i: number) => `${12 + 20 * i}px`;

/**
 * "Five Flights" — the rail is no longer a straight line, it is a section
 * through a building. A rose hairline datum climbs the grid in five
 * ascending flights (riser, tread, riser, tread); as each level lands, a
 * dashed plumb line falls into that storey, the storey's type is set out,
 * and only then does the storey fill with material. The twin-peak logomark
 * is the last step, drawn at the summit. 01 Plan at the base, 05 Endure at
 * the top: "The Standard Above" drawn as a building section.
 *
 * Two rules govern everything here:
 *  — Nothing fades. There is no autoAlpha and no opacity tween in this
 *    section. Reveals are masked rise, clip-path wipe, scale, translate and
 *    strokeDashoffset. autoAlpha toggles `visibility` at the 0 boundary and
 *    is the usual source of flicker when a user scrubs back up through a
 *    pinned timeline; with none of it there is nothing to flicker.
 *  — Line first, material second. The storey is surveyed, then it is built.
 */
export default function ApproachPreview() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;

      const q = gsap.utils.selector(el);
      const grid = el.querySelector<HTMLElement>("[data-grid]");
      const rail = el.querySelector<HTMLElement>("[data-rail]");
      const head = el.querySelector<HTMLElement>("[data-head]");
      const markSvg = el.querySelector<SVGSVGElement>("[data-peak]");
      const cells = Array.from(el.querySelectorAll<HTMLElement>("[data-step]"));
      const peaks = el.querySelectorAll<SVGPathElement>("[data-peak] .peak-draw");
      if (!grid || !rail || cells.length === 0) return;

      const treads = q("[data-tread]");
      const risers = q("[data-riser]");
      const plumbs = q("[data-plumb]");
      const plumbMasks = q("[data-plumb-mask]");
      const fills = q("[data-fill]");
      const nums = q("[data-num]");
      const titles = q("[data-title]");
      const bodies = q("[data-body]");
      const bodyWins = q("[data-body-win]");
      const bodyInners = q("[data-body-inner]");

      /**
       * Every element in this section ships at its FINISHED value — there is
       * not one from-state in the markup. Each motion branch hides what it is
       * about to animate, here, inside useGSAP's layout effect, so it lands
       * before first paint. Three things fall out of that:
       *
       *  1. If the bundle never boots or hydration fails, the section renders
       *     as the complete stepped elevation instead of blank. Same frame the
       *     reduced-motion branch produces.
       *  2. mm.revert() on a breakpoint change restores that same frame, so a
       *     resize can never strand the copy invisible.
       *  3. There is no inline transform left for GSAP to compose with. That
       *     one is not theoretical: given an inline `translateY(100%)`, GSAP
       *     resolves it to a pixel `y` and then ADDS the `yPercent` it
       *     animates, which parks the slab one full cell-height low and it
       *     never arrives. Same trap as the Tailwind v4 `scale` utilities,
       *     reached from the other direction.
       */
      const prime = () => {
        gsap.set(treads, { scaleX: 0 });
        gsap.set(risers, { scaleY: 0 });
        // Both reveals below are COUNTER-TRANSLATED DOUBLE MASKS, not
        // clip-paths. The outer element is the clip window and sweeps down;
        // the inner translates by exactly the opposite amount, so the content
        // is pixel-stationary while a hard horizontal edge passes over it.
        // Rendered position = outer + inner = 0. At yPercent -50 the window
        // spans [T-h/2, T+h/2] against content at [T, T+h], so the visible
        // intersection is the top half — which is precisely what
        // `inset(0% 0% 100% 0%) -> inset(0)` drew, at zero repaint cost.
        // clip-path is not a compositable property: scrubbed across a 90vh
        // pin it repainted four paragraphs of text on every scroll frame.
        gsap.set(plumbMasks, { yPercent: -100 });
        gsap.set(plumbs, { yPercent: 100 });
        gsap.set(fills, { yPercent: 100 });
        gsap.set(nums, { yPercent: 100 });
        gsap.set(titles, { yPercent: 115 });
        gsap.set(bodies, { yPercent: -100 });
        gsap.set(bodyInners, { yPercent: 100 });
        // Dash each logomark stroke by its own length and push the dash out
        // of view, so the paths can be drawn back on.
        peaks.forEach((p) => {
          const len = p.getTotalLength();
          gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
        });
      };

      const mm = gsap.matchMedia();

      // ── Desktop — pinned and scrubbed ───────────────────────────────────
      // The timeline is 5.75 units long and maps onto ~90vh of pin. One
      // flight per column at F = 0 / 1 / 2 / 3 / 4, then the summit.
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        prime();

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            // The reserved band above the grid makes this section taller
            // than it used to be. If it ever outgrows the viewport, "top
            // top" would pin with the fourth storey's copy below the fold —
            // so centre it instead. Re-evaluated on every refresh.
            start: () => (el.offsetHeight > window.innerHeight - 24 ? "center center" : "top top"),
            // ~90vh of travel, down from 140vh. The original figure assumed
            // Selected Work was pinned above this one, so a long hold here
            // read as part of an established rhythm. With that section
            // toggleable — and currently off — this is the page's ONLY pin,
            // and 140vh (1260px at a 900px viewport) meant roughly thirteen
            // wheel notches where the view does not move. That reads as the
            // page having frozen rather than as a held moment, which is
            // exactly what it was reported as. The timeline is mapped across
            // the pin, so shortening the travel speeds the sequence up
            // proportionally rather than truncating it.
            end: () => `+=${window.innerHeight * 0.9}`,
            pin: true,
            // Refreshes after FeaturedProjects (priority 2) and before every
            // unpinned trigger (priority 0). Pins must settle in DOM order or
            // the triggers below them — the footer especially — compute their
            // start against a document height that the pin spacers are about
            // to change, and then never fire at all.
            refreshPriority: 1,
            scrub: 0.6,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            // One owner for promotion on this whole section: layers exist for
            // the duration of the pin and are released the moment it lets go,
            // so nothing stays promoted down the rest of the page. Previously
            // twelve elements were promoted at breakpoint-match time and only
            // released by mm.revert() (i.e. never), while the paragraphs got
            // `will-change: clip-path` — a hint with no compositing fast path
            // behind it in Chromium, so it cost memory and bought nothing.
            onToggle: (self) =>
              gsap.set(
                [...nums, ...titles, ...fills, ...plumbMasks, ...plumbs, ...bodies, ...bodyInners],
                { willChange: self.isActive ? "transform" : "auto" }
              ),
          },
        });

        const FLIGHT = 1.0;

        cells.forEach((cell, i) => {
          const F = i * FLIGHT;
          const qc = gsap.utils.selector(cell);
          const riser = qc("[data-riser]")[0];

          // The riser IS the idea: the datum steps up a level. Shortest and
          // hardest tween in the section — it clicks. Never give it a back
          // or elastic ease; a staircase clicks, it does not bounce. Against
          // the long glide of the treads this reads glide / click / glide /
          // click, which is what kills the old constant-velocity rail.
          if (riser) {
            tl.fromTo(
              riser,
              { scaleY: 0 },
              { scaleY: 1, duration: 0.18, ease: "power4.out", force3D: true },
              F
            );
          }

          // The straightedge is already running out across the bay before
          // the level has finished settling — one gesture in two parts, not
          // two separate events.
          tl.fromTo(
            qc("[data-tread]"),
            { scaleX: 0 },
            { scaleX: 1, duration: 0.6, ease: "power2.out", force3D: true },
            F + 0.08
          );

          // The only accelerating ease and the only downward vector in the
          // whole section, because a plumb bob falls. It drops while the
          // tread is roughly a third of the way across, and its landing is
          // what releases the storey's content. One contrary vector gives
          // everything else something to push against.
          // Paired counter-translate (see prime): the mask sweeps down, the
          // dashed line slides up by the same amount, so the dashes neither
          // stretch — which is what ruled out scaleY — nor travel.
          tl.fromTo(
            qc("[data-plumb-mask]"),
            { yPercent: -100 },
            { yPercent: 0, duration: 0.26, ease: "power2.in", force3D: true },
            F + 0.26
          ).fromTo(
            qc("[data-plumb]"),
            { yPercent: 100 },
            { yPercent: 0, duration: 0.26, ease: "power2.in", force3D: true },
            F + 0.26
          );

          // Numeral rises through its mask like a lift's floor indicator —
          // hard-edged, either absent or fully present. expo.out so it
          // arrives rather than travels.
          tl.fromTo(
            qc("[data-num]"),
            { yPercent: 100 },
            { yPercent: 0, duration: 0.5, ease: "expo.out", force3D: true },
            F + 0.44
          );

          // Title rises out of its own mask a beat later, reading as a
          // second card sliding up from behind the first.
          tl.fromTo(
            qc("[data-title]"),
            { yPercent: 115 },
            { yPercent: 0, duration: 0.46, ease: "expo.out", force3D: true },
            F + 0.56
          );

          // The pour. Material arrives only after the storey is surveyed —
          // this is the beat that gives the section weight. Cream to shell,
          // a deliberately small delta: the mass comes from the hard edge
          // and the ease, never from contrast.
          tl.fromTo(
            qc("[data-fill]"),
            { yPercent: 100 },
            { yPercent: 0, duration: 0.8, ease: "power2.out", force3D: true },
            F + 0.6
          );

          // Body unrolls top-to-bottom, in reading order, while the block
          // rises on the same tween. Line one is complete and readable
          // before line two exists.
          // Three tweens, one gesture. Identical duration, ease and position
          // on all of them so a single playhead keeps them locked: any drift
          // between the window and the inner and the copy slides instead of
          // unrolling. The window carries the 16px rise; the mask pair does
          // the reveal.
          tl.fromTo(
            qc("[data-body-win]"),
            { y: 16 },
            { y: 0, duration: 0.5, ease: "power2.out", force3D: true },
            F + 0.66
          )
            .fromTo(
              qc("[data-body]"),
              { yPercent: -100 },
              { yPercent: 0, duration: 0.5, ease: "power2.out", force3D: true },
              F + 0.66
            )
            .fromTo(
              qc("[data-body-inner]"),
              { yPercent: 100 },
              { yPercent: 0, duration: 0.5, ease: "power2.out", force3D: true },
              F + 0.66
            );
        });

        // Each flight's tail (body ends F+1.16, slab F+1.40) deliberately
        // overlaps the next flight's riser at F+1.00. The eye has already
        // moved right to the new riser while the previous storey is still
        // settling in peripheral vision, so the five reveals read as one
        // continuous survey rather than five announcements.

        // Summit. The mark lifts onto the end of the fifth tread the
        // instant that tread lands (4.68), then the two peaks draw
        // themselves on, left then right — the same ascending gesture the
        // staircase just performed, at brand scale.
        if (markSvg) {
          tl.fromTo(markSvg, { y: 8 }, { y: 0, duration: 0.55, ease: "expo.out" }, 4.7);
        }
        // A 0.18 stagger means peak two starts climbing while peak one is
        // still going, so you watch the interlocking M assemble rather than
        // see two lines finish separately. Safe as a .to() because
        // strokeDashoffset was primed by gsap.set before the timeline existed.
        tl.to(peaks, { strokeDashoffset: 0, duration: 0.55, stagger: 0.18, ease: "power2.out" }, 4.78);

        // A slow constant pull under the entire sequence so the pinned frame
        // is never static and the direction of travel is reinforced even
        // while the eye is on the copy. ease "none" — any easing here reads
        // as a second, competing event.
        if (head) {
          tl.fromTo(head, { y: 0 }, { y: -26, ease: "none", duration: 5.75 }, 0);
        }

        // Hold from 5.51 (last stroke lands, ~96%) to 5.75 (100%). Not
        // padding: with scrub 0.6 the playhead lags the scroll position, so
        // a timeline that ends at exactly 100% unpins while the logomark is
        // still drawing. Placed explicitly rather than appended so the
        // timeline's total stays 5.75 alongside the head tween. If this
        // section ever needs shortening, reduce FLIGHT — not this.
        tl.to({}, { duration: 0.24 }, 5.51);
      });

      // ── Tablet and phone — unpinned, one-shot ───────────────────────────
      // The staircase does not exist below lg: a five-riser stair means
      // nothing over a one- or two-column stack, and the treads and risers
      // are `hidden lg:block` so they never need a tween. The story still
      // holds because the storeys are already stacked vertically — physical
      // scroll direction performs the ascent the stair performs on desktop.
      // The plumb falls back to a 48px drop from just above the cell's own
      // top border into the numeral.
      mm.add("(max-width: 1023px) and (prefers-reduced-motion: no-preference)", () => {
        prime();

        // Below lg the full-width rail is the grid's datum, drawn once. It is
        // primed here rather than in prime() because above lg it is hidden and
        // must be left alone.
        gsap.set(rail, { scaleX: 0 });
        gsap.fromTo(
          rail,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 1.0,
            ease: "power2.inOut",
            force3D: true,
            scrollTrigger: { trigger: grid, start: "top 85%" },
          }
        );

        // One trigger per cell rather than a batch off the grid: stacked,
        // the grid is tall enough that a single trigger would fire storeys
        // that are still a full screen below the fold. The stagger is done
        // by the scroll itself, which is more honest than a faked one.
        cells.forEach((cell) => {
          const qc = gsap.utils.selector(cell);
          const t = gsap.timeline({
            scrollTrigger: { trigger: cell, start: "top 82%", toggleActions: "play none none none" },
          });
          // Same grammar as desktop — plumb, pour, numeral, title, body —
          // but unscrubbed, so the more extreme expo.out is free. The slab
          // is what carries the idea here; without it the mobile branch
          // would be one 48px hairline and a lot of nothing.
          t.fromTo(qc("[data-plumb-mask]"), { yPercent: -100 }, { yPercent: 0, duration: 0.34, ease: "power2.in", force3D: true }, 0)
            .fromTo(qc("[data-plumb]"), { yPercent: 100 }, { yPercent: 0, duration: 0.34, ease: "power2.in", force3D: true }, 0)
            .fromTo(qc("[data-fill]"), { yPercent: 100 }, { yPercent: 0, duration: 0.85, ease: "power2.out" }, 0.06)
            .fromTo(qc("[data-num]"), { yPercent: 100 }, { yPercent: 0, duration: 0.62, ease: "expo.out" }, 0.14)
            .fromTo(qc("[data-title]"), { yPercent: 115 }, { yPercent: 0, duration: 0.58, ease: "expo.out" }, 0.26)
            .fromTo(qc("[data-body-win]"), { y: 14 }, { y: 0, duration: 0.62, ease: "power2.out", force3D: true }, 0.36)
            .fromTo(qc("[data-body]"), { yPercent: -100 }, { yPercent: 0, duration: 0.62, ease: "power2.out", force3D: true }, 0.36)
            .fromTo(qc("[data-body-inner]"), { yPercent: 100 }, { yPercent: 0, duration: 0.62, ease: "power2.out", force3D: true }, 0.36);
        });

        // Hung off the LAST cell so the mark still closes the sequence
        // instead of firing early at the top of a tall stack.
        gsap.to(peaks, {
          strokeDashoffset: 0,
          duration: 0.55,
          stagger: 0.18,
          delay: 0.5,
          ease: "power2.out",
          scrollTrigger: { trigger: cells[cells.length - 1], start: "top 82%" },
        });
      });

      // ── Reduced motion — the finished drawing, no ScrollTriggers ────────
      // Not just compliance: this is the frame stakeholders screenshot, so
      // it has to be a handsome static composition in its own right — the
      // full stepped elevation, plumbs dropped, storeys poured, logomark at
      // the summit. Because prime() never runs on this branch the markup is
      // already at every one of these values; the pass is kept explicit so
      // the finished state is stated once, in full, and survives any future
      // branch that reverts into this one. Every mask pair is seated at
      // yPercent 0, which is where the markup already ships them — no
      // clipping context and no residual transform left on the copy at rest.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(treads, { scaleX: 1 });
        gsap.set(risers, { scaleY: 1 });
        gsap.set(rail, { scaleX: 1 });
        gsap.set([...plumbMasks, ...plumbs], { yPercent: 0 });
        gsap.set(fills, { yPercent: 0 });
        gsap.set(nums, { yPercent: 0 });
        gsap.set(titles, { yPercent: 0 });
        gsap.set([...bodies, ...bodyInners], { yPercent: 0 });
        gsap.set(bodyWins, { y: 0 });
        if (markSvg) gsap.set(markSvg, { y: 0 });
        gsap.set(peaks, { strokeDashoffset: 0 });
        if (head) gsap.set(head, { y: 0 });
      });

      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <section ref={root} className="section-light relative py-24 md:py-32 lg:py-28">
      <div className="container-edge">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          {/* data-head, not the h2 — TextReveal owns the transforms on that
              subtree and the drift would compose with them. */}
          <div data-head className="max-w-2xl">
            <div className="flex items-center gap-4">
              <span className="font-body text-xs text-rose-deep">04</span>
              <span className="line-hair w-10" />
              <span className="eyebrow text-rose-deep">Our Approach</span>
            </div>
            <TextReveal
              as="h2"
              text="How lasting value gets built."
              className="mt-6 font-display display-md text-ink"
            />
          </div>
          <Reveal>
            <Link
              href="/approach"
              className="group inline-flex items-center gap-3 border-b border-hair-strong pb-2 font-body text-ink transition-colors hover:border-rose-deep hover:text-rose-deep"
            >
              Explore our approach
              <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
            </Link>
          </Reveal>
        </div>

        {/* The mobile rail and the logomark both sit above the grid's top
            edge, so they live in a wrapper around the grid rather than
            inside it — an absolute child of a grid container is a fragile
            place to put them.

            lg:pt-[124px] reserves the band the staircase climbs through:
            92px of maximum stair + 24px of logomark + 8px of air. It is
            static layout applied once; the treads, risers and plumbs are all
            absolutely positioned, so nothing in the band ever reflows. The
            drawn band now supplies the breathing room the old mt-16 did,
            hence lg:mt-8. */}
        <div data-grid className="relative mt-16 lg:mt-8 lg:pt-[124px]">
          {/* Mobile datum only — above lg the five treads replace it.
              No `scale-x-0` here or on any data-hooked element below:
              Tailwind v4 writes the discrete CSS `scale` property, which
              composes with — and permanently flattens — the `transform` GSAP
              owns. A stray transform utility looks like a broken trigger, not
              a CSS bug. The from-state is applied in JS instead (see prime). */}
          <span
            data-rail
            className="pointer-events-none absolute -top-px left-0 h-px w-full origin-left bg-rose-deep lg:hidden"
          />
          {/* Rests on the end of the summit tread. At lg the band is 124px,
              the top tread sits 92px above the grid, the mark is 24px tall,
              so 124 − 92 − 24 − 2 = 6px leaves its foot 2px clear of the
              tread. (Absolute offsets here are measured from the wrapper's
              padding box, i.e. its outer top edge, not from below the band.) */}
          <PeakMark
            data-peak
            className="pointer-events-none absolute right-0 -top-9 h-5 w-auto text-rose-deep lg:top-[6px] lg:h-6"
            strokeWidth={6}
            animated
          />

          <div className="grid grid-cols-1 gap-px border border-hair bg-hair sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((s, i) => (
              <div
                key={s.n}
                data-step
                style={{ "--stair": stairFor(i) } as React.CSSProperties}
                /* Five into two leaves the last cell alone on its row at sm,
                   and an empty half-row in a gap-px grid paints as a bare
                   slab of hairline. It spans the row instead. */
                className={`group relative flex flex-col bg-cream p-8 ${
                  i === STEPS.length - 1 ? "sm:col-span-2 lg:col-span-1" : ""
                }`}
              >
                {/* The slab gets its own clipper rather than overflow-hidden
                    on the cell: the cell has to let the treads, risers and
                    plumbs hang above its top edge, but the slab parked at
                    translateY(100%) must not paint over the cell below in
                    the stacked layouts.

                    At lg the clipper's top rises to this cell's own tread, so
                    the material pours up PAST the grid's top edge and stops
                    flush against the datum line. That is what turns five equal
                    cards into an actual staircase of filled blocks — the step
                    is the mass, not just a line floating above it. Below lg
                    the stair does not exist, so it stays inset to the cell. */}
                <span className="pointer-events-none absolute inset-x-0 bottom-0 top-0 z-0 overflow-hidden lg:top-[calc(var(--stair)*-1)]">
                  {/* Material. Never translate-y-full — GSAP owns transform. */}
                  <span
                    data-fill
                    className="absolute inset-0 bg-shell transition-colors duration-500 group-hover:bg-[#ded5c0]"
                  />
                </span>

                {/* The vertical click up onto this level. h-5 = 20px, the
                    exact delta between consecutive stairs, so it spans from
                    the previous cell's tread to this one's. Never scale-y-0. */}
                {i > 0 && (
                  <span
                    data-riser
                    style={{ top: "calc(var(--stair) * -1)" }}
                    className="pointer-events-none absolute left-0 hidden h-5 w-px origin-bottom bg-rose-deep lg:block"
                  />
                )}

                {/* The horizontal run across this bay. Geometry derives from
                    the real grid at any width — a single stretched SVG
                    polyline with preserveAspectRatio="none" could never land
                    its risers on the true column boundaries. -right-px so
                    consecutive treads meet across the 1px gutter. Never
                    scale-x-0. */}
                <span
                  data-tread
                  style={{ top: "calc(var(--stair) * -1)" }}
                  className="pointer-events-none absolute left-0 -right-px hidden h-px origin-left bg-rose-deep lg:block"
                />

                {/* The construction line that stitches the tread into the
                    storey. left-8 = the cell's p-8, so it lands exactly on
                    the numeral's left edge.

                    Three elements, not one. scaleY was never an option — it
                    stretches the dashes instead of revealing them. clip-path
                    did the job correctly but is not compositable, so scrubbed
                    inside the pin it repainted on every scroll frame. This is
                    the counter-translated double mask (see prime): the outer
                    span owns the geometry, [data-plumb-mask] sweeps its clip
                    window down, and [data-plumb] slides up by exactly the same
                    amount. Net translation zero, so the dashes neither stretch
                    nor travel — the line is drawn, not moved. */}
                <span className="pointer-events-none absolute left-8 top-[-20px] h-12 w-px lg:top-[calc(var(--stair)*-1)] lg:h-[calc(var(--stair)+28px)]">
                  <span data-plumb-mask className="absolute inset-0 overflow-hidden">
                    <span
                      data-plumb
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(to bottom, var(--color-rose-deep) 0 3px, transparent 3px 7px)",
                      }}
                      className="absolute inset-0"
                    />
                  </span>
                </span>

                {/* No justify-between / min-height: grid cells already
                    equalise height, so the content keeps a tight rhythm
                    instead of being pushed to the card's two edges. */}
                <div className="relative z-10 flex flex-col">
                  {/* A purpose-built mask, not .reveal-mask — Marcellus
                      digits have no descenders, so that utility's 0.4em
                      padding would only fight this tight leading. */}
                  <span className="block overflow-hidden">
                    <span
                      data-num
                      className="block font-display text-5xl leading-none text-rose-deep"
                    >
                      {s.n}
                    </span>
                  </span>

                  {/* .reveal-mask already gives "Design"'s descender room;
                      the travel is 115% rather than 100% so the glyph fully
                      clears that overhang.

                      Steps down through the desktop range: five columns leave
                      only ~117px of content inside the p-8 at lg, and
                      "Compliance" is one unbreakable word. Measured, not
                      guessed — at each of these breakpoints the widest title
                      clears its column with room to spare. Below lg the grid
                      is one or two columns, so the full size fits. */}
                  <h3 className="reveal-mask mt-7 font-display text-3xl text-ink lg:text-xl xl:text-2xl 2xl:text-3xl">
                    <span data-title className="block">
                      {s.title}
                    </span>
                  </h3>

                  {/* Balanced wrap → even rows, never a stranded half row.
                      The 30ch cap is inert from lg up (the five columns are
                      narrower than that) and still governs the stacked
                      layouts below it.

                      Three elements, and the pad/margin split between them is
                      load-bearing. yPercent resolves against offsetHeight, so
                      the mask [data-body] and the copy [data-body-inner] have
                      to be exactly the same height for their translates to
                      cancel to the pixel — hence pb-[2px] stays on the
                      paragraph (keeping the descender room INSIDE the mask,
                      where clip-path used to shave it on a subpixel boundary)
                      while the cancelling mb-[-2px] moves up to the window,
                      which is also what carries the 16px rise.

                      A cover slab was the obvious alternative and does not
                      work: [data-fill] is still pouring up behind this copy
                      while it unrolls, so the backdrop is mid-transition from
                      cream to shell and no flat colour could match it — and
                      group-hover:bg-[#ded5c0] would break it again. These
                      masks are transparent, so hover is untouched. */}
                  <div data-body-win className="mt-3 mb-[-2px]">
                    <div data-body className="overflow-hidden">
                      <p
                        data-body-inner
                        className="max-w-[30ch] text-balance pb-[2px] font-body text-sm leading-relaxed text-mist"
                      >
                        {s.body}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
