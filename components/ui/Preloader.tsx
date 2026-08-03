"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { PeakMark } from "@/components/brand/PeakMark";

/**
 * Intro curtain: the twin-peak mark draws itself while a solid copy of it
 * floods up from the baseline — that rising fill is the loading indicator,
 * in place of a percentage counter. The cream panels then collapse away to
 * reveal the site. Runs on every full page load (client-side navigations
 * don't remount it), doubling as cover while the hero video buffers.
 */
/**
 * Fired on `window` the moment the curtain lifts. Components with an entrance
 * animation wait for it; see components/home/Hero.tsx. Anything that listens
 * must also handle the curtain never running at all (client-side navigation,
 * where Preloader does not remount).
 */
export const PRELOADER_DONE = "makro:preloader-done";

export default function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
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
        gsap
          .timeline({ onComplete: finish, delay: 0.15 })
          .to(el.querySelectorAll(".pl-logo, .pl-eyebrow"), {
            scale: 0.94,
            autoAlpha: 0,
            duration: 0.6,
            ease: "power2.in",
          })
          .to(
            el.querySelectorAll(".pl-panel"),
            { scaleY: 0, duration: 1, ease: "power4.inOut", stagger: 0.06, transformOrigin: "top" },
            "-=0.1"
          );
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

  if (done) return null;

  return (
    <div ref={root} className="fixed inset-0 z-[10000]">
      {/* The row must stay transparent — an opaque backdrop behind the
          panels would keep painting cream through the whole collapse, so the
          wipe would be invisible and the reveal a hard cut. The panels are
          flex-1, so sub-pixel rounding leaves hairline gaps; a 1px overlap
          covers them and collapses along with each panel. */}
      <div className="absolute inset-0 flex">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="pl-panel h-full flex-1 bg-cream"
            style={i < 5 ? { marginRight: -1 } : undefined}
          />
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Two pixel-registered copies of the mark: a ghosted outline that
            strokes itself in, and a solid one the clip-path reveals upward. */}
        <div className="pl-logo relative aspect-[100/78] h-24 md:h-32">
          <PeakMark className="h-full w-auto text-ink/15" strokeWidth={4} animated />
          <div className="pl-fill absolute inset-0" style={{ clipPath: "inset(100% 0 0 0)" }}>
            <PeakMark className="h-full w-auto text-ink" strokeWidth={4} />
          </div>
        </div>
        <span className="pl-eyebrow eyebrow mt-8 text-ink/50">Makro Developers</span>
      </div>
    </div>
  );
}
