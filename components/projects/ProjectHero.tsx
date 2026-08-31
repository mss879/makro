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
    <section ref={ref} className="relative flex min-h-[100svh] items-end overflow-hidden pt-40">
      {/* No art yet means NO image, not a stand-in. This used to fall through
          to a shared placeholder, which is fine until a second project exists
          — then every imageless development wears the first one's building as
          if it were its own, including in social previews. An empty frame is
          honest; a borrowed one is not.

          NO SCRIM over the photograph (client, Aug 2026). There used to be a
          full-bleed `from-ink via-ink/50 to-ink/30` gradient here, carrying the
          headline's legibility across the whole plate — which meant darkening
          the entire image to serve one corner of it. Legibility now lives in
          the copy's own text-shadow (see below), so the render is shown as
          shot. On the imageless path this leaves the section on the body's
          ink ground, which white copy reads against just as well. */}
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
            /* NO img-warm. That utility is saturate(.82) contrast(1.04)
               brightness(.94) — a colour grade over the whole photograph, and
               a render the client has had produced is already graded. Client
               rule, Aug 2026: nothing added over project imagery, no overlay
               and no filter. See app/globals.css if it is ever wanted back for
               stock or editorial art, which is what it was written for. */
            className="object-cover"
          />
        )}
      </div>

      <div className="hero-plate-anchor relative w-full">
        {/* NO PLATE behind the copy either (client, Aug 2026). A black
            glassmorphism panel used to sit here — the navbar's material,
            borrowed so the two frosted surfaces read as one system down the
            page. The client's objection to it is the same one that removed
            the full-bleed gradient above: it is still an overlay on the
            render, just confined to a rectangle instead of covering the whole
            plate. Nothing darkens the art now, on this development or on any
            added later — the hero is one shared component, so there is no
            per-project setting for a future project to be missing.

            Legibility moves onto the copy itself, as a text-shadow. A halo
            tight to the glyphs does not read as a shape over the photograph
            the way a filled box does, and it is the only guard left for art
            that is uploaded from the admin: a bright daytime render would
            otherwise put white type on a pale sky with nothing behind it, and
            nobody checks contrast at upload time. */}
        <div className="hero-plate w-fit max-w-3xl [text-shadow:0_2px_20px_rgba(5,2,3,0.55)]">
          <div className="flex flex-wrap items-center gap-3">
            {/* The chips keep their ink fill and hairline border — they are
                labels rather than a panel, and at this size the fill is what
                holds them together over an arbitrary render. Still no
                backdrop-blur: it bought nothing against the plate that used
                to be here, and now that the plate is gone it would cost a
                blur pass over the photograph for the same nothing. */}
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
