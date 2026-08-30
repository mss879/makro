"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { gsap, useGSAP } from "@/lib/gsap";
import { PeakMark } from "@/components/brand/PeakMark";

/**
 * Intro curtain: the twin-peak mark draws itself while a solid copy of it
 * floods up from the baseline — that rising fill is the loading indicator,
 * in place of a percentage counter. Doubles as cover while the hero video
 * buffers.
 *
 * HOME PAGE ONLY (client, Aug 2026). It is a first-impression device and an
 * eight-second gate in front of a contact form or a project page is a cost
 * with no matching benefit — it also covered the hero video's buffering,
 * which no other route has.
 *
 * Gated on the route the visitor LANDED on, not on the current one. This
 * component sits in the persistent (site) layout and never remounts, so the
 * first pathname it sees is the entry route — which is the question being
 * asked. Keeping it in the layout rather than moving it into the home page is
 * deliberate: mounted in the page it would remount on every client-side
 * navigation back to "/", and clicking HOME from the blog would replay the
 * whole curtain.
 *
 * THE EXIT IS A HANDOFF, not a curtain call (client, Aug 2026 — "something
 * more classy and subtle"). The mark that has just filled itself in flies up
 * to the navbar and lands on the M of the lockup already sitting there, while
 * the paper panels dissolve underneath it. Nothing collapses, nothing wipes:
 * the thing the visitor has been watching load simply becomes the logo, and
 * the site is already behind it when it arrives.
 *
 * That replaced a scale-down-and-fade over six panels collapsing on a stagger,
 * which was a lot of movement to say "we are finished" and read as a slideshow
 * transition rather than as an arrival.
 */
/**
 * Fired on `window` the moment the curtain lifts. Components with an entrance
 * animation wait for it; see components/home/Hero.tsx. Anything that listens
 * must also handle the curtain never running at all (client-side navigation,
 * where Preloader does not remount).
 */
export const PRELOADER_DONE = "makro:preloader-done";

/**
 * Where the twin-peak mark actually sits inside each of the two artworks, as
 * fractions of that artwork's box. MEASURED, not estimated:
 *
 *   public/logo-black.png is 900x244, and its M occupies x 7..231, y 7..139
 *   (found by scanning the alpha channel for the first glyph run on the MAKRO
 *   line). Its strokes are ~22px thick perpendicular at that size.
 *
 *   PeakMark's viewBox is 100x78; the paths run x 3.8..96.2 and y 10..79,
 *   clipped to y=74 for the flat baseline — so the ink is 0.924 of the box
 *   wide and 0.821 of it tall, sitting low in the frame.
 *
 * If either asset is redrawn these numbers go stale and the mark will land
 * beside the lockup rather than on it. That is a visual bug, not a crash, and
 * re-measuring the PNG is how to fix it.
 */
const LOCKUP = {
  markX: 7 / 900,
  markY: 7 / 244,
  markW: 224 / 900,
  markH: 132 / 244,
  /** Perpendicular stroke thickness in the PNG's own pixels. */
  strokePx: 22,
  height: 244,
};

const PEAK = {
  inkX: 3.8 / 100,
  inkY: 10 / 78,
  inkW: 92.4 / 100,
  inkH: 64 / 78,
};

type Flight = {
  dx: number;
  dy: number;
  scaleX: number;
  scaleY: number;
  originY: number;
  strokeWidth: number;
};

/**
 * Work out the transform that puts the preloader's mark on top of the navbar's.
 *
 * Both are the same mark but not the same DRAWING: the lockup's M is a little
 * wider for its height than PeakMark is. This used to split the difference with
 * one scale factor — the geometric mean of the two — which left the mark ~7%
 * narrow and ~6% tall at the landing. Close, but the client's word was
 * "perfectly", and close is what you notice when two copies of the same shape
 * are meant to become one.
 *
 * So the axes are scaled INDEPENDENTLY and the ink boxes coincide exactly. The
 * cost is a ~7% differential stretch, which exists only while the mark is in
 * flight, is at its largest when the mark is at its smallest, and resolves to
 * the correct shape at the only moment anyone is comparing the two.
 *
 * Returns null when there is no lockup on the page to fly to.
 */
function measureFlight(logo: HTMLElement): Flight | null {
  const nav = document.querySelector<HTMLElement>("[data-nav-logo]");
  if (!nav) return null;

  const n = nav.getBoundingClientRect();
  const p = logo.getBoundingClientRect();
  if (!n.width || !n.height || !p.width || !p.height) return null;

  const targetW = n.width * LOCKUP.markW;
  const targetH = n.height * LOCKUP.markH;
  const sourceW = p.width * PEAK.inkW;
  const sourceH = p.height * PEAK.inkH;
  if (!sourceW || !sourceH) return null;

  // Centres of the INK, not of the boxes.
  const sourceCx = p.left + p.width * (PEAK.inkX + PEAK.inkW / 2);
  const sourceCy = p.top + p.height * (PEAK.inkY + PEAK.inkH / 2);
  const targetCx = n.left + n.width * (LOCKUP.markX + LOCKUP.markW / 2);
  const targetCy = n.top + n.height * (LOCKUP.markY + LOCKUP.markH / 2);

  return {
    dx: targetCx - sourceCx,
    dy: targetCy - sourceCy,
    scaleX: targetW / sourceW,
    scaleY: targetH / sourceH,
    originY: PEAK.inkY + PEAK.inkH / 2,
    // The lockup is drawn at n.height, so its stroke lands on screen at the
    // PNG thickness times that reduction. Clamped so a hairline never
    // disappears on a very small bar.
    strokeWidth: Math.max(1.2, LOCKUP.strokePx * (n.height / LOCKUP.height)),
  };
}

export default function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);
  const pathname = usePathname();
  // useState's lazy initial value, not a ref: it captures the pathname on first
  // render and ignores every later one, which is exactly the "entry route"
  // semantics described above — and unlike a ref it is legal to read during
  // render, which is where the decision to render nothing has to be made.
  const [entryPath] = useState(pathname);
  const onHome = entryPath === "/";

  useGSAP(
    () => {
      const el = root.current;
      // Not the home page: nothing rendered, nothing to animate, and — most
      // importantly — the scroll lock below is never applied. components/home
      // /Hero.tsx already handles the curtain being absent (it tests for
      // `.pl-panel` and starts its own entrance immediately), so there is no
      // event to fire on this path.
      if (!el || !onHome) return;
      document.body.style.overflow = "hidden";

      const paths = el.querySelectorAll<SVGPathElement>(".peak-draw");
      paths.forEach((p) => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = `${len}`;
        p.style.strokeDashoffset = `${len}`;
      });

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        window.clearTimeout(failsafe);
        document.body.style.overflow = "";
        setDone(true);
        // Let the hero hold its entrance until the curtain is actually up —
        // otherwise the headline finishes rising behind it and the visitor
        // only ever sees the resting state.
        window.dispatchEvent(new Event(PRELOADER_DONE));
      };

      // Last line of defence. The curtain covers the entire site and locks
      // scrolling, so any path that fails to reach finish() — a GSAP ticker
      // that never runs, a video event that never fires, a thrown tween —
      // would leave the visitor staring at a logo with no way forward.
      // Timers survive all of those, so one hard deadline removes the whole
      // class of failure. Generous enough never to cut the intro short.
      const failsafe = window.setTimeout(finish, 8000);

      // The hero video downloads behind the curtain (preloaded from the
      // document head). Hold the exit until it can play through so the
      // reveal lands on a moving frame — capped so a slow connection
      // never traps the user, and skipped on pages without the video.
      const heroVideoReady = () =>
        new Promise<HTMLVideoElement | null>((resolve) => {
          const v = document.querySelector<HTMLVideoElement>("video[data-hero-img]");
          if (!v) return resolve(null);
          if (v.readyState >= 4) return resolve(v);
          let t = 0;
          const ready = () => {
            v.removeEventListener("canplaythrough", ready);
            window.clearTimeout(t);
            resolve(v);
          };
          v.addEventListener("canplaythrough", ready);
          t = window.setTimeout(ready, 3500);
        });

      // Restart the loop so the reveal opens on the first frame.
      const restartHero = (video: HTMLVideoElement | null) => {
        if (video) {
          video.currentTime = 0;
          video.play().catch(() => {});
        }
      };

      // Read the motion preference once rather than binding a live
      // gsap.matchMedia() context. A matchMedia context reverts and replays
      // whenever its conditions are re-evaluated — including on a viewport
      // resize — which restores the collapsed panels and strands the visitor
      // behind the curtain. The curtain only ever runs once, so it has no
      // business reacting to resizes.
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduced) {
        // Land the mark on its finished state, then lift the whole
        // curtain — panels and mark — off in one short fade.
        gsap.set(el.querySelector(".pl-fill"), { clipPath: "inset(0% 0 0 0)" });
        gsap.set(paths, { strokeDashoffset: 0 });
        heroVideoReady().then((video) => {
          restartHero(video);
          gsap.to(el, { autoAlpha: 0, duration: 0.4, ease: "power2.out", onComplete: finish });
        });
        return;
      }

      const playExit = (video: HTMLVideoElement | null) => {
        restartHero(video);

        const logo = el.querySelector<HTMLElement>(".pl-logo");
        const flight = logo ? measureFlight(logo) : null;

        const tl = gsap.timeline({ onComplete: finish, delay: 0.15 });

        // The eyebrow and the ghosted outline go first: what travels is the
        // solid mark on its own, which is the thing that just finished filling.
        tl.to(el.querySelectorAll(".pl-eyebrow, .pl-ghost"), {
          autoAlpha: 0,
          duration: 0.45,
          ease: "power2.out",
        });

        if (!logo || !flight) {
          // No navbar to hand off to — an admin route, or the lockup moved.
          // Fall back to the old exit rather than dropping the curtain on the
          // spot; it is less good, not broken.
          tl.to(logo, { scale: 0.94, autoAlpha: 0, duration: 0.6, ease: "power2.in" }, "-=0.2").to(
            el.querySelectorAll(".pl-panel"),
            { scaleY: 0, duration: 1, ease: "power4.inOut", stagger: 0.06, transformOrigin: "top" },
            "-=0.1"
          );
          return;
        }

        // Scale about the mark's own optical centre, not the box's — the ink
        // sits low in PeakMark's viewBox (the apex starts at y=10 of 78), so
        // scaling about 50% 50% would land the mark high of the lockup by a
        // couple of its own heights at this scale factor.
        gsap.set(logo, { transformOrigin: `50% ${flight.originY * 100}%` });

        // ── 1. THE FLIGHT ────────────────────────────────────────────────
        // Ink the whole way, over panels that are still fully opaque. That
        // ordering is the entire fix for "it just disappears": the colour used
        // to start turning white a third of the way through the journey, while
        // the paper was still behind it, so the mark faded into the panels and
        // the travel — the part the client actually wanted to see — happened
        // invisibly. Nothing else moves during this beat.
        tl.to(
          logo,
          {
            x: flight.dx,
            y: flight.dy,
            scaleX: flight.scaleX,
            scaleY: flight.scaleY,
            duration: 0.95,
            // A long ease-in-out: the mark leaves slowly, covers the distance,
            // and settles. Anything with a bounce or an overshoot would be
            // reaching for personality the brand does not have.
            ease: "power3.inOut",
          },
          "-=0.15"
        )
          // Stroke weight thins in step with the mark. PeakMark uses
          // non-scaling-stroke, so its 4px hairline would otherwise stay 4px
          // however far the mark shrinks — nearly a fifth of the mark's height
          // by the time it arrives, which is not the lockup's weight and would
          // give the handoff away.
          .to(
            el.querySelectorAll(".pl-fill path"),
            { attr: { "stroke-width": flight.strokeWidth }, duration: 0.95, ease: "power3.inOut" },
            "<"
          )

          // ── 2. THE LANDING ─────────────────────────────────────────────
          // Only now does the paper go. The mark is already sitting exactly
          // where the lockup's M is, so what the panels uncover is the mark in
          // its final position rather than a mark still on its way.
          .to(el.querySelectorAll(".pl-panel"), {
            autoAlpha: 0,
            duration: 0.65,
            ease: "power2.inOut",
            stagger: 0.03,
          })
          // Ink to white, tracking the reveal rather than leading it: it
          // starts once the paper is thinning and finishes with it, so the
          // mark is dark while its ground is light and light by the time the
          // near-black bar is underneath. Going early is what made it vanish.
          .to(
            el.querySelectorAll(".pl-fill svg"),
            { color: "#ffffff", duration: 0.45, ease: "power1.inOut" },
            "<0.15"
          )

          // ── 3. THE HANDOFF ─────────────────────────────────────────────
          // The real lockup has been underneath the whole time, and the two
          // marks now occupy the same pixels, so this is a cross-fade between
          // identical shapes rather than a disappearance.
          .to(logo, { autoAlpha: 0, duration: 0.3, ease: "power2.out" }, "-=0.15");
      };

      const tl = gsap.timeline({
        onComplete: () => {
          heroVideoReady().then(playExit);
        },
      });

      tl.to(paths, {
        strokeDashoffset: 0,
        duration: 1.2,
        ease: "power2.inOut",
        stagger: 0.18,
      }).to(
        el.querySelector(".pl-fill"),
        {
          // GSAP interpolates the inset() string natively — the solid
          // mark climbs out of the ghosted one as the site loads.
          clipPath: "inset(0% 0 0 0)",
          duration: 1.8,
          ease: "power2.inOut",
        },
        0.35
      );
    },
    { scope: root }
  );

  if (done || !onHome) return null;

  return (
    <div ref={root} className="fixed inset-0 z-[10000]">
      {/* The row must stay transparent — an opaque backdrop behind the
          panels would keep painting paper through the whole collapse, so the
          wipe would be invisible and the reveal a hard cut. The panels are
          flex-1, so sub-pixel rounding leaves hairline gaps; a 1px overlap
          covers them and collapses along with each panel. */}
      <div className="absolute inset-0 flex">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="pl-panel h-full flex-1 bg-paper"
            style={i < 5 ? { marginRight: -1 } : undefined}
          />
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Two pixel-registered copies of the mark: a ghosted outline that
            strokes itself in, and a solid one the clip-path reveals upward. */}
        <div className="pl-logo relative aspect-[100/78] h-24 md:h-32">
          <PeakMark className="pl-ghost h-full w-auto text-ink/15" strokeWidth={4} animated />
          <div className="pl-fill absolute inset-0" style={{ clipPath: "inset(100% 0 0 0)" }}>
            <PeakMark className="h-full w-auto text-ink" strokeWidth={4} />
          </div>
        </div>
        <span className="pl-eyebrow eyebrow mt-8 text-ink/50">Makro Developers</span>
      </div>
    </div>
  );
}
