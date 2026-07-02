"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

/** Minimal luxury cursor: a rose dot with a trailing ring that reacts to links. */
export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!mq.matches) return;

    document.body.classList.add("cursor-none-desktop");
    const dotEl = dot.current!;
    const ringEl = ring.current!;
    gsap.set([dotEl, ringEl], { xPercent: -50, yPercent: -50, opacity: 0 });

    const xDot = gsap.quickTo(dotEl, "x", { duration: 0.15, ease: "power3" });
    const yDot = gsap.quickTo(dotEl, "y", { duration: 0.15, ease: "power3" });
    const xRing = gsap.quickTo(ringEl, "x", { duration: 0.5, ease: "power3" });
    const yRing = gsap.quickTo(ringEl, "y", { duration: 0.5, ease: "power3" });

    let shown = false;
    const move = (e: MouseEvent) => {
      if (!shown) {
        gsap.to([dotEl, ringEl], { opacity: 1, duration: 0.3 });
        shown = true;
      }
      xDot(e.clientX);
      yDot(e.clientY);
      xRing(e.clientX);
      yRing(e.clientY);
    };

    const over = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("a, button, [data-cursor='hover'], input, textarea, select")) {
        gsap.to(ringEl, { scale: 1.9, borderColor: "rgba(226,163,136,0.9)", duration: 0.35 });
        gsap.to(dotEl, { scale: 0.4, duration: 0.35 });
      }
    };
    const out = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("a, button, [data-cursor='hover'], input, textarea, select")) {
        gsap.to(ringEl, { scale: 1, borderColor: "rgba(255,255,255,0.4)", duration: 0.35 });
        gsap.to(dotEl, { scale: 1, duration: 0.35 });
      }
    };
    const leave = () => gsap.to([dotEl, ringEl], { opacity: 0, duration: 0.3 });

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseover", over);
    window.addEventListener("mouseout", out);
    document.addEventListener("mouseleave", leave);

    return () => {
      document.body.classList.remove("cursor-none-desktop");
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", over);
      window.removeEventListener("mouseout", out);
      document.removeEventListener("mouseleave", leave);
    };
  }, []);

  return (
    <>
      <div
        ref={ring}
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-9 w-9 rounded-full border border-white/40"
        style={{ mixBlendMode: "difference" }}
      />
      <div
        ref={dot}
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-1.5 w-1.5 rounded-full bg-rose"
      />
    </>
  );
}
