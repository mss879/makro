import Link from "next/link";
import { BRAND, IMG } from "@/lib/images";
import { pageMetadata, breadcrumbSchema, webPageSchema } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import PageHero from "@/components/ui/PageHero";
import ParallaxImage from "@/components/ui/ParallaxImage";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";
import ValueCard from "@/components/ui/ValueCard";
import Timeline from "@/components/about/Timeline";
import { PeakMark } from "@/components/brand/PeakMark";

const DESCRIPTION =
  "Makro Developers is a Sri Lankan property developer and fully owned Wheels Lanka Group subsidiary, focused on residential and commercial development in Colombo.";

export const metadata = pageMetadata({
  title: "About Us — Sri Lankan Property Developer",
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
    title: "DISCIPLINED",
    body: "We believe good development begins with disciplined decisions. From feasibility and planning to design, procurement and delivery, we apply the same rigour to every decision — balancing commercial realities with quality, functionality and long-term value.",
  },
  {
    title: "CURATED",
    body: "We are deliberate about what we bring into a development and why. From spatial planning and materials to finishes and detail, every element is carefully selected to enhance how a place is experienced, how it performs and how it stands the test of time.",
  },
  {
    title: "HOLISTIC",
    body: "A development is greater than the sum of its parts. We bring together the right specialists and consider architecture, structure, services, interiors and performance as one cohesive whole — ensuring every decision contributes to the quality and value of the finished development.",
  },
  {
    title: "TRUST",
    body: "Trust is built through what we ultimately deliver, not simply what we promise. We value transparency, honour our commitments and remain accountable — creating relationships that extend well beyond the transaction.",
  },
];

/**
 * Our Journey timeline — hidden at client request (Aug 2026). Nothing was
 * deleted: flip this to `true` to bring the eyebrow, heading and timeline
 * back exactly as they were. The CTA and guide link below it stay visible
 * either way.
 */
const SHOW_TIMELINE = false;

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
        intro="Our developments reflect considered design, quality craftsmanship and lasting value — creating spaces and landmarks where people can live, work and invest with confidence."
        imageId={BRAND.monoGrid}
        treatment="mono"
      />

      {/* Story */}
      <section className="section-light relative section-y section-y-open-t md:py-32">
        <div className="container-edge grid grid-cols-1 gap-14 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <div className="flex items-center gap-4">
              <span className="line-hair w-10" />
              <span className="eyebrow text-rose-deep">Who We Are</span>
            </div>
            <TextReveal
              as="h2"
              text="A specialist developer with the strength to think beyond the immediate."
              className="mt-6 font-display display-md text-ink"
            />
          </div>
          <div className="space-y-6 lg:col-span-5 lg:col-start-8">
            <Reveal>
              <p className="font-body text-lg leading-relaxed text-mist">
                Makro Developers is a wholly owned subsidiary of the Wheels
                Lanka Group, established with a singular focus on property
                development. We bring together specialist development expertise
                with the financial strength, governance and stability of an
                established Sri Lankan business group.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="font-body text-lg leading-relaxed text-mist">
                We approach every development as a commitment that extends
                beyond construction — from the first feasibility assessment
                through design, delivery and into ownership. Every decision is
                measured against the same standard: creating developments that
                are considered today and continue to deliver value over time.{" "}
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
          {/* Landscape at every breakpoint: the plate is 3:2 and its subject sits
              left of centre, so the old portrait mobile crop would have cut her
              out of the frame entirely. */}
          <ParallaxImage
            id={BRAND.aboutLifestyle}
            alt="Resident in the timber-and-concrete entrance courtyard of a warm, architecturally crafted Makro home"
            treatment="warm"
            className="mx-auto aspect-[3/2] w-full max-w-3xl"
            sizes="(max-width: 640px) 100vw, 768px"
            zoom={1.06}
            parallax={3}
            revealDuration={2.2}
            revealInset="6% 4% 6% 4%"
          />
        </div>
      </section>

      {/* Values / personality */}
      <section className="section-light relative section-y md:py-32">
        <div className="container-edge">
          <div className="flex items-center gap-4">
            <span className="line-hair w-10" />
            <span className="eyebrow text-rose-deep">What Defines Us</span>
          </div>
          <TextReveal
            as="h2"
            text="The Makro Distinction"
            className="mt-6 max-w-3xl font-display display-md text-ink"
          />
          {/* The cards' left hairlines carry the rhythm now, so the columns
              sit tight against each other instead of in gutters. */}
          <div className="mt-14 grid grid-cols-1 gap-y-12 gap-x-0 sm:grid-cols-2 sm:gap-x-2 lg:grid-cols-4">
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
      <section className="relative bg-ink section-y md:py-32">
        <div className="container-edge grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <ParallaxImage
            id={BRAND.aboutFoundation}
            alt="Makro Developers leadership reviewing a scale model of a residential tower alongside drawings and material samples"
            treatment="warm"
            className="aspect-[4/3] w-full"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
          <div>
            <div className="flex items-center gap-4">
              <span className="line-hair w-10" />
              <span className="eyebrow text-rose">Our Foundation</span>
            </div>
            <TextReveal
              as="h2"
              text="Strength behind every development."
              className="mt-6 font-display display-md text-bone"
            />
            <Reveal delay={0.1}>
              <p className="mt-6 font-body text-lg leading-relaxed text-mist">
                As a wholly owned subsidiary of the Wheels Lanka Group, Makro
                combines specialist property development expertise with the
                financial strength, governance and stability of an established
                and diversified Sri Lankan business group.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="mt-6 font-body text-lg leading-relaxed text-mist">
                The Group provides a strong institutional foundation from which
                Makro operates — bringing financial discipline, experienced
                governance and the stability to take a measured view of every
                development. Within that foundation, we remain singularly
                focused on property, with the freedom to pursue the right
                opportunities and the discipline to develop them for lasting
                value.
              </p>
            </Reveal>
            <Reveal delay={0.2} className="mt-8 flex items-center gap-3">
              <PeakMark className="h-4 w-auto text-rose" strokeWidth={11} />
              <span className="font-body text-sm text-bone">
                Institutional stability and governance
              </span>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Why Makro — the full-length reasons; the home page carries only
          one-line versions of these (client direction, July 2026) */}
      <section className="section-light relative section-y md:py-32">
        <div className="container-edge">
          {/* No heading under this label any more (client, Aug 2026 — the
              section headline was cut). The eyebrow is set at display scale
              instead so the section still opens on something, rather than a
              0.7rem line of tracking holding up four long reasons. */}
          <div className="flex items-center gap-5">
            <span className="line-hair w-14" />
            <TextReveal
              as="h2"
              text="Why Makro"
              className="font-display display-md uppercase text-ink"
            />
          </div>
          <div className="mt-14 grid grid-cols-1 gap-x-12 gap-y-12 md:grid-cols-2">
            {[
              {
                title: "DOMESTIC INSIGHT, INTERNATIONAL STANDARDS",
                body: "Our approach begins with a deep understanding of Sri Lanka — its planning environment, climate, construction realities and the way people live and invest. We pair that local insight with planning, engineering and design practices benchmarked against established international standards, bringing a broader perspective while remaining grounded in what works locally.",
              },
              {
                title: "SPECIALIST FOCUS. GROUP STRENGTH.",
                body: "Property development is our singular focus. Our team brings specialist expertise across the development lifecycle, supported by the financial strength, governance and stability of the Wheels Lanka Group. The combination gives us the depth to approach each development with focus, discipline and the confidence to make considered decisions from opportunity through completion.",
              },
              {
                title: "BUILT TO ENDURE, NOT SIMPLY IMPRESS",
                body: "We look beyond the moment of completion, considering how a development will perform, function and age over time. From the planning of space to the selection of materials, finishes and building systems, we prioritise durability, maintainability and lasting utility over short-term impression. We measure what we build not by how it looks on completion, but by how well it continues to serve the people who own and use it.",
              },
              {
                title: "A RELATIONSHIP, NOT MERELY A TRANSACTION",
                body: "We see every development as the beginning of a relationship, not the end of a transaction. From the first conversation through handover and ownership, we believe in clear communication, keeping our commitments and remaining accountable for what we deliver. The trust placed in us is a responsibility we take seriously — and one that extends well beyond the point of sale.",
              },
            ].map((r, i) => (
              <Reveal key={r.title} delay={i * 0.06} className="border-t border-hair pt-6">
                <div className="flex items-baseline gap-4">
                  <span className="font-body text-sm text-rose-deep">0{i + 1}</span>
                  <div>
                    <h3 className="font-display text-xl leading-tight tracking-[0.04em] text-ink md:text-2xl">
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
      <section className="section-light relative section-y md:py-32">
        <div className="container-edge">
          {SHOW_TIMELINE && (
            <>
              <div className="flex items-center gap-4">
                <span className="line-hair w-10" />
                <span className="eyebrow text-rose-deep">Our Journey</span>
              </div>
              <TextReveal
                as="h2"
                text="A short history, a long-term view."
                className="mt-6 max-w-3xl font-display display-md text-ink"
              />
              <Timeline entries={TIMELINE} />
            </>
          )}

          {/* The rule and top margin only make sense under the timeline —
              without it they read as a stray line under the section's own
              top padding. */}
          {/* The prompt line above this button was cut (client, Aug 2026),
              so there is no longer a left-hand item for justify-between to
              push against — the button just leads the row on its own. */}
          <Reveal
            className={`flex flex-wrap items-center gap-4 ${
              SHOW_TIMELINE ? "mt-16 border-t border-hair pt-10" : ""
            }`}
          >
            <Link
              href="/projects"
              className="group inline-flex items-center gap-3 bg-ink px-7 py-4 font-body text-bone transition-colors hover:bg-rose-deep hover:text-ink"
            >
              Explore our projects
              <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
            </Link>
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
