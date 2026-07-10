import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getInsight, INSIGHT_SLUGS } from "@/lib/insights";
import { getProject } from "@/lib/projects";
import { pageMetadata, breadcrumbSchema, articleSchema } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import ParallaxImage from "@/components/ui/ParallaxImage";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";
import { PeakMark } from "@/components/brand/PeakMark";

export function generateStaticParams() {
  return INSIGHT_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const insight = getInsight(slug);
  if (!insight) return { title: "Insight" };
  return pageMetadata({
    title: insight.title,
    description: insight.metaDescription,
    path: `/insights/${insight.slug}`,
    imageId: insight.cover,
    keywords: insight.keywords,
    ogType: "article",
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function InsightPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const insight = getInsight(slug);
  if (!insight) notFound();

  const related = insight.related.map(getInsight).filter(Boolean);
  const projects = insight.relatedProjects.map(getProject).filter(Boolean);

  return (
    <>
      <JsonLd
        data={[
          articleSchema(insight),
          breadcrumbSchema([
            { name: "Insights", path: "/insights" },
            { name: insight.title, path: `/insights/${insight.slug}` },
          ]),
        ]}
      />

      {/* Article hero */}
      <section className="relative bg-ink pb-16 pt-40">
        <div className="container-edge">
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/insights"
              className="font-body text-xs uppercase tracking-[0.2em] text-fog transition-colors hover:text-rose"
            >
              ← Insights
            </Link>
            <span className="line-hair w-8" />
            <span className="eyebrow text-rose">{insight.category}</span>
            <span className="font-body text-xs text-fog">
              {formatDate(insight.date)} · {insight.readTime}
            </span>
          </div>
          <TextReveal
            as="h1"
            text={insight.displayTitle}
            className="mt-8 max-w-4xl font-display display-lg text-bone"
            delay={0.1}
          />
          <Reveal delay={0.2}>
            <p className="mt-8 max-w-2xl font-body text-xl leading-relaxed text-mist">
              {insight.intro}
            </p>
          </Reveal>
        </div>
        <div className="container-edge mt-14">
          <ParallaxImage
            id={insight.cover}
            alt={insight.title}
            treatment="warm"
            className="aspect-[21/9] w-full"
            sizes="100vw"
          />
        </div>
      </section>

      {/* Body */}
      <section className="relative bg-ink pb-24 md:pb-32">
        <div className="container-edge grid grid-cols-1 gap-14 lg:grid-cols-12">
          <article className="lg:col-span-7 lg:col-start-3">
            {insight.sections.map((section, si) => (
              <div key={section.heading} className={si === 0 ? "" : "mt-16"}>
                <div className="flex items-center gap-4">
                  <span className="font-body text-xs text-rose">0{si + 1}</span>
                  <span className="line-hair w-10" />
                </div>
                <h2 className="mt-4 font-display text-3xl leading-tight text-bone md:text-4xl">
                  {section.heading}
                </h2>
                <div className="mt-6 space-y-5">
                  {section.paras.map((p, pi) => (
                    <Reveal key={pi} delay={pi * 0.05}>
                      <p className="font-body text-lg leading-relaxed text-mist">{p}</p>
                    </Reveal>
                  ))}
                </div>
                {section.points && (
                  <ul className="mt-7 space-y-0">
                    {section.points.map((pt) => (
                      <Reveal
                        key={pt}
                        className="flex items-center gap-4 border-b border-hair py-4 first:border-t"
                      >
                        <PeakMark className="h-3.5 w-auto shrink-0 text-rose" strokeWidth={12} />
                        <span className="font-body text-base text-bone">{pt}</span>
                      </Reveal>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            {/* In-article CTA */}
            <Reveal className="mt-16 border border-hair bg-carbon p-8 md:p-10">
              <div className="flex items-center gap-3">
                <PeakMark className="h-5 w-auto text-rose" strokeWidth={10} />
                <span className="eyebrow text-fog">Talk it through</span>
              </div>
              <p className="mt-5 font-display text-2xl leading-snug text-bone md:text-3xl">
                Questions about buying or investing? Our team will answer them plainly.
              </p>
              <Link
                href="/contact"
                className="group mt-7 inline-flex items-center gap-3 rounded-full bg-rose px-7 py-4 font-body text-ink transition-colors hover:bg-rose-soft"
              >
                Start a conversation
                <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
              </Link>
            </Reveal>
          </article>

          {/* Sidebar — related projects */}
          <aside className="lg:col-span-3 lg:col-start-10">
            <div className="lg:sticky lg:top-28">
              <p className="eyebrow text-fog">Relevant developments</p>
              <div className="mt-5 space-y-5">
                {projects.map(
                  (p) =>
                    p && (
                      <Link
                        key={p.slug}
                        href={`/projects/${p.slug}`}
                        className="group block border border-hair bg-carbon p-5 transition-colors hover:border-rose/40"
                      >
                        <span className="font-body text-xs uppercase tracking-[0.2em] text-fog">
                          {p.type} · {p.status}
                        </span>
                        <span className="mt-2 block font-display text-xl text-bone transition-colors group-hover:text-rose">
                          {p.name}
                        </span>
                        <span className="mt-1 block font-body text-xs text-mist">{p.location}</span>
                      </Link>
                    )
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Related reading */}
      <section className="relative border-t border-hair bg-carbon py-20 md:py-24">
        <div className="container-edge">
          <div className="flex items-center gap-4">
            <span className="line-hair w-10" />
            <span className="eyebrow text-rose">Keep reading</span>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-2">
            {related.map(
              (r) =>
                r && (
                  <Reveal key={r.slug}>
                    <Link href={`/insights/${r.slug}`} className="group block">
                      <span className="eyebrow text-fog">{r.category}</span>
                      <span className="mt-3 block font-display text-2xl leading-tight text-bone transition-colors group-hover:text-rose md:text-3xl">
                        {r.displayTitle}
                      </span>
                      <span className="mt-3 block max-w-md font-body text-sm leading-relaxed text-mist">
                        {r.excerpt}
                      </span>
                    </Link>
                  </Reveal>
                )
            )}
          </div>
        </div>
      </section>
    </>
  );
}
