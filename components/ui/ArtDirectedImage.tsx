import { getImageProps } from "next/image";

/**
 * One full-bleed image with a separate portrait file for phones.
 *
 * Client direction, Sep 2026: the two admin-editable heroes each take two
 * uploads now — a landscape file for desktop and a portrait one for mobile.
 * This is the render half of that; the columns are
 * `projects.hero_image_mobile` and `projects_page_hero_slides.image_mobile`
 * (20260901000100_hero_mobile_images.sql).
 *
 *
 * WHY <picture> AND getImageProps, NOT TWO <Image>s
 *
 * The obvious version is two <Image> elements with `hidden md:block` and
 * `md:hidden`. It looks right and is wrong: `display: none` does NOT stop a
 * browser fetching an <img> that is already in the DOM. Every visitor would
 * download BOTH heroes — on the one element on the page that is the LCP, on
 * the connection least able to afford it. A <picture> with `media` on each
 * <source> is the only construction where the browser picks one file and
 * fetches nothing else, and it makes the choice before layout, from the media
 * query alone.
 *
 * next/image cannot render a <picture>, so this uses `getImageProps()` — the
 * officially documented escape hatch for exactly this case (see "Art
 * direction" in the next/image reference). Everything else about the pipeline
 * is unchanged: same loader, same AVIF/WebP negotiation, same `qualities: [92]`
 * from next.config.ts, same remotePatterns. Only the element wrapping it
 * differs.
 *
 *
 * THE FALLBACK IS SYMMETRIC, AND THAT IS LOAD-BEARING
 *
 * `mobile ?? desktop` is the case everyone expects: no portrait variant
 * uploaded, so phones get the landscape file cropped, exactly as before this
 * feature existed. `desktop ?? mobile` is the case nobody thinks about until
 * it happens — an admin uploads only the portrait file, or clears the
 * landscape one to replace it and saves halfway. Without it that row renders
 * an empty frame on every desktop, which reads as a broken page rather than a
 * half-finished edit. With it, either single upload is a complete, working
 * hero and the second one is a genuine enhancement.
 *
 * Both null renders nothing — callers already guard on that, and an <img> with
 * no src is worse than no <img>.
 */
export default function ArtDirectedImage({
  desktop,
  mobile,
  alt,
  priority = false,
  className = "object-cover",
  sizes = "100vw",
  breakpoint = "(min-width: 768px)",
  ...rest
}: {
  /** Landscape file. Falls back to `mobile` when unset. */
  desktop: string | null | undefined;
  /** Portrait file for phones. Falls back to `desktop` when unset. */
  mobile: string | null | undefined;
  alt: string;
  priority?: boolean;
  className?: string;
  /**
   * Passed to BOTH candidates. Both slots here are full-bleed, so 100vw is
   * right for each — but the project hero asks for 120vw because its cover
   * starts at scale 1.2, and that has to reach both files or the phone picks
   * a candidate it then upscales.
   */
  sizes?: string;
  /**
   * Where the portrait file stops and the landscape one starts. Defaults to
   * Tailwind's `md`, which is the breakpoint the rest of the site changes
   * layout at — see the mobile section rhythm in globals.css.
   */
  breakpoint?: string;
  /** Anything else lands on the <img>, e.g. the `data-img` GSAP hook. */
  [key: string]: unknown;
}) {
  const landscape = desktop || mobile || "";
  const portrait = mobile || desktop || "";
  if (!landscape) return null;

  const common = { alt, sizes, fill: true, priority } as const;

  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({ ...common, src: landscape });

  // `rest` comes from the PORTRAIT call deliberately: its `src` is the <img>
  // fallback for anything that does not understand <picture>, and a phone with
  // no <picture> support is far likelier than a desktop with none.
  const {
    props: { srcSet: mobileSrcSet, ...imgProps },
  } = getImageProps({ ...common, src: portrait });

  return (
    <picture>
      {/* `sizes` HAS TO BE REPEATED ON EVERY <source>, and this is the one
          thing about this construction that silently half-works if you leave
          it out. `fill` makes next/image emit a width-descriptor srcset, and
          the spec resolves those against the SOURCE's own `sizes` — the
          attribute on the <img> below does not reach up here. With it
          missing the browser assumes 100vw: measured on a 375px phone, the
          project hero picked the 828w candidate for a slot displayed at
          450 CSS px (this hero is 120vw, because its cover starts at scale
          1.2), and then upscaled the difference on the LCP element. */}
      <source media={breakpoint} sizes={sizes} srcSet={desktopSrcSet} />
      <source sizes={sizes} srcSet={mobileSrcSet} />
      {/* A bare <img>, deliberately: getImageProps IS next/image's own props
          builder, so this is still the optimiser's output — it is hand-rolled
          only so it can sit inside a <picture>, which the component itself
          cannot render.

          fetchPriority/loading are set here rather than passed through,
          because `priority` does NOT reach the props object: getImageProps
          returns it on `meta` (as `meta.preload`), which is what <Image> reads
          to emit its preload link. Destructure only `props` — as the
          documented art-direction example does — and the LCP hint is silently
          dropped. Restoring it on the element is the half that matters; the
          preload link is deliberately not recreated, since a hand-written one
          would need its own `media` and would race the <picture> selection. */}
      <img
        {...imgProps}
        {...rest}
        fetchPriority={priority ? "high" : undefined}
        loading={priority ? "eager" : "lazy"}
        className={className}
        alt={alt}
      />
    </picture>
  );
}
