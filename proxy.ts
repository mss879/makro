import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SITE_UNLOCK_COOKIE, tokensMatch, unlockToken } from "@/lib/site-lock/token";
import { isLocked, readSiteLockState } from "@/lib/site-lock/state";

/**
 * Next.js 16 renamed Middleware to Proxy — same behaviour, new file convention.
 *
 * Two entirely separate jobs, split by path at the top of proxy():
 *
 *  1. /admin — refresh the Supabase auth session cookie so a signed-in admin
 *     stays signed in across server renders, and bounce anonymous visitors to
 *     the login screen.
 *
 *  2. everything else — the SITE LOCK. When the client turns the lock on from
 *     /admin/settings, every public page is replaced by the "Coming soon" gate
 *     unless the visitor carries a valid unlock cookie.
 *
 * The split is load-bearing in one direction: /admin is NEVER gated by the
 * lock. It is the only place the lock can be turned off, so gating it would
 * make the switch one-way — the client could lock the site and then be unable
 * to reach the screen that unlocks it.
 */

export async function proxy(request: NextRequest) {
  return request.nextUrl.pathname.startsWith("/admin")
    ? guardAdmin(request)
    : gatePublicSite(request);
}

// ---------------------------------------------------------------------------
// 1. The admin gate (unchanged behaviour)
// ---------------------------------------------------------------------------

/**
 * This is an optimistic gate only. Every admin Server Action and Route Handler
 * re-checks auth via requireUser() — per the Next.js data-security guidance, a
 * matcher change must never be able to silently unprotect a mutation.
 */
async function guardAdmin(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without credentials there is no session to refresh and no way to sign in;
  // let the request through so the login page can explain the situation.
  if (!url || !anonKey) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() revalidates against the auth server — do not swap this for
  // getSession(), which trusts an unverified cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/admin/login";

  if (!user && !isLogin) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isLogin) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin";
    redirectUrl.search = "";
    // getUser() may have rotated the session cookies via setAll() above; a
    // bare redirect would discard that rotation and leave the browser holding
    // a consumed refresh token. Carry the refreshed cookies onto the redirect.
    const redirect = NextResponse.redirect(redirectUrl);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

// ---------------------------------------------------------------------------
// 2. The site lock
// ---------------------------------------------------------------------------

/** Where a gated request is rewritten to. */
const GATE_PATH = "/coming-soon";

/**
 * Replaces the public site with the gate, unless the visitor has been let in.
 *
 * REWRITE, NOT REDIRECT. The URL the visitor asked for stays in the address
 * bar, so a shared link to /projects/makro-heights is still a link to that
 * page — it simply shows the gate until the code is entered, and then shows
 * the actual page on reload. A redirect would strand every visitor on
 * /coming-soon and throw away where they were trying to go.
 *
 * The lock state read is cached per instance (see lib/site-lock/state.ts), so
 * this costs a Map lookup on the overwhelming majority of requests, not a
 * network call.
 */
async function gatePublicSite(request: NextRequest) {
  const state = await readSiteLockState();

  // Not locked, or no way to tell — the site serves normally. `readSiteLockState`
  // returns null only when the service-role key is missing or when a cold
  // instance has never managed a successful read; both are documented as
  // fail-open there.
  if (!isLocked(state)) return NextResponse.next({ request });

  // The gate rendering itself must not be rewritten onto itself.
  if (request.nextUrl.pathname === GATE_PATH) return NextResponse.next({ request });

  // The cookie is a hash of (salt + code) — see lib/site-lock/token.ts. Both
  // halves live only on the server, so this comparison cannot be satisfied by
  // anything a visitor can set by hand, and changing either one invalidates
  // every cookie already issued.
  const presented = request.cookies.get(SITE_UNLOCK_COOKIE)?.value;
  if (presented) {
    const expected = await unlockToken(state.tokenSalt, state.accessCode);
    if (tokensMatch(presented, expected)) return NextResponse.next({ request });
  }

  const gate = request.nextUrl.clone();
  gate.pathname = GATE_PATH;
  gate.search = "";

  const response = NextResponse.rewrite(gate);

  // Every URL on the site is currently serving the same holding page. Telling
  // crawlers so — on the header as well as in the page's own metadata — is what
  // keeps a launch from starting with every route indexed as "Coming soon".
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  // The gate is a function of a cookie and a database row, neither of which a
  // shared cache can see. Without this, one CDN node could serve the gate to
  // unlocked visitors, or the real site to locked ones.
  response.headers.set("Cache-Control", "no-store, must-revalidate");

  return response;
}

export const config = {
  /**
   * Everything except the paths that must never be gated or auth-checked:
   *
   *   api/          — the unlock endpoint lives here, so gating it would make
   *                   the gate impossible to open. The rest are public write
   *                   paths with their own rate limits.
   *   _next/*       — the gate page's own JS and CSS come from here.
   *   _vercel/*     — platform internals.
   *   robots/sitemap/favicon and anything with a file extension — static
   *                   assets, served straight through.
   *
   * Everything else — the whole marketing site AND /admin — runs through
   * proxy() above, which splits them by path.
   */
  matcher: [
    "/((?!api/|_next/static|_next/image|_vercel/|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.[^/]+$).*)",
  ],
};
