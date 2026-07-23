import type { Metadata } from "next";
import { preload } from "react-dom";
import { SITE } from "@/lib/site";
import { BRAND, ogImage } from "@/lib/images";
import Hero from "@/components/home/Hero";
import BrandStatement from "@/components/home/BrandStatement";
import Stats from "@/components/home/Stats";
import Services from "@/components/home/Services";
import FeaturedProjects from "@/components/home/FeaturedProjects";
import WhyMakro from "@/components/home/WhyMakro";
import Interlude from "@/components/home/Interlude";
import ApproachPreview from "@/components/home/ApproachPreview";
import GroupBacking from "@/components/home/GroupBacking";
import Faq from "@/components/home/Faq";
import BlogPreview from "@/components/home/BlogPreview";

export const metadata: Metadata = {
  title: { absolute: `${SITE.name} — Luxury Property Developer in Colombo, Sri Lanka` },
  description:
    "Makro Developers builds premium residential and commercial properties in Colombo and across Sri Lanka. The Wheels Lanka Group company behind Makro Heights in Dehiwala — the future built well.",
  alternates: { canonical: SITE.url },
  openGraph: {
    title: `${SITE.name} — ${SITE.tagline}`,
    description:
      "Premium residential and commercial property developments in Colombo and across Sri Lanka, backed by the Wheels Lanka Group.",
    url: SITE.url,
    type: "website",
    images: [{ url: ogImage(BRAND.textureAscent), width: 2200, height: 1259 }],
  },
};

export default function Home() {
  // Emit <link rel="preload" as="video"> so the hero video downloads with
  // the document — while the preloader curtain runs — instead of waiting
  // for hydration to mount the <video> element.
  preload("/Building_push_cinematic_video_1080p_202607231223.mp4", { as: "video", type: "video/mp4", fetchPriority: "high" });

  return (
    <>
      <Hero />
      <BrandStatement />
      <Stats />
      <Services />
      {/* Full-bleed visual pause (normcph.com reference) — placed right
          after What We Do at the client's request */}
      <Interlude
        image={BRAND.interludeFacade}
        alt="Golden-hour light across the facade of a modern Makro residential development"
        eyebrow="The Standard Above"
        line="Every decision measured against a higher benchmark."
      />
      <FeaturedProjects />
      <WhyMakro />
      <ApproachPreview />
      <GroupBacking />
      <Faq />
      <BlogPreview />
    </>
  );
}
