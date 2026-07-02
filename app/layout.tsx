import type { Metadata, Viewport } from "next";
import { Rosario } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { SITE } from "@/lib/site";
import SmoothScroll from "@/components/providers/SmoothScroll";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Cursor from "@/components/ui/Cursor";
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

// Secondary / body face — Rosario, per the brand guideline
const rosario = Rosario({
  subsets: ["latin"],
  variable: "--font-rosario",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [
    "Makro Developers",
    "property development Sri Lanka",
    "luxury apartments Colombo",
    "residential developments",
    "commercial real estate Sri Lanka",
    "Wheels Lanka Group",
  ],
  openGraph: {
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    type: "website",
    locale: "en_LK",
    siteName: SITE.name,
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
        <Preloader />
        <Cursor />
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
