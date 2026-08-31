"use client";

import { useReveal } from "@/components/anim/useReveal";

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
 * A CSS transition marked by an IntersectionObserver. See useReveal for why
 * there is no GSAP here, and the Reveals block in globals.css for where the
 * "before" state lives.
 *
 * THIS COMPONENT HAS BEEN WRONG IN BOTH DIRECTIONS, so the history is worth
 * keeping:
 *
 *   1. It hid the heading in CSS and parked every word at yPercent 150, then
 *      relied on a GSAP tween behind a ScrollTrigger — plus a `completed` flag,
 *      an `activeTrigger` handle, an onRefresh testing four geometry conditions
 *      and a manual play() — to bring it back. Every one of those paths had to
 *      work or the title was invisible. Project titles were, regularly.
 *   2. The fix removed the hiding entirely and left the words seated until the
 *      trigger fired, so the reader read the heading and THEN watched it drop
 *      and rise. "I see the content and then the animation triggers, which
 *      makes no sense" — quite right.
 *
 * What both had in common is a tween that needs requestAnimationFrame. In a
 * tab that is not painting, rAF never fires, the words stay wherever GSAP
 * parked them, and no amount of trigger bookkeeping helps. This version has no
 * animation frame in it at all: the parking is a CSS rule in the
 * server-rendered HTML, and revealing is one class. A transition cannot strand
 * the content, because it never owns the "before" state.
 *
 * `stagger` and `start` are kept in the signature for the call sites; the
 * stagger is now per-word transition-delay, in CSS.
 */
export default function TextReveal({
  text,
  className,
  as = "h2",
  delay = 0,
}: Props) {
  const { ref, revealed } = useReveal<HTMLElement>();

  const words = text.split(" ");

  // Rendered as JSX rather than createElement(): handing a ref to a plain
  // function call reads as a render-phase ref access (react-hooks/refs),
  // whereas a JSX `ref` prop is understood to be attached after commit.
  const Tag = as as React.ElementType;

  return (
    <Tag
      ref={ref}
      className={`reveal-words ${revealed ? "is-revealed" : ""} ${className ?? ""}`}
      style={{ "--reveal-delay": `${delay * 1000}ms` } as React.CSSProperties}
    >
      {words.map((word, i) => (
        <span
          key={i}
          className="reveal-mask-inline"
          style={{ marginRight: "0.26em" }}
        >
          {/* --reveal-i is the word's place in the line; the CSS turns it into
              this word's share of the stagger. */}
          <span
            data-w
            className="reveal-word"
            style={{ "--reveal-i": i } as React.CSSProperties}
          >
            {word}
          </span>
        </span>
      ))}
    </Tag>
  );
}
