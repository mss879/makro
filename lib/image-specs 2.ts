/**
 * What to upload, per image slot — the one place the admin's guidance lives.
 *
 * Client direction, Aug 2026: the person adding imagery could not tell what
 * shape or size each slot wanted, so photographs were arriving too small for a
 * full-bleed hero and in aspect ratios that were about to be cropped. The
 * upload route already tells them what it DOES to a file; this tells them what
 * to hand it in the first place.
 *
 * EVERY NUMBER BELOW IS DERIVED, NOT PREFERRED. Each `recommended` width is the
 * largest the browser can actually be asked for at that slot — the `sizes`
 * attribute on the component that renders it, resolved against next/image's
 * largest breakpoint (3840) and capped by MAX_EDGE in the upload route. Going
 * above it cannot improve anything: the master is downscaled to 3840 on the way
 * in, and no `srcset` candidate wider than the slot is ever requested. `minimum`
 * is the point below which a retina laptop starts upscaling.
 *
 * `crops` is the honest half. Where a slot has a fixed aspect and `object-cover`,
 * anything that is not that shape LOSES the difference, and the person choosing
 * the photograph is the only one who can decide what is safe to lose. The one
 * slot that does not crop is the project gallery, which is the whole point of
 * ProjectGallery — so it says so, rather than making them guess.
 *
 * Keep this in step with the components named in each `renderedBy`. If one of
 * them changes aspect or `sizes`, the guidance here is wrong until it is
 * updated, and wrong guidance is worse than none.
 */

export type ImageSpec = {
  /** What this slot is, in the client's words rather than the code's. */
  label: string;
  /** Ideal pixel dimensions — the largest that can be served, so the ceiling. */
  recommended: string;
  /** Below this, a high-DPI screen upscales. */
  minimum: string;
  /** Shape to supply. `null` when any shape is fine. */
  aspect: string | null;
  /** Cropping behaviour and what to keep clear of the edges. */
  crops: string;
  /** Component that renders it — the source of truth for these numbers. */
  renderedBy: string;
};

export const IMAGE_SPECS = {
  /**
   * ProjectHero — min-h-[100svh], object-cover, sizes="120vw" (the cover starts
   * at scale 1.2). 120vw on a 3840-capped master means the full 3840.
   */
  projectHero: {
    label: "Project page hero",
    recommended: "3840 × 2160",
    minimum: "2560 × 1440",
    aspect: "16:9 landscape",
    crops:
      "Fills the whole screen, so it is cropped to whatever shape the visitor's window is — tall on a phone, wide on a desktop. Keep the subject central, and leave the bottom third quiet: the project name, status and location sit there over a dark gradient.",
    renderedBy: "components/projects/ProjectHero.tsx",
  },

  /** ProjectsPageHero — h-[100svh], object-cover, sizes="100vw". */
  projectsPageHero: {
    label: "Projects page hero slide",
    recommended: "3840 × 2160",
    minimum: "2560 × 1440",
    aspect: "16:9 landscape",
    crops:
      "Full screen, so it is cropped to the visitor's window shape. Keep the subject central. If the slide carries a heading, leave the bottom third quiet — the type sits there.",
    renderedBy: "components/projects/ProjectsPageHero.tsx",
  },

  /**
   * FeaturedProjects panel — aspect-[4/5], object-cover,
   * sizes="(max-width: 1024px) 80vw, 30vw". 80vw of a 1024 viewport at 3x is
   * ~2460, so 2048 is the practical ceiling and 4:5 is not negotiable.
   */
  selectedWork: {
    label: "Selected Work panel",
    recommended: "1640 × 2048",
    minimum: "1080 × 1350",
    aspect: "4:5 portrait",
    crops:
      "Cropped to a tall 4:5 frame. A landscape photograph loses both sides here, so shoot or pick portrait — this is the one slot where the shape really matters.",
    renderedBy: "components/home/FeaturedProjects.tsx",
  },

  /**
   * ProjectGallery — the image's own aspect, object-contain,
   * sizes="(max-width: 768px) 100vw, 50vw" → 1920 is the widest candidate.
   */
  projectGallery: {
    label: "Project gallery image",
    recommended: "1920 on the long edge",
    minimum: "1280 on the long edge",
    aspect: null,
    crops:
      "Not cropped. Each image is shown at the exact shape it was uploaded in, so portrait, landscape and square can be mixed freely.",
    renderedBy: "components/projects/ProjectGallery.tsx",
  },

  /**
   * The first gallery image doubles as `cover`: ProjectsIndex feature card
   * (aspect-[16/9], sizes="100vw"), standard card (aspect-[4/3]) and the
   * carousel (aspect-[4/3]). Unlike the rest of the gallery, it IS cropped.
   */
  projectCover: {
    label: "First gallery image (also the cover)",
    recommended: "3840 × 2160",
    minimum: "1920 × 1080",
    aspect: "16:9 or 4:3 landscape",
    crops:
      "This one is different from the rest of the gallery: it is also the cover, and the cards on the projects and home pages crop it to 16:9 and 4:3. Give it a landscape shot with the subject centred.",
    renderedBy: "components/projects/ProjectsIndex.tsx",
  },

  /**
   * Insights: index card aspect-[16/10], article hero aspect-[21/9], home
   * preview aspect-[16/9] — three different crops of one file, so the safe
   * supply is 16:9 with slack top and bottom.
   */
  blogCover: {
    label: "Article cover",
    recommended: "2400 × 1350",
    minimum: "1600 × 900",
    aspect: "16:9 landscape",
    crops:
      "Cropped three different ways — 16:10 on the insights list, a wide 21:9 band at the top of the article, and 16:9 on the home page. Keep the subject away from the top and bottom edges so every crop still works.",
    renderedBy: "app/(site)/insights/[slug]/page.tsx",
  },
} as const satisfies Record<string, ImageSpec>;

export type ImageSpecKey = keyof typeof IMAGE_SPECS;
