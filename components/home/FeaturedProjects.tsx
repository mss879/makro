"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { PROJECTS } from "@/lib/projects";
import { BRAND } from "@/lib/images";
import { PeakMark } from "@/components/brand/PeakMark";

/**
 * Selected Work — deliberately BLACK-themed, with the pinned sideways
 * scroll the client asked to keep. The portfolio currently carries one
 * real development (Makro Heights), so the track is intro panel →
 * flagship cover card → two gallery panels → end cap, which preserves
 * the horizontal travel without inventing placeholder projects.
 */
export default function FeaturedProjects() {
  const section = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  const flagship = PROJECTS[0];

  useGSAP(
    () => {
      // All breakpoints: pin the section and translate the track
      // horizontally as the page scrolls — phones included.
      const t = track.current;
      const sec = section.current;
      if (!t || !sec) return;

      gsap.to(t, {
        x: () => -(t.scrollWidth - window.innerWidth + 40),
        ease: "none",
        scrollTrigger: {
          trigger: sec,
          start: "top top",
          end: () => `+=${t.scrollWidth - window.innerWidth + 40}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });

      // Recompute once images have loaded (layout height changes positions).
      const refresh = () => ScrollTrigger.refresh();
      const to1 = setTimeout(refresh, 500);
      const to2 = setTimeout(refresh, 1500);
      window.addEventListener("load", refresh);

      return () => {
        clearTimeout(to1);
        clearTimeout(to2);
        window.removeEventListener("load", refresh);
      };
    },
    { scope: section }
  );

  return (
    <section
      ref={section}
      className="relative h-[100svh] overflow-hidden bg-ink lg:h-screen"
    >
      <div className="flex h-full items-center px-6 lg:px-0">
        <div ref={track} className="flex w-max items-center gap-6 md:gap-8">
          {/* Intro panel */}
          <div className="flex w-[80vw] shrink-0 flex-col justify-center sm:w-[58vw] lg:w-[34vw] lg:pl-[6.5vw] lg:pr-6">
            <div className="flex items-center gap-4">
              <span className="font-body text-xs text-rose">02</span>
              <span className="line-hair w-10" />
              <span className="eyebrow text-rose">Selected Work</span>
            </div>
            <h2 className="mt-6 font-display display-md text-bone">
              A portfolio built on{" "}
              <span className="metal-rose">discipline</span>, not haste.
            </h2>
            <p className="mt-6 max-w-sm font-body text-lg leading-relaxed text-mist">
              Every Makro project, regardless of scale or location, is measured
              against the same discipline in planning, engineering and
              execution. Makro Heights, our flagship residential development,
              is the first public demonstration of that standard.
            </p>
            <Link
              href="/projects"
              className="group mt-8 inline-flex items-center gap-3 font-body text-bone transition-colors hover:text-rose"
            >
              <PeakMark className="h-4 w-auto text-rose" strokeWidth={11} />
              View all projects
              <span className="transition-transform duration-500 group-hover:translate-x-1">
                →
              </span>
            </Link>
            <p className="mt-10 flex items-center gap-3 font-body text-xs text-fog">
              <span className="inline-block h-px w-6 bg-fog" /> Scroll to explore →
            </p>
          </div>

          {/* Flagship cover card — same size as every other panel */}
          <Link
            href={`/projects/${flagship.slug}`}
            className="group relative w-[80vw] shrink-0 sm:w-[58vw] lg:w-[30vw]"
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-ink-700">
              <Image
                src={BRAND.swTower}
                alt={flagship.name}
                fill
                sizes="(max-width: 1024px) 80vw, 30vw"
                className="img-warm object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent" />
              <div className="absolute left-5 top-5 flex items-center gap-2 border border-hair-strong bg-ink/50 px-3 py-1.5 backdrop-blur-md">
                <span className="h-1.5 w-1.5 bg-rose" />
                <span className="font-body text-xs text-bone">{flagship.status}</span>
              </div>
              <span className="absolute right-5 top-5 font-body text-xs text-bone/70">
                01
              </span>

              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="font-body text-xs uppercase tracking-[0.25em] text-rose">
                  {flagship.type} · {flagship.city}
                </p>
                <h3 className="mt-2 font-display text-3xl text-bone">
                  {flagship.name}
                </h3>
                <p className="mt-2 max-w-xs font-body text-sm leading-relaxed text-mist opacity-0 transition-all duration-500 group-hover:opacity-100">
                  {flagship.tagline}
                </p>
              </div>
            </div>
          </Link>

          {/* Gallery panels — brand-generated imagery, quiet feature
              captions, identical dimensions to the cover card */}
          {[
            { src: BRAND.swRooftop, caption: flagship.features[0] },
            { src: BRAND.swBalcony, caption: flagship.features[3] },
          ].map((g) => (
            <Link
              key={g.caption}
              href={`/projects/${flagship.slug}`}
              className="group relative w-[80vw] shrink-0 sm:w-[58vw] lg:w-[30vw]"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-ink-700">
                <Image
                  src={g.src}
                  alt={`${flagship.name} — ${g.caption}`}
                  fill
                  sizes="(max-width: 1024px) 80vw, 30vw"
                  className="img-warm object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
                <p className="absolute inset-x-0 bottom-0 p-6 font-body text-sm text-bone/85">
                  {g.caption}
                </p>
              </div>
            </Link>
          ))}

          {/* End cap */}
          <div className="flex w-[70vw] shrink-0 items-center sm:w-[40vw] lg:w-[22vw] lg:pr-[6.5vw]">
            <Link
              href="/projects"
              className="flex flex-col gap-4 font-body text-mist transition-colors hover:text-rose"
            >
              <PeakMark className="h-10 w-auto text-rose" strokeWidth={8} />
              <span className="font-display text-2xl text-bone">
                See the full portfolio
              </span>
              <span>All projects →</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
