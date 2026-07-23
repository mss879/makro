import Image from "next/image";
import { BRAND } from "@/lib/images";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";

/**
 * Why Makro — redesigned July 2026 (client direction): a static,
 * editorial index. Header and wide brand image up top, then four
 * full-width hairline rows with one-line reasons. The full-length
 * versions of these reasons live on the About page.
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
        {/* Header row — statement left, wide still image right */}
        <div className="grid grid-cols-1 items-end gap-10 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <div className="flex items-center gap-4">
              <span className="font-body text-xs text-rose-deep">03</span>
              <span className="line-hair w-10" />
              <span className="eyebrow text-rose-deep">Why Makro</span>
            </div>
            <TextReveal
              as="h2"
              text="Why buyers and investors choose Makro."
              className="mt-6 font-display display-md text-ink"
            />
          </div>
          <Reveal className="relative aspect-[16/10] w-full overflow-hidden bg-shell lg:col-span-5 lg:col-start-8">
            <Image
              src={BRAND.whyCourtyard}
              alt="A calm terracotta courtyard of a Makro residence in soft morning light"
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="img-warm object-cover"
            />
          </Reveal>
        </div>

        {/* Index rows — number · title · one line */}
        <div className="mt-16 md:mt-20">
          {REASONS.map((r, i) => (
            <Reveal
              key={r.title}
              delay={i * 0.06}
              className="grid grid-cols-12 items-baseline gap-y-2 border-t border-hair py-7 last:border-b md:py-8"
            >
              <span className="col-span-2 font-body text-sm text-rose-deep md:col-span-1">
                0{i + 1}
              </span>
              <h3 className="col-span-10 font-display text-2xl leading-tight text-ink md:col-span-6 md:text-3xl">
                {r.title}
              </h3>
              <p className="col-span-10 col-start-3 font-body text-base leading-relaxed text-mist md:col-span-5 md:col-start-8">
                {r.line}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
