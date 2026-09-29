import type { Metadata } from "next";
import { FEATURES, SITE } from "@/lib/site";
import { BRAND, ogImage } from "@/lib/images";
import { webPageSchema } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import { getHomeHero } from "@/lib/home-hero-data";
import { getSelectedWork } from "@/lib/selected-work-data";
import Hero from "@/components/home/Hero";
import BrandStatement from "@/components/home/BrandStatement";
import Stats from "@/components/home/Stats";
import Services from "@/components/home/Services";
import FeaturedProjects from "@/components/home/FeaturedProjects";
import WhyMakro from "@/components/home/WhyMakro";
import Interlude from "@/components/home/Interlude";
import ApproachPreview from "@/components/home/ApproachPreview";
import GroupBacking from "@/components/home/GroupBacking";
import BlogPreview from "@/components/home/BlogPreview";

/**
 * Admin-editable content, so this page must not be frozen at build time.
 *
 * Every public page here was fully static with no revalidate window, which
 * meant a project, article or image saved in the admin only appeared after the
 * next deploy. `revalidatePath()` in the Server Actions is still the fast path
 * — it invalidates immediately — but it cannot be the ONLY path: it depends on
 * the host's on-demand revalidation working, and when it does not, the page
 * simply never updates and nothing says so.
 *
 * 60s is the backstop. Cached and fast for visitors, and an edit that misses
 * the on-demand hook still lands within a minute instead of never.
 */
export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: `${SITE.name} — Property Developer in Colombo, Sri Lanka` },
  description:
    "Makro Developers plans and builds residential and commercial properties in Colombo, Sri Lanka — built for lasting value. The Wheels Lanka Group company behind Makro Heights in Dehiwala.",
  alternates: { canonical: SITE.url },
  // A page-level openGraph replaces the root's wholesale, so the shared
  // fields (siteName, locale) must be restated here, not just the overrides.
  openGraph: {
    title: `${SITE.name} — ${SITE.tagline}`,
    description:
      "Thoughtfully planned residential and commercial developments in Colombo and across Sri Lanka, built for lasting value. Backed by the Wheels Lanka Group.",
    url: SITE.url,
    type: "website",
    siteName: SITE.name,
    locale: "en_LK",
    images: [{ url: ogImage(BRAND.ogCard), width: 1200, height: 630 }],
  },
};

export default async function Home() {
  // No preload() here any more. The hero's still used to be the video's
  // `poster`, fetched as the raw file, so a link preload of that same URL
  // was free. It is now an <img> through the image optimiser (the admin
  // uploads a 3840px master; a phone should not download that), which asks
  // for a /_next/image URL per breakpoint — a preload of the raw file would
  // be a second download of the same picture. The <img> is in the server
  // HTML with fetchpriority="high", so the browser finds it as early as a
  // preload would have. The video is still deliberately NOT link-preloaded:
  // its own preload="auto" fetches it, and a duplicate link preload makes
  // Safari download the file twice.
  const [selectedWork, hero] = await Promise.all([getSelectedWork(), getHomeHero()]);

  return (
    <>
      {/* The home page was the one route emitting no page-level node: the
          layout's Organization and WebSite describe the SITE, but nothing
          described this PAGE, so the graph had a gap exactly where crawlers
          enter. isPartOf/about wire it to the two ids the layout already
          declares, keeping one entity rather than three loose fragments. */}
      <JsonLd
        data={webPageSchema({
          name: `${SITE.name} — ${SITE.tagline}`,
          description: SITE.description,
          path: "/",
        })}
      />
      {/* Admin-driven since Sep 2026 (Home Hero). Falls back to the shipped
          hero, so this line never renders an empty opening. */}
      <Hero hero={hero} />
      <BrandStatement />
      {/* Hidden at the client's request — the component is kept so the band
          can be switched back on from lib/site once the numbers are agreed. */}
      {FEATURES.statsBand && <Stats />}
      <Services />
      {/* Full-bleed visual pause (normcph.com reference) — placed right
          after What We Do at the client's request */}
      <Interlude
        image={BRAND.interludeFacade}
        alt="Golden-hour light across the facade of a modern Makro residential development"
        eyebrow="The Standard Above"
        line="Every decision held to a higher standard"
      />
      {/* The client's on/off switch for the whole rail. Rendering nothing —
          no section, no wrapper — is the point: an empty band of black would
          read as a broken page rather than a section that was turned off. */}
      {selectedWork.enabled && (
        <FeaturedProjects
          settings={selectedWork.settings}
          cards={selectedWork.cards}
        />
      )}
      <WhyMakro />
      <ApproachPreview />
      <GroupBacking />
      <BlogPreview />
    </>
  );
}
