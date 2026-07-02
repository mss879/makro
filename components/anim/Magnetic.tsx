"use client";

import { useRef } from "react";
import { gsap } from "@/lib/gsap";

/** Wraps a child so it drifts toward the cursor on hover, then springs back. */
export default function Magnetic({
  children,
  strength = 0.4,
  className,
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    gsap.to(el, {
      x: x * strength,
      y: y * strength,
      duration: 0.7,
      ease: "power3.out",
    });
  };

  const onLeave = () => {
    if (!ref.current) return;
    gsap.to(ref.current, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)" });
  };

  return (
    <span
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`inline-block ${className ?? ""}`}
    >
      {children}
    </span>
  );
}
