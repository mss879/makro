import type { NextConfig } from "next";

/**
 * Content-Security-Policy — the site's last line of defence against injected
 * script, and the one header that was missing.
 *
 * Everything here is derived from what the site actually loads. It talks to
 * exactly two origins that are not itself: Supabase (auth, REST, Storage) and
 * images.unsplash.com. There is no analytics vendor, no tag manager, no
 * embedded map, no font CDN — the fonts are self-hosted woff2 and page views go
 * to this app's own /api/track. So everything below is a deliberate entry, not
 * a defensive catch-all.
 *
 * ON 'unsafe-inline' IN script-src — the one compromise, made with open eyes.
 *
 * The App Router streams each page's RSC payload to the browser inside inline
 * <script>self.__next_f.push(...)</script> tags whose contents differ per page
 * and per build, so they cannot be hashed. The alternative is a per-request
 * nonce, which has to be minted in proxy.ts — and a page that reads a nonce
 * cannot be prerendered. Adopting nonces would turn all 26 statically
 * generated routes into on-demand server renders, trading the site's whole
 * performance story for it.
 *
 * That trade is not worth it HERE, specifically because of what this site is:
 * it renders no user-supplied HTML anywhere. The only markdown on the page is
 * the chat widget's own replies, through react-markdown with no rehype-raw, so
 * raw HTML is escaped rather than parsed; JSON-LD is escaped in
 * components/seo/JsonLd. With no injection sink, 'unsafe-inline' is not
 * covering an exposure — and the directives that DO carry weight against the
 * realistic attacks are all strict: no third-party script origin can load
 * (script-src is 'self' only besides inline), object-src and frame-src are
 * 'none', base-uri is locked so a <base> tag cannot repoint every relative URL,
 * and form-action is locked so a form cannot be made to POST somewhere else.
 *
 * Revisit this the moment the site starts rendering HTML it did not author.
 */
const SUPABASE_ORIGIN = "https://*.supabase.co";

const contentSecurityPolicy = [
  "default-src 'self'",
  // See the note above. 'unsafe-eval' is added in development only, where
  // React Fast Refresh needs it; production never carries it.
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  // next/font emits an inline <style>, and GSAP animates by writing inline
  // style attributes — both are inline styles by construction.
  "style-src 'self' 'unsafe-inline'",
  // data: for the inlined placeholder blurs, blob: for canvas-derived sources.
  // The two remote hosts mirror `images.remotePatterns` above: next/image
  // normally proxies through /_next/image on this origin, but keeping them
  // listed means a direct-source image cannot silently break.
  `img-src 'self' data: blob: https://images.unsplash.com ${SUPABASE_ORIGIN}`,
  "font-src 'self' data:",
  // The hero video ships from /public; uploaded media comes from Storage.
  `media-src 'self' ${SUPABASE_ORIGIN}`,
  // The admin panel's browser client signs in and reads through Supabase
  // directly; wss covers Realtime if it is ever switched on.
  `connect-src 'self' ${SUPABASE_ORIGIN} wss://*.supabase.co`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  // Nothing is embedded, and nothing embeds this site.
  "frame-src 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  // A <base> tag can repoint every relative URL on the page; a rewritten
  // form action can post the contact form to someone else's server.
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  // No reason to advertise the framework on every response.
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    /**
     * The site's image quality, in one place.
     *
     * next/image re-encodes every image it serves, and its default quality is
     * 75 — which is what was actually shipping, because not one <Image> in
     * this codebase passes a `quality` prop. Stacked on the admin upload's own
     * WebP pass, that meant two lossy encodes with the harsher one last, and
     * it is why client photography looked soft and blocky on the live site.
     *
     * A SINGLE-ELEMENT array is doing real work here, not just allow-listing.
     * Next resolves quality with findClosestQuality(): an <Image> with no
     * prop starts at 75, then snaps to the nearest value in this array. With
     * one entry, every image on the site — all 26 of them, plus anything added
     * later — is served at 92 without touching a single call site. Add a
     * second number and unprop'd images fall back toward 75 again, so keep
     * this to one value and treat it as the global dial.
     *
     * 92 is chosen against AVIF, which Next tries first: it is past the point
     * where banding shows in the skies and concrete these photographs are
     * mostly made of, and the files stay smaller than the old q75 WebP.
     */
    qualities: [92],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      // Project imagery uploaded through the admin panel lives in Supabase
      // Storage, which serves from <project-ref>.supabase.co.
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        // Baseline security headers on every route.
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          /**
           * Deny the powerful features outright rather than leaving them to
           * the browser's default, which for several of these is "ask". The
           * site asks for none of them, so a request for one is either a bug
           * or an injection — either way it should never reach a prompt.
           * browsing-topics opts out of Topics-based ad profiling of visitors.
           */
          {
            key: "Permissions-Policy",
            value: [
              "accelerometer=()",
              "autoplay=(self)",
              "browsing-topics=()",
              "camera=()",
              "display-capture=()",
              "encrypted-media=()",
              "fullscreen=(self)",
              "geolocation=()",
              "gyroscope=()",
              "magnetometer=()",
              "microphone=()",
              "midi=()",
              "payment=()",
              "usb=()",
              "xr-spatial-tracking=()",
            ].join(", "),
          },
          // frame-ancestors in the CSP above supersedes this for any modern
          // browser; kept because it is the only clickjacking defence some
          // corporate proxies and older clients understand.
          { key: "X-Frame-Options", value: "DENY" },
          // Isolates this browsing context from any window that opened it, so
          // a malicious opener cannot reach into this page.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          // There is no crossdomain.xml here and never should be; this stops a
          // legacy Flash/PDF client from asking for one.
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          // Let the browser warm DNS for the Supabase origin the admin panel
          // and uploaded imagery come from. Costs nothing, saves a lookup.
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
      // Immutable caching is safe for these /public assets: when one changes
      // it ships under a new file name, and admin uploads go to Supabase
      // Storage — nothing below is ever edited in place at the same URL.
      {
        source: "/brand/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/hero-architectural-1080.mp4",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
