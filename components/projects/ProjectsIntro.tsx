"use client";

import { useEffect, useRef } from "react";

/**
 * The short passage between the hero and the carousel, revealed line by line as
 * it scrolls into view (Projects → Intro in the admin).
 *
 * Built on IntersectionObserver rather than the shared Reveal/TextReveal
 * components, deliberately. Those hide their content first and animate it in
 * from a ScrollTrigger, so a trigger that never fires costs you the copy
 * entirely — a failure this codebase has already been bitten by.
 *
 * The hidden state lives in CSS (.intro-reveal in globals.css), and it is
 * scoped to `@media (scripting: enabled)` and to visitors who have not asked
 * for reduced motion. So with JavaScript off, or with reduced motion on, the
 * paragraphs are simply already in place and the observer is decoration. The
 * effect only ever ADDS the finished class — it can never take the copy away.
 *
 * Class manipulation rather than React state on purpose: it keeps this out of
 * the render cycle entirely, and setting state from inside an effect is exactly
 * what react-hooks/set-state-in-effect forbids in this codebase.
 */
export default function ProjectsIntro({
  eyebrow,
  body,
}: {
  eyebrow: string;
  body: string[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const show = () => el.classList.add("is-revealed");

    // No observer in this browser: leave the copy visible
    if (typeof IntersectionObserver === "undefined") return;

    el.classList.add("intro-armed");

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          show();
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      el.classList.remove("intro-armed");
    };
  }, []);

  if (!body.length && !eyebrow) return null;

  return (
    /* Asymmetric padding, not py-*. The space under the hero is doing real
       work — it is what makes the intro read as a pause after a full-screen
       image — but the space BELOW it was the same 128px, and stacked against
       the carousel's own 112px top it left a 240px void between two sections
       that belong together (client, Aug 2026: "reduce the padding between
       these 2 sections"). Halved on the bottom edge only; the carousel takes
       the other half off its top. */
    <section className="section-light relative pb-12 pt-24 md:pb-16 md:pt-32">
      <div ref={ref} className="container-edge text-center">
        {eyebrow && (
          <div className="intro-reveal flex items-center justify-center gap-4">
            <span className="line-hair w-10 md:w-12" />
            <span className="eyebrow text-rose-deep">{eyebrow}</span>
            <span className="line-hair w-10 md:w-12" />
          </div>
        )}

        <div className="mx-auto mt-10 max-w-3xl space-y-6 md:mt-12">
          {body.map((paragraph, i) => (
            <p
              key={i}
              style={{ transitionDelay: `${(i + 1) * 120}ms` }}
              className="intro-reveal font-display text-xl leading-relaxed text-ink md:text-2xl"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
