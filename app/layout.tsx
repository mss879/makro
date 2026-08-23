import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SITE } from "@/lib/site";
import { absoluteUrl } from "@/lib/seo";

// BRAND PRIMARY DISPLAY FONT — Marcellus (OFL, self-hosted). A classical,
// inscription-derived serif: architectural and quietly premium without the
// decorative swashes of the previous display face. Single 400 weight —
// never fake bolds or italics on it.
const marcellus = localFont({
  src: [{ path: "./fonts/Marcellus-Regular.woff2", weight: "400", style: "normal" }],
  variable: "--font-marcellus",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
  // next/font/local metric-matches against Arial by default, so a serif
  // display face was being sized against a grotesque while actually falling
  // back to Georgia — a bigger swap reflow than necessary, on exactly the
  // headings whose reflow forced the fonts.ready ScrollTrigger refresh to
  // exist. Manrope is left alone: Arial is the right match for a grotesque.
  adjustFontFallback: "Times New Roman",
});

// Secondary / body face — Manrope (OFL, self-hosted variable file,
// weights 200–800). Clean modern grotesque for UI and long-form copy.
const manrope = localFont({
  src: [{ path: "./fonts/Manrope-Variable.woff2", weight: "200 800", style: "normal" }],
  variable: "--font-manrope",
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
    // Default card image — any page without its own og image (including the
    // 404 fallback) inherits this; Twitter inherits openGraph images too.
    images: [{ url: absoluteUrl("/brand/texture-ascent.jpg") }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
};

export const viewport: Viewport = {
  themeColor: "#f2ecdc",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${marcellus.variable} ${manrope.variable} h-full antialiased`}
    >
      {/* Document shell only — fonts, base colours and the grain overlay.
          The public site's chrome (preloader, navbar, footer, smooth scroll)
          lives in app/(site)/layout.tsx so /admin can opt out of all of it. */}
      <body className="grain relative min-h-full bg-ink text-bone">{children}</body>
    </html>
  );
}
