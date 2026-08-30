"use client";

import { useState } from "react";
import Link from "next/link";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";
import { PeakMark } from "@/components/brand/PeakMark";
import type { ProjectsPageFaqItem } from "@/lib/projects-page-data";

/**
 * The question block that closes /projects — entirely admin-driven since
 * 20260830000100 (Projects → FAQ).
 *
 * Every string used to be a literal here and the questions came from
 * HOME_FAQS in lib/faqs.ts, which meant a typo in the heading was a deploy.
 * The client's direction was "the headings to everything" editable, so the
 * eyebrow, heading, standfirst and BOTH links are props now, links carrying
 * their destination as well as their label.
 *
 * lib/faqs.ts is deliberately still the source for /faq and its FAQPage
 * structured data. That page is canonical for the schema; this one is the
 * projects page's own short list, which is why it read HOME_FAQS rather than
 * FAQ_GROUPS to begin with. Merging them would put the same questions into two
 * schema graphs.
 */
export default function Faq({
  eyebrow,
  heading,
  body,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  items,
}: {
  eyebrow: string;
  heading: string;
  body: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  items: ProjectsPageFaqItem[];
}) {
  const [open, setOpen] = useState<number | null>(0);

  // An admin can unpublish every question. The heading and its two links still
  // stand on their own — "ask us directly" is if anything MORE useful with no
  // list above it — so only the accordion column is conditional.

  return (
    <section className="section-light relative overflow-hidden py-24 md:py-32">
      <div className="pointer-events-none absolute -left-20 bottom-0 opacity-[0.06]">
        <PeakMark className="h-[34rem] w-auto text-rose-deep" strokeWidth={2} />
      </div>

      <div className="container-edge relative grid grid-cols-1 gap-14 lg:grid-cols-12">
        {/* Left heading */}
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-[calc(var(--nav-h)+2rem)]">
            {/* Each piece renders only when it has something in it, so
                clearing a field in the admin closes the gap rather than
                leaving a rule, a peak mark or an arrow floating on its own. */}
            {eyebrow && (
              <div className="flex items-center gap-4">
                <span className="line-hair w-10" />
                <span className="eyebrow text-rose-deep">{eyebrow}</span>
              </div>
            )}
            {heading && (
              <TextReveal
                as="h2"
                text={heading}
                className={`font-display display-md text-ink ${eyebrow ? "mt-6" : ""}`}
              />
            )}
            <Reveal delay={0.1}>
              {body && (
                <p className="mt-6 max-w-sm font-body text-base leading-relaxed text-mist">
                  {body}
                </p>
              )}
              {/* A label with no destination is a dead control, and a
                  destination with no label is invisible — so both are required
                  before either link renders. */}
              {primaryLabel && primaryHref && (
                <Link
                  href={primaryHref}
                  className="group mt-6 flex w-fit items-center gap-3 font-body text-ink transition-colors hover:text-rose-deep"
                >
                  <PeakMark className="h-4 w-auto text-rose-deep" strokeWidth={11} />
                  {primaryLabel}
                  <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
                </Link>
              )}
              {secondaryLabel && secondaryHref && (
                <Link
                  href={secondaryHref}
                  className="group mt-4 flex w-fit items-center gap-3 font-body text-sm text-mist transition-colors hover:text-rose-deep"
                >
                  {secondaryLabel}
                  <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
                </Link>
              )}
            </Reveal>
          </div>
        </div>

        {/* Accordion */}
        <div className="lg:col-span-7 lg:col-start-6">
          <div className="flex flex-col">
            {items.map((item, i) => {
              const isOpen = open === i;
              return (
                <Reveal key={item.id} delay={i * 0.05} className="border-t border-hair last:border-b">
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-6 py-7 text-left"
                    aria-expanded={isOpen}
                    aria-controls={`projects-faq-panel-${i}`}
                  >
                    <span
                      className={`font-display text-2xl leading-tight transition-colors md:text-3xl ${
                        isOpen ? "text-rose-deep" : "text-ink"
                      }`}
                    >
                      {item.question}
                    </span>
                    <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
                      <span className="absolute h-px w-4 bg-rose-deep" />
                      <span
                        className={`absolute h-4 w-px bg-rose-deep transition-transform duration-500 ${
                          isOpen ? "rotate-90 scale-0" : "rotate-0"
                        }`}
                      />
                    </span>
                  </button>
                  <div
                    id={`projects-faq-panel-${i}`}
                    className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="max-w-xl pb-7 font-body text-base leading-relaxed text-mist">
                        {item.answer}
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
