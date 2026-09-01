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
          {/* ---------- Black overlay ----------
              Client, Sep 2026: "add a black overlay on the homepage hero,
              not too strong, and then add in the text." This reverses the
              Aug 2026 pass that stripped every scrim off the heroes — but
              the plate went with it this time, so the overlay is now the
              ONLY thing between white type and the render. Nothing else is
              carrying legibility here: no panel, no outline.

              It has to do real work. Sampled off the video frame, the ground
              under the headline averages 0.75 luminance and the ground under
              the paragraph 0.50 — white on those is 1.31:1 and 1.91:1, which
              is no contrast at all.

              Two layers, because one cannot be both subtle and sufficient:

              • A flat 22% wash over the whole frame. This is the "overlay"
                in the plain sense — it settles the render into the brand's
                70%-black ratio without dimming it to mud.
              • A gradient up from the foot of the frame over the bottom 85%,
                which is where the copy sits and where the render is
                brightest anyway.

              THE GRADIENT IS TALL AND THE FLAT LAYER IS LIGHT, and that
              split is measured, not stylistic. A 60% gradient was tried
              first: on a phone it read fine, because a tall frame puts the
              copy at 70-95% of it and deep into the ramp. On DESKTOP the
              same block sits at 53-91% — barely into a 60% gradient — and
              the headline measured 3.4:1, under AA even for large type.
              Extending the ramp fixes the desktop case without touching
              the sky; raising the flat layer would have cost the sky and
              fixed less.

              Composited: ~5.2:1 average behind the headline (3.4:1 at the
              single worst pixel, against a 3.0 floor for large type) and
              ~7.3:1 behind the paragraph (4.7:1 worst, against 4.5). Both
              clear AA at their worst point, not just on average.

              Re-measure rather than eyeball if these move — screenshot
              downscaling flatters dark type on light grounds. Sample the
              video into a canvas, composite the two alphas per pixel, and
              take the relative luminance. */}
          <div className="pointer-events-none absolute inset-0 bg-ink/22" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[85%] bg-gradient-to-t from-ink/60 via-ink/35 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative flex h-full flex-col justify-end">
          {/* NO PLATE AT ANY WIDTH (client, Sep 2026 — "remove the hero text
              container for mobile and desktop"). This settled over three
              notes: the container came off, then came back on phones because
              the text could not be read, and it is off again now that the
              black overlay above is doing that job instead — which is the
              right division of labour. The panel was a local fix for a
              global problem.

              HOME HERO ONLY. PageHero, ProjectHero, ProjectsPageHero and the
              contact hero all still wear the plate off `.hero-plate` /
              `.hero-plate-anchor`, so neither class may be deleted.

              container-edge rather than the plate's old 7px corner anchor:
              with no panel around it the copy is a block ON the page, so it
              lines up with the gutter every section below it uses — and with
              the navbar, which sits on the same clamp. */}
          <div className="container-edge pb-10 md:pb-16">
            {/* flex-col stops the reveal-masks' negative block margins from
                collapsing, which used to add a phantom 0.4em gap between
                the two heading rows. */}
            {/* data-hero-content stays on this element rather than on a
                wrapper. It used to be load-bearing for a reason that has now
                gone — an ancestor's transform/opacity turned the plate into
                a backdrop root and left its backdrop-filter nothing to
                sample — and with no plate there is no filter to protect. It
                stays anyway: the scroll drift animates whatever carries this
                attribute, and this block is the thing that should drift. */}
            <div
              data-hero-content
              className="flex w-fit flex-col items-start gap-4 [text-shadow:0_2px_20px_rgba(5,2,3,0.55)] sm:gap-6"
            >
              {/* A step down from display-fluid's clamp(2.35rem,8vw,4.6rem)
                  (client, Aug 2026 — "reduce the heading font a bit"). Set
                  here rather than on the utility: display-fluid is shared with
                  the project detail hero, which was not part of the ask. */}
              {/* The clamp's MIN moves 2rem -> 1.75rem; its max and its vw
                  slope are untouched, so nothing above ~430px wide changes at
                  all. That is the whole edit: the plate was overwhelming a
                  phone, and the heading is the tallest thing in it. */}
              {/* Plain white, no stroke. An ink outline was tried here and
                  the client's read was that they did not like it, so the
                  black overlay on the video carries the contrast instead —
                  which is the better place for it: the render gets darker,
                  the letterforms stay exactly as Marcellus drew them. */}
              <h1 className="flex flex-col font-display text-[clamp(1.75rem,6.4vw,3.8rem)] leading-[1.05] text-bone">
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

              {/* Full white, not the bone/85 this was: there is no plate
                  behind it any more holding it off the video, and 85% white
                  on a moving render is the first thing to go soft. The
                  overlay buys the contrast; spending it back on a tint
                  would be pointless. */}
              <p
                data-h-fade
                className="max-w-md font-body text-sm leading-relaxed text-bone sm:text-base md:text-lg"
              >
                Thoughtfully planned residential and commercial developments,
                built for lasting value.
              </p>

              {/* No magnetic hover on these two (client direction, Aug 2026):
                  the buttons hold their position and answer with colour only.

                  SIDE BY SIDE ON A PHONE (client, Aug 2026 — "smaller on
                  mobile and placed next to each other"). They were
                  flex-wrap at px-7 py-4, which needs ~400px of row and had
                  about 280px, so they stacked — two full-width slabs that were
                  most of the plate's height on the screen where the plate was
                  already too tall.

                  whitespace-nowrap on the labels is what keeps the single row
                  honest: without it the ROW obeys and the WORDS wrap instead,
                  trading two short buttons for two tall ones and losing on
                  both counts.

                  THE BREAKPOINT IS 360px, NOT sm. Measured, not guessed: the
                  pair needs ~270px. The plate that used to bound this row is
                  gone (Sep 2026) and container-edge is wider than it was —
                  viewport - 8px frame - 40px gutter, so 312px on a 360px
                  Android and 342px on a 390px iPhone — but 320px is still the
                  case that decides this: 272px there, which two buttons clear
                  only just, and nothing at all once a label grows. So the
                  breakpoint stays where it was measured. Below 360px they wrap
                  as they always did, and at 360px and up they sit side by side.
                  A hard flex-nowrap would have looked right on the phone it was
                  checked on and pushed the second button off the screen on the
                  narrow ones.

                  If a label ever gets longer than "Book a Consultation", raise
                  that 360 rather than shrinking the type — 0.78rem on a 44px
                  target is already the floor. */}
              <div
                data-h-fade
                className="flex flex-wrap items-center gap-2 min-[360px]:flex-nowrap sm:gap-3"
              >
                <Link
                  href="/projects"
                  className="group inline-flex items-center gap-2 whitespace-nowrap bg-rose px-3 py-3 font-body text-[0.78rem] text-ink transition-colors hover:bg-rose-soft sm:gap-3 sm:px-7 sm:py-4 sm:text-base"
                >
                  Explore Projects
                  {/* The arrow is the first thing to go: it is decoration
                      beside a label that already says where the link leads,
                      and on this row it is the ~20px that decides whether the
                      two buttons fit on one line. */}
                  <span className="hidden transition-transform duration-500 group-hover:translate-x-1 sm:inline-block">
                    →
                  </span>
                </Link>
                {/* /55, between the /40 this wore against the plate's dark
                    glass and the /70 it briefly needed against the bare
                    render. This button is nothing BUT its border, so it
                    tracks whatever is behind it, and the overlay leaves that
                    ground a little lighter than the plate was. */}
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 whitespace-nowrap border border-bone/55 px-3 py-3 font-body text-[0.78rem] text-bone transition-colors hover:border-rose hover:text-rose sm:gap-3 sm:px-7 sm:py-4 sm:text-base"
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
