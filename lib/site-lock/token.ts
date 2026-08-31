/**
 * The unlock cookie: what it holds, and how it is checked.
 *
 * DELIBERATELY DEPENDENCY-FREE AND RUNTIME-AGNOSTIC. This module is imported by
 * proxy.ts, which Next.js runs in the Edge runtime, and by a Route Handler and
 * a Server Action, which run in Node. So: Web Crypto only — no `node:crypto`,
 * no `server-only`, no Supabase client, nothing from `next/*`. Adding any of
 * those here breaks the proxy build, not this file's tests.
 *
 *
 * WHAT THE COOKIE IS
 *
 * Not the code. A hash of (salt + code), where the salt is a column only the
 * server ever reads. The visitor types the code once, at the gate; from then on
 * their browser carries the derived token instead, in an httpOnly cookie.
 *
 * Two properties fall out of deriving it rather than storing a flag, and both
 * are the reason it is done this way:
 *
 *   1. The cookie cannot be forged. A plain `unlocked=1` cookie is bypassed by
 *      anyone who opens devtools, which would make the whole gate theatre.
 *      Reproducing this value requires the salt, which is not published
 *      anywhere — not in the bundle, not over PostgREST (the anon role has no
 *      privilege on that column at all), not in the cookie itself.
 *
 *   2. Access is revocable. Change the code, or rotate the salt, and every
 *      token already in the wild stops matching on the very next request —
 *      no session table, no revocation list, no expiry sweep. "Sign everyone
 *      out" on the admin screen is one UPDATE of a uuid.
 */

/** Cookie name. Prefixed like the rest of the site's first-party cookies. */
export const SITE_UNLOCK_COOKIE = "makro_site_access";

/**
 * How long a visitor stays unlocked. Long, because re-typing a code every day
 * would train the client's own staff to stop using the gate — and it costs
 * nothing to be generous when revocation does not depend on expiry (see above).
 */
export const SITE_UNLOCK_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

/**
 * Namespace string mixed into the hash.
 *
 * Its job is to make this token meaningless anywhere else: if the same salt
 * value ever ends up used for a second purpose, the two hashes still cannot be
 * swapped for one another. The `v1` is the upgrade path — changing it
 * invalidates every existing cookie in one edit, which is what a future change
 * to this scheme would want.
 */
const NAMESPACE = "makro-site-lock-v1";

/**
 * Canonical form of an access code.
 *
 * Trimmed and lower-cased, so the code survives being read down a phone,
 * pasted with a stray space, or typed on a phone keyboard that capitalises the
 * first letter. Both sides of every comparison go through here — the token is
 * derived from the canonical form, so a code stored as "Makro2026" and typed as
 * " makro2026" produce the same token by construction rather than by a
 * comparison rule someone has to remember to apply.
 *
 * The lost case-sensitivity is not a real loss of strength: this is a code the
 * client hands out on purpose, not a password.
 */
export function canonicalCode(code: string): string {
  return code.trim().toLowerCase();
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  // btoa exists in both runtimes; Buffer does not exist in Edge.
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Derives the cookie value for a given salt + code.
 *
 * Async because Web Crypto's digest is — that is the price of being callable
 * from the Edge runtime, and the proxy already awaits a fetch on the same path.
 */
export async function unlockToken(salt: string, code: string): Promise<string> {
  const message = `${NAMESPACE}|${salt}|${canonicalCode(code)}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  return toBase64Url(new Uint8Array(digest));
}

/**
 * Length-independent, byte-by-byte comparison.
 *
 * A timing attack across the public internet against a SHA-256 digest is not a
 * realistic threat here, and this is not pretending otherwise. It is four lines
 * to remove the question entirely, and it stops the lazy `a === b` from being
 * copied into somewhere that the answer would matter.
 */
export function tokensMatch(a: string | undefined | null, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Whether `code` is the code on the settings row.
 *
 * Routed through the token rather than comparing the strings directly, so the
 * gate's verification and the proxy's cookie check are provably the same
 * predicate — if canonicalisation ever changes, it cannot change for one of
 * them and not the other.
 *
 * An empty stored code is ALWAYS a refusal, never "anything matches". That is
 * the no-code state described in the migration: the lock is absolute for the
 * public, and the only way in is the authenticated preview button in /admin.
 */
export async function verifyCode(
  salt: string,
  storedCode: string,
  submitted: string
): Promise<boolean> {
  if (!canonicalCode(storedCode)) return false;
  if (!canonicalCode(submitted)) return false;
  const [expected, actual] = await Promise.all([
    unlockToken(salt, storedCode),
    unlockToken(salt, submitted),
  ]);
  return tokensMatch(actual, expected);
}
