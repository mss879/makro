"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/**
 * Scrub-parallax wrapper — drifts its children vertically as they cross the
 * viewport. Used for the oversized peak watermarks so backgrounds feel a
 * layer deeper than the content in front of them.
 */
export default function Drift({
  children,
  className,
  distance = 70,
}: {
  children: React.ReactNode;
  className?: string;
  distance?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.fromTo(
        ref.current,
        { y: -distance },
        {
          y: distance,
          ease: "none",
          scrollTrigger: {
            trigger: ref.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
