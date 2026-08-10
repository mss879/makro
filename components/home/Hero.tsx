"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap, useGSAP } from "@/lib/gsap";
import { PRELOADER_DONE } from "@/components/ui/Preloader";

export default function Hero() {
  const root = useRef<HTMLDivElement>(null);

  // Browsers pause muted autoplay video in background tabs; make sure it
  // resumes when the visitor switches back.
  useEffect(() => {
    const v = root.current?.querySelector<HTMLVideoElement>("video[data-hero-img]");
    if (!v) return;
    const resume = () => {
      if (document.visibilityState === "visible" && v.paused) v.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", resume);
    return () => document.removeEventListener("visibilitychange", resume);
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
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-ink/50" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/60 via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div data-hero-content className="relative flex h-full flex-col justify-end">
          {/* Headline block */}
          <div className="container-edge pb-12 md:pb-16">
            {/* flex-col stops the reveal-masks' negative block margins from
                collapsing, which used to add a phantom 0.4em gap between
                the two heading rows. */}
            <div className="flex flex-col items-start gap-6">
              <h1 className="flex flex-col font-display display-fluid leading-[1.05] text-bone">
                <span className="reveal-mask">
                  <span data-h-word className="inline-block">
                    The future,
                  </span>
                </span>
                <span className="reveal-mask">
                  <span data-h-word className="inline-block">
                    built well.
                  </span>
                </span>
              </h1>

              <p data-h-fade className="max-w-md font-body text-base leading-relaxed text-bone/85 sm:text-lg">
                Premium residential and commercial developments across Sri
                Lanka, built on disciplined planning and uncompromising
                execution.
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
