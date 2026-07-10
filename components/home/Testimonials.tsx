"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import TextReveal from "@/components/anim/TextReveal";
import { PeakMark } from "@/components/brand/PeakMark";

const QUOTES = [
  {
    quote:
      "Makro did exactly what they said they would — on time, to specification, and without the drama you brace yourself for. Our home has only felt more considered as the years have passed.",
    name: "R. & S. Fernando",
    role: "Homeowners · Meridian Park",
  },
  {
    quote:
      "As an investor, I care about discipline and delivery. Makro brings both — with the reassurance of a serious group standing behind every project.",
    name: "A. Jayawardena",
    role: "Private Investor · Colombo",
  },
  {
    quote:
      "From the first conversation to the final handover, the communication stayed clear and the standards never slipped. That is far rarer than it should be.",
    name: "N. Perera",
    role: "Homeowner · The Ridgeline Residences",
  },
  {
    quote:
      "They plan carefully and build properly. You can feel the difference in the details — and in how the space performs day to day.",
    name: "Silverline Retail",
    role: "Commercial Tenant · Colombo",
  },
];

export default function Testimonials() {
  const [i, setI] = useState(0);
  const iRef = useRef(0);
  const animating = useRef(false);
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    iRef.current = i;
  }, [i]);

  const goTo = useCallback((raw: number) => {
    const target = (raw + QUOTES.length) % QUOTES.length;
    if (animating.current || target === iRef.current) return;
    animating.current = true;
    gsap.to(body.current, {
      opacity: 0,
      y: -16,
      duration: 0.4,
      ease: "power2.in",
      onComplete: () => {
        setI(target);
        iRef.current = target;
        gsap.fromTo(
          body.current,
          { opacity: 0, y: 16 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: "power2.out",
            onComplete: () => {
              animating.current = false;
            },
          }
        );
      },
    });
  }, []);

  useEffect(() => {
    const id = setInterval(() => goTo(iRef.current + 1), 6500);
    return () => clearInterval(id);
  }, [goTo]);

  const current = QUOTES[i];

  return (
    <section className="relative overflow-hidden bg-carbon py-24 md:py-36">
      <div className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 opacity-[0.05]">
        <PeakMark className="h-[24rem] w-auto text-rose" strokeWidth={2} />
      </div>

      <div className="container-edge relative">
        <div className="mx-auto max-w-4xl text-center">
          <div className="flex items-center justify-center gap-4">
            <span className="font-body text-xs text-rose">05</span>
            <span className="line-hair w-10" />
            <span className="eyebrow text-rose">In Their Words</span>
          </div>

          <TextReveal
            as="h2"
            text="What our clients say."
            className="mt-6 font-display display-md text-bone"
          />

          <div ref={body} className="mt-14">
            <blockquote className="font-display text-3xl italic leading-snug text-bone md:text-4xl">
              &ldquo;{current.quote}&rdquo;
            </blockquote>
            <div className="mt-10">
              <p className="font-body text-base text-bone">{current.name}</p>
              <p className="mt-1 font-body text-sm text-mist">{current.role}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-12 flex items-center justify-center gap-6">
            <button
              onClick={() => goTo(i - 1)}
              aria-label="Previous testimonial"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-hair-strong text-bone transition-colors hover:border-rose hover:text-rose"
            >
              ←
            </button>
            <div className="flex items-center gap-2">
              {QUOTES.map((_, idx) => (
                <button
                  key={idx}
                  aria-label={`Testimonial ${idx + 1}`}
                  onClick={() => goTo(idx)}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    idx === i ? "w-8 bg-rose" : "w-1.5 bg-fog hover:bg-mist"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => goTo(i + 1)}
              aria-label="Next testimonial"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-hair-strong text-bone transition-colors hover:border-rose hover:text-rose"
            >
              →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
