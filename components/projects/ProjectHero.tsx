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
       cropped behind the browser chrome.

       TWO COMPOSITIONS, SPLIT AT md (client, Oct 2026):
       - PHONES: the home hero's phone layout — the picture on top, the copy
         centred in ink on a paper band underneath, both on screen at once
         ("like the homepage hero mobile view"). A column of exactly the
         viewport: the band is as tall as its type and the picture takes the
         rest (flex-1, with min-h-0 so it can give way).
       - md AND UP: the picture full-bleed, the copy bottom-left on the hero
         fade, no container — the same as the home and /projects heroes. */
    // data-hero: the floating buttons keep off it — lib/stow-over-hero.ts.
    <section
      ref={ref}
      data-hero
      className="relative flex h-[100svh] flex-col overflow-hidden md:h-auto md:min-h-[100svh] md:flex-row md:items-end md:pt-40"
    >
      {/* No art yet means NO image, not a stand-in. This used to fall through
          to a shared placeholder, which is fine until a second project exists
          — then every imageless development wears the first one's building as
          if it were its own, including in social previews. An empty frame is
          honest; a borrowed one is not.

          NO FULL-BLEED SCRIM over the photograph (client, Aug 2026): a
          `from-ink via-ink/50 to-ink/30` gradient used to darken the whole
          plate to serve one corner of it. What there is, from md (Oct 2026),
          is the hero fade — the home hero's, in from the left and gone by half
          the width. On a phone the picture is shown as shot: the copy is not
          on it. */}
      <div className="relative min-h-0 w-full flex-1 overflow-hidden md:absolute md:inset-0">
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

        {/* THE FADE, md and up. A sibling of the image, not on it, so the
            cover's scroll-scrubbed zoom does not stretch the fade with it.
            Only with art: on the imageless ink ground there is nothing to
            fade. */}
        {project.heroImage && (
          <div aria-hidden="true" className="hero-fade pointer-events-none absolute inset-0 hidden md:block" />
        )}
      </div>

      {/* THE BAND on a phone — paper between 3px solid ink rules, as on the
          home hero — and from md the transparent layer that seats the copy
          bottom-left over the picture. `hero-open` strips the glass plate at
          every width and sets this anchor's padding; see app/globals.css. */}
      <div className="hero-plate-anchor hero-open relative w-full shrink-0 bg-paper max-md:border-y-[3px] max-md:border-ink md:bg-transparent">
        {/* Centred on a phone, left-aligned from md. The soft glow only from
            md, where the copy is on the picture: on the paper band a dark halo
            round ink type would read as a smudge. It is a halo tight to the
            glyphs, not a shape over the photograph, and still worth having
            over the fade — art comes from the admin, and nobody checks
            contrast at upload time. */}
        <div className="hero-plate hero-open flex w-full max-w-3xl flex-col items-center text-center md:block md:w-fit md:text-start md:[text-shadow:0_2px_20px_rgba(5,2,3,0.55)]">
          <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
            {/* Labels, not a panel. On the band they are ink outlines, the
                home hero's secondary button; over the picture from md they
                keep their ink fill and hairline, which is what holds them
                together over an arbitrary render. */}
            <span className="border border-ink/30 px-4 py-1.5 font-body text-xs text-ink md:border-white/20 md:bg-ink/40 md:text-bone">
              {project.type}
            </span>
            <span className="flex items-center gap-2 border border-ink/30 px-4 py-1.5 font-body text-xs text-ink md:border-white/20 md:bg-ink/40 md:text-bone">
              <span className="h-1.5 w-1.5 bg-rose" />
              {project.status}
            </span>
            <span className="font-body text-xs uppercase tracking-[0.25em] text-rose-deep md:text-rose">
              {project.location}
            </span>
          </div>

          {/* Ink on the band at the home hero's phone size (set in
              globals.css — display-fluid is a hand-written class), bone on the
              picture from md. */}
          <TextReveal
            as="h1"
            text={project.name}
            className="mt-4 font-display display-fluid text-ink sm:mt-6 md:text-bone"
            delay={0.1}
            // On a phone the name sits low in the band, inside the bottom 12%
            // that the default trigger line ignores — it would stay hidden
            // until a scroll. Any pixel on screen reveals it.
            rootMargin="0px"
          />
          <p className="mt-4 font-body text-sm text-ink/80 max-md:leading-relaxed sm:mt-6 sm:text-base md:text-xl md:text-rose-soft md:text-pretty">
            {project.tagline}
          </p>
        </div>
      </div>
    </section>
  );
}
