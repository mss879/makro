import type { CSSProperties } from "react";
import Link from "next/link";
import { BRAND } from "@/lib/images";
import { FAQ_GROUPS, ALL_FAQS } from "@/lib/faqs";
import { pageMetadata, breadcrumbSchema, faqSchema } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import PageHero from "@/components/ui/PageHero";
import FaqAccordion from "@/components/faq/FaqAccordion";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";
import { PeakMark } from "@/components/brand/PeakMark";

const DESCRIPTION =
  "Answers to common questions about buying, investing and living in a Makro development — from apartment purchases in Colombo and foreign ownership in Sri Lanka to payment plans and after-handover support.";

export const metadata = pageMetadata({
  title: "Frequently Asked Questions — Buying & Investing",
  description: DESCRIPTION,
  path: "/faq",
  imageId: BRAND.textureFlow,
  keywords: [
    "buying property in Sri Lanka FAQ",
    "foreigners buying apartments Sri Lanka",
    "off-plan payment schedule Sri Lanka",
    "Makro Developers questions",
    "property developer FAQ Colombo",
  ],
});

export default function FaqPage() {
  return (
    <>
      <JsonLd
        data={[
          faqSchema(ALL_FAQS),
          breadcrumbSchema([{ name: "FAQ", path: "/faq" }]),
        ]}
      />
      <PageHero
        eyebrow="Questions"
        title="Asked, and answered."
        intro="Everything buyers and investors usually want to know — about us, our developments and what it's like to own one."
        imageId={BRAND.textureFlow}
        treatment="warm"
      />

      <section className="section-light relative py-24 md:py-32">
        <div className="container-edge flex flex-col gap-20">
          {FAQ_GROUPS.map((group, gi) => (
            <div key={group.group} className="grid grid-cols-1 gap-10 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <div className="lg:sticky lg:top-28">
                  <div className="flex items-center gap-4">
                    <span className="font-body text-xs text-rose-deep">0{gi + 1}</span>
                    <span className="line-hair w-10" />
                    <span className="eyebrow text-rose-deep">{group.group}</span>
                  </div>
                  <TextReveal
                    as="h2"
                    text={group.group}
                    className="mt-5 font-display display-md text-ink"
                  />
                </div>
              </div>
              {/* Remap the accordion's explicit bone/rose classes for the light
                  section: question text renders ink, accents render rose-deep. */}
              <div
                className="lg:col-span-7 lg:col-start-6"
                style={
                  {
                    "--color-bone": "var(--color-ink)",
                    "--color-rose": "var(--color-rose-deep)",
                  } as CSSProperties
                }
              >
                <FaqAccordion items={group.items} defaultOpen={gi === 0 ? 0 : null} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cross-links */}
      <section className="section-light relative overflow-hidden border-t border-hair py-20 md:py-24">
        <div className="pointer-events-none absolute -right-16 bottom-0 opacity-[0.05]">
          <PeakMark className="h-[26rem] w-auto text-rose-deep" strokeWidth={2} />
        </div>
        <div className="container-edge relative">
          <Reveal className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div>
              <p className="eyebrow text-rose-deep">Still deciding?</p>
              <h2 className="mt-4 max-w-xl font-display display-md text-ink">
                The answers live in the work.
              </h2>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/projects"
                className="group inline-flex items-center gap-3 bg-ink px-7 py-4 font-body text-bone transition-colors hover:bg-rose-deep hover:text-ink"
              >
                Browse developments
                <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-3 border border-hair-strong px-7 py-4 font-body text-ink transition-colors hover:border-rose-deep hover:text-rose-deep"
              >
                Ask us directly
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-10 font-body text-sm text-fog">
              Want more depth? Read our{" "}
              <Link
                href="/insights"
                className="text-mist underline decoration-rose-deep/50 underline-offset-4 transition-colors hover:text-rose-deep"
              >
                guides on buying and investing in Sri Lankan property
              </Link>
              .
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
