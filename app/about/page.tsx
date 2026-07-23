import Link from "next/link";
import { BRAND, IMG } from "@/lib/images";
import { pageMetadata, breadcrumbSchema, webPageSchema } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import PageHero from "@/components/ui/PageHero";
import ParallaxImage from "@/components/ui/ParallaxImage";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";
import ValueCard from "@/components/ui/ValueCard";
import { PeakMark } from "@/components/brand/PeakMark";

const DESCRIPTION =
  "Makro Developers is a Sri Lankan property developer and a fully owned subsidiary of the Wheels Lanka Group — combining corporate strength with a focused approach to residential and commercial development in Colombo and beyond.";

export const metadata = pageMetadata({
  title: "About Us — A Sri Lankan Property Developer",
  description: DESCRIPTION,
  path: "/about",
  imageId: IMG.towersUp,
  keywords: [
    "about Makro Developers",
    "Sri Lankan property developer",
    "Wheels Lanka Group subsidiary",
    "real estate development company Colombo",
    "trusted property developer Sri Lanka",
  ],
});

const VALUES = [
  {
    title: "Disciplined",
    body: "Every decision, from planning to material selection, is measured against the same standard — regardless of budget or market segment.",
  },
  {
    title: "Innovative",
    body: "We continually refine our design and construction methods to meet modern living demands without abandoning what endures.",
  },
  {
    title: "Trustworthy",
    body: "We build relationships on delivering exactly what we promise — to customers, partners and communities alike.",
  },
  {
    title: "Modern",
    body: "Our architecture embraces contemporary design and thinking, without chasing trends that date quickly.",
  },
];

const TIMELINE = [
  {
    year: "2013",
    title: "A dedicated development arm",
    body: "Makro Developers is incorporated as the real estate development arm of the Wheels Lanka Group, created to build its own reputation within Sri Lanka’s property industry.",
  },
  {
    year: "Since",
    title: "Building a disciplined track record",
    body: "Every project has been measured against the same standard of planning, design and execution — regardless of scale, location or market segment.",
  },
  {
    year: "Today",
    title: "A flagship standard, in motion",
    body: "Makro Heights, our flagship residential development in Dehiwala, is designed to become the first public demonstration of everything The Makro Standard represents.",
  },
  {
    year: "Ahead",
    title: "A heritage in the making",
    body: "Our ambition extends beyond individual projects — to become one of Sri Lanka’s heritage developer brands, recognised for consistency across generations.",
  },
];

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={[
          webPageSchema({
            type: "AboutPage",
            name: "About Makro Developers",
            description: DESCRIPTION,
            path: "/about",
          }),
          breadcrumbSchema([{ name: "About", path: "/about" }]),
        ]}
      />
      <PageHero
        eyebrow="About Makro"
        title="Shaping how Sri Lanka lives."
        intro="We design and build developments that set a new standard for craftsmanship, trust and long-term value — for the people who will live, work and invest in them."
        imageId={BRAND.monoGrid}
        treatment="mono"
      />

      {/* Story */}
      <section className="section-light relative py-24 md:py-32">
        <div className="container-edge grid grid-cols-1 gap-14 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <div className="flex items-center gap-4">
              <span className="line-hair w-10" />
              <span className="eyebrow text-rose-deep">Who We Are</span>
            </div>
            <TextReveal
              as="h2"
              text="A new standard of craftsmanship, trust and value."
              className="mt-6 font-display display-md text-ink"
            />
          </div>
          <div className="space-y-6 lg:col-span-5 lg:col-start-8">
            <Reveal>
              <p className="font-body text-lg leading-relaxed text-mist">
                Makro Developers is a wholly owned subsidiary of the Wheels
                Lanka Group, established to focus entirely on residential and
                commercial property development. Being part of an established,
                diversified business group gives us the financial strength,
                governance and long-term stability to take on developments with
                confidence — and every Makro project carries that backing.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="font-body text-lg leading-relaxed text-mist">
                We approach every development as a long-term commitment rather
                than a single sale, from the first feasibility study to long
                after the keys have changed hands. That commitment is what we
                call The Standard Above — the benchmark against which every
                decision we make is measured.{" "}
                <Link
                  href="/approach"
                  className="text-ink underline decoration-rose-deep/50 underline-offset-4 transition-colors hover:text-rose-deep"
                >
                  Learn what The Standard Above means to us
                </Link>
                .
              </p>
            </Reveal>
          </div>
        </div>

        <div className="container-edge mt-16">
          <ParallaxImage
            id={BRAND.lifestylePool}
            alt="Resident beside the pool of a warm, architecturally crafted Makro home"
            treatment="warm"
            className="mx-auto aspect-[4/5] w-full max-w-3xl sm:aspect-[3/2]"
            sizes="(max-width: 640px) 100vw, 768px"
            zoom={1.06}
            parallax={3}
            revealDuration={2.2}
            revealInset="6% 4% 6% 4%"
          />
        </div>
      </section>

      {/* Values / personality */}
      <section className="section-light relative py-24 md:py-32">
        <div className="container-edge">
          <div className="flex items-center gap-4">
            <span className="line-hair w-10" />
            <span className="eyebrow text-rose-deep">What Defines Us</span>
          </div>
          <TextReveal
            as="h2"
            text="The traits behind everything we build."
            className="mt-6 max-w-3xl font-display display-md text-ink"
          />
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v, i) => (
              <ValueCard
                key={v.title}
                index={`0${i + 1}`}
                title={v.title}
                body={v.body}
                delay={i * 0.08}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Wheels Lanka Group */}
      <section className="relative bg-ink py-24 md:py-32">
        <div className="container-edge grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <ParallaxImage
            id={IMG.skylineWarm}
            alt="City skyline"
            treatment="warm"
            className="aspect-[4/3] w-full"
            sizes="50vw"
          />
          <div>
            <div className="flex items-center gap-4">
              <span className="line-hair w-10" />
              <span className="eyebrow text-rose">Our Foundation</span>
            </div>
            <TextReveal
              as="h2"
              text="Backed by the Wheels Lanka Group."
              className="mt-6 font-display display-md text-bone"
            />
            <Reveal delay={0.1}>
              <p className="mt-8 font-body text-lg leading-relaxed text-mist">
                Makro Developers operates with the backing of the Wheels Lanka
                Group, one of Sri Lanka&rsquo;s established diversified business
                groups. That relationship brings capital discipline,
                professional governance and a long-term outlook to every
                development we undertake — meaning every Makro project is
                supported by more than a single balance sheet.
              </p>
            </Reveal>
            <Reveal delay={0.15} className="mt-8 flex items-center gap-3">
              <PeakMark className="h-4 w-auto text-rose" strokeWidth={11} />
              <span className="font-body text-sm text-bone">
                A fully owned subsidiary of the Wheels Lanka Group.
              </span>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Why Makro — the full-length reasons; the home page carries only
          one-line versions of these (client direction, July 2026) */}
      <section className="section-light relative py-24 md:py-32">
        <div className="container-edge">
          <div className="flex items-center gap-4">
            <span className="line-hair w-10" />
            <span className="eyebrow text-rose-deep">Why Makro</span>
          </div>
          <TextReveal
            as="h2"
            text="Why buyers and investors choose Makro."
            className="mt-6 max-w-3xl font-display display-md text-ink"
          />
          <div className="mt-14 grid grid-cols-1 gap-x-12 gap-y-12 md:grid-cols-2">
            {[
              {
                title: "Local insight, international standard",
                body: "We understand Sri Lanka — its planning regulations, its climate, and the way people actually live here. That local depth is paired with planning, engineering and design discipline benchmarked against international standards.",
              },
              {
                title: "The strength of a group behind us",
                body: "Makro Developers is a wholly owned subsidiary of the Wheels Lanka Group, giving every development the financial strength, governance and long-term stability of an established business group behind it.",
              },
              {
                title: "Built to endure, not to impress",
                body: "We measure success by how a building performs decades after handover, not how it photographs on completion day. Every material, layout and system is chosen for lasting value over short-term impression.",
              },
              {
                title: "A relationship, not a transaction",
                body: "Our responsibility to a customer doesn't end at handover. From the first enquiry through years of ownership, we remain accountable for what we've built and responsive to the people who live in it.",
              },
            ].map((r, i) => (
              <Reveal key={r.title} delay={i * 0.06} className="border-t border-hair pt-6">
                <div className="flex items-baseline gap-4">
                  <span className="font-body text-sm text-rose-deep">0{i + 1}</span>
                  <div>
                    <h3 className="font-display text-2xl leading-tight text-ink md:text-3xl">
                      {r.title}
                    </h3>
                    <p className="mt-4 max-w-xl font-body text-base leading-relaxed text-mist">
                      {r.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="section-light relative py-24 md:py-32">
        <div className="container-edge">
          <div className="flex items-center gap-4">
            <span className="line-hair w-10" />
            <span className="eyebrow text-rose-deep">Our Journey</span>
          </div>
          <TextReveal
            as="h2"
            text="A short history, a long-term view."
            className="mt-6 max-w-3xl font-display display-md text-ink"
          />
          <div className="mt-14 grid grid-cols-1 gap-px border border-hair bg-hair md:grid-cols-2 lg:grid-cols-4">
            {TIMELINE.map((t, i) => (
              <Reveal
                key={t.title}
                delay={i * 0.08}
                className="flex min-h-[20rem] flex-col justify-between bg-shell p-8"
              >
                <span className="font-body text-xs uppercase tracking-[0.25em] text-rose-deep">
                  {t.year}
                </span>
                <div>
                  <h3 className="font-display text-2xl text-ink">{t.title}</h3>
                  <p className="mt-3 font-body text-sm leading-relaxed text-mist">
                    {t.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-16 flex flex-wrap items-center justify-between gap-6 border-t border-hair pt-10">
            <p className="max-w-xl font-display text-2xl text-ink">
              Curious where we are building next?
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/approach"
                className="group inline-flex items-center gap-3 border border-hair-strong px-7 py-4 font-body text-ink transition-colors hover:border-rose-deep hover:text-rose-deep"
              >
                How we build
              </Link>
              <Link
                href="/projects"
                className="group inline-flex items-center gap-3 bg-ink px-7 py-4 font-body text-bone transition-colors hover:bg-rose-deep hover:text-ink"
              >
                Explore our projects
                <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </Reveal>

          <Reveal className="mt-10">
            <p className="font-body text-sm text-fog">
              Deciding who to build your future with?{" "}
              <Link
                href="/insights/how-to-choose-a-property-developer-in-sri-lanka"
                className="text-mist underline decoration-rose-deep/50 underline-offset-4 transition-colors hover:text-rose-deep"
              >
                Read our guide to choosing a developer in Sri Lanka
              </Link>
              .
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
