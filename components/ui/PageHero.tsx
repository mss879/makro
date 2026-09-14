"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, useGSAP } from "@/lib/gsap";
import { unsplash } from "@/lib/images";
import TextReveal from "@/components/anim/TextReveal";

type PageHeroProps = {
  imageId: string;
  /** "none" for client renders that arrive graded — see BRAND in lib/images. */
  treatment?: "warm" | "mono" | "none";
  /**
   * The art's width over its height. Only `sizes` reads it, so close is
   * enough — it decides which candidate a phone fetches, nothing else.
   */
  imageAspect?: number;
} & (
  | {
      /** The page's name — the only thing in the glass plate, large, in white. */
      heading: string;
      eyebrow?: never;
      title?: never;
      intro?: never;
    }
  | {
      heading?: never;
      /** Glass-plate layout: eyebrow, optional title and intro. */
      eyebrow: string;
      title?: string;
      intro?: string;
    }
);

/**
 * Reusable inner-page hero with a treated background image and reveal.
 * Deliberately quieter than the homepage hero (client direction — the
 * sub-page heroes should introduce the page, not shout at it).
 *
 * Both layouts sit in the black glass plate, bottom-left. With `heading`, the
 * plate holds only the page's name, set large in white (About, Approach,
 * Blog). Otherwise it holds an eyebrow with an optional title and intro
 * (Careers, Sustainability).
 */
export default function PageHero({
  heading,
  eyebrow,
  title,
  intro,
  imageId,
  treatment = "mono",
  imageAspect = 16 / 9,
}: PageHeroProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const img = ref.current?.querySelector("[data-hero-img]");
        if (img) {
          gsap.fromTo(
            img,
            { scale: 1.08 },
            {
              scale: 1,
              ease: "none",
              scrollTrigger: { trigger: ref.current, start: "top top", end: "bottom top", scrub: true },
            }
          );
        }
        if (ref.current) {
          const introEl = ref.current.querySelector("[data-hero-intro]");
          if (introEl) {
            gsap.fromTo(
              introEl,
              { opacity: 0, y: 24 },
              {
                opacity: 1,
                y: 0,
                duration: 1,
                delay: 0.5,
                ease: "power3.out",
              }
            );
          }

          // Content drifts up and softens as the hero scrolls away,
          // mirroring the homepage hero behaviour.
          gsap.to(ref.current.querySelector("[data-hero-content]"), {
            y: -24,
            opacity: 0.75,
            ease: "none",
            scrollTrigger: {
              trigger: ref.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          });
        }
      });

      // Reduced motion — the hero at rest: image unscaled, intro and
      // content seated and fully opaque. The intro is optional (the heading
      // layout has none), so it is only set when it exists.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        const img = ref.current?.querySelector("[data-hero-img]");
        if (img) gsap.set(img, { scale: 1 });
        const introEl = ref.current?.querySelector("[data-hero-intro]");
        if (introEl) gsap.set(introEl, { opacity: 1, y: 0 });
        const content = ref.current?.querySelector("[data-hero-content]");
        if (content) gsap.set(content, { y: 0, opacity: 1 });
      });

      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    <section
      ref={ref}
      /* One height for every inner-page hero (client, Aug 2026 — the blog,
         about, contact and approach heroes "need to be the same size"). They
         were not, because nothing set a height and the content decided it:
         /approach and /careers passed a title and /about, /insights and
         /contact did not, so a titled hero ran ~90px taller (/approach has
         since lost its title — client, Sep 2026). Measured at 793px wide:
         contact and insights 377, about 407, approach 467.

         min-h rather than a fixed h — a floor makes them identical while the
         copy still has somewhere to go if a title wraps to three lines on a
         phone, where a hard height would clip it. max(32rem,60vh) so the floor
         holds on a short window, in which 60vh alone would fall under the
         natural content and let them drift apart again, while tall screens get
         a hero proportional to the viewport. The section is already
         justify-center, so the extra room is shared above and below.

         The contact page used to repeat this box by hand; it has had no hero
         at all since Sep 2026. */
      /* justify-end, not justify-center: the plate is anchored to the bottom
         of the frame now. The top padding stays so the min-height still
         reserves room under the floating navbar. */
      className="relative flex min-h-[max(32rem,60vh)] flex-col justify-end overflow-hidden pt-[calc(var(--nav-h)+3rem)] md:pt-[calc(var(--nav-h)+4rem)]"
    >
      <div className="absolute inset-0">
        <Image
          data-hero-img
          src={unsplash(imageId, 2000)}
          alt=""
          fill
          priority
          /* On a phone the frame is taller than it is wide — 32rem tall — so
             object-cover paints landscape art at 32rem × its aspect, ×1.08 for
             the scroll zoom it starts at. A bare "100vw" had a phone fetch
             the 828w candidate for the About panorama and stretch it ~3.6×,
             visibly soft. From md up the frame is nearly as wide as the art
             is painted — within ~13% even for that panorama at 1512px — and
             the candidate above 100vw already covers the difference. */
          sizes={`(max-width: 767px) calc(32rem * ${(imageAspect * 1.08).toFixed(2)}), 100vw`}
          /* NO opacity-35 and NO gradient over it (client, Aug 2026 — "all
             the black overlays need to be removed from all the page hero
             sections"). Both were here and they compounded: a full-bleed
             from-ink via-ink/55 to-ink/25 scrim, over an image already knocked
             back to 35% on an ink ground — which is a 65% black wash by
             another name, and is why the About hero read as a near-black
             rectangle with a photograph somewhere inside it.

             The `treatment` filter stays. img-warm and img-mono are colour
             grades chosen per page, not black laid over the art, and the
             client's objection was to the overlays. "none" is for the heroes
             the client supplied themselves, which are already graded. */
          className={`object-cover ${
            treatment === "mono" ? "img-mono" : treatment === "warm" ? "img-warm" : ""
          }`}
        />
      </div>

      <div className="hero-plate-anchor relative w-full">
        {/* The black glass plate (client, Aug 2026). w-fit so it ends
            where the copy ends — a plate spanning the viewport would be a
            scrim by another name, which is the objection that had the first
            version of it removed from the project hero. Capped at
            max-w-3xl so a long title wraps instead of reaching for the far
            edge. See .hero-plate in globals.css for the recipe and why it
            is one class rather than four copies. */}
        {/* data-hero-content SITS ON THE PLATE ITSELF, not on a wrapper
            around it, and that is load-bearing rather than tidy.

            The scroll drift below animates this element's transform and
            opacity. Either one on an ANCESTOR of a backdrop-filter makes
            that ancestor a "backdrop root": the filter can then only sample
            what is painted inside it, and the hero image is a sibling of
            this subtree, not a child. So with the attribute one level up the
            plate had nothing to blur — it degraded to a flat translucent box
            at rest and got worse as the opacity fell, which is exactly what
            the client saw on scroll.

            An element's own transform and opacity are fine: they do not
            create a backdrop root for its own backdrop-filter. Moving the
            hook down one level keeps the drift and gives the glass the page
            back to sample. */}
        {/* The text-shadow does the work the scrim used to. A halo tight to
            the glyphs is not a shape over the photograph, and with the image
            now at full brightness the copy needs something behind it that is
            not a black box — same treatment as the project heroes. */}
        <div
          data-hero-content
          className="hero-plate w-fit max-w-3xl [text-shadow:0_2px_20px_rgba(5,2,3,0.55)]"
        >
          {heading ? (
            /* THE PAGE'S NAME, AND NOTHING ELSE (client, Sep 2026). The
               small eyebrow did not say clearly enough which page this is,
               so on About, Approach and Blog the plate now holds just the
               name, large and in white, and the intro sentence is gone.
               Same size as the plate titles on Careers and Sustainability.

               TextReveal spaces every word with a 0.26em right margin, the
               last one included; the negative margin cancels it, so the
               plate's padding reads the same on both sides of the name. */
            <TextReveal
              as="h1"
              text={heading}
              className="-mr-[0.26em] font-display text-[clamp(2rem,3.8vw,3.6rem)] leading-[1.14] text-bone"
              delay={0.15}
            />
          ) : (
            <>
              <div className="flex items-center gap-4">
                <span className="line-hair w-12" />
                <span className="eyebrow text-rose">{eyebrow}</span>
              </div>
              {title && (
                <TextReveal
                  as="h1"
                  text={title}
                  className="mt-6 max-w-4xl font-display text-[clamp(2rem,3.8vw,3.6rem)] leading-[1.14] text-bone"
                  delay={0.15}
                />
              )}
              {intro && (
                <p
                  data-hero-intro
                  className="mt-6 max-w-xl font-body text-lg leading-relaxed text-mist"
                >
                  {intro}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
