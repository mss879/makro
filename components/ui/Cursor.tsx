"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

/**
 * Decorative trailing ring that follows the pointer and reacts to links.
 * The native cursor is never hidden — replacing it proved fragile (the
 * pointer vanished whenever the follower stalled), so the ring is an
 * accent, not a substitute.
 */
export default function Cursor() {
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!mq.matches) return;

    const ringEl = ring.current!;
    gsap.set(ringEl, { xPercent: -50, yPercent: -50, opacity: 0 });

    const xRing = gsap.quickTo(ringEl, "x", { duration: 0.5, ease: "power3" });
    const yRing = gsap.quickTo(ringEl, "y", { duration: 0.5, ease: "power3" });

    let shown = false;
    const move = (e: MouseEvent) => {
      if (!shown) {
        gsap.to(ringEl, { opacity: 1, duration: 0.3 });
        shown = true;
      }
      xRing(e.clientX);
      yRing(e.clientY);
    };

    const over = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("a, button, [data-cursor='hover'], input, textarea, select")) {
        gsap.to(ringEl, { scale: 1.9, borderColor: "rgba(226,163,136,0.9)", duration: 0.35 });
      }
    };
    const out = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("a, button, [data-cursor='hover'], input, textarea, select")) {
        gsap.to(ringEl, { scale: 1, borderColor: "rgba(255,255,255,0.4)", duration: 0.35 });
      }
    };
    const leave = () => {
      shown = false;
      gsap.to(ringEl, { opacity: 0, duration: 0.3 });
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseover", over);
    window.addEventListener("mouseout", out);
    document.addEventListener("mouseleave", leave);

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", over);
      window.removeEventListener("mouseout", out);
      document.removeEventListener("mouseleave", leave);
    };
  }, []);

  return (
    <div
      ref={ring}
      className="pointer-events-none fixed left-0 top-0 z-[9999] h-9 w-9 rounded-full border border-white/40"
      style={{ mixBlendMode: "difference" }}
    />
  );
}
