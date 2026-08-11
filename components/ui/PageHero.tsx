"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, useGSAP } from "@/lib/gsap";
import { unsplash } from "@/lib/images";
import TextReveal from "@/components/anim/TextReveal";

/**
 * Reusable inner-page hero with a treated background image and reveal.
 * Deliberately quieter than the homepage hero (client direction — the
 * sub-page heroes should introduce the page, not shout at it).
 */
export default function PageHero({
  eyebrow,
  title,
  intro,
  imageId,
  treatment = "mono",
}: {
  eyebrow: string;
  title?: string;
  intro?: string;
  imageId: string;
  treatment?: "warm" | "mono";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const img = ref.current?.querySelector("[data-hero-img]");
        if (img) {
          gsap.fromTo(
            img,
            { scale: 1.08 },
            {
              scale: 1,
              ease: "none",
              scrollTrigger: { trigger: ref.current, start: "top top", end: "bottom top", scrub: true },
            }
          );
        }
        if (ref.current) {
          const introEl = ref.current.querySelector("[data-hero-intro]");
          if (introEl) {
            gsap.fromTo(
              introEl,
              { opacity: 0, y: 24 },
              {
                opacity: 1,
                y: 0,
                duration: 1,
                delay: 0.5,
                ease: "power3.out",
              }
            );
          }

          // Content drifts up and softens as the hero scrolls away,
          // mirroring the homepage hero behaviour.
          gsap.to(ref.current.querySelector("[data-hero-content]"), {
            y: -24,
            opacity: 0.75,
            ease: "none",
            scrollTrigger: {
              trigger: ref.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          });
        }
      });

      // Reduced motion — the hero at rest: image unscaled, intro and
      // content seated and fully opaque.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        const img = ref.current?.querySelector("[data-hero-img]");
        if (img) gsap.set(img, { scale: 1 });
        if (ref.current) {
          gsap.set(ref.current.querySelector("[data-hero-intro]"), { opacity: 1, y: 0 });
          gsap.set(ref.current.querySelector("[data-hero-content]"), { y: 0, opacity: 1 });
        }
      });

      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    <section
      ref={ref}
      className="relative flex flex-col justify-center overflow-hidden pb-14 pt-[calc(var(--nav-h)+3rem)] md:pb-16 md:pt-[calc(var(--nav-h)+4rem)]"
    >
      <div className="absolute inset-0">
        <Image
          data-hero-img
          src={unsplash(imageId, 2000)}
          alt=""
          fill
          priority
          sizes="100vw"
          className={`object-cover ${treatment === "mono" ? "img-mono" : "img-warm"} opacity-35`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/25" />
      </div>

      <div data-hero-content className="container-edge relative w-full">
        <div className="flex items-center gap-4">
          <span className="line-hair w-12" />
          <span className="eyebrow text-rose">{eyebrow}</span>
        </div>
        {title && (
          <TextReveal
            as="h1"
            text={title}
            className="mt-6 max-w-4xl font-display text-[clamp(2rem,3.8vw,3.6rem)] leading-[1.14] text-bone"
            delay={0.15}
          />
        )}
        {intro && (
          <p
            data-hero-intro
            className="mt-8 max-w-xl font-body text-lg leading-relaxed text-mist"
          >
            {intro}
          </p>
        )}
      </div>
    </section>
  );
}
