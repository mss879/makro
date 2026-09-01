import Link from "next/link";
import { BRAND, IMG } from "@/lib/images";
import { getInsights } from "@/lib/blog-data";
import { pageMetadata, breadcrumbSchema, webPageSchema } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import PageHero from "@/components/ui/PageHero";
import ParallaxImage from "@/components/ui/ParallaxImage";
import Reveal from "@/components/anim/Reveal";

/**
 * Admin-editable content, so this page must not be frozen at build time.
 *
 * Every public page here was fully static with no revalidate window, which
 * meant a project, article or image saved in the admin only appeared after the
 * next deploy. `revalidatePath()` in the Server Actions is still the fast path
 * — it invalidates immediately — but it cannot be the ONLY path: it depends on
 * the host's on-demand revalidation working, and when it does not, the page
 * simply never updates and nothing says so.
 *
 * 60s is the backstop. Cached and fast for visitors, and an edit that misses
 * the on-demand hook still lands within a minute instead of never.
 */
export const revalidate = 60;

const DESCRIPTION =
  "Guides and insights on Sri Lankan property — buying an apartment in Colombo, investing in real estate, Grade-A space and choosing a developer you can trust.";

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

export default async function InsightsPage() {
  const insights = await getInsights();

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
        eyebrow="Blog"
        intro="Considered perspectives on Sri Lankan property — from the people who plan, build and deliver it."
        imageId={BRAND.lifestyleLoft}
        treatment="warm"
      />

      <section className="section-light relative section-y section-y-open-t md:py-32">
        <div className="container-edge">
          <div className="grid grid-cols-1 gap-x-10 gap-y-16 md:grid-cols-2">
            {insights.map((insight, i) => (
              <Reveal key={insight.slug} delay={i * 0.08}>
                <Link href={`/insights/${insight.slug}`} className="group block">
                  <div className="overflow-hidden">
                    <ParallaxImage
                      id={insight.cover}
                      alt={insight.title}
                      treatment={i % 2 === 0 ? "warm" : "mono"}
                      className="aspect-[16/10] w-full"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      width={1000}
                    />
                  </div>
                  <div className="mt-6 flex items-center gap-4">
                    <span className="eyebrow text-rose-deep">{insight.category}</span>
                    <span className="line-hair w-8" />
                    <span className="font-body text-xs text-fog">{insight.readTime}</span>
                  </div>
                  <h2 className="mt-3 max-w-lg font-display text-3xl leading-tight text-ink transition-colors group-hover:text-rose-deep md:text-4xl">
                    {insight.displayTitle}
                  </h2>
                  <p className="mt-3 max-w-lg font-body text-base leading-relaxed text-mist">
                    {insight.excerpt}
                  </p>
                  <span className="group mt-5 inline-flex items-center gap-3 font-body text-sm text-ink transition-colors group-hover:text-rose-deep">
                    Read the guide
                    <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>

          {/* Cross-links */}
          <Reveal className="mt-24 flex flex-wrap items-center justify-between gap-6 border-t border-hair pt-10">
            <p className="max-w-xl font-display text-2xl text-ink">
              Ready to see the standard we write about?
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/projects"
                className="group inline-flex items-center gap-3 bg-ink px-7 py-4 font-body text-bone transition-colors hover:bg-rose-deep hover:text-ink"
              >
                Explore our projects
                <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
              </Link>
              <Link
                href="/faq"
                className="inline-flex items-center gap-3 border border-hair-strong px-7 py-4 font-body text-ink transition-colors hover:border-rose-deep hover:text-rose-deep"
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
