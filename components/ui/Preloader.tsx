"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { PeakMark } from "@/components/brand/PeakMark";

/**
 * Intro curtain: the twin-peak mark draws itself while a counter runs 0→100,
 * then the panels split away to reveal the site. Shown once per session.
 */
export default function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useGSAP(
    () => {
      if (typeof window !== "undefined" && sessionStorage.getItem("makro_intro")) {
        setDone(true);
        return;
      }

      const el = root.current;
      if (!el) return;
      document.body.style.overflow = "hidden";

      const paths = el.querySelectorAll<SVGPathElement>(".peak-draw");
      paths.forEach((p) => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = `${len}`;
        p.style.strokeDashoffset = `${len}`;
      });

      const finish = () => {
        document.body.style.overflow = "";
        sessionStorage.setItem("makro_intro", "1");
        setDone(true);
      };

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

      const playExit = (video: HTMLVideoElement | null) => {
        // Restart the loop so the reveal opens on the first frame.
        if (video) {
          video.currentTime = 0;
          video.play().catch(() => {});
        }
        gsap
          .timeline({ onComplete: finish, delay: 0.15 })
          .to(el.querySelector(".pl-mark"), { scale: 0.94, opacity: 0, duration: 0.6, ease: "power2.in" })
          .to(el.querySelector(".pl-count"), { opacity: 0, duration: 0.4 }, "<")
          .to(
            el.querySelectorAll(".pl-panel"),
            { scaleY: 0, duration: 1, ease: "power4.inOut", stagger: 0.06, transformOrigin: "top" },
            "-=0.1"
          );
      };

      const counter = { n: 0 };
      const tl = gsap.timeline({
        onComplete: () => {
          heroVideoReady().then(playExit);
        },
      });

      tl.to(paths, {
        strokeDashoffset: 0,
        duration: 1.5,
        ease: "power2.inOut",
        stagger: 0.18,
      }).to(
        counter,
        {
          n: 100,
          duration: 1.8,
          ease: "power2.inOut",
          onUpdate: () => {
            const c = el.querySelector<HTMLElement>(".pl-count");
            if (c) c.textContent = String(Math.round(counter.n)).padStart(3, "0");
          },
        },
        0
      );
    },
    { scope: root }
  );

  if (done) return null;

  return (
    <div ref={root} className="fixed inset-0 z-[10000]">
      <div className="absolute inset-0 flex">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="pl-panel h-full flex-1 bg-ink" />
        ))}
      </div>
      <div className="pl-mark absolute inset-0 flex flex-col items-center justify-center">
        <PeakMark className="h-24 w-auto text-rose md:h-32" strokeWidth={4} animated />
        <div className="mt-8 flex items-center gap-3 font-body text-mist">
          <span className="eyebrow">Makro Developers</span>
          <span className="pl-count font-display text-2xl text-bone">000</span>
        </div>
      </div>
    </div>
  );
}
