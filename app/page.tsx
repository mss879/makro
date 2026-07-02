import { preload } from "react-dom";
import Hero from "@/components/home/Hero";
import BrandStatement from "@/components/home/BrandStatement";
import Stats from "@/components/home/Stats";
import Services from "@/components/home/Services";
import FeaturedProjects from "@/components/home/FeaturedProjects";
import WhyMakro from "@/components/home/WhyMakro";
import BrandMoment from "@/components/home/BrandMoment";
import ApproachPreview from "@/components/home/ApproachPreview";
import GroupBacking from "@/components/home/GroupBacking";
import Faq from "@/components/home/Faq";
import Marquee from "@/components/anim/Marquee";

export default function Home() {
  // Emit <link rel="preload" as="video"> so the hero video downloads with
  // the document — while the preloader curtain runs — instead of waiting
  // for hydration to mount the <video> element.
  preload("/hero.mp4", { as: "video", type: "video/mp4", fetchPriority: "high" });

  return (
    <>
      <Hero />
      <BrandStatement />
      <Stats />
      <Services />
      <FeaturedProjects />
      <WhyMakro />
      <BrandMoment />
      <Marquee
        items={[
          "The future built well",
          "Precision",
          "Craftsmanship",
          "Enduring value",
          "Trust",
        ]}
      />
      <ApproachPreview />
      <GroupBacking />
      <Faq />
    </>
  );
}
