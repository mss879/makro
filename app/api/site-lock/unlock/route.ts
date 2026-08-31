import { NextResponse, type NextRequest } from "next/server";

import { clientIp, isRateLimited } from "@/lib/rate-limit";
import { createAdminSupabase } from "@/lib/supabase/server";
import {
  SITE_UNLOCK_COOKIE,
  SITE_UNLOCK_MAX_AGE,
  canonicalCode,
  unlockToken,
  verifyCode,
} from "@/lib/site-lock/token";

/**
 * The one door in the site lock.
 *
 * A visitor on the "Coming soon" gate posts the access code here; if it matches,
 * they get the unlock cookie and the proxy stops replacing pages for them.
 *
 * WHY A ROUTE HANDLER AND NOT A SERVER ACTION. The gate is served by REWRITING
 * every URL onto /coming-soon, so the page's own URL is whatever the visitor
 * asked for. A Server Action posts back to that URL, which the proxy would
 * rewrite in turn — a form submission arriving somewhere other than where Next
 * dispatched it from. A route handler has a fixed path that is excluded from
 * the proxy matcher, so the submission always lands exactly here.
 *
 * WHY THE SERVICE-ROLE CLIENT. The code and the salt are the two columns the
 * anon role has no privilege on whatsoever — that split is what makes the code
 * a secret at all (see the migration header). Only service_role can read them,
 * so without SUPABASE_SERVICE_ROLE_KEY this answers 503. That is consistent
 * rather than alarming: the same missing key means the proxy could not read the
 * lock state either, so the site is not gated in the first place and there is
 * nothing to unlock.
 */

export const dynamic = "force-dynamic";

/**
 * Ten attempts a minute per address. This is the only guessing surface the lock
 * has, and the codes it protects are short and human, so the brake matters more
 * here than on the other public write paths — but it is still a brake, not a
 * lockout: a client reading a code off a printed card and mistyping it three
 * times must not be shut out.
 */
const ATTEMPT_LIMIT = 10;

/**
 * `code` is what the no-JavaScript path puts in the query string, instead of
 * the message itself. Reflecting a server-supplied sentence back through a URL
 * and onto the page means whatever is in that URL gets rendered — React escapes
 * it, so it is not an injection, but it does let anyone hand a Makro visitor a
 * link that makes the gate say something Makro did not write. A fixed set of
 * codes the page maps to its own copy cannot be repointed that way.
 */
export type UnlockErrorCode =
  | "empty"
  | "rate"
  | "unavailable"
  | "closed"
  | "invalid";

type Outcome =
  | { ok: true }
  | { ok: false; status: number; code: UnlockErrorCode; message: string };

async function attempt(request: NextRequest, submitted: string): Promise<Outcome> {
  if (!canonicalCode(submitted)) {
    return {
      ok: false,
      status: 400,
      code: "empty",
      message: "Enter the access code to continue.",
    };
  }

  if (isRateLimited("site-unlock", clientIp(request.headers), ATTEMPT_LIMIT)) {
    return {
      ok: false,
      status: 429,
      code: "rate",
      message: "Too many attempts — wait a minute and try again.",
    };
  }

  const supabase = createAdminSupabase();
  if (!supabase) {
    console.error("[makro] Site unlock attempted without SUPABASE_SERVICE_ROLE_KEY.");
    return {
      ok: false,
      status: 503,
      code: "unavailable",
      message: "Access codes are unavailable right now. Please try again later.",
    };
  }

  const { data, error } = await supabase
    .from("site_lock_settings")
    .select("access_code, token_salt")
    .maybeSingle();

  if (error) {
    console.error("[makro] Site unlock could not read settings:", error.message);
    return {
      ok: false,
      status: 503,
      code: "unavailable",
      message: "Access codes are unavailable right now. Please try again later.",
    };
  }

  // No row, or no code set. Said plainly rather than as "incorrect code":
  // there is nothing to get right, and letting someone retype a code that
  // cannot work is the more frustrating answer. It gives nothing away either —
  // that no code is set is not a secret, the code is.
  if (!data || !canonicalCode(data.access_code)) {
    return {
      ok: false,
      status: 403,
      code: "closed",
      message: "This site is not accepting access codes at the moment.",
    };
  }

  const passed = await verifyCode(data.token_salt, data.access_code, submitted);
  if (!passed) {
    return {
      ok: false,
      status: 401,
      code: "invalid",
      message: "That code is not recognised.",
    };
  }

  return { ok: true };
}

/** Mints the cookie for a verified visitor. */
async function grant(response: NextResponse): Promise<NextResponse> {
  const supabase = createAdminSupabase();
  // Unreachable in practice — attempt() has already used this client — but the
  // type is nullable and a cookie minted from a guess would be a cookie that
  // never matches.
  if (!supabase) return response;

  const { data } = await supabase
    .from("site_lock_settings")
    .select("access_code, token_salt")
    .maybeSingle();

  if (!data) return response;

  response.cookies.set({
    name: SITE_UNLOCK_COOKIE,
    value: await unlockToken(data.token_salt, data.access_code),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SITE_UNLOCK_MAX_AGE,
  });

  return response;
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  const wantsJson = contentType.includes("application/json");

  let submitted = "";
  if (wantsJson) {
    try {
      const body = (await request.json()) as { code?: unknown };
      submitted = typeof body.code === "string" ? body.code : "";
    } catch {
      return NextResponse.json({ error: "Malformed request." }, { status: 400 });
    }
  } else {
    // The no-JavaScript path: the gate's form posts here natively, and the
    // answer is a redirect back to the gate carrying the error in the query.
    const form = await request.formData();
    submitted = String(form.get("code") ?? "");
  }

  const outcome = await attempt(request, submitted);

  if (wantsJson) {
    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.message }, { status: outcome.status });
    }
    return grant(NextResponse.json({ ok: true }));
  }

  const destination = new URL("/coming-soon", request.nextUrl.origin);
  if (!outcome.ok) {
    destination.searchParams.set("error", outcome.code);
    return NextResponse.redirect(destination, { status: 303 });
  }

  // 303 so the browser follows with GET — a 307 would replay the POST against
  // the page it lands on.
  const back = new URL("/", request.nextUrl.origin);
  return grant(NextResponse.redirect(back, { status: 303 }));
}
