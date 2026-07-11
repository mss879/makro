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
    title: "Prestigious",
    body: "A premium, aspirational brand admired for excellence and considered, bespoke solutions.",
  },
  {
    title: "Innovative",
    body: "Constantly evolving our design and construction methods to meet modern living and global standards.",
  },
  {
    title: "Trustworthy",
    body: "Building reliable, lasting relationships with clients, partners and the communities we develop within.",
  },
  {
    title: "Modern",
    body: "Embracing contemporary design and intelligent solutions that feel effortless to live and work in.",
  },
];

const TIMELINE = [
  {
    year: "The beginning",
    title: "Founded within a group of strength",
    body: "Makro Developers is established as a fully owned subsidiary of the Wheels Lanka Group, pairing corporate stability with a specialist focus on real estate.",
  },
  {
    year: "6+ years ago",
    title: "First development delivered",
    body: "Our first project is completed and handed over — proof of a model built on thoughtful planning and quality execution.",
  },
  {
    year: "Since",
    title: "A growing portfolio",
    body: "We continue to pursue opportunities that create long-term value across residential and commercial developments in Sri Lanka.",
  },
  {
    year: "Ahead",
    title: "The future, built well",
    body: "A pipeline of considered developments — each chosen for its potential to shape how Sri Lanka lives and works.",
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
        intro="A Sri Lankan property developer pairing corporate strength with an uncompromising approach to building well."
        imageId={BRAND.monoGrid}
        treatment="mono"
      />

      {/* Story */}
      <section className="relative bg-ink py-24 md:py-32">
        <div className="container-edge grid grid-cols-1 gap-14 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <div className="flex items-center gap-4">
              <span className="line-hair w-10" />
              <span className="eyebrow text-rose">Who We Are</span>
            </div>
            <TextReveal
              as="h2"
              text="A new standard of craftsmanship, trust and value."
              className="mt-6 font-display display-md text-bone"
            />
          </div>
          <div className="space-y-6 lg:col-span-5 lg:col-start-8">
            <Reveal>
              <p className="font-body text-lg leading-relaxed text-mist">
                Makro Developers is a property development company in Sri Lanka
                focused on residential and commercial developments — a fully
                owned subsidiary of the Wheels Lanka Group, combining corporate
                stability with a specialist&rsquo;s focus on real estate.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="font-body text-lg leading-relaxed text-mist">
                Since our first development over six years ago, we&rsquo;ve held
                to one commitment — long-term value through{" "}
                <Link
                  href="/approach"
                  className="text-bone underline decoration-rose/50 underline-offset-4 transition-colors hover:text-rose"
                >
                  thoughtful planning and quality execution
                </Link>
                . <span className="text-bone">The future, built well.</span>
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
      <section className="relative bg-carbon py-24 md:py-32">
        <div className="container-edge">
          <div className="flex items-center gap-4">
            <span className="line-hair w-10" />
            <span className="eyebrow text-rose">What Defines Us</span>
          </div>
          <TextReveal
            as="h2"
            text="The traits behind everything we build."
            className="mt-6 max-w-3xl font-display display-md text-bone"
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
                Being part of an established group gives every Makro development
                something rare in real estate: staying power. Capital
                discipline, a long-term view — and the confidence that the
                projects we begin are the projects we finish.
              </p>
            </Reveal>
            <Reveal delay={0.15} className="mt-8 flex items-center gap-3">
              <PeakMark className="h-4 w-auto text-rose" strokeWidth={11} />
              <span className="font-body text-sm text-bone">
                A fully owned subsidiary of the Wheels Lanka Group
              </span>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="relative bg-carbon py-24 md:py-32">
        <div className="container-edge">
          <div className="flex items-center gap-4">
            <span className="line-hair w-10" />
            <span className="eyebrow text-rose">Our Journey</span>
          </div>
          <TextReveal
            as="h2"
            text="A short history, a long-term view."
            className="mt-6 max-w-3xl font-display display-md text-bone"
          />
          <div className="mt-14 grid grid-cols-1 gap-px border border-hair bg-hair md:grid-cols-2 lg:grid-cols-4">
            {TIMELINE.map((t, i) => (
              <Reveal
                key={t.title}
                delay={i * 0.08}
                className="flex min-h-[20rem] flex-col justify-between bg-ink p-8"
              >
                <span className="font-body text-xs uppercase tracking-[0.25em] text-rose">
                  {t.year}
                </span>
                <div>
                  <h3 className="font-display text-2xl text-bone">{t.title}</h3>
                  <p className="mt-3 font-body text-sm leading-relaxed text-mist">
                    {t.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-16 flex flex-wrap items-center justify-between gap-6 border-t border-hair pt-10">
            <p className="max-w-xl font-display text-2xl text-bone">
              Curious where we are building next?
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/approach"
                className="group inline-flex items-center gap-3 rounded-full border border-hair-strong px-7 py-4 font-body text-bone transition-colors hover:border-rose hover:text-rose"
              >
                How we build
              </Link>
              <Link
                href="/projects"
                className="group inline-flex items-center gap-3 rounded-full bg-rose px-7 py-4 font-body text-ink transition-colors hover:bg-rose-soft"
              >
                Explore our projects
                <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </Reveal>

          <Reveal className="mt-10">
            <p className="font-body text-sm text-fog">
              Deciding who to build with?{" "}
              <Link
                href="/insights/how-to-choose-a-property-developer-in-sri-lanka"
                className="text-mist underline decoration-rose/50 underline-offset-4 transition-colors hover:text-rose"
              >
                Read our guide to choosing a property developer in Sri Lanka
              </Link>
              .
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
