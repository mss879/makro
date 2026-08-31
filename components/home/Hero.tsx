"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap, useGSAP } from "@/lib/gsap";
import { PRELOADER_DONE } from "@/components/ui/Preloader";

export default function Hero() {
  const root = useRef<HTMLDivElement>(null);

  // Two jobs, one effect, because they share ownership of "why is this
  // paused": browsers pause muted autoplay in background tabs and it has to
  // resume when the visitor switches back — but a full-screen 1080p loop
  // carrying a three-function CSS filter should not keep decoding and running
  // a shader pass per frame once it is eight sections off screen, which is
  // most of this page.
  useEffect(() => {
    const v = root.current?.querySelector<HTMLVideoElement>("video[data-hero-img]");
    if (!v) return;

    // Set only by the observer below. Without it the visibilitychange handler
    // would helpfully restart decoding for a hero nobody can see, every time
    // the visitor came back to the tab.
    let parked = false;

    const play = () => {
      if (document.visibilityState === "visible" && v.paused) v.play().catch(() => {});
    };
    const resume = () => {
      if (!parked) play();
    };
    document.addEventListener("visibilitychange", resume);

    // IntersectionObserver rather than a ScrollTrigger: it reports off the
    // compositor instead of Lenis's scroll callback, so it costs nothing per
    // frame — and it still works for reduced-motion visitors, where Lenis
    // never mounts at all.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          parked = false;
          play();
        } else if (!v.paused) {
          parked = true;
          v.pause();
        }
      },
      { threshold: 0 }
    );
    io.observe(v);

    return () => {
      document.removeEventListener("visibilitychange", resume);
      io.disconnect();
    };
  }, []);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;

      // Keep hero video framed 1:1 inside the hero area without zooming/cropping behind navbar
      const img = el.querySelector("[data-hero-img]");
      if (img) {
        gsap.set(img, { scale: 1, yPercent: 0 });
      }

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Hold the headline down until the curtain has lifted. Started
        // immediately it would play out behind the preloader and the visitor
        // would only ever meet the finished state.
        const tl = gsap.timeline({ paused: true });
        tl.from(el.querySelectorAll("[data-h-word]"), {
          yPercent: 150,
          duration: 1.1,
          ease: "power4.out",
          stagger: 0.09,
        })
          .from(
            el.querySelectorAll("[data-h-fade]"),
            { opacity: 0, y: 24, duration: 0.9, ease: "power3.out", stagger: 0.12 },
            "-=0.6"
          );

        // The curtain only mounts on a full page load. On a client-side
        // navigation back to the home page there is none, so start straight
        // away rather than waiting for an event that will never fire.
        const start = () => tl.play();
        if (document.querySelector(".pl-panel")) {
          window.addEventListener(PRELOADER_DONE, start, { once: true });
        } else {
          gsap.delayedCall(0.15, start);
        }

        // Fade the whole frame content slightly as you scroll away
        gsap.to(el.querySelector("[data-hero-content]"), {
          y: -40,
          opacity: 0.6,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true },
        });
      });

      // Reduced motion — the finished frame, stated explicitly: headline
      // seated, copy and CTAs opaque, no scroll-away drift.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(el.querySelectorAll("[data-h-word]"), { yPercent: 0 });
        gsap.set(el.querySelectorAll("[data-h-fade]"), { opacity: 1, y: 0 });
        gsap.set(el.querySelector("[data-hero-content]"), { y: 0, opacity: 1 });
      });

      return () => mm.revert();
    },
    { scope: root }
  );

  // The section owns the viewport height and the inset padding; with
  // border-box the frame's h-full is already the viewport less the top and
  // bottom inset. Deliberately NOT a calc(): `calc(100svh-var(...))` is
  // invalid CSS — the minus needs surrounding whitespace — so it silently
  // fell back to height:auto and collapsed the hero to its content height.
  return (
    <section
      ref={root}
      className="relative h-[100svh] bg-ink p-[var(--hero-inset)]"
    >
      {/* Sharp-edged video frame, inset from every viewport edge by
          --hero-inset (client direction, Aug 2026). The navbar overlays this
          frame rather than sitting above it. */}
      <div className="relative h-full overflow-hidden">
        {/* Hero video */}
        <div className="absolute inset-0">
          {/* The poster is the real first paint: it decodes in a fraction of
              the time the 2.9 MB loop takes, so a slow connection sees the
              composed hero instead of a black rectangle. It is frame 0 of the
              loop, so there is no visible jump when playback starts — regenerate
              it from the video if the video is ever swapped. */}
          <video
            data-hero-img
            src="/hero-architectural-1080.mp4"
            poster="/brand/hero-architectural-poster.webp"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
            className="img-warm absolute inset-0 h-full w-full object-cover"
          />
          {/* Dark gradients for text legibility */}
          {/* Two full-bleed black gradients used to sit here — one up the
              frame, one in from the left — and both are gone with the rest of
              the hero overlays (client, Aug 2026). The glass plate and the
              copy's own text-shadow carry legibility now. */}
        </div>

        {/* Content */}
        <div className="relative flex h-full flex-col justify-end">
          {/* Headline block */}
          {/* More room than the 4px every other hero uses (client, Aug 2026).
              This is the only hero whose art is already an inset frame, so the
              plate sits inside it rather than against the viewport edge — see
              the note on .hero-plate-anchor. */}
          <div className="hero-plate-anchor [--hero-plate-inset:1.5rem] md:[--hero-plate-inset:2rem]">
            {/* flex-col stops the reveal-masks' negative block margins from
                collapsing, which used to add a phantom 0.4em gap between
                the two heading rows. */}
            {/* The hero plate, as on every other hero. The buttons are inside
                it rather than below: they are part of this block, and a plate
                that stopped at the paragraph would leave them floating under
                a panel they plainly belong to. */}
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
            <div
              data-hero-content
              className="hero-plate flex w-fit flex-col items-start gap-6 [text-shadow:0_2px_20px_rgba(5,2,3,0.55)]"
            >
              {/* A step down from display-fluid's clamp(2.35rem,8vw,4.6rem)
                  (client, Aug 2026 — "reduce the heading font a bit"). Set
                  here rather than on the utility: display-fluid is shared with
                  the project detail hero, which was not part of the ask. */}
              <h1 className="flex flex-col font-display text-[clamp(2rem,6.4vw,3.8rem)] leading-[1.05] text-bone">
                <span className="reveal-mask">
                  <span data-h-word className="inline-block">
                    The Future,
                  </span>
                </span>
                <span className="reveal-mask">
                  <span data-h-word className="inline-block">
                    Built to Endure.
                  </span>
                </span>
              </h1>

              <p data-h-fade className="max-w-md font-body text-base leading-relaxed text-bone/85 sm:text-lg">
                Thoughtfully planned residential and commercial developments,
                built for lasting value.
              </p>

              {/* No magnetic hover on these two (client direction, Aug 2026):
                  the buttons hold their position and answer with colour only. */}
              <div data-h-fade className="flex flex-wrap items-center gap-3">
                <Link
                  href="/projects"
                  className="group inline-flex items-center gap-3 bg-rose px-7 py-4 font-body text-ink transition-colors hover:bg-rose-soft"
                >
                  Explore Projects
                  <span className="transition-transform duration-500 group-hover:translate-x-1">
                    →
                  </span>
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-3 border border-bone/40 px-7 py-4 font-body text-bone transition-colors hover:border-rose hover:text-rose"
                >
                  Book a Consultation
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
