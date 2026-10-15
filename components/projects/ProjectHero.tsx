"use client";

import { useRef } from "react";
import ArtDirectedImage from "@/components/ui/ArtDirectedImage";
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
    // data-hero: the floating buttons keep off it — lib/stow-over-hero.ts.
    <section ref={ref} data-hero className="relative flex min-h-[100svh] items-end overflow-hidden pt-40">
      {/* No art yet means NO image, not a stand-in. This used to fall through
          to a shared placeholder, which is fine until a second project exists
          — then every imageless development wears the first one's building as
          if it were its own, including in social previews. An empty frame is
          honest; a borrowed one is not.

          NO FULL-BLEED SCRIM over the photograph (client, Aug 2026): a
          `from-ink via-ink/50 to-ink/30` gradient used to darken the whole
          plate to serve one corner of it. What there is (Oct 2026) is the
          hero fade below — from md the home hero's, in from the left and gone
          by half the width; on a phone the same ramp from the foot. On the
          imageless path the section sits on the body's ink ground, which
          white copy reads against just as well. */}
      <div className="absolute inset-0">
        {project.heroImage && (
          <ArtDirectedImage
            data-img
            desktop={project.heroImage}
            // Portrait file for phones, uploaded separately in the admin
            // (client, Sep 2026). Empty falls back to the landscape hero, so
            // every project that predates this renders exactly as it did.
            mobile={project.heroImageMobile}
            alt={project.name}
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

      {/* THE FADE (client, Oct 2026: the same fade as the home hero, "no
          containers"). From md it comes in from the left (.hero-fade); on a
          phone, where the copy runs most of the way across, it rises from the
          foot (.hero-fade-up). Siblings of the image box, not inside it, so
          the cover's scroll-scrubbed zoom does not stretch the fade with it.
          Only with art: on the imageless ink ground there is nothing to fade. */}
      {project.heroImage && (
        <>
          <div aria-hidden="true" className="hero-fade-up pointer-events-none absolute inset-0 md:hidden" />
          <div aria-hidden="true" className="hero-fade pointer-events-none absolute inset-0 hidden md:block" />
        </>
      )}

      <div className="hero-plate-anchor hero-open relative w-full">
        {/* NO CONTAINER, AT EVERY WIDTH (client, Oct 2026: "we don't want
            the containers" — the home hero's fade with the text at the
            bottom; phones included, on this hero only). `hero-open` strips the
            glass box and, from md, caps the column so the copy ends inside
            the side fade. See app/globals.css.

            The text-shadow is a halo tight to the glyphs, not a shape over the
            photograph, and it is still worth having over the fade: art comes
            from the admin, and nobody checks contrast at upload time. */}
        <div className="hero-plate hero-open w-fit max-w-3xl [text-shadow:0_2px_20px_rgba(5,2,3,0.55)]">
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
          <p className="mt-6 font-body text-xl text-rose-soft md:text-pretty">
            {project.tagline}
          </p>
        </div>
      </div>
    </section>
  );
}
