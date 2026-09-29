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

      // ── The scroll-away drift, md AND UP ONLY ──────────────────────────
      // It lifts and fades the copy as the hero leaves, which works because
      // up here the copy is a glass pane floating over a moving picture:
      // type drifting against art reads as depth.
      //
      // Below md it would be a defect. Since Sep 2026 the phone lays the
      // copy out UNDER the video on solid ink, so the same tween slides the
      // letters over a background that cannot move with them and fades them
      // against a panel that stays opaque — which reads as the text dimming
      // for no reason rather than as parallax. It also eats the gap: at full
      // travel the 48px between the video's edge and the headline measured
      // 24px, because the whole block had been pulled up into it.
      //
      // The entrance above stays in the shared branch — the headline should
      // rise into place at every width.
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
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
        gsap.set(words, { yPercent: 0 });
        if (fades.length) gsap.set(fades, { opacity: 1, y: 0 });
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
      className="relative h-[100svh] bg-ink p-0 md:p-[var(--hero-inset)]"
    >
      {/* TWO COMPOSITIONS, ONE MARKUP (client, Sep 2026: "for mobile view on
          the hero section the client wants the whole video to fit in a
          horizontal way and then the text part under it" — desktop
          explicitly unchanged).

          md AND UP is the frame it has always been: the video full-bleed
          behind everything, inset from every viewport edge by --hero-inset,
          with the navbar overlaying it and the copy on glass in the bottom
          corner.

          BELOW md it is a column, and BOTH HALVES ARE ON SCREEN AT ONCE
          (client, Sep 2026 — the version where the visitor had to scroll to
          reach the words was tried and rejected): a tall portrait video, and
          a rose-gold band under it carrying the copy in ink.

          The band is the reason the copy needs no glass, no scrim and no
          text-shadow down here. Ink on the brand's rose measures 10.4:1 —
          better than any treatment over a photograph was ever going to give,
          and it turns the 10% accent of the brand ratio into the thing that
          closes the hero rather than a detail inside it.

          `flex-1` on the video and `shrink-0` on the band is what keeps the
          split self-adjusting: the band is exactly as tall as its type, the
          video takes every pixel left over, and the ratio moves on its own
          when the headline re-wraps or the viewport changes. min-h-0 is what
          lets the video actually give way — without it a flex item refuses
          to shrink below its content and the band is pushed off the bottom
          of the screen. */}
      <div className="relative flex h-full flex-col overflow-hidden md:block">
        {/* Hero video — the frame's whole remaining height below md, the
            frame itself above it. */}
        <div className="relative min-h-0 w-full flex-1 overflow-hidden md:absolute md:inset-0 md:h-full md:flex-none">
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
          {/* NOTHING OVER THE PICTURE. It is shown exactly as shot — no flat
              wash, no gradient, no scrim of any kind.

              Three were tried and all three failed the same brief. A flat
              ink/22 wash plus a tall gradient dimmed the whole picture, which
              is what the client objected to. A wide radial pooled on the copy
              was invisible but still touched 57% of the frame. A tight radial
              confined it properly and then read as "a black tint circle" on
              the smooth sky, because a radial has a centre and therefore
              always has a shape you can see.

              The glass pane under the copy does the whole job instead, and it
              does it better: it is the only option that removes DETAIL from
              behind the letters rather than just luminance, so it needs less
              darkening than any of them and touches nothing outside its own
              footprint. See .hero-glass. */}
        </div>

        {/* Content. Below md this is the next thing in the column, under the
            video — shrink-0 so it keeps its natural height and the video
            above absorbs the rest. At md and up it goes back to filling the
            frame and seating the copy in the bottom corner. */}
        {/* --color-paper, the same off-white grey every light section on the
              site stands on (client, Sep 2026 — "the off grey background
              colour he has in the desktop background, use that instead of the
              rose gold"). It replaces a bg-rose band: rose is the brand's 10%
              accent and a full-width slab of it was spending the whole
              allowance in one place.

              It also means the hero now hands off to a section of the SAME
              ground, with only the frame's 4px of ink between them — which
              reads as the bottom edge of the hero frame closing, exactly like
              the 4px on its other three sides.

              A 3px ink rule top and bottom. Client, Sep 2026, over three
              notes: "a slight black border line on the top and bottom of that
              container, not too thick", then "make the border slightly
              thicker", then "a bit more thicker". It shipped at 1px, went to
              2, and is now at 3.

              4px is the next stop worth taking if it is asked for again, and
              it is a better number than it looks: --hero-inset is 4px, so the
              rule would carry exactly the weight of the frame around the
              video and the hero would read as one system rather than two
              line weights. Past that it stops being a rule and becomes a band
              of colour in its own right.

              SOLID ink, not a percentage, and the reason is that the two
              edges are not the same problem. Both were drawn at 26% first
              (the site's own `--color-hair-strong` for a light surface) and
              then at 45%, and the client's report each time was the same:
              "I see border at the bottom but not on top."

              That is exactly what those weights do here. The BOTTOM rule sits
              directly above the frame's 4px of ink, so whatever it is worth
              it stacks onto solid black and reads. The TOP rule has to hold
              its own against the foot of the photograph — dark paving in this
              render — and a translucent black line over a dark image is
              nothing at all. Only a fully opaque rule is guaranteed to read
              against both a light band and whatever the video happens to be
              showing at that edge.

              THE WHOLE FRAME COMES OFF BELOW md. --hero-inset puts 4px of
              ink around the hero on every side, which is right on desktop —
              the video reads as a framed object hanging inside the page. On
              a phone it did two things the client caught in turn: the band's
              bottom rule landed on top of 4px of frame and read as a thick
              black band against a thin line at the top, and the 4px down
              each side left the band visibly narrower than the section under
              it ("there's a gap on the left and right side").

              Both are the same cause, so both go with the same fix. Edge to
              edge on a phone, the band is exactly as wide as the section it
              hands off to, and the rules are the only ink at either edge —
              the same line twice, spanning the full width. md puts the frame
              back in one go. */}
          <div className="relative shrink-0 border-y-[3px] border-ink bg-paper md:flex md:h-full md:flex-col md:justify-end md:border-y-0 md:bg-transparent">
          {/* GLASS AT md AND UP ONLY. `.hero-glass` is itself wrapped in a
              media query (Tailwind variants do not apply to hand-written
              classes, so `md:hero-glass` would silently do nothing), which
              means this same element is a bare block of copy on ink below md
              — 21:1, no pane needed, because there is no longer a photograph
              behind the letters to lift them off.

              `.hero-glass` rather than the `.hero-plate` the other four
              heroes share: this pane is deliberately lighter and tighter, and
              those numbers must not re-tune every hero on the site. Neither
              shared class may be deleted.

              container-edge rather than the plate's old 7px corner anchor:
              the pane is small enough now that hanging it off the very corner
              would read as a sticker on the frame. On the page gutter it
              lines up with every section below it, and with the navbar, which
              sits on the same clamp. */}
          {/* 20px top / 24px bottom, taken down over two client notes in Sep
              2026 — first 48 to 32 ("reduce the padding on the container from
              the top and bottom"), then to this ("there's a lot of padding on
              the container and on the top, reduce it a bit").

              ASYMMETRIC ON PURPOSE. The band's top edge meets the picture,
              where the eye reads the boundary as the end of the image and
              wants the type close to it; the bottom edge is followed by the
              frame and then a whole section, so it carries the extra 4px
              without looking loose. Every pixel given back here goes to the
              video, which is flex-1.

              It also tightens the hand-off below: 24 + the frame's 4px + the
              48 the next section carries is 76px against the site's 96px
              rhythm. Acceptable, because that boundary is a change of SURFACE
              — rose to paper — rather than two blocks of copy that need to be
              told apart. */}
            <div className="container-edge pb-6 pt-5 md:pb-16 md:pt-0">
            {/* flex-col stops the reveal-masks' negative block margins from
                collapsing, which used to add a phantom 0.4em gap between
                the two heading rows. */}
            {/* data-hero-content SITS ON THE PANE ITSELF, not on a wrapper
                around it, and with a backdrop-filter back in play that is
                load-bearing again rather than tidy.

                The scroll drift animates this element's transform and
                opacity. Either one on an ANCESTOR of a backdrop-filter makes
                that ancestor a "backdrop root": the filter can then only
                sample what is painted inside it, and the video is a sibling
                of this subtree, not a child. One level up, the glass would
                have nothing to blur — it degrades to a flat translucent box
                at rest and gets worse as the opacity falls, which is exactly
                what the client reported the last time this pane existed. An
                element's own transform and opacity are fine. */}
            <div
              data-hero-content
              /* CENTRED BELOW md (client, Sep 2026), left-aligned from md up.
                 The two halves of the hero now want opposite things: on a
                 phone the copy is a block of its own under a full-width video
                 band, and a centred block under a centred band is the
                 composition; on desktop it is a plate in the bottom-left
                 corner of a photograph, where centring would leave it
                 floating.

                 w-full below md is what makes `text-center` mean anything —
                 w-fit shrink-wraps to the longest line, and text centred
                 inside a box that is exactly as wide as its widest line does
                 not move. md:w-fit puts the shrink-wrap back for the pane,
                 which has to end where the copy ends or it is a scrim. */
              className="hero-glass flex w-full flex-col items-center gap-4 text-center sm:gap-6 md:w-fit md:items-start md:text-left md:[text-shadow:0_1px_2px_rgba(5,2,3,0.45)]"
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
              {/* Ink on the rose band below md, bone over the video above it. The
                  band is a light surface, so the whole copy inverts — this is
                  the same contract `.section-light` has everywhere else on the
                  site, just applied to one block rather than a section. */}
              {/* One reveal-mask per line, and the lines are the admin's: the
                  break between them is chosen in the Home Hero screen, one
                  line per row, rather than left to wherever the browser
                  wraps. The index is a safe key — the list is only ever
                  replaced whole, never reordered in place. */}
              <h1 className="flex flex-col font-display text-[clamp(1.75rem,6.4vw,3.8rem)] leading-[1.05] text-ink md:text-bone">
                {hero.headingLines.map((line, i) => (
                  <span key={i} className="reveal-mask">
                    <span data-h-word className="inline-block">
                      {line}
                    </span>
                  </span>
                ))}
              </h1>

              {/* Full white, not the bone/85 this was: there is no plate
                  behind it any more holding it off the video, and 85% white
                  on a moving render is the first thing to go soft. The
                  overlay buys the contrast; spending it back on a tint
                  would be pointless. */}
              {hero.body && (
                <p
                  data-h-fade
                  className="max-w-md font-body text-sm leading-relaxed text-ink/80 sm:text-base md:text-lg md:text-bone"
                >
                  {hero.body}
                </p>
              )}

              {/* No magnetic hover on these two (client direction, Aug 2026):
                  the buttons hold their position and answer with colour only.

                  SIDE BY SIDE ON A PHONE (client, Aug 2026 — "smaller on
                  mobile and placed next to each other"). They were
                  flex-wrap at px-7 py-4, which needs ~400px of row and had
                  about 280px, so they stacked — two full-width slabs that were
                  most of the plate's height on the screen where the plate was
                  already too tall.

                  whitespace-nowrap on the labels is what keeps each button one
                  line tall: without it a squeezed row keeps its shape and the
                  WORDS wrap instead, trading two short buttons for two tall
                  ones.

                  THE ROW WRAPS AT EVERY WIDTH. It used to be pinned to one row
                  from 360px up (`min-[360px]:flex-nowrap`), which was safe only
                  because both labels were fixed and measured: the pair needed
                  ~270px against 312px of row on a 360px Android. Since Sep
                  2026 the labels are the client's to change in the admin, and
                  a pinned row with a longer label pushes the second button off
                  the side of the screen. Wrapping costs nothing while they fit
                  — two buttons that fit still sit side by side, as they do
                  with the shipped labels at every width down to 320px — and
                  drops the second one underneath when they do not.

                  Either button, or both, can be switched off by clearing its
                  label, so the row is only drawn when it has something in it. */}
              {(hero.primary || hero.secondary) && (
                <div
                  data-h-fade
                  className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:justify-start"
                >
                  {/* [text-shadow:none] ON BOTH LABELS (client, Sep 2026 — "in the
                      Explore button, the text, does it have a shadow? If it does
                      remove it").

                      There is none below md and never was; what the client was
                      looking at is white-on-black through screenshot compression.
                      But the block above DOES set a text-shadow at md, and it is
                      inherited — so on desktop the two labels really did carry a
                      halo with no job to do. That shadow exists to hold the
                      headline and the paragraph off a moving picture; a label
                      sitting on a solid fill has its own ground already, and the
                      halo only softens it. Killed on the buttons at every width,
                      which answers the note and fixes the case it was pointing
                      at. */}
                  {hero.primary && (
                    <HeroLink
                      href={hero.primary.href}
                      className="group inline-flex items-center gap-2 whitespace-nowrap bg-ink px-3 py-3 font-body text-[0.78rem] text-bone [text-shadow:none] transition-colors hover:bg-ink-600 sm:gap-3 sm:px-7 sm:py-4 sm:text-base md:bg-rose md:text-ink md:hover:bg-rose-soft"
                    >
                      {hero.primary.label}
                      {/* The arrow is the first thing to go: it is decoration
                          beside a label that already says where the link leads,
                          and on this row it is the ~20px that decides whether the
                          two buttons fit on one line. */}
                      <span className="hidden transition-transform duration-500 group-hover:translate-x-1 sm:inline-block">
                        →
                      </span>
                    </HeroLink>
                  )}
                  {/* /55, between the /40 this wore against the plate's dark
                      glass and the /70 it briefly needed against the bare
                      render. This button is nothing BUT its border, so it
                      tracks whatever is behind it, and the overlay leaves that
                      ground a little lighter than the plate was. */}
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
