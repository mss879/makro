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

  /* ---------------------------------------------------------------------
     The two PORTRAIT slots (client, Sep 2026). Same components as the two
     landscape heroes above, served below 768px via <picture> — see
     components/ui/ArtDirectedImage.tsx.

     THE NUMBERS ARE SMALLER, AND THAT IS NOT A COMPROMISE. `recommended` is
     still the widest candidate the browser can ask for, and a phone is a
     narrow viewport: 1440 covers a 480px CSS width at 3x, which is above
     every mainstream device. Asking for 3840 on a file that is only ever
     shown on a phone costs the visitor bytes and buys nothing.

     9:16, not 4:5. These are the only full-viewport slots on the site, and a
     phone viewport is taller than 4:5 — a 4:5 file would still be cropped
     top and bottom, which is the problem the second upload exists to solve.
     --------------------------------------------------------------------- */

  projectHeroMobile: {
    label: "Project page hero — mobile",
    recommended: "1440 × 2560",
    minimum: "1080 × 1920",
    aspect: "9:16 portrait",
    crops:
      "Shown full screen on phones instead of the landscape hero above. Keep the subject central and leave the bottom third quiet — the project name, status and location sit there. Leave this empty and the landscape image is used on phones too, cropped to the narrow screen.",
    renderedBy: "components/projects/ProjectHero.tsx",
  },

  projectsPageHeroMobile: {
    label: "Projects page hero slide — mobile",
    recommended: "1440 × 2560",
    minimum: "1080 × 1920",
    aspect: "9:16 portrait",
    crops:
      "Shown full screen on phones instead of the landscape slide above. Keep the subject central; if the slide carries a heading, leave the bottom third quiet. Leave this empty and the landscape image is used on phones too.",
    renderedBy: "components/projects/ProjectsPageHero.tsx",
  },

  /* ---------------------------------------------------------------------
     The HOME hero (Sep 2026) — components/home/Hero.tsx. Four slots: a video
     and its still for desktop, and the same pair for phones. The videos share
     this table because the guidance panel is the same component; nothing
     re-encodes them, so their numbers are the file itself rather than a
     next/image candidate.

     The still is ArtDirectedImage with sizes="100vw" at every width, so the
     desktop numbers are the same derivation as the two heroes above.

     The PHONE slot is not full screen, and that is why it asks for 4:5 rather
     than the 9:16 of the other two. Below md the hero is a column — the
     picture takes whatever height the copy band under it leaves — so the
     frame is shorter than the screen. Measured at 375x812: 375x581, about
     2:3, and a real phone with its browser bars showing is shorter still and
     nearer square. 4:5 sits in the middle of that range and loses the least
     at either end of it; a 9:16 file would lose a third of its height.
     --------------------------------------------------------------------- */

  homeHero: {
    label: "Home page hero still",
    recommended: "3840 × 2160",
    minimum: "2560 × 1440",
    aspect: "16:9 landscape",
    crops:
      "With a video, this is its first frame — shown the instant the page opens, while the video loads — and it is filled in for you when you upload the video, so nothing jumps when playback starts. With no video, this image is the hero. Either way it fills the screen on desktop, cropped to the window's shape, with the headline over its bottom-left corner.",
    renderedBy: "components/home/Hero.tsx",
  },

  homeHeroMobile: {
    label: "Home page hero still — mobile",
    recommended: "1440 × 1800",
    minimum: "1080 × 1350",
    aspect: "4:5 portrait",
    crops:
      "Shown on phones instead of the landscape still, in the frame above the headline — roughly 4:5, a little taller on long phones. Filled in automatically from the phone video if you upload one. Leave it empty and the landscape still is used, cropped to the narrow frame.",
    renderedBy: "components/home/Hero.tsx",
  },

  homeHeroVideo: {
    label: "Home page hero video",
    recommended: "1920 × 1080",
    minimum: "1280 × 720",
    aspect: "16:9 landscape",
    crops:
      "An MP4 (H.264) exported for the web, with no sound track, 10–20 seconds that loop cleanly. Keep it under about 10 MB: every visitor downloads it before the hero starts to move. It fills the screen on desktop, cropped to the window's shape, so keep the subject central and the bottom-left quiet for the headline.",
    renderedBy: "components/home/Hero.tsx",
  },

  homeHeroVideoMobile: {
    label: "Home page hero video — mobile",
    recommended: "1080 × 1350",
    minimum: "720 × 900",
    aspect: "4:5 portrait",
    crops:
      "Optional. Played on phones instead of the landscape video, in the frame above the headline. Same format as the desktop video — MP4, no sound, looping — and smaller is better here: phones are often on mobile data. Leave it empty and the landscape video plays on phones too, cropped to the narrow frame.",
    renderedBy: "components/home/Hero.tsx",
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
