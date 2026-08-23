"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, useGSAP } from "@/lib/gsap";
import { IMG, unsplash } from "@/lib/images";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";
import { PeakMark } from "@/components/brand/PeakMark";

const POINTS = [
  "An established corporate group",
  "Capital discipline & staying power",
  "A long-term outlook on value",
];

export default function GroupBacking() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const img = ref.current?.querySelector("[data-bg]");
        if (img) {
          gsap.fromTo(
            img,
            { scale: 1.15, yPercent: -4 },
            {
              scale: 1,
              yPercent: 4,
              ease: "none",
              scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: true },
            }
          );
        }
      });

      // Reduced motion — the backdrop holds its natural frame, no scrub.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        const img = ref.current?.querySelector("[data-bg]");
        if (img) gsap.set(img, { scale: 1, yPercent: 0 });
      });

      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    <section ref={ref} className="relative overflow-hidden py-16 md:py-24">
      <div className="absolute inset-0">
        <Image
          data-bg
          // 1200, not 2000: this plate sits at opacity-20 under two full-bleed
          // gradients and is scrub-scaled, so a 2000px source was decode,
          // memory and raster nobody can see.
          src={unsplash(IMG.cityNight, 1200)}
          alt=""
          fill
          sizes="100vw"
          className="img-mono object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/90 to-ink/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink to-transparent" />
      </div>

      <div className="pointer-events-none absolute -right-10 top-1/2 -translate-y-1/2 opacity-[0.03]">
        <PeakMark className="h-[22rem] w-auto text-rose" strokeWidth={1.5} />
      </div>

      <div className="container-edge relative">
        <div className="max-w-2xl">
          <div className="flex items-center gap-4">
            <span className="font-body text-xs text-rose">05</span>
            <span className="line-hair w-10" />
            <span className="eyebrow text-rose">Strength &amp; Stability</span>
          </div>

          <TextReveal
            as="h2"
            text="Group stability. Specialist focus."
            className="mt-4 font-display text-2xl leading-tight text-bone sm:text-3xl md:text-4xl"
          />

          <Reveal delay={0.1}>
            <p className="mt-5 max-w-xl font-body text-base leading-relaxed text-mist">
              Makro Developers is a wholly owned subsidiary of the Wheels Lanka
              Group, one of Sri Lanka&rsquo;s established diversified business
              groups. That relationship gives every development the financial
              strength, governance and long-term stability to be delivered with
              confidence — while Makro remains singularly focused on property
              development.
            </p>
          </Reveal>

          <Reveal delay={0.15} className="mt-7 flex flex-wrap gap-x-8 gap-y-3">
            {POINTS.map((p) => (
              <div key={p} className="flex items-center gap-2.5">
                <PeakMark className="h-3 w-auto text-rose" strokeWidth={10} />
                <span className="font-body text-xs text-bone/85 sm:text-sm">{p}</span>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
