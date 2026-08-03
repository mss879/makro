"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Reports each page view to /api/track. Uses sendBeacon so the request
 * survives navigation and never blocks rendering; falls back to fetch with
 * keepalive where sendBeacon is unavailable.
 */
export default function TrackPageview() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    // React runs effects twice in dev StrictMode — don't double-count.
    if (last.current === pathname) return;
    last.current = pathname;

    const body = JSON.stringify({ path: pathname, referrer: document.referrer || null });

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      return;
    }
    fetch("/api/track", {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
