"use client";

import { useRef, createElement } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

type Props = {
  text: string;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
  delay?: number;
  stagger?: number;
  start?: string;
};

/**
 * Word-by-word mask reveal — each word rises out of an overflow-hidden line.
 * Reliable premium headline animation without external split plugins.
 */
export default function TextReveal({
  text,
  className,
  as = "h2",
  delay = 0,
  stagger = 0.055,
  start = "top 85%",
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const words = el.querySelectorAll<HTMLElement>("[data-w]");
      gsap.set(el, { autoAlpha: 1 });
      gsap.from(words, {
        yPercent: 150,
        duration: 1.05,
        ease: "power4.out",
        stagger,
        delay,
        scrollTrigger: {
          trigger: el,
          start,
          toggleActions: "play none none none",
        },
      });
    },
    { scope: ref }
  );

  const words = text.split(" ");

  return createElement(
    as,
    { ref, className: `will-reveal ${className ?? ""}` },
    words.map((word, i) =>
      createElement(
        "span",
        {
          key: i,
          className: "reveal-mask-inline",
          style: { marginRight: "0.26em" },
        },
        createElement(
          "span",
          { "data-w": true, className: "inline-block will-change-transform" },
          word
        )
      )
    )
  );
}
