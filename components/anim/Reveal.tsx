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

/**
 * Fade + rise an element when it scrolls into view.
 *
 * REWRITTEN TO FAIL VISIBLE, alongside TextReveal and for the same reason —
 * see that file for the full account. In short: this used to hide its children
 * in CSS (`will-reveal`, opacity 0) and depend on a tween to bring them back,
 * with a `completed` flag, an `activeTrigger` handle, an onRefresh testing four
 * geometry conditions and a manual play() for the initial viewport. If none of
 * those paths fired — a stale layout, a backgrounded tab during load, a
 * client-side navigation measured against the previous page — the content was
 * simply invisible, with nothing on the page to say so.
 *
 * Now nothing hides anything. There is no opacity-0 class, and
 * `immediateRender: false` keeps GSAP from applying the from-state either, so
 * the children are in their final position from first paint. The tween is
 * layered on top: when the element scrolls into view it rises into place, and
 * if that never happens the content was already correct.
 *
 * `once` is kept in the signature because 62 call sites pass through here, but
 * every one of them uses the default. The reveal is an entrance; replaying it
 * on the way back up would be a different effect.
 */
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

      // Reduced motion gets no tween — and needs no "put it back" branch
      // either, because nothing was ever moved or hidden.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(el, {
          autoAlpha: 0,
          y,
          duration,
          delay,
          ease: "power3.out",
          immediateRender: false,
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            once,
            toggleActions: once ? "play none none none" : "play none none reverse",
          },
        });
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
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
