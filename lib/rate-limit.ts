import { createHash } from "node:crypto";

/**
 * Fixed-window in-memory rate limiter for the public write paths (contact,
 * newsletter, page-view tracking).
 *
 * Keys are a SHA-256 of route + ip so raw addresses are never held in memory,
 * consistent with the cookieless-analytics stance in app/api/track/route.ts.
 * Windows live in a module-level Map that is swept periodically, so memory
 * stays bounded at roughly one entry per active client per window.
 *
 * Deliberately process-local: a multi-instance deployment gets one window
 * *per instance*, so the effective limit is `limit × instances`. That is fine
 * as an abuse brake for a single-region marketing site — move to a shared
 * store (e.g. Upstash Redis) before scaling out horizontally.
 */

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

/** Sweep at most this often — expired entries are harmless in between. */
const SWEEP_INTERVAL_MS = 5 * 60_000;
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

/**
 * Best-effort caller address. Behind a proxy/CDN the client is the first hop
 * in x-forwarded-for; x-real-ip is the common single-value fallback. With
 * neither (plain local dev) every caller shares one bucket, which is fine
 * for a brake.
 */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

/** True once `ip` has exceeded `limit` calls to `route` in the current window. */
export function isRateLimited(
  route: string,
  ip: string,
  limit: number,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  sweep(now);

  const key = createHash("sha256").update(`${route}|${ip}`).digest("base64url");
  const entry = windows.get(key);

  if (!entry || entry.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count += 1;
  return entry.count > limit;
}
