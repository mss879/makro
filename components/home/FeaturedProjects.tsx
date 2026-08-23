"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap, useGSAP } from "@/lib/gsap";
import type { SelectedWorkCard, SelectedWorkSettings } from "@/lib/selected-work-data";
import { PeakMark } from "@/components/brand/PeakMark";

/**
 * Selected Work — deliberately BLACK-themed, with the pinned sideways
 * scroll the client asked to keep. Every string and panel now comes from
 * the admin panel (selected_work_settings + selected_work_cards); the
 * track is intro panel → cards in admin order → end cap.
 */

/** Shared by every panel so the track keeps one rhythm regardless of card kind. */
const PANEL_CLASS = "group relative w-[80vw] shrink-0 sm:w-[58vw] lg:w-[30vw]";

export default function FeaturedProjects({
  settings,
  cards,
}: {
  settings: SelectedWorkSettings;
  cards: SelectedWorkCard[];
}) {
  const section = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // All breakpoints: pin the section and translate the track
      // horizontally as the page scrolls — phones included.
      const t = track.current;
      const sec = section.current;
      if (!t || !sec) return;

      gsap.to(t, {
        x: () => -(t.scrollWidth - window.innerWidth + 40),
        ease: "none",
        scrollTrigger: {
          trigger: sec,
          start: "top top",
          end: () => `+=${t.scrollWidth - window.innerWidth + 40}`,
          pin: true,
          // Pinning inserts a spacer and changes document height, so every
          // trigger BELOW this one recomputes against a stale page unless the
          // pins refresh first. Highest priority because this is the topmost
          // pin on the home page; ApproachPreview (further down) takes 1, and
          // everything unpinned defaults to 0 and refreshes last. Without
          // this, reveals near the footer intermittently never fire and the
          // content stays permanently invisible.
          refreshPriority: 2,
          scrub: 1,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });

      // Deliberately NO image-load refresh here. It guarded against a layout
      // shift that cannot happen on this rail: every panel has an explicit
      // viewport-derived width (PANEL_CLASS and the intro/end-cap widths) and
      // every image box an explicit aspect-[4/5], so t.scrollWidth is a pure
      // function of window.innerWidth and image decoding cannot move it. The
      // three refreshes it used to fire (500ms, 1500ms, and window load) each
      // re-measured every trigger on the page and ran ~26 onRefresh handlers
      // that force synchronous layout — for a measurement that never changed.
    },
    { scope: section }
  );

  // No early return on an empty rail: the admin left the section switched on,
  // so the intro copy and the end cap still stand. Emptiness is a content
  // state, not a reason to silently drop a section the client is looking for.

  return (
    <section
      ref={section}
      className="relative h-[100svh] overflow-hidden bg-ink lg:h-screen"
    >
      <div className="flex h-full items-center px-6 lg:px-0">
        <div ref={track} className="flex w-max items-center gap-6 md:gap-8">
          {/* Intro panel */}
          <div className="flex w-[80vw] shrink-0 flex-col justify-center sm:w-[58vw] lg:w-[34vw] lg:pl-[6.5vw] lg:pr-6">
            <div className="flex items-center gap-4">
              <span className="font-body text-xs text-rose">{settings.indexLabel}</span>
              <span className="line-hair w-10" />
              <span className="eyebrow text-rose">{settings.eyebrow}</span>
            </div>
            {/* Three columns rather than one: the highlight sits mid-sentence,
                and storing the heading as HTML would hand an injection surface
                to an admin-edited field. */}
            <h2 className="mt-6 font-display display-md text-bone">
              {settings.headingBefore}
              <span className="metal-rose">{settings.headingHighlight}</span>
              {settings.headingAfter}
            </h2>
            <p className="mt-6 max-w-sm font-body text-lg leading-relaxed text-mist">
              {settings.body}
            </p>
            <Link
              href={settings.ctaHref}
              className="group mt-8 inline-flex items-center gap-3 font-body text-bone transition-colors hover:text-rose"
            >
              <PeakMark className="h-4 w-auto text-rose" strokeWidth={11} />
              {settings.ctaLabel}
              <span className="transition-transform duration-500 group-hover:translate-x-1">
                →
              </span>
            </Link>
            <p className="mt-10 flex items-center gap-3 font-body text-xs text-fog">
              <span className="inline-block h-px w-6 bg-fog" /> {settings.scrollHint}
            </p>
          </div>

          {/* Cards, in admin order. A 'cover' panel carries the status pill,
              index numeral, kicker, title and hover-reveal caption; a 'gallery'
              panel is quieter — imagery with a single bottom caption. */}
          {cards.map((card) => {
            const isCover = card.kind === "cover";

            const panel = (
              <div className="relative aspect-[4/5] overflow-hidden bg-ink-700">
                <Image
                  // Already resolved by lib/selected-work-data — a bare Unsplash
                  // id, a /brand path or a Storage URL all arrive usable here.
                  src={card.image}
                  alt={card.alt}
                  fill
                  sizes="(max-width: 1024px) 80vw, 30vw"
                  className="img-warm object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                />
                {isCover ? (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent" />
                    <div className="absolute left-5 top-5 flex items-center gap-2 border border-hair-strong bg-ink/50 px-3 py-1.5 backdrop-blur-md">
                      <span className="h-1.5 w-1.5 bg-rose" />
                      <span className="font-body text-xs text-bone">
                        {card.statusBadge}
                      </span>
                    </div>
                    <span className="absolute right-5 top-5 font-body text-xs text-bone/70">
                      {card.indexLabel}
                    </span>

                    <div className="absolute inset-x-0 bottom-0 p-6">
                      <p className="font-body text-xs uppercase tracking-[0.25em] text-rose">
                        {card.kicker}
                      </p>
                      <h3 className="mt-2 font-display text-3xl text-bone">
                        {card.title}
                      </h3>
                      <p className="mt-2 max-w-xs font-body text-sm leading-relaxed text-mist opacity-0 transition-all duration-500 group-hover:opacity-100">
                        {card.caption}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
                    <p className="absolute inset-x-0 bottom-0 p-6 font-body text-sm text-bone/85">
                      {card.caption}
                    </p>
                  </>
                )}
              </div>
            );

            // No href and no project reference is a legitimate editorial choice
            // — a purely decorative panel. A <Link> with an empty destination
            // would be a keyboard-focusable dead end, so drop the anchor.
            return card.href ? (
              <Link key={card.id} href={card.href} className={PANEL_CLASS}>
                {panel}
              </Link>
            ) : (
              <div key={card.id} className={PANEL_CLASS}>
                {panel}
              </div>
            );
          })}

          {/* End cap */}
          <div className="flex w-[70vw] shrink-0 items-center sm:w-[40vw] lg:w-[22vw] lg:pr-[6.5vw]">
            <Link
              href={settings.endcapHref}
              className="flex flex-col gap-4 font-body text-mist transition-colors hover:text-rose"
            >
              <PeakMark className="h-10 w-auto text-rose" strokeWidth={8} />
              <span className="font-display text-2xl text-bone">
                {settings.endcapHeading}
              </span>
              <span>{settings.endcapLinkLabel}</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
