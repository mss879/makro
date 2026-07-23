import Link from "next/link";
import { BRAND, IMG } from "@/lib/images";
import { pageMetadata, breadcrumbSchema, webPageSchema } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import PageHero from "@/components/ui/PageHero";
import ParallaxImage from "@/components/ui/ParallaxImage";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";
import { PeakMark } from "@/components/brand/PeakMark";

const DESCRIPTION =
  "How Makro Developers creates lasting value in Sri Lankan real estate — a four-stage development process of thoughtful planning, climate-aware design, disciplined construction and after-handover care.";

export const metadata = pageMetadata({
  title: "Our Approach to Property Development",
  description: DESCRIPTION,
  path: "/approach",
  imageId: BRAND.textureAscent,
  keywords: [
    "property development process",
    "how property developers work",
    "construction quality Sri Lanka",
    "residential development process",
    "commercial development Sri Lanka",
  ],
});

const STEPS = [
  {
    n: "01",
    title: "Plan",
    lead: "We begin with the market and the land — never the marketing.",
    body: "Rigorous feasibility, honest numbers and a clear brief. We only proceed when a project can genuinely create long-term value.",
    image: IMG.concreteLines,
    treatment: "mono" as const,
  },
  {
    n: "02",
    title: "Design",
    lead: "Architecture and engineering in service of how people live.",
    body: "Climate-aware, efficient and quietly timeless — designs that feel as considered on year ten as on day one.",
    image: IMG.staircase,
    treatment: "warm" as const,
  },
  {
    n: "03",
    title: "Build",
    lead: "Disciplined execution, rigorous quality control.",
    body: "We hold to specification and schedule, with hands-on oversight at every stage — and the resources of an established group to build properly.",
    image: IMG.angularGlass,
    treatment: "mono" as const,
  },
  {
    n: "04",
    title: "Endure",
    lead: "We stand behind what we deliver.",
    body: "Value is sustained long after handover. From materials to after-care, we design for durability that keeps rewarding owners and investors.",
    image: IMG.duskHouse,
    treatment: "warm" as const,
  },
];

const SERVICES = [
  {
    title: "Residential Development",
    body: "Homes and communities — from private villas to multi-unit residences — planned around comfort, privacy and the way modern families actually live.",
  },
  {
    title: "Commercial Development",
    body: "Grade-A offices, retail and mixed-use landmarks engineered for performance, flexibility and the businesses shaping Sri Lanka's next decade.",
  },
  {
    title: "Investment & Value",
    body: "A disciplined, long-term approach to site selection and capital — pursuing opportunities that create durable value for owners and investors alike.",
  },
];

export default function ApproachPage() {
  return (
    <>
      <JsonLd
        data={[
          webPageSchema({
            name: "Our Approach — Makro Developers",
            description: DESCRIPTION,
            path: "/approach",
          }),
          breadcrumbSchema([{ name: "Approach", path: "/approach" }]),
        ]}
      />
      <PageHero
        eyebrow="Our Approach"
        title="How lasting value gets built."
        intro="A disciplined process that turns land and capital into developments worth inheriting."
        imageId={BRAND.textureAscent}
        treatment="warm"
      />

      {/* Process — alternating rows */}
      <section className="relative bg-ink py-20 md:py-28">
        <div className="container-edge">
          <div className="flex items-center gap-4">
            <span className="line-hair w-10" />
            <span className="eyebrow text-rose">The Process</span>
          </div>
          <TextReveal
            as="h2"
            text="Four disciplines, held to consistently."
            className="mt-6 max-w-3xl font-display display-md text-bone"
          />

          <div className="mt-16 flex flex-col gap-20 md:gap-28">
            {STEPS.map((s, i) => (
              <div
                key={s.n}
                className={`grid grid-cols-1 items-center gap-10 lg:grid-cols-2 ${
                  i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                <ParallaxImage
                  id={s.image}
                  alt={s.title}
                  treatment={s.treatment}
                  className="aspect-[4/3] w-full"
                  sizes="50vw"
                />
                <div className={i % 2 === 1 ? "lg:pr-10" : "lg:pl-10"}>
                  <div className="flex items-center gap-4">
                    <span className="font-display text-5xl text-rose/70">{s.n}</span>
                    <span className="line-hair w-16" />
                  </div>
                  <h3 className="mt-5 font-display text-5xl text-bone">{s.title}</h3>
                  <p className="mt-5 max-w-md font-body text-xl leading-snug text-rose-soft">
                    {s.lead}
                  </p>
                  <Reveal delay={0.1}>
                    <p className="mt-5 max-w-lg font-body text-lg leading-relaxed text-mist">
                      {s.body}
                    </p>
                  </Reveal>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="relative bg-carbon py-24 md:py-32">
        <div className="container-edge">
          <div className="flex items-center gap-4">
            <span className="line-hair w-10" />
            <span className="eyebrow text-rose">What We Do</span>
          </div>
          <TextReveal
            as="h2"
            text="Focused expertise across residential and commercial."
            className="mt-6 max-w-3xl font-display display-md text-bone"
          />
          <div className="mt-14 grid grid-cols-1 gap-px border border-hair bg-hair lg:grid-cols-3">
            {SERVICES.map((s, i) => (
              <Reveal
                key={s.title}
                delay={i * 0.08}
                className="flex min-h-[22rem] flex-col justify-between bg-ink p-8"
              >
                <PeakMark className="h-8 w-auto text-rose" strokeWidth={8} />
                <div>
                  <h3 className="font-display text-3xl text-bone">{s.title}</h3>
                  <p className="mt-4 font-body text-sm leading-relaxed text-mist">
                    {s.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Standards statement */}
      <section className="relative bg-ink py-24 md:py-32">
        <div className="container-edge mx-auto max-w-4xl text-center">
          <PeakMark className="mx-auto h-10 w-auto text-rose" strokeWidth={7} />
          <TextReveal
            as="p"
            text="Quiet authority through outcomes, not promises. The work speaks for itself."
            className="mt-8 font-display text-3xl leading-snug text-bone md:text-4xl"
          />
          <p className="mt-8 font-body text-sm uppercase tracking-[0.3em] text-rose">
            The future built well
          </p>

          <Reveal className="mt-14 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/projects"
              className="group inline-flex items-center gap-3 bg-rose px-7 py-4 font-body text-ink transition-colors hover:bg-rose-soft"
            >
              See the results
              <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
            </Link>
            <Link
              href="/sustainability"
              className="inline-flex items-center gap-3 border border-hair-strong px-7 py-4 font-body text-bone transition-colors hover:border-rose hover:text-rose"
            >
              Building responsibly
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
