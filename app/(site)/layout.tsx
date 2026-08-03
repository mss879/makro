import { organizationSchema, websiteSchema, creatorSchema } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import SmoothScroll from "@/components/providers/SmoothScroll";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Preloader from "@/components/ui/Preloader";
import ScrollProgress from "@/components/ui/ScrollProgress";
import TrackPageview from "@/components/analytics/TrackPageview";

/**
 * The public site's chrome.
 *
 * It lives here rather than in the root layout so that /admin — a tool, not a
 * marketing page — doesn't inherit the preloader curtain, the sticky navbar,
 * the footer or Lenis smooth scrolling (which would fight the CRM's drag and
 * drop). The route group is transparent to routing: every URL below is
 * unchanged.
 */
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <JsonLd data={[organizationSchema(), websiteSchema(), creatorSchema()]} />
      <Preloader />
      <ScrollProgress />
      <TrackPageview />
      <SmoothScroll>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </SmoothScroll>
    </>
  );
}
