"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { PeakMark } from "@/components/brand/PeakMark";

/** Infinite horizontal marquee of brand phrases, subtly scrub-reactive. */
export default function Marquee({
  items,
  speed = 30,
}: {
  items: string[];
  speed?: number;
}) {
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = track.current;
      if (!el) return;
      const total = el.scrollWidth / 2;
      const tween = gsap.to(el, {
        x: -total,
        duration: speed,
        ease: "none",
        repeat: -1,
      });

      // Scroll-velocity reaction: the belt quickens as you scroll and
      // settles back to its resting pace once the page comes to rest.
      const st = ScrollTrigger.create({
        onUpdate: (self) => {
          const boost = gsap.utils.clamp(1, 3.5, 1 + Math.abs(self.getVelocity()) / 900);
          gsap.to(tween, {
            timeScale: boost,
            duration: 0.6,
            ease: "power2.out",
            overwrite: true,
          });
        },
      });

      return () => st.kill();
    },
    { scope: track }
  );

  const row = [...items, ...items];

  return (
    <div className="relative overflow-hidden border-y border-hair py-6">
      <div ref={track} className="flex w-max items-center gap-10 whitespace-nowrap">
        {row.map((item, i) => (
          <div key={i} className="flex items-center gap-10">
            <span className="font-display text-3xl text-bone/90 md:text-5xl">
              {item}
            </span>
            <PeakMark className="h-5 w-auto text-rose" strokeWidth={10} />
          </div>
        ))}
      </div>
    </div>
  );
}
