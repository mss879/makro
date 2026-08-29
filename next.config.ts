import type { NextConfig } from "next";

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
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Frame-Options", value: "DENY" },
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
