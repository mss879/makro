"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

type Entry = {
  year: string;
  title: string;
  body: string;
};

/**
 * "The Measure" — the history drawn as one continuous graduated rule.
 *
 * A surveyor's measure with a hard ink zero-mark at 2013 that runs through
 * four stations and then stops being solid, continuing as a dotted projection
 * that escapes the container's edge padding and runs off the viewport.
 * Measured behind, open ahead — which is the honest reading of copy that is
 * one real date followed by three relative markers.
 *
 * Every box, border, panel and fill from the old four-cell grid is gone. The
 * section is cream, two 1px hairlines, a 6px graduation comb and type. The
 * years are the hero because they are the most evocative content here and
 * used to be the smallest thing in it.
 *
 * Deliberately NOT the homepage's ApproachPreview: nothing climbs, nothing
 * steps, no material pours, no logomark, no 01–04 index. That one is a
 * building section; this is a rule. The index and the hairline-row
 * construction are also both already used by "Why Makro" immediately above
 * this component on the same page.
 *
 * On tablet and phone the instrument simply stands up. A levelling staff IS
 * vertical, so the stacked layout is the truer form of the idea rather than a
 * squashed desktop — and a 2×2 grid would reintroduce the "four boxes"
 * reading this redesign exists to kill.
 */
export default function Timeline({ entries }: { entries: Entry[] }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;

      const CLIP_L_HID = "inset(0% 100% 0% 0%)"; // reveal left → right
      const CLIP_T_HID = "inset(0% 0% 100% 0%)"; // reveal top → bottom
      const CLIP_VIS = "inset(0% 0% 0% 0%)";

      const q = gsap.utils.selector(el);
      const mm = gsap.matchMedia();

      // Masked travel MUST be measured from the mask, in pixels — never a
      // fixed yPercent. yPercent resolves against the element's own height,
      // but these masks are sized by em padding (.reveal-mask adds 0.4em top
      // and bottom), so the gap between element and mask is constant while
      // the element height changes with line count. At 120%, a two-line
      // heading (53px in a 70px mask) travelled 63px and just cleared, while
      // a one-line heading (26px in the same 70px mask) travelled 31px and
      // never left the mask at all — so it sat there fully visible and never
      // appeared to animate. Travelling the mask's own height always clears
      // it, whatever the line count.
      //
      // Function-based so ScrollTrigger's invalidateOnRefresh re-measures
      // after a resize reflows a heading onto a different number of lines.
      const drop = (node: Element) => () =>
        (node.parentElement?.offsetHeight ?? node.getBoundingClientRect().height) + 2;

      // ── Desktop ≥1280 — the horizontal instrument ─────────────────────────
      // 1280 rather than 1024 on purpose: at 1024 the four columns compute to
      // ~200px, which sets a 22px title to ~15ch and pushes "Building a
      // disciplined track record" onto three lines. At 1280 they are ~274px
      // and every title sets to two.
      mm.add("(min-width: 1280px) and (prefers-reduced-motion: no-preference)", () => {
        const d = gsap.utils.selector(q("[data-desktop]")[0]);
        const years = d("[data-year]");
        const titles = d("[data-title]");

        // Nothing ships a from-state in markup or CSS — priming happens only
        // here, so a failed bundle, failed hydration or mm.revert() all leave
        // the complete, legible drawing on screen.
        gsap.set(d("[data-stop]"), { scaleY: 0 });
        gsap.set(d("[data-rule]"), { scaleX: 0 });
        gsap.set(d("[data-comb]"), { clipPath: CLIP_L_HID });
        gsap.set(d("[data-tick]"), { scaleY: 0 });
        gsap.set(d("[data-dotted]"), { clipPath: CLIP_L_HID });
        years.forEach((n) => gsap.set(n, { y: drop(n)() }));
        titles.forEach((n) => gsap.set(n, { y: drop(n)() }));
        gsap.set(d("[data-body]"), { clipPath: CLIP_T_HID, y: 10 });
        // Eight promoted layers, released by mm.revert(). The 1px hairlines
        // are not promoted — nothing to gain — nor the clip-paths, which
        // would cost memory for nothing.
        gsap.set([...years, ...titles], { willChange: "transform" });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            end: "top 30%",
            scrub: 0.7,
            invalidateOnRefresh: true,
          },
        });

        // The instrument is set down before it is run out.
        tl.fromTo(d("[data-stop]"), { scaleY: 0 }, { scaleY: 1, duration: 0.22, ease: "power4.out" }, 0);

        // The rule is the clock and runs at constant velocity — it is a
        // straightedge being run out, and any easing here would read as a
        // second, competing event. The comb is revealed by clip-path, NOT
        // scaleX: scaling an element carrying a repeating gradient stretches
        // the graduations instead of revealing them.
        tl.fromTo(d("[data-rule]"), { scaleX: 0 }, { scaleX: 1, duration: 3.6, ease: "none" }, 0.1);
        tl.fromTo(
          d("[data-comb]"),
          { clipPath: CLIP_L_HID },
          { clipPath: CLIP_VIS, duration: 3.6, ease: "none" },
          0.1
        );

        // Station arrivals are derived, not chosen: the rule spans x=0 to
        // station 4 over 3.6 units at constant velocity, so its leading edge
        // crosses the stations at exactly 0.10 / 1.30 / 2.50 / 3.70. Copy and
        // rule share one clock, which is what makes the rule read as the
        // cause of everything. Changing the 1.20 interval means changing the
        // 3.60 duration with it.
        // The desktop layout is three separate blocks — a years row, the
        // measure, then the copy grid — so there is no per-entry container to
        // scope to. Everything is addressed positionally instead, which is
        // safe because all three lists are rendered from the same `entries`
        // array in the same order.
        const bodies = d("[data-body]");
        const ticks = d("[data-tick]");

        entries.forEach((_, i) => {
          const A = 0.1 + i * 1.2;

          // Station 1's mark is the ink end-stop, so it gets no rose tick —
          // rendering both would put two vertical marks at x=0.
          if (i > 0) {
            tl.fromTo(ticks[i - 1], { scaleY: 0 }, { scaleY: 1, duration: 0.22, ease: "power3.out" }, A - 0.1);
          }
          tl.fromTo(years[i], { y: drop(years[i]) }, { y: 0, duration: 0.5, ease: "expo.out" }, A + 0.05);
          tl.fromTo(titles[i], { y: drop(titles[i]) }, { y: 0, duration: 0.5, ease: "expo.out" }, A + 0.17);
          tl.fromTo(
            bodies[i],
            { clipPath: CLIP_T_HID, y: 10 },
            { clipPath: CLIP_VIS, y: 0, duration: 0.55, ease: "power2.out" },
            A + 0.25
          );
        });

        // ease "none" because it is the same instrument continuing — it must
        // not re-ease into a new gesture.
        tl.fromTo(
          d("[data-dotted]"),
          { clipPath: CLIP_L_HID },
          { clipPath: CLIP_VIS, duration: 1, ease: "none" },
          3.72
        );

        // Not padding: with scrub 0.7 the playhead lags the scroll, so a
        // timeline ending at exactly 100% leaves the projection half-drawn.
        tl.to({}, { duration: 0.28 }, 4.72);
      });

      // ── Below 1280 — the staff stands up ──────────────────────────────────
      // The rule tracks scroll position rather than performing a sequence, and
      // the per-entry stagger is done by the scroll itself, which is more
      // honest than faking one.
      const staffBranch = (phone: boolean) => () => {
        const s = gsap.utils.selector(q("[data-staff]")[0]);
        const bodyTravel = phone ? 8 : 12;
        const k = phone ? 0.9 : 1;

        gsap.set(s("[data-cap]"), { scaleX: 0 });
        gsap.set(s("[data-vrule]"), { scaleY: 0 });
        gsap.set(s("[data-vtail]"), { clipPath: CLIP_T_HID });
        gsap.set(s("[data-vtick]"), { scaleX: 0 });
        s("[data-year]").forEach((n) => gsap.set(n, { y: drop(n)() }));
        s("[data-title]").forEach((n) => gsap.set(n, { y: drop(n)() }));
        gsap.set(s("[data-body]"), { clipPath: CLIP_T_HID, y: bodyTravel });
        // Phone ships the comb visible and never animates it: one fewer
        // clip-path repaint per frame on a low-end device, and at a 24px
        // pitch nobody misses the reveal.
        if (!phone) gsap.set(s("[data-vcomb]"), { clipPath: CLIP_T_HID });

        const staff = q("[data-staff]")[0];
        const track = {
          trigger: staff,
          start: "top 80%",
          end: "bottom 78%",
          scrub: 0.8,
          invalidateOnRefresh: true,
        };

        gsap.fromTo(s("[data-vrule]"), { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: track });
        if (!phone) {
          gsap.fromTo(
            s("[data-vcomb]"),
            { clipPath: CLIP_T_HID },
            { clipPath: CLIP_VIS, ease: "none", scrollTrigger: track }
          );
        }
        gsap.fromTo(
          s("[data-cap]"),
          { scaleX: 0 },
          { scaleX: 1, duration: 0.26, ease: "power4.out", scrollTrigger: { trigger: staff, start: "top 80%" } }
        );

        const items = s("[data-entry]");
        items.forEach((li, i) => {
          const c = gsap.utils.selector(li);
          const t = gsap.timeline({
            scrollTrigger: { trigger: li, start: "top 82%", toggleActions: "play none none none" },
          });
          if (i > 0) {
            t.fromTo(c("[data-vtick]"), { scaleX: 0 }, { scaleX: 1, duration: 0.26 * k, ease: "power3.out" }, 0);
          }
          const yr = c("[data-year]")[0];
          const ti = c("[data-title]")[0];
          t.fromTo(yr, { y: drop(yr) }, { y: 0, duration: 0.55 * k, ease: "expo.out" }, 0.08)
            .fromTo(ti, { y: drop(ti) }, { y: 0, duration: 0.55 * k, ease: "expo.out" }, 0.2)
            .fromTo(
              c("[data-body]"),
              { clipPath: CLIP_T_HID, y: bodyTravel },
              { clipPath: CLIP_VIS, y: 0, duration: 0.6 * k, ease: "power2.out" },
              0.3
            );

          // The tail drops off the last entry — the same "open ahead"
          // statement as the desktop projection, rotated.
          if (i === items.length - 1) {
            t.fromTo(
              s("[data-vtail]"),
              { clipPath: CLIP_T_HID },
              { clipPath: CLIP_VIS, duration: 0.7, ease: "none" },
              0.4
            );
          }
        });
      };

      mm.add("(min-width: 768px) and (max-width: 1279px) and (prefers-reduced-motion: no-preference)", staffBranch(false));
      mm.add("(max-width: 767px) and (prefers-reduced-motion: no-preference)", staffBranch(true));

      // ── Reduced motion — the finished frame, no ScrollTriggers at all ─────
      // The markup already sits at every one of these values; the pass is kept
      // explicit so the finished state is stated once, in full, and survives
      // any future branch reverting into it. clipPath "none" rather than a
      // full inset so no clipping context is left on text at rest.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(q("[data-stop], [data-tick], [data-vrule]"), { scaleY: 1 });
        gsap.set(q("[data-rule], [data-cap], [data-vtick]"), { scaleX: 1 });
        gsap.set(q("[data-comb], [data-dotted], [data-vcomb], [data-vtail]"), { clipPath: "none" });
        // y, not yPercent — the masked reveals travel in pixels measured from
        // the mask (see `drop`), so this is the property that must be cleared.
        gsap.set(q("[data-year], [data-title]"), { y: 0, yPercent: 0 });
        gsap.set(q("[data-body]"), { clipPath: "none", y: 0 });
      });

      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <div
      ref={root}
      // --bleed is byte-identical to .container-edge's padding-inline, so the
      // dotted projection's negative right margin lands exactly on the
      // viewport edge. --mgap is shared by all three overlay grids, which is
      // what guarantees their tracks are identical.
      style={{ "--bleed": "clamp(1.25rem, 5vw, 6.5rem)" } as React.CSSProperties}
      className="relative mt-14 [--mgap:2.5rem] md:mt-16 2xl:[--mgap:3.5rem]"
    >
      {/* ── Desktop: the horizontal instrument ── */}
      <div data-desktop className="hidden xl:block">
        <div className="grid grid-cols-4 items-end gap-x-[var(--mgap)]">
          {entries.map((e) => (
            <span
              key={e.year}
              /* A purpose-built mask, not .reveal-mask: its 0.4em padding is
                 27px at 68px type and would demand ~145% of masked travel.
                 0.08em/0.22em is sized for Marcellus's descender in "Today"
                 and nothing more, and the padding cancels the negative margin
                 exactly, so it stays layout-neutral. */
              className="-mb-[0.22em] -mt-[0.08em] block overflow-hidden pb-[0.22em] pt-[0.08em]"
            >
              <span
                data-year
                /* Mixed case, exactly as authored — uppercase reads as a
                   poster, mixed-case Marcellus at 68px reads as an expensive
                   book. Ink, never rose: rose is the instrument, ink is the
                   type. leading-[1] so the mask never clips a cap at rest. */
                className="block font-display leading-[1] tracking-[0.01em] text-ink"
                /* Pulled back from the original 2.75/4.2vw/4.25rem — at 1440
                   that set them at 60px, which read louder than the section
                   heading above and unbalanced the page. 3.4vw lands them at
                   ~49px, still clearly the hero of the section but sitting
                   under "A short history, a long-term view." rather than
                   competing with it. */
                style={{ fontSize: "clamp(2.25rem, 3.4vw, 3.5rem)" }}
              >
                {e.year}
              </span>
            </span>
          ))}
        </div>

        <div className="relative mt-7 h-9">
          {/* The zero. This is ALSO station 1's mark — on a real ruler the
              zero and the first graduation are the same thing. Ink and 6px
              longer than the rose ticks, so the datum reads structural and
              the stations read accent. */}
          <span
            data-stop
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 h-[30px] w-px origin-top bg-ink/60"
          />

          {/* Everything whose x must derive from the real columns lives in
              this overlay grid; all children share [grid-row:1] so they
              overlap freely. No magic pixel offsets anywhere. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 grid grid-cols-4 items-start gap-x-[var(--mgap)]">
            {/* A stretched grid item's width is (track − margins), so a
                negative right margin of exactly one gutter carries the rule
                across that gutter and lands it on track 4's start line. */}
            <span
              data-rule
              aria-hidden="true"
              className="col-start-1 col-end-4 mr-[calc(var(--mgap)*-1)] h-px w-auto origin-left bg-rose-deep [grid-row:1]"
            />
            <span
              data-comb
              aria-hidden="true"
              className="col-start-1 col-end-4 mr-[calc(var(--mgap)*-1)] mt-px h-[6px] w-auto [grid-row:1]"
              /* 6px tall, 1px wide, 12% ink, 28px pitch: a texture at reading
                 distance, an instrument up close. */
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to right, var(--color-hair) 0 1px, transparent 1px 28px)",
              }}
            />
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                data-tick
                aria-hidden="true"
                style={{ gridColumnStart: i + 1 }}
                /* Hangs DOWN off the rule toward its title — the tick stitches
                   the measure to the copy, and is the only downward vector in
                   a section that otherwise runs left to right. */
                className="mt-px h-6 w-px origin-top justify-self-start bg-rose-deep [grid-row:1]"
              />
            ))}
            {/* Past the fourth station the instrument stops being solid and
                runs off the viewport. Hard cut at the edge, no fade — a fade
                would apologise for it. */}
            <span
              data-dotted
              aria-hidden="true"
              className="col-start-4 col-end-5 mr-[calc(var(--bleed)*-1)] h-px w-auto [grid-row:1]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to right, var(--color-rose-deep) 0 3px, transparent 3px 8px)",
              }}
            />
          </div>
        </div>

        {/* Headings and bodies live in ONE grid with explicit row placement:
            every h3 is row 1, every p is row 2. A heading is therefore not in
            the same box as any body, and the client's alignment rule is not
            something being obeyed — it is geometrically impossible to
            violate. */}
        <div
          className="mt-10 grid grid-cols-4 gap-x-[var(--mgap)]"
          style={{ gridTemplateRows: "auto auto", rowGap: "0.875rem" }}
        >
          {entries.map((e, i) => (
            <h3
              key={`t-${e.year}`}
              style={{ gridRow: 1, gridColumn: i + 1 }}
              /* 19/21px rather than the original 22/24px. At 22px the entry
                 titles crowded the years above them and read as a competing
                 heading level; pulled back, the hierarchy is year → title →
                 body with clear steps between each. */
              className="reveal-mask max-w-[28ch] text-balance font-display text-[1.1875rem] leading-[1.3] text-ink 2xl:text-[1.3125rem]"
            >
              <span data-title className="block">
                {e.title}
              </span>
            </h3>
          ))}
          {entries.map((e, i) => (
            <p
              key={`b-${e.year}`}
              data-body
              style={{ gridRow: 2, gridColumn: i + 1 }}
              /* pb/-mb pair so the clip-path never shaves a descender on a
                 subpixel boundary at rest. */
              className="-mb-[2px] max-w-[34ch] pb-[2px] font-body text-[0.9375rem] leading-[1.65] text-mist"
            >
              {e.body}
            </p>
          ))}
        </div>
      </div>

      {/* ── Tablet and phone: the staff stands up ── */}
      <ol data-staff className="relative pl-9 md:pl-14 xl:hidden">
        <span
          data-cap
          aria-hidden="true"
          className="absolute left-0 top-0 h-px w-8 origin-left bg-ink/60"
        />
        <span
          data-vrule
          aria-hidden="true"
          className="absolute left-0 top-0 h-[calc(100%-5rem)] w-px origin-top bg-rose-deep"
        />
        <span
          data-vcomb
          aria-hidden="true"
          className="absolute left-0 top-0 h-[calc(100%-5rem)] w-[6px]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, var(--color-hair) 0 1px, transparent 1px 24px)",
          }}
        />
        <span
          data-vtail
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-20 w-px"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, var(--color-rose-deep) 0 3px, transparent 3px 8px)",
          }}
        />

        {entries.map((e, i) => (
          <li key={e.year} data-entry className="relative pb-14 last:pb-20 md:pb-[4.5rem]">
            {i > 0 && (
              <span
                data-vtick
                aria-hidden="true"
                className="absolute -left-9 top-[0.55em] h-px w-7 origin-left bg-rose-deep md:-left-14"
              />
            )}
            <span className="-mb-[0.22em] -mt-[0.08em] block overflow-hidden pb-[0.22em] pt-[0.08em]">
              <span
                data-year
                className="block font-display text-[2.5rem] leading-[1] tracking-[0.01em] text-ink md:text-[3rem]"
              >
                {e.year}
              </span>
            </span>
            {/* Matched to the desktop step-down so the hierarchy reads the
                same on a phone as it does on a monitor. */}
            <h3 className="reveal-mask mt-4 max-w-[32ch] font-display text-[1.125rem] leading-[1.3] text-ink md:mt-5 md:text-[1.25rem]">
              <span data-title className="block">
                {e.title}
              </span>
            </h3>
            <p
              data-body
              className="-mb-[2px] mt-2.5 pb-[2px] font-body text-[0.9375rem] leading-[1.65] text-mist md:mt-3 md:max-w-[54ch]"
            >
              {e.body}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
