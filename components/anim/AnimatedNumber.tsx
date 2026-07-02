"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/** Counts up to `value` when scrolled into view. */
export default function AnimatedNumber({
  value,
  suffix = "",
  prefix = "",
  className,
  duration = 2,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const obj = { n: 0 };
      gsap.to(obj, {
        n: value,
        duration,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
        onUpdate: () => {
          el.textContent = `${prefix}${Math.round(obj.n).toLocaleString()}${suffix}`;
        },
      });
    },
    { scope: ref }
  );

  return (
    <span ref={ref} className={className}>
      {prefix}
      {0}
      {suffix}
    </span>
  );
}
