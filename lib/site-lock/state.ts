/**
 * The lock state, as the proxy sees it.
 *
 * Same constraints as ./token — this runs inside proxy.ts, in the Edge runtime.
 * No Supabase client (it pulls in Node built-ins through @supabase/ssr's cookie
 * handling), no `server-only`, no `next/headers`. Just fetch against PostgREST.
 *
 *
 * WHY THE SERVICE-ROLE KEY
 *
 * The proxy needs `access_code` and `token_salt` to check a cookie, and those
 * two columns are the ones the anon role has no privilege on — that split is
 * the entire security model of this feature (see the migration header). The
 * only role that can read them is service_role, and the proxy is a server-side
 * process, so the key never reaches a browser.
 *
 * If the key is absent, this returns null and the proxy lets everything
 * through. The lock fails OPEN. That is a decision, not an oversight: a
 * marketing gate is not a security boundary, and the alternative — a missing
 * environment variable serving a "Coming soon" page over a live site with no
 * way to log in and fix it — is a far worse outage than the one it prevents.
 * /admin/settings says this on screen whenever the key is missing.
 *
 *
 * WHY THE CACHE
 *
 * This is on the hot path of every single page request on the site. A network
 * round trip to Supabase per request would put Colombo-to-region latency in
 * front of every navigation, for a value that changes about twice a year.
 *
 * So: one fetch per instance per TTL, held in a module-level variable. Next
 * keeps the proxy module alive between requests, so in practice a busy instance
 * makes four requests a minute regardless of traffic.
 *
 * The cost is that flipping the switch takes up to TTL seconds to be visible,
 * and longer if several instances are warm — each expires on its own schedule.
 * Fifteen seconds is short enough that the client reads it as "immediate" after
 * the page reload they were going to do anyway, and long enough that the fetch
 * is noise. The admin screen states the delay rather than pretending it is not
 * there.
 */

import { canonicalCode } from "./token";

export type SiteLockState = {
  enabled: boolean;
  accessCode: string;
  tokenSalt: string;
};

/** Seconds a good read is trusted before the next one. */
const TTL_MS = 15_000;

/**
 * Seconds before RETRYING after a failed read. Shorter than the TTL: a failure
 * usually means a blip, and the sooner the real state is back the better —
 * but not so short that an outage turns into a request-rate fetch loop.
 */
const RETRY_MS = 5_000;

type Cache = {
  /** Last state read successfully. Survives failures on purpose — see below. */
  value: SiteLockState | null;
  /** When `value` was fetched, or when the last attempt failed. */
  checkedAt: number;
  /** Whether the last attempt succeeded, which selects TTL vs RETRY. */
  ok: boolean;
  /** De-duplicates concurrent misses so a cold instance makes one request. */
  inflight: Promise<SiteLockState | null> | null;
};

const cache: Cache = { value: null, checkedAt: 0, ok: false, inflight: null };

async function fetchState(url: string, key: string): Promise<SiteLockState | null> {
  // Explicit column list, and `limit=1` rather than the singular Accept header:
  // the object representation answers 406 when the table is empty, which is a
  // legitimate state here (a database restored without the seed) and should
  // read as "not locked", not as an error.
  const endpoint =
    `${url}/rest/v1/site_lock_settings` +
    `?select=enabled,access_code,token_salt&limit=1`;

  const response = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
    // The module-level cache above is the only cache this should have. Letting
    // the runtime add its own would stack two expiries and make the delay after
    // a toggle unpredictable.
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`site_lock_settings read failed: ${response.status}`);
  }

  const rows = (await response.json()) as Array<{
    enabled?: boolean;
    access_code?: string | null;
    token_salt?: string | null;
  }>;

  const row = Array.isArray(rows) ? rows[0] : undefined;
  // No row means the feature has never been configured, which is unlocked.
  if (!row) return { enabled: false, accessCode: "", tokenSalt: "" };

  return {
    enabled: Boolean(row.enabled),
    accessCode: row.access_code ?? "",
    tokenSalt: row.token_salt ?? "",
  };
}

/**
 * Current lock state, cached. Null means "cannot tell" — the caller must treat
 * that as unlocked.
 */
export async function readSiteLockState(): Promise<SiteLockState | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const now = Date.now();
  const age = now - cache.checkedAt;
  const fresh = cache.ok ? age < TTL_MS : age < RETRY_MS;
  if (fresh && cache.checkedAt !== 0) return cache.value;

  // A second request arriving during a cold fetch waits for the same promise
  // instead of opening its own connection.
  if (cache.inflight) return cache.inflight;

  cache.inflight = fetchState(url, key)
    .then((state) => {
      cache.value = state;
      cache.ok = true;
      cache.checkedAt = Date.now();
      return state;
    })
    .catch((error: unknown) => {
      cache.ok = false;
      cache.checkedAt = Date.now();
      console.error(
        "[makro] Site lock state could not be read:",
        error instanceof Error ? error.message : error
      );
      // THE LAST KNOWN STATE IS KEPT, not cleared. Once an instance has seen
      // "locked", a Supabase blip does not quietly publish the site — it keeps
      // serving the gate off the stale value until a read succeeds. Only a
      // cold instance that has never managed a read falls through to null, and
      // that one has genuinely no basis to hide anything.
      return cache.value;
    })
    .finally(() => {
      cache.inflight = null;
    });

  return cache.inflight;
}

/**
 * Whether this state should gate the request.
 *
 * A lock with no code is still a lock — see the migration. What it is not is a
 * lock anyone can talk their way past.
 */
export function isLocked(state: SiteLockState | null): state is SiteLockState {
  return Boolean(state?.enabled);
}

/** True when the gate should render its code field at all. */
export function hasAccessCode(state: SiteLockState | null): boolean {
  return Boolean(state && canonicalCode(state.accessCode));
}
