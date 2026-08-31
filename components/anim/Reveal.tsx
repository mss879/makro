"use client";

import { useReveal } from "@/components/anim/useReveal";

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
 * A CSS transition marked by an IntersectionObserver — see useReveal for why
 * there is no GSAP here, and the Reveals block in globals.css for where the
 * "before" state lives and why it is in the server-rendered markup.
 *
 * The short version of a long argument. This used to hide its children in CSS
 * and depend on a GSAP tween to bring them back, which left content invisible
 * whenever the tween did not run. The fix for that removed the hiding
 * altogether, which meant the reader saw the seated content and then watched
 * it drop and animate — worse. The answer is that the "before" state has to be
 * in the first painted frame AND its removal must not depend on an animation
 * frame ever arriving. CSS parking plus a transition is both.
 *
 * `duration` and `once` are kept in the signature because 62 call sites pass
 * through here; the duration is now the transition's, set once in CSS, and
 * every call site uses the default `once`.
 */
export default function Reveal({
  children,
  className,
  y = 40,
  delay = 0,
  as = "div",
}: Props) {
  const { ref, revealed } = useReveal<HTMLDivElement>();

  // Rendered as JSX rather than createElement(): handing a ref to a plain
  // function call reads as a render-phase ref access (react-hooks/refs),
  // whereas a JSX `ref` prop is understood to be attached after commit.
  const Tag = as as React.ElementType;

  return (
    <Tag
      ref={ref}
      className={`will-reveal ${revealed ? "is-revealed" : ""} ${className ?? ""}`}
      style={{ "--reveal-y": `${y}px`, "--reveal-delay": `${delay * 1000}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
