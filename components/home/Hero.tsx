"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap, useGSAP } from "@/lib/gsap";
import Magnetic from "@/components/anim/Magnetic";

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

      const tl = gsap.timeline({ delay: 0.35 });
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

      // Fade the whole frame content slightly as you scroll away
      gsap.to(el.querySelector("[data-hero-content]"), {
        y: -40,
        opacity: 0.6,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true },
      });
    },
    { scope: root }
  );

  return (
    <section ref={root} className="relative">
      {/* Full-bleed frame directly beneath the white sticky navbar */}
      <div className="relative h-[calc(100svh-var(--nav-h))] min-h-[600px] overflow-hidden">
        {/* Hero video */}
        <div className="absolute inset-0">
          <video
            data-hero-img
            src="/Building_push_cinematic_video_1080p_202607231223.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
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

              <div data-h-fade className="flex flex-wrap items-center gap-3">
                <Magnetic strength={0.4}>
                  <Link
                    href="/projects"
                    className="group inline-flex items-center gap-3 bg-rose px-7 py-4 font-body text-ink transition-colors hover:bg-rose-soft"
                  >
                    Explore Projects
                    <span className="transition-transform duration-500 group-hover:translate-x-1">
                      →
                    </span>
                  </Link>
                </Magnetic>
                <Magnetic strength={0.4}>
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-3 border border-bone/40 px-7 py-4 font-body text-bone transition-colors hover:border-rose hover:text-rose"
                  >
                    Book a Consultation
                  </Link>
                </Magnetic>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
