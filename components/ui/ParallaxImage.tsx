"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, useGSAP } from "@/lib/gsap";
import { unsplash } from "@/lib/images";

type Props = {
  id: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  treatment?: "warm" | "mono" | "none";
  parallax?: number;
  priority?: boolean;
  sizes?: string;
  width?: number;
  /** Constant zoom of the inner layer — gives the parallax room to travel. */
  zoom?: number;
  /** Seconds for the clip-path reveal. */
  revealDuration?: number;
  /** Starting clip inset, e.g. "14% 8% 14% 8%" — how far the frame grows. */
  revealInset?: string;
};

/** Scroll-parallax image with a clip-path reveal and brand tonal treatment. */
export default function ParallaxImage({
  id,
  alt,
  className,
  imgClassName,
  treatment = "warm",
  parallax = 12,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
  width = 1600,
  zoom = 1.18,
  revealDuration = 1.4,
  revealInset = "14% 8% 14% 8%",
}: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const w = wrap.current;
      const el = inner.current;
      if (!w || !el) return;

      gsap.fromTo(
        w,
        { clipPath: `inset(${revealInset})` },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: revealDuration,
          ease: "power3.out",
          scrollTrigger: { trigger: w, start: "top 85%" },
        }
      );

      // Base zoom lives here (not a CSS class) so it can vary per instance;
      // GSAP composes it with the parallax translate into one transform.
      gsap.set(el, { scale: zoom });
      gsap.fromTo(
        el,
        { yPercent: -parallax },
        {
          yPercent: parallax,
          ease: "none",
          scrollTrigger: { trigger: w, start: "top bottom", end: "bottom top", scrub: true },
        }
      );
    },
    { scope: wrap }
  );

  const treatClass =
    treatment === "warm" ? "img-warm" : treatment === "mono" ? "img-mono" : "";

  return (
    <div ref={wrap} className={`relative overflow-hidden bg-ink-700 ${className ?? ""}`}>
      <div ref={inner} className="absolute inset-0">
        <Image
          src={unsplash(id, width)}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={`object-cover ${treatClass} ${imgClassName ?? ""}`}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/40 via-transparent to-transparent" />
    </div>
  );
}
