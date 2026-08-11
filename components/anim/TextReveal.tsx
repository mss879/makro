"use client";

import { useRef } from "react";
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

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Calculate element's position relative to document top.
        // Document-relative position is invariant to temporary scroll offsets during route navigation.
        const pageTop = el.getBoundingClientRect().top + window.scrollY;
        const inInitialViewport = pageTop < window.innerHeight;

        let completed = false;
        let activeTrigger: ReturnType<typeof gsap.fromTo>["scrollTrigger"] = undefined;

        const markComplete = () => {
          if (completed) return;
          completed = true;
          gsap.set(words, { yPercent: 0 });
          if (activeTrigger) {
            try {
              activeTrigger.kill();
            } catch {}
          }
        };

        const tween = gsap.fromTo(
          words,
          { yPercent: 150 },
          {
            yPercent: 0,
            duration: 1.05,
            ease: "power4.out",
            stagger,
            delay,
            onComplete: markComplete,
            scrollTrigger: {
              trigger: el,
              start,
              toggleActions: "play none none none",
              onRefresh: (self) => {
                const r = el.getBoundingClientRect();
                const absTop = r.top + window.scrollY;
                if (
                  absTop < window.innerHeight ||
                  (r.top < window.innerHeight && r.bottom > 0) ||
                  self.progress > 0 ||
                  self.isActive
                ) {
                  self.animation?.progress(1);
                  gsap.set(words, { yPercent: 0 });
                  completed = true;
                  try {
                    self.kill();
                  } catch {}
                }
              },
            },
          }
        );

        activeTrigger = tween.scrollTrigger;

        if (inInitialViewport) {
          tween.play();
        } else if (activeTrigger && (activeTrigger.progress > 0 || activeTrigger.isActive)) {
          markComplete();
        }
      });

      // Reduced motion — every word seated in its mask, no tween and no
      // ScrollTrigger to go stale.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(words, { yPercent: 0 });
      });

      return () => mm.revert();
    },
    { scope: ref }
  );

  const words = text.split(" ");

  // Rendered as JSX rather than createElement(): handing a ref to a plain
  // function call reads as a render-phase ref access (react-hooks/refs),
  // whereas a JSX `ref` prop is understood to be attached after commit.
  const Tag = as as React.ElementType;

  return (
    <Tag ref={ref} className={`will-reveal ${className ?? ""}`}>
      {words.map((word, i) => (
        <span
          key={i}
          className="reveal-mask-inline"
          style={{ marginRight: "0.26em" }}
        >
          <span data-w className="inline-block will-change-transform">
            {word}
          </span>
        </span>
      ))}
    </Tag>
  );
}
