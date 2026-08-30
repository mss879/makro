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
  /** Skip the frame-open entirely. A 0% inset animates a value to itself. */
  reveal?: boolean;
};

/**
 * Inflate the `vw` widths in a `sizes` string by the inner layer's zoom.
 *
 * The image is painted into a box the size of the wrapper, then GSAP scales
 * that layer by `zoom` (1.18 by default) so the parallax has room to travel.
 * The browser knows nothing about that transform: it picks a candidate from
 * srcset using `sizes`, which describes the UNZOOMED box — so every parallax
 * image on the site was being served ~18% fewer pixels than it is displayed
 * at, and then upscaled. Small on its own, compounding with everything else.
 *
 * Rewriting the string here rather than at each call site keeps the nine
 * callers readable and keeps this correct if `zoom` is ever tuned. Values above
 * 100vw are legal and meaningful: the box really is wider than the viewport
 * once scaled.
 *
 * The parsing is the fiddly part. A `sizes` entry is `<media-condition> <length>`
 * and BOTH halves can carry a `px` — `(max-width: 640px) 768px` — so a blanket
 * regex would "zoom" the breakpoint and silently move which images get which
 * treatment. Media conditions are always parenthesised, so each comma-separated
 * entry is split at its last `)` and only the length after it is scaled.
 */
function zoomedSizes(sizes: string, zoom: number): string {
  if (!(zoom > 1)) return sizes;
  const scale = (length: string) =>
    length.replace(
      /(\d+(?:\.\d+)?)(vw|px)/g,
      (_, n: string, unit: string) => `${Math.round(Number(n) * zoom)}${unit}`
    );

  return sizes
    .split(",")
    .map((entry) => {
      const close = entry.lastIndexOf(")");
      // No parenthesis: the whole entry is a bare length (`"50vw"`).
      if (close === -1) return scale(entry);
      // Otherwise everything up to and including `)` is the media condition
      // and must survive untouched.
      return entry.slice(0, close + 1) + scale(entry.slice(close + 1));
    })
    .join(",");
}

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
  reveal = true,
}: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const w = wrap.current;
      const el = inner.current;
      if (!w || !el) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (reveal) {
          gsap.fromTo(
            w,
            { clipPath: `inset(${revealInset})` },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              duration: revealDuration,
              ease: "power3.out",
              // Drop the clipping context once the frame has finished opening.
              // GSAP leaves a tween's end value inline forever, so without this
              // every instance carried `clip-path: inset(0)` — a render surface
              // the compositor keeps for the life of the page — long after the
              // reveal was over. The wrapper already has overflow:hidden and no
              // border-radius, so inset(0) and none crop identically.
              onComplete: () => gsap.set(w, { clipPath: "none" }),
              scrollTrigger: { trigger: w, start: "top 85%" },
            }
          );
        }

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
      });

      // Reduced motion — frame fully open, inner layer held at the parallax
      // midpoint: the same crop a default visitor sees with the image
      // centred in the viewport, just static.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(w, { clipPath: "none" });
        gsap.set(el, { scale: zoom, yPercent: 0 });
      });

      return () => mm.revert();
    },
    { scope: wrap }
  );

  const treatClass =
    treatment === "warm" ? "img-warm" : treatment === "mono" ? "img-mono" : "";

  return (
    /* bg-well, not bg-ink-700: this component is used on dark bands and light
       ones, and a near-black well flashes behind every picture on a light page
       while it loads. The token resolves per section — see globals.css. */
    <div ref={wrap} className={`relative overflow-hidden bg-well ${className ?? ""}`}>
      <div ref={inner} className="absolute inset-0">
        <Image
          src={unsplash(id, width)}
          alt={alt}
          fill
          sizes={zoomedSizes(sizes, zoom)}
          priority={priority}
          className={`object-cover ${treatClass} ${imgClassName ?? ""}`}
        />
      </div>
      {/* Token-driven, and transparent inside a light section: a dark wash
          over the bottom of a picture lifts it off an ink ground and dirties a
          paper one. */}
      <div className="image-scrim pointer-events-none absolute inset-0" />
    </div>
  );
}
