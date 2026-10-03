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
      // with the glass. The entrance above still plays at every width.

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
      {/* ONE COMPOSITION AT EVERY WIDTH: the picture on top, the copy in a
          band underneath it, both on screen at once.

          Phones got it first (client, Sep 2026: "the whole video to fit in a
          horizontal way and then the text part under it" — a version where
          the visitor had to scroll to reach the words was tried and
          rejected). Desktop followed in Oct 2026 ("on mobile we have the text
          coming at the bottom — the client wants something like that for the
          desktop as well"); until then the picture ran full-bleed behind
          everything with the copy on a glass pane in its bottom corner.

          `flex-1` on the picture and `shrink-0` on the band is what keeps the
          split self-adjusting: the band is exactly as tall as its type, the
          picture takes every pixel left over, and the ratio moves on its own
          when the headline re-wraps or the viewport changes. min-h-0 is what
          lets the picture actually give way — without it a flex item refuses
          to shrink below its content and the band is pushed off the bottom
          of the screen.

          md AND UP keeps the frame's top and bottom only: --hero-inset is
          4px of ink above the picture and below the band. Its LEFT AND RIGHT
          SIDES CAME OFF in Oct 2026 for the reason they came off the phone a
          month earlier — with the copy in a band, 4px of ink down each side
          left that band visibly narrower than the full-width section it hands
          off to (client: "remove it from the left and right side as there's
          a gap to the next section and it's noticeable"). Below md there is
          no frame at all — see the band. */}
      <div className="relative flex h-full flex-col overflow-hidden">
        {/* The picture — every pixel the band leaves. */}
        <div className="relative min-h-0 w-full flex-1 overflow-hidden">
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

              Three were tried while the copy still sat on the picture, and all
              three failed the same brief. A flat ink/22 wash plus a tall
              gradient dimmed the whole picture, which is what the client
              objected to. A wide radial pooled on the copy was invisible but
              still touched 57% of the frame. A tight radial confined it
              properly and then read as "a black tint circle" on the smooth
              sky, because a radial has a centre and therefore always has a
              shape you can see.

              Since Oct 2026 the copy is not over the picture at any width —
              it sits in the band below — so there is nothing left for any
              treatment to do. */}
        </div>

        {/* THE BAND. --color-paper, the same off-white grey every light
            section on the site stands on (client, Sep 2026 — "the off grey
            background colour he has in the desktop background, use that
            instead of the rose gold"). It replaces a bg-rose band: rose is the
            brand's 10% accent and a full-width slab of it was spending the
            whole allowance in one place.

            It also means the hero hands off to a section of the SAME ground,
            with only the frame's 4px of ink between them — which reads as the
            bottom edge of the hero frame closing.

            BELOW md: a 3px ink rule top and bottom. Client, Sep 2026, over
            three notes: "a slight black border line on the top and bottom of
            that container, not too thick", then "make the border slightly
            thicker", then "a bit more thicker". It shipped at 1px, went to 2,
            and is now at 3. SOLID ink, not a percentage: both edges were drawn
            at 26% and then 45% first, and each time the client saw the bottom
            rule but not the top one. The bottom rule sits on solid black and
            reads at any weight; the top one has to hold its own against the
            foot of the picture, and a translucent black line over a dark image
            is nothing at all.

            THE WHOLE FRAME COMES OFF BELOW md. --hero-inset puts 4px of ink
            around the hero on every side, which on a phone did two things the
            client caught in turn: the band's bottom rule landed on top of 4px
            of frame and read as a thick black band against a thin line at the
            top, and the 4px down each side left the band visibly narrower than
            the section under it ("there's a gap on the left and right side").
            Edge to edge on a phone, the band is exactly as wide as the section
            it hands off to, and the rules are the only ink at either edge.

            md AND UP the frame's bottom edge is on, so the band needs no rule
            of its own there — the frame's 4px closes it — and the rule on top
            is drawn at --hero-inset, the same weight, so the two lines match.
            Edge to edge like the phone: the band is exactly as wide as the
            section below it. */}
        <div className="relative shrink-0 border-y-[3px] border-ink bg-paper md:border-b-0 md:border-t-[length:var(--hero-inset)]">
          {/* container-edge: the copy lines up with the page gutter, with
              every section below it, and with the navbar, which sits on the
              same clamp.

              BELOW md: 20px top / 24px bottom, taken down over two client
              notes in Sep 2026 — first 48 to 32 ("reduce the padding on the
              container from the top and bottom"), then to this ("there's a lot
              of padding on the container and on the top, reduce it a bit").
              Asymmetric on purpose: the top edge meets the picture, where the
              eye wants the type close to it; the bottom edge is followed by a
              whole section, so it carries the extra 4px without looking loose.
              Every pixel given back here goes to the picture, which is flex-1.

              md AND UP: 32px both ways. A desktop band is far wider than it is
              tall, and type set that close to two long rules reads as
              squeezed; 32px keeps it airy while the band stays a small part of
              the screen. */}
          <div className="container-edge pb-6 pt-5 md:py-8">
            {/* CENTRED BELOW lg, A ROW FROM lg.

                On phones and tablets the copy is a centred block under a
                centred picture — the composition the client signed off on the
                phone (Sep 2026). w-full is what makes `text-center` mean
                anything: text centred inside a box exactly as wide as its
                widest line does not move.

                From lg the band is wide enough to set the copy as a row: the
                headline on the left, the paragraph and buttons on the right,
                their bottom edges on one line. That is what keeps a desktop
                band short — stacked, the same copy runs about 360px deep at
                1440 wide; as a row it measures 209px from 1024 up, and the
                picture keeps the difference. minmax(0,1fr) makes the headline the side that
                gives if space runs out; `auto` keeps the buttons on the one
                row they fit. */}
            <div className="flex w-full flex-col items-center gap-4 text-center sm:gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-x-12 lg:gap-y-0 lg:text-left">
              {/* A step down from display-fluid's clamp(2.35rem,8vw,4.6rem)
                  (client, Aug 2026 — "reduce the heading font a bit"). Set
                  here rather than on the utility: display-fluid is shared with
                  the project detail hero, which was not part of the ask. The
                  clamp's MIN later moved 2rem -> 1.75rem for phones.

                  Plain ink, no stroke: an outline was tried and the client did
                  not like it, and on the paper band the type needs no help.

                  FROM lg THE HEADLINE SHARES ITS ROW with the paragraph and the
                  buttons, which want ~450px. At 1024 wide that leaves about
                  430px, and the shipped headline set at the full 3.8rem is
                  427px wide — no margin at all. So the lg clamp starts lower
                  and reaches the same 3.8rem by 1280: laptops and up keep the
                  size the hero has always had, and the narrow end keeps room
                  for a line the admin writes longer.

                  One reveal-mask per line, and the lines are the admin's: the
                  break between them is chosen in the Home Hero screen, one
                  line per row, rather than left to wherever the browser
                  wraps. flex-col stops the masks' negative block margins from
                  collapsing, which once added a phantom 0.4em gap between the
                  rows. The index is a safe key — the list is only ever
                  replaced whole, never reordered in place. */}
              <h1 className="flex flex-col font-display text-[clamp(1.75rem,6.4vw,3.8rem)] leading-[1.05] text-ink lg:text-[clamp(2.75rem,4.75vw,3.8rem)]">
                {hero.headingLines.map((line, i) => (
                  <span key={i} className="reveal-mask">
                    <span data-h-word className="inline-block">
                      {line}
                    </span>
                  </span>
                ))}
              </h1>

              {/* The right-hand column from lg. `contents` below lg removes
                  this box from the layout altogether, so on phones and tablets
                  the paragraph and the buttons are children of the centred
                  column exactly as they always were — same gaps, same order —
                  and the phone layout is untouched by its existence. */}
              {(hero.body || hero.primary || hero.secondary) && (
                <div className="contents lg:flex lg:max-w-md lg:flex-col lg:items-start lg:gap-6">
                  {hero.body && (
                    <p
                      data-h-fade
                      className="max-w-md font-body text-sm leading-relaxed text-ink/80 sm:text-base md:text-lg"
                    >
                      {hero.body}
                    </p>
                  )}

                  {/* No magnetic hover on these two (client direction, Aug
                      2026): the buttons hold their position and answer with
                      colour only.

                      SIDE BY SIDE ON A PHONE (client, Aug 2026 — "smaller on
                      mobile and placed next to each other"), at px-3 py-3 on
                      0.78rem type. whitespace-nowrap keeps each button one
                      line tall: without it a squeezed row keeps its shape and
                      the WORDS wrap instead, trading two short buttons for
                      two tall ones.

                      THE ROW WRAPS AT EVERY WIDTH. The labels are the
                      client's to change in the admin, and a pinned row with a
                      longer label would push the second button off the side
                      of the screen. Wrapping costs nothing while they fit —
                      the shipped pair sits side by side at every width down
                      to 320px — and drops the second one underneath when they
                      do not.

                      Either button, or both, can be switched off by clearing
                      its label, so the row is only drawn when it has
                      something in it. */}
                  {(hero.primary || hero.secondary) && (
                    <div
                      data-h-fade
                      className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 lg:justify-start"
                    >
                      {/* Ink at every width now that the copy is on the paper
                          band everywhere — it was rose on glass over the
                          picture on desktop. The rose comes back on hover,
                          the way the contact form's submit button does it. */}
                      {hero.primary && (
                        <HeroLink
                          href={hero.primary.href}
                          className="group inline-flex items-center gap-2 whitespace-nowrap bg-ink px-3 py-3 font-body text-[0.78rem] text-bone transition-colors hover:bg-ink-600 sm:gap-3 sm:px-7 sm:py-4 sm:text-base md:hover:bg-rose-deep md:hover:text-ink"
                        >
                          {hero.primary.label}
                          {/* The arrow is the first thing to go: it is
                              decoration beside a label that already says
                              where the link leads, and on a phone's row it is
                              the ~20px that decides whether the two buttons
                              fit on one line. */}
                          <span className="hidden transition-transform duration-500 group-hover:translate-x-1 sm:inline-block">
                            →
                          </span>
                        </HeroLink>
                      )}
                      {hero.secondary && (
                        <HeroLink
                          href={hero.secondary.href}
                          className="inline-flex items-center gap-2 whitespace-nowrap border border-ink/30 px-3 py-3 font-body text-[0.78rem] text-ink transition-colors hover:border-ink sm:gap-3 sm:px-7 sm:py-4 sm:text-base"
                        >
                          {hero.secondary.label}
                        </HeroLink>
                      )}
                    </div>
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
