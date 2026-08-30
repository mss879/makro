import Link from "next/link";
import { IMG } from "@/lib/images";
import { getProjects } from "@/lib/projects-data";
import { getProjectsPageContent } from "@/lib/projects-page-data";
import { pageMetadata, breadcrumbSchema, webPageSchema, projectListSchema } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import ProjectsPageHero from "@/components/projects/ProjectsPageHero";
import ProjectsIntro from "@/components/projects/ProjectsIntro";
import ProjectsCarousel from "@/components/projects/ProjectsCarousel";
import Faq from "@/components/projects/Faq";
import Reveal from "@/components/anim/Reveal";

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

const DESCRIPTION =
  "Explore the Makro Developers portfolio — led by Makro Heights, our flagship residential condominium in Dehiwala, with further developments in planning.";

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

export default async function ProjectsPage() {
  const [projects, page] = await Promise.all([getProjects(), getProjectsPageContent()]);

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
          projectListSchema(projects),
          breadcrumbSchema([{ name: "Projects", path: "/projects" }]),
        ]}
      />
      {/* The page, in the order the client asked for (Aug 2026): full-screen
          hero, scroll-revealed intro, the carousel — then straight to the FAQ.
          Each admin section renders only when its own switch is on and it has
          something to show, so turning one off closes the gap rather than
          leaving an empty band.

          THE STATUS-GROUPED PORTFOLIO INDEX THAT USED TO SIT BETWEEN THE
          CAROUSEL AND THE FAQ IS GONE (client, Aug 2026). It was the long
          "Upcoming / On-going / Delivered" listing, with its type filters and
          jump-to dropdown, and it showed the same developments the carousel
          had just shown — the page said the portfolio twice and the second
          telling was the longer one.

          Consequences worth knowing, because they are not local to this file:

          - The carousel is now the ONLY list of developments on /projects. It
            is admin-curated, so a project that is published but never added
            under Projects → Carousel is no longer reachable from this page,
            and emptying that curation empties the portfolio.
          - The navbar's Projects dropdown pointed at #upcoming, #on-going and
            #delivered, which were ids inside the index. Those anchors left
            with it, so the dropdown went too — see components/layout/Navbar.tsx.
          - ProjectsIndex, SectionJump and HashScroll are still in the tree,
            unimported. Restoring the section is putting three lines back, not
            rebuilding it. */}
      {page.hero.enabled && (
        <ProjectsPageHero
          slides={page.hero.slides}
          autoplay={page.hero.autoplay}
          intervalMs={page.hero.intervalMs}
          showDots={page.hero.showDots}
        />
      )}
      {page.intro.enabled && (
        <ProjectsIntro eyebrow={page.intro.eyebrow} body={page.intro.body} />
      )}
      {page.carousel.enabled && (
        <ProjectsCarousel
          eyebrow={page.carousel.eyebrow}
          heading={page.carousel.heading}
          projects={page.carousel.projects}
        />
      )}

      {/* Lives here rather than on the home page — the questions people ask
          are almost always about the developments. The canonical FAQPage
          schema stays on /faq; duplicating it here would conflict.

          Every string is admin-controlled now (Projects → FAQ, added in
          20260830000100), which is why the whole section sits behind its own
          switch like the three above it. */}
      {page.faq.enabled && (
        <Faq
          eyebrow={page.faq.eyebrow}
          heading={page.faq.heading}
          body={page.faq.body}
          primaryLabel={page.faq.primaryLabel}
          primaryHref={page.faq.primaryHref}
          secondaryLabel={page.faq.secondaryLabel}
          secondaryHref={page.faq.secondaryHref}
          items={page.faq.items}
        />
      )}

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
