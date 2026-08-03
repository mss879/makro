"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
// global-error replaces the root layout when active, so it must bring its own
// global styles (per the error.js file convention). The next/font variables
// from app/layout.tsx are gone with it — globals.css falls back to Georgia /
// system-ui, which is acceptable for a catastrophic-failure page.
import "./globals.css";

/**
 * Last-resort error boundary — renders only when the root layout itself
 * fails, so it must define its own <html> and <body>. Never shown on a
 * healthy page.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server errors arrive redacted; the digest matches the server-side log.
    console.error("[makro] Root error:", error.digest ?? error.message);
  }, [error]);

  return (
    <html lang="en">
      <body className="grain relative min-h-full bg-ink text-bone">
        {/* metadata exports are unsupported in error boundaries — React
            hoists a plain <title> into <head> instead. */}
        <title>Something went wrong · Makro Developers</title>
        <section className="flex min-h-screen items-center justify-center px-6 text-center">
          <div>
            <p className="eyebrow text-rose">Something went wrong</p>
            <h1 className="mt-6 font-display display-lg text-bone">
              A momentary fault on our side.
            </h1>
            <p className="mx-auto mt-6 max-w-md font-body text-lg text-mist">
              An unexpected error interrupted the site. Please try again in a
              moment.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="group mt-10 inline-flex items-center gap-3 bg-rose px-8 py-4 font-body text-ink transition-colors hover:bg-rose-soft"
            >
              Try again
              <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
            </button>
          </div>
        </section>
      </body>
    </html>
  );
}
