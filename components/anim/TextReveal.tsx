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
 *
 * REWRITTEN TO FAIL VISIBLE (client, Aug 2026 — "the headings are not showing
 * for the individual pages, keep it simple").
 *
 * What it used to do: hide the heading in CSS (`will-reveal`, opacity 0), park
 * every word at yPercent 150 inside its mask on first render, and rely on a
 * tween to bring both back. That tween carried a ScrollTrigger, a `completed`
 * flag, an `activeTrigger` handle, an onRefresh that re-checked four different
 * geometry conditions, and a manual play() for the initial viewport — roughly
 * fifty lines whose only job was to answer "has this fired yet?".
 *
 * Every one of those paths had to succeed or the heading stayed invisible:
 * words clipped inside their masks under a container at opacity 0. A trigger
 * created against a stale layout, a ticker that never ran because the tab was
 * backgrounded during load, a client-side navigation measuring the page it
 * just left — any of them and the title was simply gone. Which is what the
 * client was seeing on the project pages.
 *
 * What it does now: NOTHING hides the text. There is no opacity-0 class, and
 * `immediateRender: false` means the words are not parked at the from-state
 * either — they sit exactly where they belong from first paint. The animation
 * is layered on top as an enhancement: when the heading comes into view the
 * tween takes over, rises the words, and is done. If the trigger never fires,
 * if GSAP fails to load, if JavaScript is off entirely — the heading is
 * already correct on the page, because the "after" state IS the markup.
 *
 * `once: true` rather than toggleActions: the reveal is an entrance, and
 * re-running it every time the heading scrolls back past would be a different
 * effect. It also means there is no state to keep and nothing to go stale.
 */
export default function TextReveal({
  text,
  className,
  as = "h2",
  delay = 0,
  stagger = 0.055,
  start = "top 90%",
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const words = el.querySelectorAll<HTMLElement>("[data-w]");
      if (!words.length) return;

      const mm = gsap.matchMedia();

      // Reduced motion gets no tween at all — and needs no "seat the words"
      // branch either, because the words were never moved.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(words, {
          yPercent: 120,
          duration: 0.9,
          ease: "power3.out",
          stagger,
          delay,
          // The one line that makes this fail visible: without it GSAP would
          // apply the from-state on creation and we would be back to a heading
          // that depends on the trigger firing to become readable.
          immediateRender: false,
          scrollTrigger: { trigger: el, start, once: true },
        });
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
    <Tag ref={ref} className={className}>
      {words.map((word, i) => (
        <span
          key={i}
          className="reveal-mask-inline"
          style={{ marginRight: "0.26em" }}
        >
          {/* No will-change here. GSAP's global default is force3D:"auto", so
              it applies translateZ(0) for the tween's duration and strips it
              on completion — promotion already happens exactly when needed.
              Hardcoded in the markup it promoted every word permanently: 36
              composited layers on the home page alone, held for the life of
              the document long after the words had finished moving, for the
              compositor to sort and draw on every frame. */}
          <span data-w className="inline-block">
            {word}
          </span>
        </span>
      ))}
    </Tag>
  );
}
