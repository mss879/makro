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
  title: string;
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
      /* Trimmed Aug 2026 (client direction: too much dead space above the
         copy). The navbar is in normal flow on inner pages, so its height is
         already separating this from the top of the window — the old pt-32/36
         was stacked on top of that. The min-h came down too: on a tall window
         it was the binding dimension and, with items-end, every extra pixel
         became emptiness above the eyebrow. */
      className="relative flex min-h-[32vh] items-end overflow-hidden pb-12 pt-16 md:min-h-[36vh] md:pt-20"
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
        <TextReveal
          as="h1"
          text={title}
          className="mt-6 max-w-4xl font-display display-lg text-bone"
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
