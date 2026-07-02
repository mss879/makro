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
      const img = ref.current?.querySelector("[data-bg]");
      if (img) {
        gsap.fromTo(
          img,
          { scale: 1.2, yPercent: -6 },
          {
            scale: 1,
            yPercent: 6,
            ease: "none",
            scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: true },
          }
        );
      }
    },
    { scope: ref }
  );

  return (
    <section ref={ref} className="relative overflow-hidden py-28 md:py-40">
      <div className="absolute inset-0">
        <Image
          data-bg
          src={unsplash(IMG.cityNight, 2000)}
          alt=""
          fill
          sizes="100vw"
          className="img-mono object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink to-transparent" />
      </div>

      <div className="pointer-events-none absolute -right-10 top-1/2 -translate-y-1/2 opacity-[0.06]">
        <PeakMark className="h-[36rem] w-auto text-rose" strokeWidth={2} />
      </div>

      <div className="container-edge relative">
        <div className="max-w-3xl">
          <div className="flex items-center gap-4">
            <span className="font-body text-xs text-rose">05</span>
            <span className="line-hair w-10" />
            <span className="eyebrow text-rose">Strength &amp; Stability</span>
          </div>

          <TextReveal
            as="h2"
            text="Group stability. Specialist focus."
            className="mt-7 font-display display-lg text-bone"
          />

          <Reveal delay={0.1}>
            <p className="mt-8 max-w-2xl font-body text-lg leading-relaxed text-mist">
              Makro Developers is a fully owned subsidiary of the Wheels Lanka
              Group, whose scale and long-term outlook underpin everything we
              build. The projects we start, we finish.
            </p>
          </Reveal>

          <Reveal delay={0.15} className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
            {POINTS.map((p) => (
              <div key={p} className="flex items-center gap-3">
                <PeakMark className="h-3.5 w-auto text-rose" strokeWidth={12} />
                <span className="font-body text-sm text-bone">{p}</span>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
