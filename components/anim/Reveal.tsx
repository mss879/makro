"use client";

import { createElement, useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

type Props = {
  children: React.ReactNode;
  className?: string;
  y?: number;
  delay?: number;
  duration?: number;
  once?: boolean;
  as?: "div" | "section" | "span" | "li" | "article";
};

/** Fade + rise element when it scrolls into view. */
export default function Reveal({
  children,
  className,
  y = 40,
  delay = 0,
  duration = 1,
  once = true,
  as = "div",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      gsap.fromTo(
        el,
        { autoAlpha: 0, y },
        {
          autoAlpha: 1,
          y: 0,
          duration,
          delay,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            toggleActions: once ? "play none none none" : "play none none reverse",
          },
        }
      );
    },
    { scope: ref }
  );

  return createElement(
    as,
    { ref, className: `will-reveal ${className ?? ""}` },
    children
  );
}
