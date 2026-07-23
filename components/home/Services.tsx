import Link from "next/link";
import Image from "next/image";
import { BRAND } from "@/lib/images";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";
import { PeakMark } from "@/components/brand/PeakMark";

const SERVICES = [
  {
    n: "01",
    title: "Residential Development",
    body: "Residential developments that balance thoughtful planning with everyday livability, creating homes built to be lived in for decades.",
    image: BRAND.serviceResidential,
  },
  {
    n: "02",
    title: "Commercial Development",
    body: "Commercial spaces engineered for long-term performance and tenant confidence, from feasibility through to handover.",
    image: BRAND.serviceCommercial,
  },
  {
    n: "03",
    title: "Investment & Value",
    body: "Every development is structured to protect and grow its value, delivering confident long-term returns on a Makro address.",
    image: BRAND.serviceValue,
  },
];

export default function Services() {
  return (
    <section className="section-light relative py-24 md:py-32">
      <div className="container-edge">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="flex items-center gap-4">
              <span className="font-body text-xs text-rose-deep">01</span>
              <span className="line-hair w-10" />
              <span className="eyebrow text-rose-deep">What We Do</span>
            </div>
            <TextReveal
              as="h2"
              text="Focused expertise, end to end."
              className="mt-6 font-display display-md text-ink"
            />
          </div>
          <Reveal>
            <Link
              href="/approach"
              className="group inline-flex items-center gap-3 border-b border-hair-strong pb-2 font-body text-ink transition-colors hover:border-rose-deep hover:text-rose-deep"
            >
              See how we work
              <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
            </Link>
          </Reveal>
        </div>

        {/* Image cards on the cream field. The imagery stays fully visible
            (client direction — no dark hover-reveal); a bottom scrim keeps
            the text legible. Title and body live in fixed-height rows so
            all three cards align horizontally regardless of text length. */}
        <div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-3">
          {SERVICES.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <Link
                href="/approach"
                className="group flex flex-col"
              >
                {/* Image card frame with number overlay on top */}
                <div className="relative h-[22rem] w-full overflow-hidden bg-ink-700 p-6">
                  <Image
                    src={s.image}
                    alt={s.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="img-warm object-cover transition-transform duration-[1.1s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                  />
                  {/* Subtle top scrim for contrast */}
                  <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ink/50 to-transparent" />

                  {/* Number & PeakMark overlay on top of card */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="font-display text-4xl text-bone">{s.n}</span>
                    <PeakMark className="h-5 w-auto text-bone" strokeWidth={10} />
                  </div>
                </div>

                {/* Text content outside card below image */}
                <div className="mt-5 flex flex-col items-start">
                  <h3 className="font-display text-2xl text-ink transition-colors duration-300 group-hover:text-rose-deep">
                    {s.title}
                  </h3>
                  <p className="mt-3 font-body text-sm leading-relaxed text-mist">
                    {s.body}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 font-body text-sm font-medium text-rose-deep">
                    Learn more
                    <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
