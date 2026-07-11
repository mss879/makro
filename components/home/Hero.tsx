"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap, useGSAP } from "@/lib/gsap";
import Magnetic from "@/components/anim/Magnetic";

// White logo tab — a trapezoid with straight diagonal shoulders that tapers
// from the frame's top edge down to a flat base, per the reference design.
// Fixed geometry; the SVG scales with its container.
const TAB = (() => {
  const w = 340; // width along the top edge
  const h = 78; // depth the tab dips into the frame
  const bw = 232; // width of the flat base
  const r = 14; // softening radius at the two base corners
  const dx = (w - bw) / 2;
  const len = Math.hypot(dx, h);
  const ux = (r * dx) / len;
  const uy = (r * h) / len;
  const d = [
    `M 0 0`,
    `L ${(dx - ux).toFixed(1)} ${(h - uy).toFixed(1)}`,
    `Q ${dx} ${h} ${dx + r} ${h}`,
    `L ${w - dx - r} ${h}`,
    `Q ${w - dx} ${h} ${(w - dx + ux).toFixed(1)} ${(h - uy).toFixed(1)}`,
    `L ${w} 0`,
    `Z`,
  ].join(" ");
  return { w, h, d };
})();

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

      // Ken Burns: image settles in, then drifts continuously
      const img = el.querySelector("[data-hero-img]");
      if (img) {
        gsap.fromTo(img, { scale: 1.35 }, { scale: 1.08, duration: 2.4, ease: "power3.out" });
        gsap.to(img, {
          scale: 1.16,
          duration: 14,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: 2.4,
        });
        // Parallax on scroll
        gsap.to(img, {
          yPercent: 16,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true },
        });
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
    <section ref={root} className="relative sm:px-[10px] sm:pt-[10px]">
      {/* White logo island — straight diagonal shoulders, set into the frame's
          top edge. Phones skip it: the solid white navbar carries the brand. */}
      <Link
        href="/"
        aria-label="Makro Developers — home"
        className="group absolute left-1/2 top-[10px] z-20 hidden -translate-x-1/2 sm:block sm:h-[62px] sm:w-[270px] md:h-[72px] md:w-[300px] 2xl:h-[78px] 2xl:w-[340px]"
      >
        <svg
          viewBox={`0 0 ${TAB.w} ${TAB.h}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full drop-shadow-[0_14px_30px_rgba(5,2,3,0.35)]"
          aria-hidden="true"
        >
          <path d={TAB.d} fill="#ffffff" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center pb-2.5">
          <Image
            src="/logo-black.png"
            alt="Makro Developers"
            width={900}
            height={244}
            priority
            className="h-7 w-auto transition-opacity duration-500 group-hover:opacity-80 md:h-8"
          />
        </span>
      </Link>

      {/* Full-bleed on phones; framed with rounded corners from sm up */}
      <div className="relative h-[100svh] min-h-[640px] overflow-hidden sm:h-[calc(100svh-10px)] sm:rounded-[1.6rem]">
        {/* Hero video */}
        <div className="absolute inset-0">
          <video
            data-hero-img
            src="/hero.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="img-warm absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-ink/50" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/60 via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div data-hero-content className="relative flex h-full flex-col justify-end">
          {/* Headline block */}
          <div className="container-edge pb-12 md:pb-16">
            <h1 className="font-display display-fluid text-bone">
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

            <div className="mt-7 flex flex-col items-start justify-between gap-7 lg:flex-row lg:items-end">
              <p data-h-fade className="max-w-sm text-balance font-body text-base leading-relaxed text-bone/85 sm:text-lg md:max-w-md lg:max-w-xl">
                Makro Developers delivers premium residential and commercial
                developments across Sri Lanka. Addresses you&rsquo;re proud to
                call your own.
              </p>

              <div data-h-fade className="flex flex-wrap items-center gap-3">
                <Magnetic strength={0.4}>
                  <Link
                    href="/projects"
                    className="group inline-flex items-center gap-3 rounded-full bg-rose px-7 py-4 font-body text-ink transition-colors hover:bg-rose-soft"
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
                    className="inline-flex items-center gap-3 rounded-full border border-bone/40 px-7 py-4 font-body text-bone transition-colors hover:border-rose hover:text-rose"
                  >
                    Book a Consultation
                  </Link>
                </Magnetic>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex">
          <span className="eyebrow text-bone/50">Scroll</span>
          <span className="relative h-10 w-px overflow-hidden bg-bone/20">
            <span className="absolute left-0 top-0 h-4 w-full animate-[scrollcue_1.8s_ease-in-out_infinite] bg-rose" />
          </span>
        </div>
      </div>

      <style>{`
        @keyframes scrollcue {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(250%); }
        }
      `}</style>
    </section>
  );
}
