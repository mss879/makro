import type { Metadata } from "next";
import { IMG } from "@/lib/images";
import PageHero from "@/components/ui/PageHero";
import ProjectsGrid from "@/components/projects/ProjectsGrid";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Explore Makro Developers' portfolio of residential and commercial developments across Sri Lanka — completed, selling and in planning.",
};

export default function ProjectsPage() {
  return (
    <>
      <PageHero
        eyebrow="Our Portfolio"
        title="Developments built to last."
        intro="Residential and commercial projects across Sri Lanka — each delivered to a standard you can feel."
        imageId={IMG.whiteVillaPool}
        treatment="warm"
      />
      <ProjectsGrid />
    </>
  );
}
