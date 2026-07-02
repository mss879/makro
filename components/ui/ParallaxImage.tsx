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
        { clipPath: "inset(14% 8% 14% 8%)" },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 1.4,
          ease: "power3.out",
          scrollTrigger: { trigger: w, start: "top 85%" },
        }
      );

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
      <div ref={inner} className="absolute inset-0 scale-[1.18]">
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
