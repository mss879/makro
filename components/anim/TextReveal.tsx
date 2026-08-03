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
        // fromTo, never from. `gsap.from` with a ScrollTrigger renders its
        // from-state immediately (words pushed 150% down, out of their masks)
        // and re-applies it on every ScrollTrigger.refresh — so if the trigger
        // has already been passed when a refresh lands, the words get re-hidden
        // and, with toggleActions "play none none none", never play again. The
        // heading is then invisible permanently. fromTo states both ends
        // explicitly, so a refresh cannot strand it half-primed.
        gsap.fromTo(
          words,
          { yPercent: 150 },
          {
            yPercent: 0,
            duration: 1.05,
            ease: "power4.out",
            stagger,
            delay,
            scrollTrigger: {
              trigger: el,
              start,
              toggleActions: "play none none none",
              // Belt to the braces above: if a refresh ever finds the trigger
              // already scrolled past, force the finished state rather than
              // trusting the toggle to have fired. Costs nothing when the
              // animation played normally.
              //
              // self.animation, NOT a closure over the tween: onRefresh fires
              // during gsap.fromTo()'s own construction, so a `const tween =`
              // referenced here is still in its temporal dead zone and throws,
              // which takes hydration down with it.
              onRefresh: (self) => {
                if (self.progress > 0 || self.isActive) self.animation?.progress(1);
              },
            },
          }
        );
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
