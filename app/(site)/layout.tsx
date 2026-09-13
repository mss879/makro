import { organizationSchema, websiteSchema, creatorSchema } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import SmoothScroll from "@/components/providers/SmoothScroll";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Preloader from "@/components/ui/Preloader";
import ScrollProgress from "@/components/ui/ScrollProgress";
import TrackPageview from "@/components/analytics/TrackPageview";
import PageTransitions from "@/components/providers/PageTransitions";
import ChatMount from "@/components/chat/ChatMount";
import WhatsAppFloat from "@/components/layout/WhatsAppFloat";
import { isChatConfigured } from "@/lib/chat/config";

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
      {/* The dissolve between pages. Here and not in the root layout for the
          same reason as everything else in this file: /admin is a tool, and
          its navigations should stay instant. */}
      <PageTransitions />
      <SmoothScroll>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </SmoothScroll>
      {/* Outside SmoothScroll on purpose: the widget is fixed to the viewport,
          and Lenis transforms its wrapper — a fixed child of a transformed
          ancestor positions against that ancestor, not the viewport, so the
          panel would drift with the page as you scroll.

          Rendered only when the model key AND the service-role key are both
          present (lib/chat/config.ts). A launcher that opens onto a 503 is
          worse than no launcher. */}
      {isChatConfigured && <ChatMount />}
      {/* The WhatsApp hotline, floating (client, Sep 2026). Outside
          SmoothScroll for the same reason as the chat, and told whether the
          launcher is there so it stacks above it rather than on it — the
          launcher keeps the corner either way. */}
      <WhatsAppFloat stacked={isChatConfigured} />
    </>
  );
}
