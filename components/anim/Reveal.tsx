"use client";

import { useRef } from "react";
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

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
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
      });

      // Reduced motion — the finished state, no tween and no ScrollTrigger.
      // autoAlpha (not opacity alone) mirrors the tween's end value, which
      // clears any inline visibility:hidden a reverted branch left behind.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(el, { autoAlpha: 1, y: 0 });
      });

      return () => mm.revert();
    },
    { scope: ref }
  );

  // Rendered as JSX rather than createElement(): handing a ref to a plain
  // function call reads as a render-phase ref access (react-hooks/refs),
  // whereas a JSX `ref` prop is understood to be attached after commit.
  const Tag = as as React.ElementType;

  return (
    <Tag ref={ref} className={`will-reveal ${className ?? ""}`}>
      {children}
    </Tag>
  );
}
