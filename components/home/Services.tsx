import Link from "next/link";
import Image from "next/image";
import { IMG, unsplash } from "@/lib/images";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";
import { PeakMark } from "@/components/brand/PeakMark";

const SERVICES = [
  {
    n: "01",
    title: "Residential Development",
    body: "Homes and communities — from private villas to multi-unit residences — planned around comfort, privacy and the way modern families live.",
    image: IMG.terracottaVilla,
  },
  {
    n: "02",
    title: "Commercial Development",
    body: "Grade-A offices, retail and mixed-use landmarks, engineered for performance and the businesses shaping Sri Lanka's next decade.",
    image: IMG.towersUp,
  },
  {
    n: "03",
    title: "Investment & Value",
    body: "A disciplined, long-term approach to site selection and capital — pursuing opportunities that create durable value for investors.",
    image: IMG.angularGlass,
  },
];

export default function Services() {
  return (
    <section className="relative bg-ink py-24 md:py-32">
      <div className="container-edge">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="flex items-center gap-4">
              <span className="font-body text-xs text-rose">01</span>
              <span className="line-hair w-10" />
              <span className="eyebrow text-rose">What We Do</span>
            </div>
            <TextReveal
              as="h2"
              text="Focused expertise, end to end."
              className="mt-6 font-display display-md text-bone"
            />
          </div>
          <Reveal>
            <Link
              href="/approach"
              className="group inline-flex items-center gap-3 border-b border-hair-strong pb-2 font-body text-bone transition-colors hover:border-rose hover:text-rose"
            >
              See how we work
              <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
            </Link>
          </Reveal>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {SERVICES.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <Link
                href="/approach"
                className="group relative flex h-[30rem] flex-col justify-between overflow-hidden rounded-2xl border border-hair p-8"
              >
                {/* Reveal image */}
                <div className="absolute inset-0 -z-10">
                  <Image
                    src={unsplash(s.image, 900)}
                    alt={s.title}
                    fill
                    sizes="33vw"
                    className="img-mono scale-110 object-cover opacity-20 transition-all duration-[1.1s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-100 group-hover:opacity-70 group-hover:[filter:saturate(0.85)_contrast(1.05)]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/40 transition-opacity duration-700 group-hover:from-ink group-hover:via-ink/50" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-display text-5xl text-rose/70 transition-colors group-hover:text-rose">
                    {s.n}
                  </span>
                  <PeakMark className="h-5 w-auto text-rose opacity-50 transition-opacity duration-500 group-hover:opacity-100" strokeWidth={10} />
                </div>

                <div>
                  <h3 className="font-display text-3xl text-bone">{s.title}</h3>
                  <p className="mt-4 font-body text-sm leading-relaxed text-mist transition-colors group-hover:text-bone/90">
                    {s.body}
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 font-body text-sm text-rose opacity-0 transition-all duration-500 group-hover:opacity-100">
                    Learn more <span>→</span>
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
