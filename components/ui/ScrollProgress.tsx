"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";

/** Thin rose-gold progress bar fixed to the very top of the viewport. */
export default function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!bar.current) return;
    gsap.set(bar.current, { scaleX: 0, transformOrigin: "left center" });
    gsap.to(bar.current, {
      scaleX: 1,
      ease: "none",
      scrollTrigger: {
        trigger: document.documentElement,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.3,
      },
    });
    return () => ScrollTrigger.getAll().forEach((t) => t.vars.trigger === document.documentElement && t.kill());
  });

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[9998] h-[2px] bg-transparent">
      <div ref={bar} className="h-full w-full bg-gradient-to-r from-rose-deep via-rose to-rose-soft" />
    </div>
  );
}
