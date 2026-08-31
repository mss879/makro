"use client";

import { useCallback, useEffect, useRef } from "react";
import Image from "next/image";

/**
 * Full-screen preview for the project gallery — click a photograph, see it at
 * the size it was shot for (client, Aug 2026).
 *
 * The gallery stage is 640px tall at its biggest and has to hold portrait and
 * landscape images in the same frame, which leaves a tall photograph rendering
 * at maybe a third of the screen. This is where a buyer actually looks at the
 * balcony.
 *
 * NOTHING IS CROPPED HERE EITHER. Same rule as the stage it opens from, and
 * more obviously right at this size: object-contain, sized against BOTH axes
 * of the viewport, so a portrait image is limited by height and a landscape one
 * by width and neither is ever cut. The ground is near-black rather than the
 * page's paper because a photograph shown at full size wants nothing competing
 * with it — and because at this scale the letterboxed air has to read as a
 * darkened room, not as a light box the picture failed to fill.
 *
 * It owns no index of its own. The gallery's `index` is the single source of
 * truth, so paging in here and closing leaves the strip on the image that was
 * last looked at, rather than snapping back to whatever was showing when it
 * opened.
 *
 * position: fixed is safe despite Lenis: SmoothScroll renders a fragment, not a
 * transformed wrapper, so there is no ancestor for the fixed positioning to
 * resolve against instead of the viewport. (The chat widget is mounted outside
 * SmoothScroll for a hazard that no longer exists; do not read that as a
 * precedent this has to follow.)
 */
export default function GalleryLightbox({
  images,
  name,
  index,
  onIndex,
  onClose,
}: {
  images: string[];
  name: string;
  index: number;
  onIndex: (next: number) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const count = images.length;

  // Wrap both ways, like the stage's arrows: the gallery this opened from
  // loops, so an arrow that dies at the last image would contradict it.
  const go = useCallback(
    (next: number) => onIndex(((next % count) + count) % count),
    [count, onIndex]
  );

  // Escape closes, arrows page. Bound to the document rather than to the
  // dialog, so the keys work wherever focus has ended up inside it.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(index - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        go(index + 1);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [go, index, onClose]);

  // Scroll lock, and give the close button the focus so the dialog can be
  // dismissed from the keyboard the moment it opens.
  //
  // The lock is released on unmount and only ever by the effect that took it,
  // matching the mobile nav's handling — clearing overflow unconditionally is
  // how one component ends up releasing another's lock and letting the page
  // scroll behind a curtain that is still up.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = "";
      // Back to the photograph that was clicked, not to the top of the page.
      previous?.focus?.();
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${name} — image ${index + 1} of ${count}`}
      // Clicking the ground closes. The image and the controls stop the event,
      // so the only clicks that reach this are clicks on the empty room around
      // the photograph — which is what people expect to be a dismissal, and
      // the reason the picture is wrapped rather than left as a bare child.
      onClick={onClose}
      className="fixed inset-0 z-[900] flex flex-col bg-ink/97 backdrop-blur-sm"
    >
      {/* Top bar — counter left, close right. Its own row rather than glyphs
          floating over the corners of the picture: this surface does not lay
          anything over project imagery unless it has to, and at full size
          there is room not to. */}
      <div className="flex shrink-0 items-center justify-between px-5 py-4 sm:px-8">
        <p className="font-body text-xs uppercase tracking-[0.22em] text-bone/60">
          {count > 1 ? `${index + 1} / ${count}` : name}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          aria-label="Close preview"
          className="flex h-11 w-11 items-center justify-center border border-hair-strong text-bone transition-colors hover:border-rose hover:text-rose"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
            <path d="M1 1l14 14M15 1L1 15" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>

      {/* The picture. min-h-0 is what makes the flex child actually shrink to
          the space left over — without it the image keeps its intrinsic height
          and pushes the whole column past the viewport, which is the classic
          way a full-screen viewer ends up scrolling. */}
      <div className="relative min-h-0 flex-1">
        <Image
          key={images[index]}
          src={images[index]}
          alt={`${name} — view ${index + 1}`}
          fill
          // contain, and no `quality` prop: next.config's single-value
          // `qualities: [92]` is the global dial for the whole site, and
          // passing a number here would only be a second place to keep in step.
          className="object-contain"
          sizes="100vw"
          priority
          onClick={(event) => event.stopPropagation()}
        />
      </div>

      {/* Paging, under the image rather than over it — see the note on the top
          bar. Hidden entirely for a single-image gallery, where two arrows that
          both return to the same photograph are furniture. */}
      {count > 1 && (
        <div className="flex shrink-0 items-center justify-center gap-4 px-5 py-5 sm:py-6">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              go(index - 1);
            }}
            aria-label="Previous image"
            className="group flex h-11 w-14 items-center justify-center border border-hair-strong text-bone transition-colors hover:border-rose hover:text-rose"
          >
            <svg
              viewBox="0 0 32 12"
              className="h-3 w-7 transition-transform duration-500 group-hover:-translate-x-1"
              fill="none"
              aria-hidden="true"
            >
              <path d="M32 6H2M8 1L2 6l6 5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              go(index + 1);
            }}
            aria-label="Next image"
            className="group flex h-11 w-14 items-center justify-center border border-hair-strong text-bone transition-colors hover:border-rose hover:text-rose"
          >
            <svg
              viewBox="0 0 32 12"
              className="h-3 w-7 transition-transform duration-500 group-hover:translate-x-1"
              fill="none"
              aria-hidden="true"
            >
              <path d="M0 6h30M24 1l6 5-6 5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
