import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, PROJECTS, PROJECT_SLUGS } from "@/lib/projects";
import ProjectHero from "@/components/projects/ProjectHero";
import ParallaxImage from "@/components/ui/ParallaxImage";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";
import { PeakMark } from "@/components/brand/PeakMark";

export function generateStaticParams() {
  return PROJECT_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return { title: "Project" };
  return {
    title: project.name,
    description: project.summary,
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const idx = PROJECTS.findIndex((p) => p.slug === slug);
  const next = PROJECTS[(idx + 1) % PROJECTS.length];

  return (
    <>
      <ProjectHero project={project} />

      {/* Overview + specs */}
      <section className="relative bg-ink py-24 md:py-32">
        <div className="container-edge grid grid-cols-1 gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-4">
              <span className="line-hair w-10" />
              <span className="eyebrow text-rose">Overview</span>
            </div>
            <TextReveal
              as="h2"
              text={project.headline}
              className="mt-6 font-display display-md text-bone"
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
            <Reveal className="border border-hair bg-carbon p-8">
              <div className="flex items-center gap-3">
                <PeakMark className="h-5 w-auto text-rose" strokeWidth={10} />
                <span className="eyebrow text-fog">At a glance</span>
              </div>
              <dl className="mt-6 divide-y divide-hair">
                {project.specs.map((s) => (
                  <div key={s.label} className="flex items-center justify-between py-4">
                    <dt className="font-body text-sm text-mist">{s.label}</dt>
                    <dd className="font-display text-xl text-bone">{s.value}</dd>
                  </div>
                ))}
              </dl>
              <Link
                href="/contact"
                className="group mt-8 flex w-full items-center justify-center gap-3 rounded-full bg-rose px-6 py-4 font-body text-ink transition-colors hover:bg-rose-soft"
              >
                Enquire about this project
                <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="relative bg-carbon py-16 md:py-24">
        <div className="container-edge">
          <div className="flex items-center gap-4">
            <span className="line-hair w-10" />
            <span className="eyebrow text-rose">Gallery</span>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-6">
            <ParallaxImage
              id={project.gallery[0]}
              alt={`${project.name} — view 1`}
              treatment="warm"
              className="aspect-[16/10] md:col-span-4"
              sizes="66vw"
            />
            <ParallaxImage
              id={project.gallery[1] ?? project.cover}
              alt={`${project.name} — view 2`}
              treatment="warm"
              className="aspect-[3/4] md:col-span-2 md:row-span-2"
              sizes="33vw"
            />
            <ParallaxImage
              id={project.gallery[2] ?? project.cover}
              alt={`${project.name} — view 3`}
              treatment="mono"
              className="aspect-[16/10] md:col-span-4"
              sizes="66vw"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative bg-ink py-24 md:py-32">
        <div className="container-edge grid grid-cols-1 gap-14 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-4">
              <span className="line-hair w-10" />
              <span className="eyebrow text-rose">Features</span>
            </div>
            <TextReveal
              as="h2"
              text="Considered in every detail."
              className="mt-6 font-display display-md text-bone"
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
                  <PeakMark className="h-4 w-auto shrink-0 text-rose" strokeWidth={11} />
                  <span className="font-body text-base text-bone">{f}</span>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Next project */}
      <section className="relative overflow-hidden border-t border-hair bg-carbon">
        <Link href={`/projects/${next.slug}`} className="group block">
          <div className="container-edge flex flex-col items-start justify-between gap-6 py-16 md:flex-row md:items-center">
            <div>
              <span className="eyebrow text-fog">Next project</span>
              <h3 className="mt-3 font-display text-4xl text-bone transition-colors group-hover:text-rose md:text-6xl">
                {next.name}
              </h3>
              <p className="mt-2 font-body text-sm text-mist">
                {next.type} · {next.location}
              </p>
            </div>
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-hair-strong text-2xl text-bone transition-all duration-500 group-hover:border-rose group-hover:bg-rose group-hover:text-ink">
              →
            </span>
          </div>
        </Link>
      </section>
    </>
  );
}
