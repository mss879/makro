"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, useGSAP } from "@/lib/gsap";
import { unsplash } from "@/lib/images";
import TextReveal from "@/components/anim/TextReveal";
import type { Project } from "@/lib/projects";

export default function ProjectHero({ project }: { project: Project }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const img = ref.current?.querySelector("[data-img]");
      if (img) {
        gsap.fromTo(
          img,
          { scale: 1.2 },
          {
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: ref.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          }
        );
      }
    },
    { scope: ref }
  );

  return (
    <section ref={ref} className="relative flex min-h-[90vh] items-end overflow-hidden pb-16 pt-40">
      <div className="absolute inset-0">
        <Image
          data-img
          src={unsplash(project.cover, 2200)}
          alt={project.name}
          fill
          priority
          sizes="100vw"
          className="img-warm object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-ink/30" />
      </div>

      <div className="container-edge relative w-full">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-hair-strong bg-ink/40 px-4 py-1.5 font-body text-xs text-bone backdrop-blur-md">
            {project.type}
          </span>
          <span className="flex items-center gap-2 rounded-full border border-hair-strong bg-ink/40 px-4 py-1.5 font-body text-xs text-bone backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-rose" />
            {project.status}
          </span>
          <span className="font-body text-xs uppercase tracking-[0.25em] text-rose">
            {project.location}
          </span>
        </div>

        <TextReveal
          as="h1"
          text={project.name}
          className="mt-6 max-w-5xl font-display display-fluid text-bone"
          delay={0.1}
        />
        <p className="mt-6 max-w-xl font-body text-xl text-rose-soft">
          {project.tagline}
        </p>
      </div>
    </section>
  );
}
