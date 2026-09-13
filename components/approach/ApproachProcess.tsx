"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollTrigger, useGSAP } from "@/lib/gsap";

export type ApproachStep = {
  n: string;
  title: string;
  lead: string;
  paras: string[];
};

/**
 * Where the line's leading edge rides in the viewport, as a fraction of its
 * height from the top. Everything above it is drawn, and a stage is lit and
 * its copy set the moment its marker crosses it. One number for both, so the
 * line and the copy can never disagree about where "here" is.
 */
const LINE_AT = 0.62;

/** Points sampled along each segment for the scroll-position → length lookup. */
const SAMPLES = 64;

type Segment = {
  total: number;
  startY: number;
  endY: number;
  samples: { len: number; x: number; y: number }[];
};

/**
 * The Approach page's five stages, joined by one line that draws itself down
 * the page as it is read (client, Sep 2026: the stage images came out, and in
 * their place "a curved animated line moving" down with "the approach coming
 * one after another").
 *
 * THE ROUTE. Every stage hangs off a square marker on one axis — centred from
 * lg with the copy alternating either side of it, down the left edge below
 * that with the copy beside it. Between markers the line bows out into the
 * empty half beside the stage it is leaving (on a phone, a gentle wave inside
 * the gutter), so the curve occupies exactly the space the images used to. A
 * faint dashed copy of the route is always there; the rose line is drawn over
 * it, and each marker fills with ink as the line reaches it.
 *
 * THE GEOMETRY IS MEASURED, NOT AUTHORED. Five stages of very different
 * lengths put the markers somewhere different at every width, so the path is
 * rebuilt from their measured positions on mount, whenever the list resizes
 * (fonts, width, reflow) and on every ScrollTrigger refresh.
 *
 * THE COPY CANNOT FAIL INVISIBLE. It is revealed by an IntersectionObserver
 * using the site's own parked class (.will-reveal — see useReveal and the
 * Reveals block in globals.css), never by the scroll loop that draws the line.
 * The home page's approach section learned this the hard way: copy whose
 * visibility depended on a chain of scroll tweens rendered as empty boxes on
 * phones. Here the line and the lit markers are decoration — if that loop
 * never runs, the page is still five fully readable stages.
 *
 * Reduced motion gets the finished drawing: every segment drawn, every marker
 * lit, nothing tracking the scroll.
 */
export default function ApproachProcess({ steps }: { steps: ApproachStep[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState<boolean[]>(() => steps.map(() => false));
  const count = steps.length;

  // ── The copy: one-shot, observer-driven ────────────────────────────────
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const markers = Array.from(el.querySelectorAll<HTMLElement>("[data-marker]"));
    const reveal = (i: number) =>
      setRevealed((prev) => (i < 0 || prev[i] ? prev : prev.map((on, j) => on || j === i)));

    let observer: IntersectionObserver | undefined;
    try {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            // Crossed the line, or already above the viewport — a reload or a
            // restored scroll part-way down must not leave copy parked.
            if (!entry.isIntersecting && entry.boundingClientRect.bottom > 0) continue;
            reveal(markers.indexOf(entry.target as HTMLElement));
            observer?.unobserve(entry.target);
          }
        },
        { rootMargin: `0px 0px -${Math.round((1 - LINE_AT) * 100)}% 0px` }
      );
      markers.forEach((m) => observer?.observe(m));
    } catch {
      // No observer at all: show everything rather than leave it parked.
      const t = setTimeout(() => setRevealed((prev) => prev.map(() => true)), 0);
      return () => clearTimeout(t);
    }
    return () => observer?.disconnect();
  }, [count]);

  // ── The line and the markers: tracked to the scroll ───────────────────
  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const svg = el.querySelector<SVGSVGElement>("[data-route]");
      const track = el.querySelector<SVGPathElement>("[data-track]");
      const tip = el.querySelector<HTMLElement>("[data-tip]");
      const paths = Array.from(el.querySelectorAll<SVGPathElement>("[data-seg]"));
      const markers = Array.from(el.querySelectorAll<HTMLElement>("[data-marker]"));
      const copy = el.querySelector<HTMLElement>("[data-copy]");
      if (!svg || !track || !tip || !markers.length || paths.length !== markers.length) return;

      const wide = window.matchMedia("(min-width: 1024px)");
      const still = window.matchMedia("(prefers-reduced-motion: reduce)");

      let segments: Segment[] = [];
      let tops: number[] = [];
      // Last values written, so a scroll frame only touches what changed.
      const offsets = paths.map(() => NaN);
      const lit = markers.map(() => false);
      let tipAt = "";

      const update = () => {
        if (!segments.length) return;
        const tipY = still.matches
          ? Infinity
          : window.innerHeight * LINE_AT - el.getBoundingClientRect().top;

        let tipX: number | null = null;
        for (let i = 0; i < segments.length; i++) {
          const s = segments[i];
          let drawn = 0;
          if (tipY >= s.endY) drawn = s.total;
          else if (tipY > s.startY) {
            // y rises monotonically along every segment, so the samples can
            // be binary-searched by y and interpolated.
            const smp = s.samples;
            let lo = 0;
            let hi = smp.length - 1;
            while (hi - lo > 1) {
              const mid = (lo + hi) >> 1;
              if (smp[mid].y <= tipY) lo = mid;
              else hi = mid;
            }
            const span = smp[hi].y - smp[lo].y;
            const f = span > 0 ? (tipY - smp[lo].y) / span : 0;
            drawn = smp[lo].len + (smp[hi].len - smp[lo].len) * f;
            tipX = smp[lo].x + (smp[hi].x - smp[lo].x) * f;
          }
          const offset = Math.round((s.total - drawn) * 10) / 10;
          if (offset !== offsets[i]) {
            offsets[i] = offset;
            paths[i].style.strokeDashoffset = `${offset}`;
          }
        }

        for (let i = 0; i < markers.length; i++) {
          const on = tipY >= tops[i];
          if (on !== lit[i]) {
            lit[i] = on;
            markers[i].toggleAttribute("data-lit", on);
          }
        }

        // The pen: shown only while it is out on a segment. Inside a marker,
        // before the start or past the end, the line has nowhere to lead.
        const at = tipX === null ? "" : `${tipX.toFixed(1)},${tipY.toFixed(1)}`;
        if (at !== tipAt) {
          tipAt = at;
          if (tipX === null) {
            tip.style.opacity = "0";
          } else {
            tip.style.opacity = "1";
            tip.style.transform = `translate3d(${tipX.toFixed(1)}px, ${tipY.toFixed(1)}px, 0)`;
          }
        }
      };

      const measure = () => {
        const box = el.getBoundingClientRect();
        if (!box.width || !box.height) return;
        const nodes = markers.map((m) => {
          const r = m.getBoundingClientRect();
          return {
            x: r.left - box.left + r.width / 2,
            top: r.top - box.top,
            bottom: r.bottom - box.top,
            half: r.width / 2,
          };
        });
        const isWide = wide.matches;
        const d: string[] = [];

        const first = nodes[0];
        if (isWide) {
          // Out of the heading: leaves the page's left edge under it and
          // lands vertically on the centred axis.
          const mid = first.top / 2;
          d.push(`M 0 0 C 0 ${mid} ${first.x} ${mid} ${first.x} ${first.top}`);
        } else {
          d.push(`M ${first.x} 0 L ${first.x} ${first.top}`);
        }

        // Below lg the wave has to live in the gutter: out towards the screen
        // edge as far as 12px short of it (the list sits inside the page's own
        // padding), in towards the copy as far as 18px short of it, and the
        // same distance both ways so the bends read as one rhythm. Capped by
        // width — measured, the first version held a phone to 13px of bend and
        // the line read as straight.
        const narrowReach = Math.min(
          first.x + Math.max(0, box.left - 12),
          (copy ? copy.getBoundingClientRect().left - box.left : first.x * 2) - first.x - 18,
          box.width * 0.085,
          44
        );

        for (let i = 1; i < nodes.length; i++) {
          const a = nodes[i - 1];
          const b = nodes[i];
          const h = b.top - a.bottom;
          if (h <= 0) {
            d.push(`M ${a.x} ${a.bottom} L ${b.x} ${b.top}`);
            continue;
          }
          // Away from the copy of the stage being left. From lg the copy runs
          // right, left, right… so the first bow swings left.
          const dir = (i - 1) % 2 === 0 ? -1 : 1;
          const reach = isWide
            ? Math.min(((dir < 0 ? a.x : box.width - a.x) - a.half) * 0.5, h * 0.42, 320)
            : Math.max(0, narrowReach);
          // Both handles offset by k put the bow's crest at 0.75k.
          const k = (dir * reach) / 0.75;
          d.push(
            `M ${a.x} ${a.bottom} C ${a.x + k} ${a.bottom + h * 0.35} ${b.x + k} ${
              a.bottom + h * 0.65
            } ${b.x} ${b.top}`
          );
        }

        track.setAttribute("d", d.join(" "));
        segments = paths.map((p, i) => {
          p.setAttribute("d", d[i]);
          const total = p.getTotalLength();
          const samples: Segment["samples"] = [];
          for (let s = 0; s <= SAMPLES; s++) {
            const len = (total * s) / SAMPLES;
            const pt = p.getPointAtLength(len);
            samples.push({ len, x: pt.x, y: pt.y });
          }
          p.style.strokeDasharray = `${total} ${total}`;
          offsets[i] = NaN;
          return { total, startY: samples[0].y, endY: samples[SAMPLES].y, samples };
        });
        tops = nodes.map((n) => n.top);
        svg.setAttribute("data-ready", "");
        update();
      };

      ScrollTrigger.create({
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        onUpdate: update,
        onToggle: update,
        onRefresh: measure,
      });

      const resize = new ResizeObserver(measure);
      resize.observe(el);
      still.addEventListener("change", update);
      measure();

      return () => {
        resize.disconnect();
        still.removeEventListener("change", update);
      };
    },
    { scope: root }
  );

  return (
    <div ref={root} className="relative mt-10 pt-10 md:mt-12 lg:pt-40">
      {/* Path data is written by the measure pass, never rendered, so React
          never owns it. Invisible until that first pass has run. */}
      <svg
        data-route
        aria-hidden
        fill="none"
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible opacity-0 transition-opacity duration-700 data-[ready]:opacity-100"
      >
        <path data-track className="stroke-hair-strong" strokeWidth={1} strokeDasharray="2 6" />
        {steps.map((s) => (
          <path
            key={s.n}
            data-seg
            className="stroke-rose-deep"
            strokeWidth={1.5}
            style={{ strokeDasharray: "0 1" }}
          />
        ))}
      </svg>

      {/* The pen at the head of the line. Sharp-cornered, like everything. */}
      <span
        data-tip
        aria-hidden
        className="pointer-events-none absolute left-[-3.5px] top-[-3.5px] z-[5] size-[7px] bg-rose-deep opacity-0 transition-opacity duration-300"
      />

      <ol>
        {steps.map((s, i) => (
          <li
            key={s.n}
            className="relative grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 pb-20 last:pb-0 md:gap-x-10 lg:grid-cols-[minmax(0,1fr)_3.5rem_minmax(0,1fr)] lg:gap-x-14 lg:pb-36"
          >
            {/* The column is wider than the marker below md on purpose: the
                spare room either side is where the line bends. */}
            <div
              data-marker
              className="group relative z-10 col-start-1 row-start-1 flex size-11 items-center justify-center justify-self-center overflow-hidden border border-hair-strong bg-paper transition-colors duration-500 data-[lit]:border-ink md:size-14 lg:col-start-2"
            >
              {/* Ink pours in from the top edge — the side the line enters. */}
              <span
                aria-hidden
                className="absolute inset-0 origin-top scale-y-0 bg-ink transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[lit]:scale-y-100 motion-reduce:transition-none"
              />
              <span className="relative font-display text-sm leading-none text-fog transition-colors duration-500 group-data-[lit]:text-rose md:text-base">
                {s.n}
              </span>
            </div>

            <div
              data-copy
              className={`col-start-2 row-start-1 min-w-0 max-w-xl ${
                i % 2 === 1 ? "lg:col-start-1 lg:justify-self-end" : "lg:col-start-3"
              }`}
            >
              {/* Faded up, not the word-mask rise TextReveal uses: a parked
                  word sits 120% down inside a mask padded 0.4em for
                  descenders, which leaves the tips of tall letters showing
                  under it — invisible for the moment a heading waits at the
                  bottom of the screen, but these wait for the line across the
                  lower third of it. */}
              <h3
                className={`will-reveal font-display text-4xl leading-[1.1] text-ink md:text-5xl ${
                  revealed[i] ? "is-revealed" : ""
                }`}
                style={{ "--reveal-y": "1.25rem" } as React.CSSProperties}
              >
                {s.title}
              </h3>
              <p
                className={`will-reveal mt-6 max-w-md font-body text-lg leading-snug text-rose-deep md:text-xl ${
                  revealed[i] ? "is-revealed" : ""
                }`}
                style={{ "--reveal-y": "1.25rem", "--reveal-delay": "120ms" } as React.CSSProperties}
              >
                {s.lead}
              </p>
              {/* One block, one delay: a per-paragraph stagger in a column
                  this tall reads as the page loading, not as a reveal. */}
              <div
                className={`will-reveal mt-5 space-y-5 ${revealed[i] ? "is-revealed" : ""}`}
                style={{ "--reveal-y": "1.75rem", "--reveal-delay": "240ms" } as React.CSSProperties}
              >
                {s.paras.map((para) => (
                  <p key={para} className="font-body text-base leading-relaxed text-mist md:text-lg">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
