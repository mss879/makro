"use client";

import { useState } from "react";
import Link from "next/link";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";
import { PeakMark } from "@/components/brand/PeakMark";

const FAQS = [
  {
    q: "Where does Makro Developers build?",
    a: "We focus on residential and commercial developments across Sri Lanka, with a concentration in and around Colombo. Each site is selected for its long-term potential rather than short-term appeal.",
  },
  {
    q: "Is Makro part of a larger group?",
    a: "Yes. Makro Developers is a fully owned subsidiary of the Wheels Lanka Group — an established corporate group whose scale and stability underpin everything we build.",
  },
  {
    q: "Can I invest in a Makro development?",
    a: "We welcome conversations with investors. Our approach to capital is disciplined and long-term; reach out via our contact page and our team will share current opportunities.",
  },
  {
    q: "How do I enquire about a specific project?",
    a: "Every development has its own page with full details. From there, or from our contact form, you can register your interest and a member of our team will be in touch.",
  },
  {
    q: "What makes a Makro home different?",
    a: "Thoughtful planning, quality execution and materials chosen to age gracefully — it is quality you feel years after handover, not just on the day you receive the keys.",
  },
  {
    q: "Do you provide support after handover?",
    a: "Yes. We stand behind what we deliver and design it to endure, so our developments keep rewarding the people and investors who trust them.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="relative overflow-hidden bg-carbon py-24 md:py-32">
      <div className="pointer-events-none absolute -left-20 bottom-0 opacity-[0.05]">
        <PeakMark className="h-[34rem] w-auto text-rose" strokeWidth={2} />
      </div>

      <div className="container-edge relative grid grid-cols-1 gap-14 lg:grid-cols-12">
        {/* Left heading */}
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <div className="flex items-center gap-4">
              <span className="font-body text-xs text-rose">06</span>
              <span className="line-hair w-10" />
              <span className="eyebrow text-rose">Questions</span>
            </div>
            <TextReveal
              as="h2"
              text="Things people often ask."
              className="mt-6 font-display display-md text-bone"
            />
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-sm font-body text-base leading-relaxed text-mist">
                Can&rsquo;t find what you&rsquo;re looking for? We&rsquo;re happy
                to talk it through.
              </p>
              <Link
                href="/contact"
                className="group mt-6 inline-flex items-center gap-3 font-body text-bone transition-colors hover:text-rose"
              >
                <PeakMark className="h-4 w-auto text-rose" strokeWidth={11} />
                Ask us directly
                <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
              </Link>
            </Reveal>
          </div>
        </div>

        {/* Accordion */}
        <div className="lg:col-span-7 lg:col-start-6">
          <div className="flex flex-col">
            {FAQS.map((item, i) => {
              const isOpen = open === i;
              return (
                <Reveal key={item.q} delay={i * 0.05} className="border-t border-hair last:border-b">
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-6 py-7 text-left"
                    aria-expanded={isOpen}
                  >
                    <span
                      className={`font-display text-2xl leading-tight transition-colors md:text-3xl ${
                        isOpen ? "text-rose" : "text-bone"
                      }`}
                    >
                      {item.q}
                    </span>
                    <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
                      <span className="absolute h-px w-4 bg-rose" />
                      <span
                        className={`absolute h-4 w-px bg-rose transition-transform duration-500 ${
                          isOpen ? "rotate-90 scale-0" : "rotate-0"
                        }`}
                      />
                    </span>
                  </button>
                  <div
                    className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="max-w-xl pb-7 font-body text-base leading-relaxed text-mist">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
