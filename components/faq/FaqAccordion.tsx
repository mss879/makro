"use client";

import { useState } from "react";
import Reveal from "@/components/anim/Reveal";
import type { FaqItem } from "@/lib/faqs";

/** Accordion list matching the homepage FAQ interaction pattern. */
export default function FaqAccordion({
  items,
  defaultOpen = null,
}: {
  items: FaqItem[];
  defaultOpen?: number | null;
}) {
  const [open, setOpen] = useState<number | null>(defaultOpen);

  return (
    <div className="flex flex-col">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <Reveal key={item.q} delay={i * 0.04} className="border-t border-hair last:border-b">
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-6 py-6 text-left"
              aria-expanded={isOpen}
            >
              <span
                className={`font-display text-xl leading-tight transition-colors md:text-2xl ${
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
                <p className="max-w-2xl pb-6 font-body text-base leading-relaxed text-mist">
                  {item.a}
                </p>
              </div>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}
