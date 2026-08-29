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

          NO SCRIM over the photograph (client, Aug 2026). There used to be a
          full-bleed `from-ink via-ink/50 to-ink/30` gradient here, carrying the
          headline's legibility across the whole plate — which meant darkening
          the entire image to serve one corner of it. Legibility now lives in
          the glass panel the copy sits in, so the render is shown as shot.
          On the imageless path this leaves the section on the body's ink
          ground, which the panel reads against just as well. */}
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
      </div>

      <div className="container-edge relative w-full">
        {/* Black glassmorphism plate — deliberately the same recipe as the
            navbar's floating panel (components/layout/Navbar.tsx): hairline
            white border, ink at half opacity, heavy backdrop blur, and the
            same shadow geometry. Client direction, Aug 2026: the hero copy
            should sit in the navbar's material rather than on a darkened
            photograph, so the two frosted plates read as one system down the
            page. Values are copied from the navbar's RESTING state — the
            scrolled state is a touch more opaque, but that alpha shift exists
            to separate the bar from content passing under it, which a static
            panel has no need of.

            w-fit, not w-full: a plate spanning the whole viewport would be a
            scrim again by another name, and even at max-w-3xl a fixed-width
            block left a wide band of empty glass to the right of the longest
            line — the box was sized by its container rather than by its
            content. Shrink-to-fit means the plate ends where the copy ends,
            capped at max-w-3xl so a long project name wraps instead of
            reaching for the far edge. Keeping the render in the clear is the
            whole point of removing the gradient. */}
        <div className="w-fit max-w-3xl border border-white/20 bg-ink/50 p-7 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-9">
          <div className="flex flex-wrap items-center gap-3">
            {/* No backdrop-blur on the chips any more. Nesting a backdrop
                filter inside one makes the inner element sample its parent's
                already-frosted result — a second blur pass for a difference
                that is not visible against the plate behind it. A hairline
                border and a lift in the ink is enough to separate them now. */}
            <span className="border border-white/20 bg-ink/40 px-4 py-1.5 font-body text-xs text-bone">
              {project.type}
            </span>
            <span className="flex items-center gap-2 border border-white/20 bg-ink/40 px-4 py-1.5 font-body text-xs text-bone">
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
            className="mt-6 font-display display-fluid text-bone"
            delay={0.1}
          />
          <p className="mt-6 font-body text-xl text-rose-soft">
            {project.tagline}
          </p>
        </div>
      </div>
    </section>
  );
}
