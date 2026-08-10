import Image from "next/image";
import { BRAND } from "@/lib/images";
import Reveal from "@/components/anim/Reveal";

/**
 * Why Makro — relaid out Aug 2026 (client direction) after the section
 * statement was dropped. With no heading to hold the left column, the
 * old header-over-index arrangement left a dead half-page, so the image
 * now runs full height beside the index instead of floating above it:
 * eyebrow across the top, tall still on the left, four hairline reasons
 * on the right. The full-length versions of these live on the About page.
 */
const REASONS = [
  {
    title: "Local insight, international standard",
    line: "Sri Lankan depth, benchmarked to international standards.",
  },
  {
    title: "The strength of a group behind us",
    line: "The financial strength of the Wheels Lanka Group behind every project.",
  },
  {
    title: "Built to endure, not to impress",
    line: "Measured by how buildings perform decades after handover.",
  },
  {
    title: "A relationship, not a transaction",
    line: "Accountable to our customers long after the keys change hands.",
  },
];

export default function WhyMakro() {
  return (
    <section className="section-light relative py-24 md:py-36">
      <div className="container-edge">
        {/* Section label — the only thing above the fold of this block now
            that the statement is gone. */}
        <div className="flex items-center gap-4">
          <span className="font-body text-xs text-rose-deep">03</span>
          <span className="line-hair w-10" />
          <span className="eyebrow text-rose-deep">Why Makro</span>
        </div>

        {/* Still left, index right. The image stretches to the index's
            height on desktop so the two columns close on the same line
            top and bottom — that shared block is what replaces the
            heading as the section's structure. */}
        <div className="mt-10 grid grid-cols-1 gap-10 md:mt-12 lg:grid-cols-12 lg:gap-x-16">
          <Reveal className="relative aspect-[4/3] w-full overflow-hidden bg-shell sm:aspect-[16/9] lg:col-span-4 lg:aspect-auto">
            <Image
              src={BRAND.whyCourtyard}
              alt="A calm terracotta courtyard of a Makro residence in soft morning light"
              fill
              sizes="(max-width: 1024px) 100vw, 32vw"
              className="img-warm object-cover object-center"
            />
          </Reveal>

          <div className="lg:col-span-7 lg:col-start-6">
            {REASONS.map((r, i) => (
              <Reveal
                key={r.title}
                delay={i * 0.06}
                className="flex gap-5 border-t border-hair py-6 last:border-b md:gap-6 md:py-7"
              >
                <span className="w-5 shrink-0 pt-1 font-body text-xs text-rose-deep">
                  0{i + 1}
                </span>
                <div>
                  <h3 className="font-display text-lg leading-snug text-ink md:text-xl">
                    {r.title}
                  </h3>
                  <p className="mt-1.5 font-body text-sm leading-relaxed text-mist">
                    {r.line}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
