import Link from "next/link";
import { BRAND, IMG } from "@/lib/images";
import { PROJECTS } from "@/lib/projects";
import { pageMetadata, breadcrumbSchema, webPageSchema, projectListSchema } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import PageHero from "@/components/ui/PageHero";
import ProjectsGrid from "@/components/projects/ProjectsGrid";
import Reveal from "@/components/anim/Reveal";

const DESCRIPTION =
  "Explore the Makro Developers portfolio — led by Makro Heights, our flagship residential condominium on Rohini Place in Dehiwala, with further residential and commercial developments in planning across Sri Lanka.";

export const metadata = pageMetadata({
  title: "Property Developments in Sri Lanka",
  description: DESCRIPTION,
  path: "/projects",
  imageId: IMG.whiteVillaPool,
  keywords: [
    "property developments Sri Lanka",
    "luxury apartments Colombo",
    "apartments for sale Colombo",
    "apartments in Dehiwala",
    "Makro Heights Dehiwala",
    "new developments Sri Lanka",
  ],
});

export default function ProjectsPage() {
  return (
    <>
      <JsonLd
        data={[
          webPageSchema({
            type: "CollectionPage",
            name: "Makro Developers — Projects",
            description: DESCRIPTION,
            path: "/projects",
          }),
          projectListSchema(PROJECTS),
          breadcrumbSchema([{ name: "Projects", path: "/projects" }]),
        ]}
      />
      <PageHero
        eyebrow="Our Portfolio"
        title="Developments built to last."
        intro="Residential and commercial projects across Sri Lanka — each delivered to a standard you can feel."
        imageId={BRAND.towersRender}
        treatment="warm"
      />
      <ProjectsGrid />

      {/* Cross-links — the portfolio is the proof; point to the process and the guides */}
      <section className="relative border-t border-hair bg-carbon">
        <div className="container-edge grid grid-cols-1 md:grid-cols-2">
          <Reveal className="border-b border-hair py-14 md:border-b-0 md:border-r md:py-16 md:pr-14">
            <p className="eyebrow text-fog">Behind every project</p>
            <h3 className="mt-4 font-display text-3xl text-bone">
              The process that delivers them.
            </h3>
            <Link
              href="/approach"
              className="group mt-6 inline-flex items-center gap-3 font-body text-bone transition-colors hover:text-rose"
            >
              Our approach
              <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
            </Link>
          </Reveal>
          <Reveal delay={0.1} className="py-14 md:py-16 md:pl-14">
            <p className="eyebrow text-fog">Before you buy</p>
            <h3 className="mt-4 font-display text-3xl text-bone">
              Buying an apartment in Colombo?
            </h3>
            <Link
              href="/insights/buying-an-apartment-in-colombo-guide"
              className="group mt-6 inline-flex items-center gap-3 font-body text-bone transition-colors hover:text-rose"
            >
              Read the complete guide
              <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
