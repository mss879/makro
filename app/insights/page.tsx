import Link from "next/link";
import { BRAND, IMG } from "@/lib/images";
import { INSIGHTS } from "@/lib/insights";
import { pageMetadata, breadcrumbSchema, webPageSchema } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import PageHero from "@/components/ui/PageHero";
import ParallaxImage from "@/components/ui/ParallaxImage";
import Reveal from "@/components/anim/Reveal";

const DESCRIPTION =
  "Guides and insights on Sri Lankan property — buying an apartment in Colombo, investing in real estate, Grade-A commercial space and how to choose a developer you can trust.";

export const metadata = pageMetadata({
  title: "Property Insights & Buying Guides",
  description: DESCRIPTION,
  path: "/insights",
  imageId: IMG.penthouse,
  keywords: [
    "Sri Lanka property guides",
    "Colombo real estate insights",
    "property buying guide Sri Lanka",
    "real estate investment advice Sri Lanka",
  ],
});

export default function InsightsPage() {
  return (
    <>
      <JsonLd
        data={[
          webPageSchema({
            type: "CollectionPage",
            name: "Insights — Makro Developers",
            description: DESCRIPTION,
            path: "/insights",
          }),
          breadcrumbSchema([{ name: "Insights", path: "/insights" }]),
        ]}
      />
      <PageHero
        eyebrow="Insights"
        title="Know before you build, buy or invest."
        intro="Considered guides to Sri Lankan property — written by the people who plan, build and deliver it."
        imageId={BRAND.lifestyleLoft}
        treatment="warm"
      />

      <section className="relative bg-ink py-24 md:py-32">
        <div className="container-edge">
          <div className="grid grid-cols-1 gap-x-10 gap-y-16 md:grid-cols-2">
            {INSIGHTS.map((insight, i) => (
              <Reveal key={insight.slug} delay={i * 0.08}>
                <Link href={`/insights/${insight.slug}`} className="group block">
                  <div className="overflow-hidden">
                    <ParallaxImage
                      id={insight.cover}
                      alt={insight.title}
                      treatment={i % 2 === 0 ? "warm" : "mono"}
                      className="aspect-[16/10] w-full"
                      sizes="50vw"
                    />
                  </div>
                  <div className="mt-6 flex items-center gap-4">
                    <span className="eyebrow text-rose">{insight.category}</span>
                    <span className="line-hair w-8" />
                    <span className="font-body text-xs text-fog">{insight.readTime}</span>
                  </div>
                  <h2 className="mt-4 max-w-lg font-display text-3xl leading-tight text-bone transition-colors group-hover:text-rose md:text-4xl">
                    {insight.displayTitle}
                  </h2>
                  <p className="mt-4 max-w-lg font-body text-base leading-relaxed text-mist">
                    {insight.excerpt}
                  </p>
                  <span className="group mt-5 inline-flex items-center gap-3 font-body text-sm text-bone transition-colors group-hover:text-rose">
                    Read the guide
                    <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>

          {/* Cross-links */}
          <Reveal className="mt-24 flex flex-wrap items-center justify-between gap-6 border-t border-hair pt-10">
            <p className="max-w-xl font-display text-2xl text-bone">
              Ready to see the standard we write about?
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/projects"
                className="group inline-flex items-center gap-3 rounded-full bg-rose px-7 py-4 font-body text-ink transition-colors hover:bg-rose-soft"
              >
                Explore our projects
                <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
              </Link>
              <Link
                href="/faq"
                className="inline-flex items-center gap-3 rounded-full border border-hair-strong px-7 py-4 font-body text-bone transition-colors hover:border-rose hover:text-rose"
              >
                Quick answers
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
