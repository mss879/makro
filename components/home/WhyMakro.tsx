"use client";

import { useState } from "react";
import Image from "next/image";
import { IMG, unsplash } from "@/lib/images";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";

const REASONS = [
  {
    title: "Local insight, international standard",
    body: "We read the Sri Lankan market with precision — and build to standards of design and construction that travel anywhere.",
    image: IMG.towersUp,
  },
  {
    title: "The strength of a group behind us",
    body: "Backed by the Wheels Lanka Group, we have the stability and staying power to see every project through.",
    image: IMG.skylineWarm,
  },
  {
    title: "Built to endure, not to impress",
    body: "Materials, methods and detailing chosen to age gracefully — quality you feel years after handover.",
    image: IMG.concreteLines,
  },
  {
    title: "A relationship, not a transaction",
    body: "Clear communication and quiet accountability, from first enquiry to final key.",
    image: IMG.staircase,
  },
];

export default function WhyMakro() {
  const [active, setActive] = useState(0);

  return (
    <section className="relative bg-carbon py-24 md:py-36">
      <div className="container-edge grid grid-cols-1 gap-14 lg:grid-cols-12">
        {/* Sticky left — heading + synced image */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <div className="flex items-center gap-4">
              <span className="font-body text-xs text-rose">03</span>
              <span className="line-hair w-10" />
              <span className="eyebrow text-rose">Why Makro</span>
            </div>
            <TextReveal
              as="h2"
              text="Why buyers and investors choose Makro."
              className="mt-6 font-display display-md text-bone"
            />

            <div className="relative mt-10 hidden aspect-[16/11] w-full overflow-hidden bg-ink-700 lg:block">
              {REASONS.map((r, i) => (
                <Image
                  key={r.image}
                  src={unsplash(r.image, 1200)}
                  alt={r.title}
                  fill
                  sizes="40vw"
                  className={`img-warm object-cover transition-all duration-700 ${
                    active === i ? "scale-100 opacity-100" : "scale-105 opacity-0"
                  }`}
                />
              ))}
              <div className="absolute inset-0 bg-gradient-to-t from-ink/50 to-transparent" />
              <span className="absolute bottom-5 left-5 font-body text-sm text-bone">
                0{active + 1}{" "}
                <span className="text-fog">/ 0{REASONS.length}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right — interactive list */}
        <div className="lg:col-span-6 lg:col-start-7">
          <div className="flex flex-col">
            {REASONS.map((r, i) => (
              <Reveal
                key={r.title}
                delay={i * 0.06}
                className="group border-t border-hair py-8 last:border-b"
              >
                <div
                  onMouseEnter={() => setActive(i)}
                  className="cursor-default"
                >
                  <div className="flex items-baseline gap-5">
                    <span
                      className={`font-body text-sm transition-colors ${
                        active === i ? "text-rose" : "text-fog"
                      }`}
                    >
                      0{i + 1}
                    </span>
                    <div>
                      <h3
                        className={`font-display text-3xl leading-tight transition-colors md:text-4xl ${
                          active === i ? "text-rose" : "text-bone"
                        }`}
                      >
                        {r.title}
                      </h3>
                      <p className="mt-4 max-w-lg font-body text-base leading-relaxed text-mist">
                        {r.body}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
