import type { Metadata } from "next";
import { IMG } from "@/lib/images";
import PageHero from "@/components/ui/PageHero";
import ParallaxImage from "@/components/ui/ParallaxImage";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";
import { PeakMark } from "@/components/brand/PeakMark";

export const metadata: Metadata = {
  title: "Sustainability",
  description:
    "Makro Developers is committed to sustainable growth and lasting value — building responsibly for people, place and the long term.",
};

const PILLARS = [
  {
    title: "Sustainable Growth",
    body: "We grow with intent, not haste — pursuing durable value our communities benefit from for decades.",
  },
  {
    title: "Responsible Construction",
    body: "Efficient design, careful material selection and considerate building practices reduce waste and impact across the life of every project.",
  },
  {
    title: "Climate-Conscious Design",
    body: "Cross-ventilation, shading, natural light and solar-ready services are designed in — comfort and lower running costs that suit the Sri Lankan climate.",
  },
  {
    title: "Lasting Value",
    body: "Buildings that endure are the most sustainable of all — built to last, rewarding the people and places they serve.",
  },
];

const PRACTICES = [
  "Solar-ready rooftops and services",
  "Rainwater harvesting where feasible",
  "Passive cooling & natural ventilation",
  "Durable, low-maintenance materials",
  "Landscaped, green shared spaces",
  "Efficient water & energy systems",
];

export default function SustainabilityPage() {
  return (
    <>
      <PageHero
        eyebrow="Sustainability"
        title="Built responsibly. Built to last."
        intro="A commitment to sustainable growth and lasting value — for people, place and the long term."
        imageId={IMG.woodFacade}
        treatment="warm"
      />

      {/* Commitment */}
      <section className="relative bg-ink py-24 md:py-32">
        <div className="container-edge grid grid-cols-1 gap-14 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <div className="flex items-center gap-4">
              <span className="line-hair w-10" />
              <span className="eyebrow text-rose">Our Commitment</span>
            </div>
            <TextReveal
              as="h2"
              text="The most sustainable building endures."
              className="mt-6 font-display display-md text-bone"
            />
          </div>
          <div className="space-y-6 lg:col-span-5 lg:col-start-8">
            <Reveal>
              <p className="font-body text-lg leading-relaxed text-mist">
                At Makro Developers, sustainability is not bolted on at the end
                — it runs from feasibility to handover, driven by a commitment
                to sustainable growth and lasting value.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="font-body text-lg leading-relaxed text-mist">
                Well-planned developments suited to their climate last longer
                and consume less to run — better for owners, communities and
                the environment.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="relative bg-carbon py-24 md:py-32">
        <div className="container-edge">
          <div className="flex items-center gap-4">
            <span className="line-hair w-10" />
            <span className="eyebrow text-rose">Our Pillars</span>
          </div>
          <TextReveal
            as="h2"
            text="The pillars of responsible growth."
            className="mt-6 max-w-3xl font-display display-md text-bone"
          />
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {PILLARS.map((p, i) => (
              <Reveal
                key={p.title}
                delay={i * 0.08}
                className="group flex gap-6 border border-hair bg-ink p-8 transition-colors duration-500 hover:bg-carbon"
              >
                <span className="font-body text-xs text-fog">0{i + 1}</span>
                <div>
                  <h3 className="font-display text-3xl text-bone">{p.title}</h3>
                  <p className="mt-4 font-body text-sm leading-relaxed text-mist">
                    {p.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Practices */}
      <section className="relative bg-ink py-24 md:py-32">
        <div className="container-edge grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <ParallaxImage
            id={IMG.terracottaVilla}
            alt="A sustainable Makro development"
            treatment="warm"
            className="aspect-[4/5] w-full"
            sizes="50vw"
          />
          <div>
            <div className="flex items-center gap-4">
              <span className="line-hair w-10" />
              <span className="eyebrow text-rose">In Practice</span>
            </div>
            <TextReveal
              as="h2"
              text="Responsibility, designed in."
              className="mt-6 font-display display-md text-bone"
            />
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-lg font-body text-lg leading-relaxed text-mist">
                Where feasible, our developments incorporate measures that lower
                impact and running costs while improving daily comfort:
              </p>
            </Reveal>
            <div className="mt-8 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              {PRACTICES.map((p, i) => (
                <Reveal
                  key={p}
                  delay={i * 0.05}
                  className="flex items-center gap-3 border-b border-hair py-4"
                >
                  <PeakMark className="h-3.5 w-auto shrink-0 text-rose" strokeWidth={12} />
                  <span className="font-body text-sm text-bone">{p}</span>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
