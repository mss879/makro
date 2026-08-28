import { BRAND, IMG } from "@/lib/images";
import { pageMetadata, breadcrumbSchema, webPageSchema } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import PageHero from "@/components/ui/PageHero";
import ParallaxImage from "@/components/ui/ParallaxImage";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";

const DESCRIPTION =
  "How Makro Developers creates lasting value in Sri Lankan real estate — feasibility-led planning, integrated design, compliance, disciplined construction and performance beyond handover.";

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

/**
 * Five stages, not four (client revision, Aug 2026): Compliance was inserted
 * ahead of Build, and Build was rewritten around programme control. Bodies
 * are an array because every stage now runs to several paragraphs — the home
 * page's ApproachPreview still carries the one-line version of each.
 */
const STEPS = [
  {
    n: "01",
    title: "Plan",
    lead: "We begin with the land, the market it caters to and the driving numbers — never the marketing.",
    paras: [
      "Every project starts with rigorous feasibility, realistic assumptions and a clear understanding of who the development is for. We assess the site, market, planning parameters, development potential, costs and commercial viability before committing capital.",
      "We consider not simply what can be built, but what should be built to create lasting value.",
    ],
    image: IMG.concreteLines,
    treatment: "mono" as const,
  },
  {
    n: "02",
    title: "Design",
    lead: "We design around how people live, not simply how much can be built.",
    paras: [
      "High-utility layouts, efficient circulation and purposeful spaces allow more of the sold area to serve a meaningful purpose. We consider the realities of everyday living — storage, movement, privacy, natural light, ventilation, functionality and how each space connects to the next.",
      "The right specialists are integrated from the outset across architecture, structure, MEP, interiors and other disciplines. We coordinate every aspect as one, balancing design, engineering, services, finishes and operational maintenance, whilst ensuring commercial viability.",
    ],
    image: IMG.staircase,
    treatment: "warm" as const,
  },
  {
    n: "03",
    title: "Compliance",
    lead: "Compliance built into every stage.",
    paras: [
      "Regulatory, statutory, technical, environmental and condominium requirements are addressed from the outset and coordinated throughout design and construction. The right specialists are involved at each stage to maintain conformity with approved plans and requirements, while incorporating practical measures for resource efficiency, natural light, ventilation and long-term environmental performance.",
      "The objective extends beyond obtaining approval to build. It is to complete the development with the required clearances and documentation in place, avoiding post-construction conformity issues that can delay handover, deed registration and the transfer of ownership.",
      "Compliance protects completion. Proper completion protects value.",
    ],
    image: IMG.angularGlass,
    treatment: "mono" as const,
  },
  {
    n: "04",
    title: "Build",
    lead: "Precision in execution. Control at every stage.",
    paras: [
      "Construction is where every decision made during planning and design is tested. We maintain disciplined control over specifications, quality, procurement, sequencing and programme, with experienced project teams and specialist consultants working within a coordinated framework.",
      "A well-managed programme is more than a target completion date. It is the careful sequencing of trades, procurement, approvals and interdependent activities to keep work flowing efficiently and minimise avoidable disruption. We continuously coordinate the programme, resources and site activities to maintain momentum and deliver as planned.",
      "Construction is also dynamic. Material availability, site conditions, third-party dependencies, weather and other unforeseen events can affect even the most carefully prepared programme. When circumstances change, we respond proactively, reassess the programme and communicate transparently with our customers.",
      "We plan for certainty, manage for change and communicate with clarity.",
    ],
    image: IMG.duskHouse,
    treatment: "warm" as const,
  },
  {
    n: "05",
    title: "Endure",
    lead: "Completion is a milestone, not the finish line.",
    paras: [
      "The true measure of a development emerges over time. We consider how buildings will perform, adapt and be maintained long after completion — from the durability of materials and finishes to the efficiency of building systems and the quality of shared spaces.",
      "We carry that same discipline through handover, documentation and after-care, ensuring the development is completed as a whole, not simply as a building. The objective is lasting performance, a sound ownership experience and value that endures.",
      "Because lasting value is not defined at completion. It is proven over time.",
    ],
    image: IMG.towersUp,
    treatment: "mono" as const,
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
        title="Where lasting value begins."
        intro="A disciplined approach that brings together commercial judgement, specialist expertise and rigorous execution to create developments built for lasting value."
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
            text="Five disciplines. One standard."
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
                  {/* Each stage now runs to several paragraphs, so they are
                      revealed as one block with a single delay rather than a
                      per-paragraph stagger — four staggered fades in a column
                      this tall reads as the page loading, not as a reveal. */}
                  <Reveal delay={0.1} className="mt-5 max-w-lg space-y-5">
                    {s.paras.map((para) => (
                      <p
                        key={para}
                        className="font-body text-lg leading-relaxed text-mist"
                      >
                        {para}
                      </p>
                    ))}
                  </Reveal>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
