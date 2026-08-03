import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createPublicWriteSupabase } from "@/lib/supabase/server";
import { clientIp, isRateLimited } from "@/lib/rate-limit";

/**
 * Cookieless page-view collector.
 *
 * `visitor` is a salted hash of IP + user-agent + the current date, so views
 * can be grouped into rough daily uniques without storing anything that
 * identifies a person, and yesterday's hash cannot be linked to today's.
 */

const BOT = /bot|crawl|spider|slurp|bingpreview|headless|lighthouse|pingdom|curl|wget/i;

let saltWarned = false;
/** Logs once per process so a misconfigured deployment is obvious but not noisy. */
function warnDefaultSalt() {
  if (saltWarned) return;
  saltWarned = true;
  console.warn(
    "[makro] PAGEVIEW_HASH_SALT is not set — visitor hashes are salted with the " +
      "public dev salt, so anyone can recompute them. Set it in the deployment " +
      "environment (openssl rand -hex 32)."
  );
}

export async function POST(request: NextRequest) {
  let path = "/";
  let referrer: string | null = null;

  try {
    const body = await request.json();
    if (typeof body?.path === "string") path = body.path.slice(0, 512);
    if (typeof body?.referrer === "string" && body.referrer) {
      referrer = body.referrer.slice(0, 512);
    }
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // The admin panel is a tool, not an audience.
  if (path.startsWith("/admin")) return NextResponse.json({ ok: true });

  const userAgent = request.headers.get("user-agent") ?? "";
  if (!userAgent || BOT.test(userAgent)) return NextResponse.json({ ok: true });

  // Throttled callers get the success shape too — losing a page view is
  // preferable to handing an abuser a signal that the limiter exists.
  const ip = clientIp(request.headers);
  if (isRateLimited("track", ip, 60)) return NextResponse.json({ ok: true });

  const supabase = createPublicWriteSupabase();
  if (!supabase) return NextResponse.json({ ok: true });

  const salt = process.env.PAGEVIEW_HASH_SALT;
  if (!salt && process.env.NODE_ENV === "production") warnDefaultSalt();
  const day = new Date().toISOString().slice(0, 10);
  const visitor = createHash("sha256")
    .update(`${ip}${userAgent}${salt ?? "makro-dev-salt"}${day}`)
    .digest("hex");

  const { error } = await supabase.from("page_views").insert({ path, referrer, visitor });
  if (error) console.error("[makro] Failed to record page view:", error.message);

  return NextResponse.json({ ok: true });
}
