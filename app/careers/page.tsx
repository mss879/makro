import Link from "next/link";
import { BRAND } from "@/lib/images";
import { SITE } from "@/lib/site";
import { pageMetadata, breadcrumbSchema, webPageSchema } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import PageHero from "@/components/ui/PageHero";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";
import { PeakMark } from "@/components/brand/PeakMark";

const DESCRIPTION =
  "Build a career with Makro Developers — a growing Sri Lankan property developer backed by the Wheels Lanka Group. Opportunities across engineering, design management, sales and operations in Colombo.";

export const metadata = pageMetadata({
  title: "Careers in Property Development",
  description: DESCRIPTION,
  path: "/careers",
  imageId: BRAND.textureWaves,
  keywords: [
    "careers Makro Developers",
    "property development jobs Sri Lanka",
    "construction careers Colombo",
    "real estate jobs Sri Lanka",
  ],
});

const DISCIPLINES = [
  {
    title: "Engineering & Construction",
    body: "Site engineers, quantity surveyors and project managers who hold a schedule and a standard at the same time.",
  },
  {
    title: "Design Management",
    body: "Architects and design coordinators who translate climate, brief and budget into buildings that endure.",
  },
  {
    title: "Sales & Client Relations",
    body: "People who guide buyers and investors with the same honesty we bring to the buildings themselves.",
  },
  {
    title: "Corporate & Operations",
    body: "Finance, legal and administrative professionals who keep a disciplined developer disciplined.",
  },
];

export default function CareersPage() {
  return (
    <>
      <JsonLd
        data={[
          webPageSchema({
            name: "Careers — Makro Developers",
            description: DESCRIPTION,
            path: "/careers",
          }),
          breadcrumbSchema([{ name: "Careers", path: "/careers" }]),
        ]}
      />
      <PageHero
        eyebrow="Careers"
        title="Build what lasts. Including your career."
        intro="We hire people who take quiet pride in doing things properly — and give them buildings worth their name."
        imageId={BRAND.textureWaves}
        treatment="warm"
      />

      {/* Why Makro */}
      <section className="relative bg-ink py-24 md:py-32">
        <div className="container-edge grid grid-cols-1 gap-14 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <div className="flex items-center gap-4">
              <span className="line-hair w-10" />
              <span className="eyebrow text-rose">Why Makro</span>
            </div>
            <TextReveal
              as="h2"
              text="Serious work, done well, in good company."
              className="mt-6 font-display display-md text-bone"
            />
          </div>
          <div className="space-y-6 lg:col-span-5 lg:col-start-8">
            <Reveal>
              <p className="font-body text-lg leading-relaxed text-mist">
                Makro Developers pairs the stability of the {SITE.parent} with
                the pace of a focused development team. You will work on
                residential and commercial projects that people will live with
                for decades — and be held to that standard.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="font-body text-lg leading-relaxed text-mist">
                Our values —{" "}
                <Link
                  href="/about"
                  className="text-bone underline decoration-rose/50 underline-offset-4 transition-colors hover:text-rose"
                >
                  prestigious, innovative, trustworthy, modern
                </Link>{" "}
                — describe the people here as much as the buildings. If our{" "}
                <Link
                  href="/approach"
                  className="text-bone underline decoration-rose/50 underline-offset-4 transition-colors hover:text-rose"
                >
                  way of building
                </Link>{" "}
                reads like your way of working, we should talk.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Disciplines */}
      <section className="relative bg-carbon py-24 md:py-32">
        <div className="container-edge">
          <div className="flex items-center gap-4">
            <span className="line-hair w-10" />
            <span className="eyebrow text-rose">Where You Fit</span>
          </div>
          <TextReveal
            as="h2"
            text="Four disciplines, one standard."
            className="mt-6 max-w-3xl font-display display-md text-bone"
          />
          <div className="mt-14 grid grid-cols-1 gap-px border border-hair bg-hair sm:grid-cols-2">
            {DISCIPLINES.map((d, i) => (
              <Reveal
                key={d.title}
                delay={i * 0.08}
                className="flex min-h-[16rem] flex-col justify-between bg-ink p-8"
              >
                <PeakMark className="h-6 w-auto text-rose" strokeWidth={9} />
                <div>
                  <h3 className="font-display text-2xl text-bone">{d.title}</h3>
                  <p className="mt-3 font-body text-sm leading-relaxed text-mist">{d.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Open application */}
      <section className="relative bg-ink py-24 md:py-32">
        <div className="container-edge mx-auto max-w-4xl text-center">
          <PeakMark className="mx-auto h-10 w-auto text-rose" strokeWidth={7} />
          <TextReveal
            as="h2"
            text="No open role that fits? Write anyway."
            className="mt-8 font-display display-md text-bone"
          />
          <Reveal delay={0.1}>
            <p className="mx-auto mt-6 max-w-xl font-body text-lg leading-relaxed text-mist">
              We are always interested in exceptional people. Send your CV and a
              few lines on what you would want to build to{" "}
              <a
                href={`mailto:${SITE.email}`}
                className="text-bone underline decoration-rose/50 underline-offset-4 transition-colors hover:text-rose"
              >
                {SITE.email}
              </a>
              .
            </p>
          </Reveal>
          <Reveal delay={0.15} className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/contact"
              className="group inline-flex items-center gap-3 rounded-full bg-rose px-7 py-4 font-body text-ink transition-colors hover:bg-rose-soft"
            >
              Get in touch
              <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center gap-3 rounded-full border border-hair-strong px-7 py-4 font-body text-bone transition-colors hover:border-rose hover:text-rose"
            >
              Who we are
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
