"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { gsap, useGSAP } from "@/lib/gsap";
import { PRELOADER_DONE } from "@/components/ui/Preloader";
import ArtDirectedImage from "@/components/ui/ArtDirectedImage";
import type { HomeHero } from "@/lib/home-hero-data";

/**
 * The home page's opening. Every word and file in it comes from the admin
 * (Home Hero, Sep 2026) through lib/home-hero-data.ts, which falls back to the
 * hero this component used to hard-code — so the layout below is fixed, and
 * what fills it is the client's.
 */

/** The `type` hint on a <source>, so a browser skips a format it cannot play without fetching it. */
function videoType(src: string): string | undefined {
  const path = src.split(/[?#]/)[0].toLowerCase();
  if (path.endsWith(".webm")) return "video/webm";
  if (path.endsWith(".mp4") || path.endsWith(".m4v")) return "video/mp4";
  return undefined;
}

/**
 * A button's link, whichever kind the admin typed. A page on this site goes
 * through next/link, which is what the page dissolve (PageTransitions) replays
 * the click on; another site opens in a new tab so the visitor keeps their
 * place here; mail and phone links are left to the operating system.
 */
function HeroLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  const external = /^https?:\/\//i.test(href);
  return (
    <a
      href={href}
      className={className}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

export default function Hero({ hero }: { hero: HomeHero }) {
  const root = useRef<HTMLDivElement>(null);

  // The fallback runs both ways, as ArtDirectedImage's does: either video on
  // its own is a complete hero at every width.
  const desktopVideo = hero.video || hero.videoMobile;
  const mobileVideo = hero.videoMobile || hero.video;
  const hasStill = Boolean(hero.image || hero.imageMobile);
  const videoKey = desktopVideo ? `${desktopVideo}|${mobileVideo}` : "";
  // One grade for the whole picture, never per file — see HomeHero.warm.
  const grade = hero.warm ? "img-warm " : "";

  // Two jobs, one effect, because they share ownership of "why is this
  // paused": browsers pause muted autoplay in background tabs and it has to
  // resume when the visitor switches back — but a full-screen 1080p loop
  // carrying a three-function CSS filter should not keep decoding and running
  // a shader pass per frame once it is eight sections off screen, which is
  // most of this page.
  //
  // Keyed on the files: a different pair of videos is a different <video>
  // element (see its `key`), and this has to follow it. An image hero has no
  // video and nothing to do here.
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
  }, [videoKey]);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;

      // Keep hero video framed 1:1 inside the hero area without zooming/cropping behind navbar
      const img = el.querySelector("[data-hero-img]");
      if (img) {
        gsap.set(img, { scale: 1, yPercent: 0 });
      }

      const words = el.querySelectorAll("[data-h-word]");
      // The paragraph and the buttons are both optional now — the admin can
      // leave either out — and GSAP warns about every tween handed an empty
      // list, so the fades are only built when there is something to fade.
      const fades = el.querySelectorAll("[data-h-fade]");

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Hold the headline down until the curtain has lifted. Started
        // immediately it would play out behind the preloader and the visitor
        // would only ever meet the finished state.
        const tl = gsap.timeline({ paused: true });
        tl.from(words, {
          yPercent: 150,
          duration: 1.1,
          ease: "power4.out",
          stagger: 0.09,
        });
        if (fades.length) {
          tl.from(
            fades,
            { opacity: 0, y: 24, duration: 0.9, ease: "power3.out", stagger: 0.12 },
            "-=0.6"
          );
        }

        // The curtain only mounts on a full page load. On a client-side
        // navigation back to the home page there is none, so start straight
        // away rather than waiting for an event that will never fire.
        const start = () => tl.play();
        if (document.querySelector(".pl-panel")) {
          window.addEventListener(PRELOADER_DONE, start, { once: true });
        } else {
          gsap.delayedCall(0.15, start);
        }

      });

      // NO SCROLL-AWAY DRIFT, AT ANY WIDTH. There used to be one on desktop:
      // it lifted and faded the copy as the hero left, which worked while the
      // copy was a glass pane floating over a moving picture — type drifting
      // against art reads as depth. It never ran on phones, where the copy
      // sits on a solid band under the picture: there the same tween slid the
      // letters over a background that cannot move with them and faded them
      // against a panel that stays opaque, which reads as the text dimming for
      // no reason (and at full travel it pulled the block 24px up into the gap
      // above it). Desktop took the band too in Oct 2026, so the drift went
      // with the glass, and it was not brought back when the copy returned to
      // the picture later that month — nobody asked for it. The entrance above
      // still plays at every width.

      // Reduced motion — the finished frame, stated explicitly: headline
      // seated, copy and CTAs opaque.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(words, { yPercent: 0 });
        if (fades.length) gsap.set(fades, { opacity: 1, y: 0 });
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
      // The floating buttons keep off whatever carries this — lib/stow-over-hero.ts.
      data-hero
      className="relative h-[100svh] bg-ink p-0 md:py-[var(--hero-inset)]"
    >
      {/* TWO COMPOSITIONS, SPLIT AT md — and the phone one is not to be
          touched (client, Oct 2026: the new hero is for desktop and medium
          screens only; "leave the mobile view as it is").

          PHONES (below md): the picture on top, the copy in a paper band
          underneath, both on screen at once — the composition signed off in
          Sep 2026 ("the whole video to fit in a horizontal way and then the
          text part under it"; a version where the visitor had to scroll to
          reach the words was rejected). `flex-1` on the picture and
          `shrink-0` on the band keep the split self-adjusting: the band is
          exactly as tall as its type and the picture takes the rest. min-h-0
          is what lets the picture give way — without it a flex item refuses to
          shrink below its content and pushes the band off the screen.

          md AND UP (Oct 2026): the picture fills the hero and the copy sits on
          it, bottom-left, over an ink fade from the left that is gone by half
          the width — see .hero-fade. The band is lifted out of the flow over
          the picture and drops its paper and rules, so ONE copy element
          serves both compositions. md+ keeps the frame's top and bottom:
          --hero-inset is 4px of ink above and below the picture. */}
      <div className="relative flex h-full flex-col overflow-hidden">
        {/* The picture — every pixel the band leaves on a phone, the whole
            hero from md. */}
        <div className="relative min-h-0 w-full flex-1 overflow-hidden md:absolute md:inset-0">
          {/* THE STILL. With a video it is the real first paint: it decodes
              in a fraction of the time the loop takes, so a slow connection
              sees the composed hero instead of a black rectangle. It is the
              video's first frame — the admin takes it from the file on
              upload — so nothing jumps when playback starts. With no video,
              it IS the hero.

              It is painted UNDER the video rather than set as its `poster`,
              for two reasons. A poster is one URL for every screen, and the
              phone has a still of its own. And a poster is fetched raw — for
              an admin upload, a 3840px master on a phone — where this goes
              through the image optimiser at the size the screen needs. A
              <video> with no poster paints nothing until its first frame
              decodes, so the still shows through until then and the frame
              lands exactly over it (both object-cover, same box).

              Decorative under a video: the video is aria-hidden and the
              headline says what the page is. Alone, it carries the admin's
              alt text. */}
          {hasStill && (
            <ArtDirectedImage
              desktop={hero.image}
              mobile={hero.imageMobile}
              alt={desktopVideo ? "" : hero.alt}
              // The LCP element on this route, video or not.
              priority
              sizes="100vw"
              className={`${grade}object-cover`}
              {...(desktopVideo ? { "aria-hidden": "true" } : { "data-hero-img": "" })}
            />
          )}

          {/* THE VIDEO, over its still. The phone's file is chosen by `media`
              on its <source> — the one way a <video> picks a file BEFORE
              downloading one; two elements with `hidden md:block` would fetch
              both. Source order is the fallback: a browser that ignores
              `media` on video sources (Chrome and Firefox before 120) plays
              the first one it can, which is the desktop file — exactly what
              every phone got before the phone video existed.

              Keyed on the files because a <video> does not re-run source
              selection when its <source> children change: without the key a
              refreshed page would keep looping the old video. */}
          {desktopVideo && (
            <video
              key={videoKey}
              data-hero-img
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden="true"
              className={`${grade}absolute inset-0 h-full w-full object-cover`}
            >
              {mobileVideo && mobileVideo !== desktopVideo ? (
                <>
                  <source media="(min-width: 768px)" src={desktopVideo} type={videoType(desktopVideo)} />
                  <source src={mobileVideo} type={videoType(mobileVideo)} />
                </>
              ) : (
                <source src={desktopVideo} type={videoType(desktopVideo)} />
              )}
            </video>
          )}

          {/* The fade, md and up only. On a phone the copy is not on the
              picture, so the picture is shown exactly as shot. Its own layer,
              never baked into the picture. */}
          <div aria-hidden="true" className="hero-fade pointer-events-none absolute inset-0 hidden md:block" />
        </div>

        {/* THE BAND on a phone; from md, the layer that puts the copy over the
            picture.

            On a phone it is --color-paper, the same off-white grey every
            light section stands on (client, Sep 2026 — "the off grey
            background colour ... instead of the rose gold"), between 3px
            SOLID ink rules top and bottom. The rules went 1px → 2px → 3px over
            three client notes; they were translucent first, and each time the
            client saw the bottom rule but not the top one, because a
            translucent line over the foot of a dark picture is nothing at
            all. No frame on a phone: the band is edge to edge, exactly as wide
            as the section under it ("there's a gap on the left and right
            side").

            From md it covers the hero, transparent and unruled, and seats the
            copy at its foot. */}
        <div className="relative shrink-0 border-y-[3px] border-ink bg-paper md:absolute md:inset-0 md:flex md:items-end md:border-0 md:bg-transparent">
          {/* container-edge lines the copy up with the page gutter, every
              section below and the navbar.

              Phones: 20px top / 24px bottom, taken down over two client notes
              in Sep 2026 ("reduce the padding on the container from the top
              and bottom", then "reduce it a bit"). Asymmetric on purpose: the
              top edge meets the picture, where the eye wants the type close.

              md and up: off the foot of the frame by 56px, 64px from lg. */}
          <div className="container-edge w-full pb-6 pt-5 md:pb-14 md:pt-0 lg:pb-16">
            {/* CENTRED ON A PHONE, LEFT-ALIGNED FROM md.

                On a phone the copy is a centred block under the picture —
                w-full is what makes `text-center` mean anything.

                From md the column is capped (40vw on tablets, 36vw from lg,
                never past 34rem) so the copy ends inside the fade, and the
                headline's md size is set to the same proportion so its
                longest line still fits the column at 768. The soft glow is the
                one the /projects hero has always used — not an outline (the
                client turned one down in Sep 2026); it only keeps glyph edges
                clean over a bright patch of picture. */}
            <div className="flex w-full flex-col items-center gap-4 text-center sm:gap-6 md:max-w-[min(34rem,40vw)] md:items-start md:text-left md:[text-shadow:0_2px_20px_rgba(5,2,3,0.55)] lg:max-w-[min(34rem,36vw)]">
              {/* One reveal-mask per line, and the lines are the admin's: the
                  break between them is chosen in the Home Hero screen, one
                  line per row, rather than left to wherever the browser
                  wraps. flex-col stops the masks' negative block margins from
                  collapsing, which once added a phantom 0.4em gap between the
                  rows. The index is a safe key — the list is only ever
                  replaced whole, never reordered in place.

                  Phones: display-fluid's clamp a step down (client, Aug 2026
                  — "reduce the heading font a bit"), min 1.75rem, in ink on
                  the paper band. From md: bone on the picture, sized to the
                  column. */}
              <h1 className="flex flex-col font-display text-[clamp(1.75rem,6.4vw,3.8rem)] leading-[1.05] text-ink md:text-[clamp(2rem,4.2vw,3.8rem)] md:text-bone">
                {hero.headingLines.map((line, i) => (
                  <span key={i} className="reveal-mask">
                    <span data-h-word className="inline-block">
                      {line}
                    </span>
                  </span>
                ))}
              </h1>

              {hero.body && (
                <p
                  data-h-fade
                  className="max-w-md font-body text-sm leading-relaxed text-ink/80 sm:text-base md:max-w-[min(26rem,34vw)] md:text-bone/85 md:text-pretty lg:max-w-[min(26rem,28vw)] lg:text-lg"
                >
                  {hero.body}
                </p>
              )}

              {/* No magnetic hover on these two (client direction, Aug 2026):
                  the buttons hold their position and answer with colour only.

                  SIDE BY SIDE ON A PHONE (client, Aug 2026 — "smaller on
                  mobile and placed next to each other"), at px-3 py-3 on
                  0.78rem type, ink on the paper band. whitespace-nowrap keeps
                  each button one line tall: without it a squeezed row keeps
                  its shape and the WORDS wrap instead.

                  THE ROW WRAPS AT EVERY WIDTH. The labels are the client's to
                  change in the admin, and a pinned row with a longer label
                  would push the second button off the side of the screen — or,
                  from md, out past the fade.

                  From md, over the picture: rose and a light outline, the pair
                  the hero had the last time its copy sat on the picture.
                  Either button, or both, can be switched off by clearing its
                  label. */}
              {(hero.primary || hero.secondary) && (
                <div
                  data-h-fade
                  className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:justify-start"
                >
                  {hero.primary && (
                    <HeroLink
                      href={hero.primary.href}
                      className="group inline-flex items-center gap-2 whitespace-nowrap bg-ink px-3 py-3 font-body text-[0.78rem] text-bone [text-shadow:none] transition-colors hover:bg-ink-600 sm:gap-3 sm:px-7 sm:py-4 sm:text-base md:bg-rose md:text-ink md:hover:bg-rose-soft"
                    >
                      {hero.primary.label}
                      {/* The arrow is the first thing to go: it is decoration
                          beside a label that already says where the link
                          leads, and on a phone's row it is the ~20px that
                          decides whether the two buttons fit on one line. */}
                      <span className="hidden transition-transform duration-500 group-hover:translate-x-1 sm:inline-block">
                        →
                      </span>
                    </HeroLink>
                  )}
                  {hero.secondary && (
                    <HeroLink
                      href={hero.secondary.href}
                      className="inline-flex items-center gap-2 whitespace-nowrap border border-ink/30 px-3 py-3 font-body text-[0.78rem] text-ink [text-shadow:none] transition-colors hover:border-ink sm:gap-3 sm:px-7 sm:py-4 sm:text-base md:border-bone/55 md:text-bone md:hover:border-rose md:hover:text-rose"
                    >
                      {hero.secondary.label}
                    </HeroLink>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
