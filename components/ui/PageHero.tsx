"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, useGSAP } from "@/lib/gsap";
import { unsplash } from "@/lib/images";
import TextReveal from "@/components/anim/TextReveal";
import { PeakMark } from "@/components/brand/PeakMark";

/** Reusable inner-page hero with a treated background image and reveal. */
export default function PageHero({
  eyebrow,
  title,
  intro,
  imageId,
  treatment = "mono",
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  imageId: string;
  treatment?: "warm" | "mono";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const img = ref.current?.querySelector("[data-hero-img]");
      if (img) {
        gsap.fromTo(
          img,
          { scale: 1.25 },
          {
            scale: 1,
            ease: "none",
            scrollTrigger: { trigger: ref.current, start: "top top", end: "bottom top", scrub: true },
          }
        );
      }
      if (ref.current) {
        gsap.from(ref.current.querySelector("[data-hero-intro]"), {
          opacity: 0,
          y: 24,
          duration: 1,
          delay: 0.5,
          ease: "power3.out",
        });

        // Content drifts up and softens as the hero scrolls away,
        // mirroring the homepage hero behaviour.
        gsap.to(ref.current.querySelector("[data-hero-content]"), {
          y: -48,
          opacity: 0.5,
          ease: "none",
          scrollTrigger: {
            trigger: ref.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      }
    },
    { scope: ref }
  );

  return (
    <section
      ref={ref}
      className="relative flex min-h-[78vh] items-end overflow-hidden pb-16 pt-40"
    >
      <div className="absolute inset-0">
        <Image
          data-hero-img
          src={unsplash(imageId, 2000)}
          alt=""
          fill
          priority
          sizes="100vw"
          className={`object-cover ${treatment === "mono" ? "img-mono" : "img-warm"} opacity-60`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/30" />
      </div>

      <div className="pointer-events-none absolute right-6 top-1/3 opacity-[0.06] md:right-16">
        <PeakMark className="h-[30rem] w-auto text-rose" strokeWidth={2} />
      </div>

      <div data-hero-content className="container-edge relative w-full">
        <div className="flex items-center gap-4">
          <span className="line-hair w-12" />
          <span className="eyebrow text-rose">{eyebrow}</span>
        </div>
        <TextReveal
          as="h1"
          text={title}
          className="mt-6 max-w-5xl font-display display-fluid text-bone"
          delay={0.15}
        />
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
