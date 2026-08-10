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

    // No observer in this browser: leave the copy exactly as the server sent
    // it — visible — rather than arming a hidden state nothing would undo.
    if (typeof IntersectionObserver === "undefined") return;

    // Arm only now. The hidden state in globals.css hangs off this class, so
    // the paragraphs are not hidden until the code that reveals them is
    // demonstrably running.
    el.classList.add("intro-armed");

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          show();
          io.disconnect();
        }
      },
      // Fires a little before the block is fully in view, so the rise finishes
      // about when the reader reaches it rather than starting then.
      { rootMargin: "0px 0px -15% 0px", threshold: 0.1 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      // Unarm on teardown so a re-mount never inherits a hidden state whose
      // observer has been disconnected.
      el.classList.remove("intro-armed");
    };
  }, []);

  if (!body.length && !eyebrow) return null;

  return (
    <section className="section-light relative py-24 md:py-32">
      <div ref={ref} className="container-edge">
        {eyebrow && (
          <div className="flex items-center gap-4">
            <span className="line-hair w-12" />
            <span className="eyebrow text-rose-deep">{eyebrow}</span>
          </div>
        )}

        <div className="mt-10 max-w-3xl space-y-6 md:mt-12">
          {body.map((paragraph, i) => (
            <p
              key={i}
              style={{ transitionDelay: `${i * 120}ms` }}
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
