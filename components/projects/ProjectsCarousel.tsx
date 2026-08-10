"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { unsplash } from "@/lib/images";
import type { Project } from "@/lib/projects";

/**
 * The featured-projects rail (Projects → Carousel in the admin).
 *
 * The admin curates WHICH projects appear and in what order; every visible
 * field is read from the project itself, so there is no second copy of a
 * development's details to go stale. The four stat rows are the project's own
 * `specs` — the same {label, value} pairs the detail page renders — which is
 * why a card can show "Launch / Starting from / Villas / Available Units" for
 * one project and different labels for another without any per-card config.
 *
 * Scrolling is native overflow-x with scroll-snap rather than a transform
 * track: it keeps keyboard and trackpad behaviour for free, survives a resize
 * without recalculating, and degrades to a plain scrollable row if the arrow
 * buttons never wire up.
 */
export default function ProjectsCarousel({
  eyebrow,
  heading,
  projects,
}: {
  eyebrow: string;
  heading: string;
  projects: Project[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 1);
    // -1 for sub-pixel rounding: a track scrolled fully right can land a
    // fraction short and leave the arrow enabled with nowhere to go.
    setAtEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    sync();
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sync, projects.length]);

  const nudge = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    // One card plus its gap, so a click always lands on a snap point.
    const card = el.querySelector<HTMLElement>("[data-card]");
    const step = card ? card.offsetWidth + 24 : el.clientWidth * 0.8;
    el.scrollBy({ left: step * direction, behavior: "smooth" });
  };

  if (!projects.length) return null;

  return (
    <section className="section-light relative py-20 md:py-28">
      <div className="container-edge">
        {eyebrow && (
          <div className="flex items-center gap-4">
            <span className="line-hair w-12" />
            <span className="eyebrow text-rose-deep">{eyebrow}</span>
          </div>
        )}
        {heading && (
          <h2 className={`font-display display-md text-ink ${eyebrow ? "mt-6" : ""}`}>
            {heading}
          </h2>
        )}
      </div>

      <div className="relative mt-12 md:mt-16">
        <div
          ref={trackRef}
          onScroll={sync}
          className="no-scrollbar container-edge flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2"
        >
          {projects.map((project) => (
            <article
              key={project.slug}
              data-card
              className="w-[85vw] shrink-0 snap-start border border-hair bg-cream sm:w-[420px]"
            >
              <Link href={`/projects/${project.slug}`} className="group block">
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-shell">
                  <Image
                    src={unsplash(project.cover, 900)}
                    alt={project.name}
                    fill
                    sizes="(max-width: 640px) 85vw, 420px"
                    className="img-warm object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                </div>

                <div className="p-6 md:p-7">
                  <h3 className="font-display text-2xl leading-tight text-ink">{project.name}</h3>
                  <p className="mt-2 font-body text-sm text-mist">{project.location}</p>
                  <span className="mt-4 inline-flex items-center gap-2 font-body text-sm text-ink transition-colors group-hover:text-rose-deep">
                    View
                    <span className="transition-transform duration-500 group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </div>
              </Link>

              {/* The project's own specs, capped at four so a project with a
                  long spec list cannot make one card taller than its row. */}
              {project.specs.length > 0 && (
                <dl className="px-6 pb-6 md:px-7 md:pb-7">
                  {project.specs.slice(0, 4).map((spec) => (
                    <div
                      key={spec.label}
                      className="flex items-baseline justify-between gap-4 border-t border-hair py-3"
                    >
                      <dt className="font-body text-sm text-mist">{spec.label}</dt>
                      <dd className="font-body text-sm text-ink">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </article>
          ))}
        </div>

        {projects.length > 1 && (
          <div className="container-edge mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={() => nudge(-1)}
              disabled={atStart}
              aria-label="Previous projects"
              className="flex h-11 w-11 items-center justify-center border border-ink/20 font-body text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-ink/20"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => nudge(1)}
              disabled={atEnd}
              aria-label="More projects"
              className="flex h-11 w-11 items-center justify-center border border-ink/20 font-body text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-ink/20"
            >
              →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
