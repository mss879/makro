import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Project } from "@/lib/projects";
import { getProjects, getProjectBySlug, getProjectSlugs } from "@/lib/projects-data";
import { pageMetadata, breadcrumbSchema, projectSchema } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import ProjectHero from "@/components/projects/ProjectHero";
import CatalogueDownload from "@/components/projects/CatalogueDownload";
import ProjectGallery from "@/components/projects/ProjectGallery";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";
import { PeakMark } from "@/components/brand/PeakMark";

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

export async function generateStaticParams() {
  return (await getProjectSlugs()).map((slug) => ({ slug }));
}

/** Keyword-bearing title suffix by development type. */
function seoTitle(project: Project): string {
  const kind =
    project.type === "Residential"
      ? "Luxury Residences"
      : project.type === "Commercial"
        ? "Grade-A Commercial Space"
        : "Mixed-Use Development";
  return `${project.name} — ${kind} in ${project.city}`;
}

/** Meta descriptions must stay ≤160 characters — admin-authored summaries can
    run long, so keep whole sentences while they fit and fall back to a clean
    word-boundary cut when even the first sentence is over. */
function metaDescription(summary: string): string {
  if (summary.length <= 160) return summary;
  const sentences = summary.slice(0, 160).match(/^[\s\S]*[.!?](?=\s)/);
  if (sentences) return sentences[0].trim();
  return `${summary.slice(0, 157).replace(/\s+\S*$/, "")}…`;
}

/** Each project funnels readers to the most relevant guide. */
const RELATED_INSIGHT: Record<Project["type"], { href: string; label: string }> = {
  Residential: {
    href: "/insights/buying-an-apartment-in-colombo-guide",
    label: "Guide: buying an apartment in Colombo",
  },
  Commercial: {
    href: "/insights/grade-a-office-space-colombo",
    label: "Guide: what Grade-A office space means",
  },
  "Mixed-Use": {
    href: "/insights/sri-lanka-real-estate-investment-guide",
    label: "Guide: investing in Sri Lankan real estate",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return { title: "Project" };
  return pageMetadata({
    title: seoTitle(project),
    description: metaDescription(project.summary),
    path: `/projects/${project.slug}`,
    // `|| undefined`, not the bare value: cover is "" when unset, and `??`
    // does not catch an empty string — pageMetadata would hand "" to ogImage
    // and get the shared placeholder back. undefined lets it fall through to
    // the brand texture, which is abstract and cannot misrepresent a project.
    imageId: project.cover || undefined,
    keywords: [
      project.name,
      `${project.type.toLowerCase()} development ${project.location.split(",")[0].trim()}`,
      "Makro Developers project",
      "property development Sri Lanka",
    ],
  });
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const projects = await getProjects();
  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();

  const idx = projects.findIndex((p) => p.slug === slug);
  const next = projects.length > 1 ? projects[(idx + 1) % projects.length] : null;
  const relatedInsight = RELATED_INSIGHT[project.type];

  return (
    <>
      <JsonLd
        data={[
          projectSchema(project),
          breadcrumbSchema([
            { name: "Projects", path: "/projects" },
            { name: project.name, path: `/projects/${project.slug}` },
          ]),
        ]}
      />
      <ProjectHero project={project} />

      {/* Overview + specs */}
      <section className="section-light relative section-y section-y-open-t md:py-32">
        <div className="container-edge grid grid-cols-1 gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-4">
              <span className="line-hair w-10" />
              <span className="eyebrow text-rose-deep">Overview</span>
            </div>
            <TextReveal
              as="h2"
              text={project.headline}
              className="mt-6 font-display display-md text-ink"
            />
            <div className="mt-8 space-y-6">
              {project.description.map((para, i) => (
                <Reveal key={i} delay={i * 0.08}>
                  <p className="max-w-2xl font-body text-lg leading-relaxed text-mist">
                    {para}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Specs */}
          <div className="lg:col-span-4 lg:col-start-9">
            <Reveal className="border border-hair bg-shell p-8">
              <div className="flex items-center gap-3">
                <PeakMark className="h-5 w-auto text-rose-deep" strokeWidth={10} />
                <span className="eyebrow text-fog">At a glance</span>
              </div>
              <dl className="mt-6 divide-y divide-hair">
                {project.specs.map((s) => (
                  <div key={s.label} className="flex items-center justify-between py-4">
                    <dt className="font-body text-sm text-mist">{s.label}</dt>
                    <dd className="font-display text-xl text-ink">{s.value}</dd>
                  </div>
                ))}
              </dl>
              {project.specsNote && (
                <p className="mt-4 font-body text-xs leading-relaxed text-fog">
                  {project.specsNote}
                </p>
              )}
              <Link
                href="/contact"
                className="group mt-8 flex w-full items-center justify-center gap-3 bg-ink px-6 py-4 font-body text-bone transition-colors hover:bg-rose-deep hover:text-ink"
              >
                Enquire about this project
                <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
              </Link>
              {/* Only rendered when a catalogue has been uploaded — an empty
                  gate is worse than no button. */}
              {project.catalogueUrl && (
                <div className="mt-3">
                  <CatalogueDownload slug={project.slug} projectName={project.name} />
                </div>
              )}

              <div className="mt-6 space-y-2 border-t border-hair pt-5">
                <Link
                  href="/projects"
                  className="block font-body text-sm text-mist transition-colors hover:text-rose-deep"
                >
                  ← All developments
                </Link>
                <Link
                  href={relatedInsight.href}
                  className="block font-body text-sm text-mist transition-colors hover:text-rose-deep"
                >
                  {relatedInsight.label} →
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Gallery — a project created in the admin panel can be published
          before any image is uploaded, and removing the last image sets cover
          back to null. Both leave gallery empty, so the whole section is
          conditional: rendering it would pass undefined down to next/image. */}
      {project.gallery.length > 0 && (
      <section className="section-light relative bg-shell section-y md:py-24">
        <div className="container-edge">
          <div className="flex items-center gap-4">
            <span className="line-hair w-10" />
            <span className="eyebrow text-rose-deep">Gallery</span>
          </div>
          {/* Every uploaded image, at its own aspect — see ProjectGallery for
              why this is no longer three fixed frames. The `mono` treatment
              that used to sit on the third frame is gone with them: B&W is a
              black-section device in this brand, and this band is light. */}
          <ProjectGallery images={project.gallery} name={project.name} />
        </div>
      </section>
      )}

      {/* Features */}
      <section className="section-light relative section-y md:py-32">
        <div className="container-edge grid grid-cols-1 gap-14 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-4">
              <span className="line-hair w-10" />
              <span className="eyebrow text-rose-deep">Features</span>
            </div>
            <TextReveal
              as="h2"
              text="Considered in every detail."
              className="mt-6 font-display display-md text-ink"
            />
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <div className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
              {project.features.map((f, i) => (
                <Reveal
                  key={f}
                  delay={i * 0.05}
                  className="flex items-center gap-4 border-b border-hair py-5"
                >
                  <PeakMark className="h-4 w-auto shrink-0 text-rose-deep" strokeWidth={11} />
                  <span className="font-body text-base text-ink">{f}</span>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Next project — only when there is another project to link to */}
      {next && (
        <section className="section-light relative overflow-hidden border-t border-hair bg-shell">
          <Link href={`/projects/${next.slug}`} className="group block">
            <div className="container-edge flex flex-col items-start justify-between gap-6 py-12 md:flex-row md:py-16 md:items-center">
              <div>
                <span className="eyebrow text-fog">Next project</span>
                <h3 className="mt-3 font-display text-4xl text-ink transition-colors group-hover:text-rose-deep md:text-6xl">
                  {next.name}
                </h3>
                <p className="mt-3 font-body text-sm text-mist">
                  {next.type} · {next.location}
                </p>
              </div>
              <span className="flex h-16 w-16 items-center justify-center border border-hair-strong text-2xl text-ink transition-all duration-500 group-hover:border-rose-deep group-hover:bg-rose-deep group-hover:text-bone">
                →
              </span>
            </div>
          </Link>
        </section>
      )}
    </>
  );
}
