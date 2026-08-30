"use client";

import { useState } from "react";
import Image from "next/image";
import Reveal from "@/components/anim/Reveal";

/**
 * The project gallery — every uploaded image, at the shape it was uploaded in.
 *
 * WHAT THIS REPLACED, AND WHY. The gallery used to be three hard-coded frames
 * with fixed aspect ratios (16/10, 3/4, 16/10) filled by `object-cover`. Two
 * things were wrong with that, and the client hit both:
 *
 *   1. Every image was CROPPED to a frame chosen before anyone knew what the
 *      photograph was. A portrait shot dropped into the 16/10 slot lost its top
 *      and bottom; the parallax layer's 1.18 zoom cropped it again on top of
 *      that. The client's brief is the opposite — show the image they uploaded.
 *   2. It rendered exactly THREE frames regardless. A project can hold five
 *      images (MAX_PROJECT_IMAGES), so images four and five were uploaded,
 *      stored, paid for in bandwidth on the admin screen — and never shown.
 *      Worse, a project with only one image had `cover` repeated into slots two
 *      and three, so the same photograph appeared three times as if it were
 *      three different views.
 *
 * HOW IT AVOIDS CROPPING WITHOUT KNOWING THE DIMENSIONS. `project_images`
 * stores a path and nothing about the raster, so the server cannot know an
 * image's aspect ratio at render time. Rather than add a column and leave every
 * ALREADY-uploaded image still cropped until someone re-uploads it, each frame
 * measures its own image on load (`naturalWidth/naturalHeight`) and adopts that
 * ratio. It therefore works for the images already in the bucket, today, with
 * no migration and no backfill.
 *
 * The cost is that a frame settles from the placeholder ratio to the true one
 * on first paint. Two things keep that from being a problem: `object-contain`
 * means the image is never cropped even during that window, only letterboxed;
 * and the gallery sits well below the fold, so the settle happens long before
 * it is scrolled into view. If that ever needs to be zero, the fix is to store
 * width/height at upload time and pass them in as the initial ratio — this
 * component would keep working unchanged, with the measurement as a fallback
 * for legacy rows.
 *
 * Masonry columns rather than a grid: with arbitrary aspect ratios a grid row
 * is only as useful as its shortest cell, and any fixed row height reintroduces
 * the cropping this component exists to remove.
 */
export default function ProjectGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  // Keyed by src, not by index, so reordering in the admin cannot hand a
  // measurement to the wrong photograph.
  const [ratios, setRatios] = useState<Record<string, number>>({});

  if (images.length === 0) return null;

  return (
    <div className="mt-10 gap-6 [column-count:1] md:[column-count:2]">
      {images.map((src, i) => (
        <Reveal
          key={src}
          delay={i * 0.06}
          // `break-inside: avoid` is what stops a column from slicing a frame
          // in half; the bottom margin is the column-gap's vertical partner,
          // which `gap` alone does not supply in a multi-column layout.
          className="mb-6 block [break-inside:avoid]"
        >
          <div
            className="relative w-full overflow-hidden bg-shell"
            // 4/3 until the real ratio is known. A neutral placeholder, not a
            // guess at the content: it only governs the frame's height for the
            // first paint, and object-contain means nothing is cut off inside
            // it either way.
            style={{ aspectRatio: ratios[src] ?? 4 / 3 }}
          >
            <Image
              src={src}
              alt={`${name} — view ${i + 1}`}
              fill
              // contain, not cover. Once the frame has adopted the image's own
              // ratio the two are identical; before that, contain is what makes
              // the difference between "letterboxed for a moment" and "cropped".
              /* No img-warm: the client's rule is that project imagery is
                 shown as supplied, which rules out a colour grade as much as a
                 crop. See ProjectHero. */
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 50vw"
              onLoad={(e) => {
                const img = e.currentTarget;
                if (!img.naturalWidth || !img.naturalHeight) return;
                const ratio = img.naturalWidth / img.naturalHeight;
                setRatios((prev) =>
                  prev[src] === ratio ? prev : { ...prev, [src]: ratio }
                );
              }}
            />
          </div>
        </Reveal>
      ))}
    </div>
  );
}
