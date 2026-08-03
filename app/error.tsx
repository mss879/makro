"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { PeakMark } from "@/components/brand/PeakMark";

/**
 * Route error boundary — catches unexpected render/data errors below the root
 * layout and shows a branded fallback (mirroring not-found.tsx) instead of a
 * blank screen. Only ever rendered in failure states, so it cannot affect the
 * normal appearance of the site.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server errors arrive redacted; the digest matches the server-side log.
    console.error("[makro] Route error:", error.digest ?? error.message);
  }, [error]);

  return (
    <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden bg-ink px-6 pt-24 text-center">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.05]">
        <PeakMark className="h-[60vh] w-auto text-rose" strokeWidth={2} />
      </div>
      <div className="relative">
        <p className="eyebrow text-rose">Something went wrong</p>
        <h1 className="mt-6 font-display display-lg text-bone">
          A momentary fault on our side.
        </h1>
        <p className="mx-auto mt-6 max-w-md font-body text-lg text-mist">
          An unexpected error interrupted this page. Please try again — if it
          persists, we would be glad to hear from you directly.
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
  );
}
