import Link from "next/link";
import { BRAND } from "@/lib/images";
import ParallaxImage from "@/components/ui/ParallaxImage";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";
import { PeakMark } from "@/components/brand/PeakMark";

const PRINCIPLES = [
  "Thoughtful planning",
  "Quality execution",
  "Strategic investment",
  "Enduring, long-term value",
];

export default function BrandStatement() {
  return (
    <section className="section-light relative py-24 md:py-36">
      <div className="container-edge grid grid-cols-1 gap-14 lg:grid-cols-12">
        {/* Left — image + floating credential */}
        <div className="relative lg:col-span-5">
          <ParallaxImage
            id={BRAND.statementCorner}
            alt="A Makro development's terracotta corner rising against a rose-gold sky"
            treatment="warm"
            className="aspect-[3/4] w-full md:aspect-[4/5]"
            sizes="(max-width: 1024px) 100vw, 40vw"
          />
          {/* Ink credential badge — high contrast against the white field */}
          <Reveal className="absolute -bottom-8 right-0 w-52 bg-ink p-5 shadow-[0_30px_60px_-30px_rgba(5,2,3,0.5)] md:right-8 md:w-56 md:p-6">
            <PeakMark className="h-6 w-auto text-rose" strokeWidth={9} />
            <p className="mt-4 font-display text-4xl text-bone">6+</p>
            <p className="mt-1 font-body text-sm text-white/60">
              Years delivering developments across Sri Lanka
            </p>
          </Reveal>
        </div>

        {/* Right — statement */}
        <div className="lg:col-span-6 lg:col-start-7">
          <div className="flex items-center gap-4">
            <span className="line-hair w-10" />
            <span className="eyebrow text-rose-deep">About Makro</span>
          </div>

          <TextReveal
            as="h2"
            text="Homes and landmarks built to hold their value."
            className="mt-7 font-display display-md text-ink"
          />

          <Reveal delay={0.1}>
            <p className="mt-8 max-w-xl font-body text-lg leading-relaxed text-mist">
              For years, Makro Developers has approached every project as a
              long-term commitment, not a single transaction. We plan with
              discipline, build with precision and stand behind every
              development long after completion.
            </p>
          </Reveal>

          <Reveal delay={0.15} className="mt-10 grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2">
            {PRINCIPLES.map((p) => (
              <div key={p} className="flex items-center gap-3 border-t border-hair pt-4">
                <PeakMark className="h-3.5 w-auto text-rose-deep" strokeWidth={12} />
                <span className="font-body text-sm font-medium text-ink">{p}</span>
              </div>
            ))}
          </Reveal>

          <Reveal delay={0.2}>
            <Link
              href="/about"
              className="group mt-12 inline-flex items-center gap-3 border-b border-hair-strong pb-2 font-body text-ink transition-colors hover:border-rose-deep hover:text-rose-deep"
            >
              The Makro story
              <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
