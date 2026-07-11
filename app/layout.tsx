import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SITE } from "@/lib/site";
import { organizationSchema, websiteSchema, creatorSchema } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import SmoothScroll from "@/components/providers/SmoothScroll";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Preloader from "@/components/ui/Preloader";
import ScrollProgress from "@/components/ui/ScrollProgress";

// BRAND PRIMARY DISPLAY FONT — TAN Garland (licensed, client-provided).
// Self-hosted from app/fonts; system serifs cover the brief swap window.
const tanGarland = localFont({
  src: [{ path: "./fonts/TANGarland.woff2", weight: "400", style: "normal" }],
  variable: "--font-tan-garland",
  display: "swap",
  fallback: ["Didot", "Times New Roman", "serif"],
});

// Secondary / body face — Rosario, self-hosted from the client's licensed
// files (Font/rosario, OFL) rather than Google Fonts. Static faces only:
// 400 + 700 with true italics.
const rosario = localFont({
  src: [
    { path: "./fonts/Rosario-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Rosario-Italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/Rosario-Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/Rosario-BoldItalic.woff2", weight: "700", style: "italic" },
  ],
  variable: "--font-rosario",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Property Developer in Colombo, Sri Lanka`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "Makro Developers",
    "property developer Sri Lanka",
    "property development Colombo",
    "luxury apartments Colombo",
    "residential developments Sri Lanka",
    "commercial real estate Sri Lanka",
    "Wheels Lanka Group",
  ],
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.legal,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    type: "website",
    locale: "en_LK",
    siteName: SITE.name,
    url: SITE.url,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
};

export const viewport: Viewport = {
  themeColor: "#050203",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${tanGarland.variable} ${rosario.variable} h-full antialiased`}
    >
      <body className="grain relative min-h-full bg-ink text-bone">
        <JsonLd data={[organizationSchema(), websiteSchema(), creatorSchema()]} />
        <Preloader />
        <ScrollProgress />
        <SmoothScroll>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </SmoothScroll>
      </body>
    </html>
  );
}
