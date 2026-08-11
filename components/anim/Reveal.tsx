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
        const pageTop = el.getBoundingClientRect().top + window.scrollY;
        const inInitialViewport = pageTop < window.innerHeight;

        let completed = false;
        let activeTrigger: ReturnType<typeof gsap.fromTo>["scrollTrigger"] = undefined;

        const markComplete = () => {
          if (completed) return;
          completed = true;
          gsap.set(el, { autoAlpha: 1, y: 0 });
          if (activeTrigger) {
            try {
              activeTrigger.kill();
            } catch {}
          }
        };

        const tween = gsap.fromTo(
          el,
          { autoAlpha: 0, y },
          {
            autoAlpha: 1,
            y: 0,
            duration,
            delay,
            ease: "power3.out",
            onComplete: once ? markComplete : undefined,
            scrollTrigger: {
              trigger: el,
              start: "top 88%",
              toggleActions: once ? "play none none none" : "play none none reverse",
              onRefresh: (self) => {
                if (!once) return;
                const r = el.getBoundingClientRect();
                const absTop = r.top + window.scrollY;
                if (
                  absTop < window.innerHeight ||
                  (r.top < window.innerHeight && r.bottom > 0) ||
                  self.progress > 0 ||
                  self.isActive
                ) {
                  self.animation?.progress(1);
                  gsap.set(el, { autoAlpha: 1, y: 0 });
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

        if (once) {
          if (inInitialViewport) {
            tween.play();
          } else if (activeTrigger && (activeTrigger.progress > 0 || activeTrigger.isActive)) {
            markComplete();
          }
        }
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
