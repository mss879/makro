"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, useGSAP } from "@/lib/gsap";
import TextReveal from "@/components/anim/TextReveal";
import type { Project } from "@/lib/projects";

export default function ProjectHero({ project }: { project: Project }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
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
      });

      // Reduced motion — the cover at its finished scale, no scrub.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        const img = ref.current?.querySelector("[data-img]");
        if (img) gsap.set(img, { scale: 1 });
      });

      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    /* 100svh, not 90vh (client, Aug 2026: "there's a gap — make the image fit
       the screen"). At 90vh the cover stopped ~90px above the fold on a laptop
       and the next section's ground showed as a band under it, so the hero read
       as a picture that had not quite loaded rather than a full-bleed plate.
       svh rather than vh so mobile browsers measure against the SMALL viewport
       — with dvh the hero resizes as the URL bar retracts, which restarts the
       scrub; with vh it sits taller than the visible area and the headline is
       cropped behind the browser chrome. Matches ProjectsPageHero, which was
       already 100svh and already fit. */
    <section ref={ref} className="relative flex min-h-[100svh] items-end overflow-hidden pb-16 pt-40">
      {/* No art yet means NO image, not a stand-in. This used to fall through
          to a shared placeholder, which is fine until a second project exists
          — then every imageless development wears the first one's building as
          if it were its own, including in social previews. An empty frame is
          honest; a borrowed one is not.

          The gradient stays either way: it is what the headline is legible
          against, and dropping it on the empty path would leave white type on
          a flat ground. */}
      <div className="absolute inset-0">
        {project.heroImage && (
          <Image
            data-img
            src={project.heroImage}
            alt={project.name}
            fill
            priority
            /* 120vw, not 100vw. The cover is set to scale 1.2 and scrubs back
               to 1 as you scroll, so at the moment it is first seen — the LCP
               frame, at the top of the page — it is painted 20% wider than the
               viewport. `sizes` is how the browser chooses from srcset, and it
               cannot see the transform: at 100vw a phone was picking the
               1200px candidate for a slot being displayed at ~1400 device px
               and upscaling the difference. */
            sizes="120vw"
            className="img-warm object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-ink/30" />
      </div>

      <div className="container-edge relative w-full">
        <div className="flex flex-wrap items-center gap-3">
          <span className="border border-hair-strong bg-ink/40 px-4 py-1.5 font-body text-xs text-bone backdrop-blur-md">
            {project.type}
          </span>
          <span className="flex items-center gap-2 border border-hair-strong bg-ink/40 px-4 py-1.5 font-body text-xs text-bone backdrop-blur-md">
            <span className="h-1.5 w-1.5 bg-rose" />
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
