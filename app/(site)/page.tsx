import type { Metadata } from "next";
import { preload } from "react-dom";
import { FEATURES, SITE } from "@/lib/site";
import { BRAND, ogImage } from "@/lib/images";
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

export const metadata: Metadata = {
  title: { absolute: `${SITE.name} — Property Developer in Colombo, Sri Lanka` },
  description:
    "Makro Developers builds premium residential and commercial properties in Colombo, Sri Lanka. The Wheels Lanka Group company behind Makro Heights in Dehiwala.",
  alternates: { canonical: SITE.url },
  // A page-level openGraph replaces the root's wholesale, so the shared
  // fields (siteName, locale) must be restated here, not just the overrides.
  openGraph: {
    title: `${SITE.name} — ${SITE.tagline}`,
    description:
      "Premium residential and commercial property developments in Colombo and across Sri Lanka, backed by the Wheels Lanka Group.",
    url: SITE.url,
    type: "website",
    siteName: SITE.name,
    locale: "en_LK",
    images: [{ url: ogImage(BRAND.textureAscent), width: 2200, height: 1259 }],
  },
};

export default async function Home() {
  // The poster is what the visitor actually sees first, so it gets the
  // high-priority preload. The video is deliberately NOT link-preloaded —
  // the hero's <video preload="auto"> already fetches it, and a duplicate
  // link preload makes Safari download the file twice.
  preload("/brand/hero-architectural-poster.webp", { as: "image", fetchPriority: "high" });

  const selectedWork = await getSelectedWork();

  return (
    <>
      <Hero />
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
