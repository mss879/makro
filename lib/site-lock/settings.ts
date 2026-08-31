import "server-only";

import { createAnonSupabase } from "@/lib/supabase/server";

/**
 * The gate's copy, for the page that renders it.
 *
 * Separate module from ./state on purpose. That one runs in the proxy, on every
 * request, and reads the two SECRET columns with the service-role key. This one
 * runs in a Server Component, only on requests that are actually being gated,
 * and reads the PUBLIC columns with the ordinary anon key.
 *
 * The column list below is not a convenience — it is the security boundary.
 * anon has been granted SELECT on exactly these columns and nothing else (see
 * 20260831000100_site_lock.sql), so a `select("*")` here would not leak the
 * access code, it would fail outright with a permission error. Widening this
 * list to a column anon cannot read breaks the gate loudly rather than quietly,
 * which is the behaviour worth having.
 */

const COLUMNS = "id, enabled, eyebrow, heading, body, note, show_contact" as const;

export interface SiteLockCopy {
  /** Mirrors the row so the gate can send an unlocked visitor back to the site. */
  enabled: boolean;
  eyebrow: string;
  heading: string;
  body: string;
  /** Empty hides the access-code field entirely. */
  note: string;
  showContact: boolean;
}

/**
 * What the gate shows when the database cannot be reached.
 *
 * Reachable in exactly one situation worth naming: the proxy has a cached
 * "locked" state from before an outage and is still gating, while this read
 * fails. The visitor gets a complete, on-brand holding page instead of an error
 * — which is the entire job of a holding page.
 *
 * `enabled: true` is deliberate. A failed read must not be mistaken for "the
 * lock is off" by the redirect in the page, or an outage would bounce every
 * gated visitor into the site the client has asked to hide.
 */
export const DEFAULT_SITE_LOCK_COPY: SiteLockCopy = {
  enabled: true,
  eyebrow: "Makro Developers",
  heading: "Something considered is on its way.",
  body: "Our new website is being finished with the same care we bring to everything we build. It will be here shortly. In the meantime, we are still very much open — get in touch and we will be glad to talk.",
  note: "Have an access code?",
  showContact: true,
};

export async function readSiteLockCopy(): Promise<SiteLockCopy> {
  const supabase = createAnonSupabase();
  if (!supabase) return DEFAULT_SITE_LOCK_COPY;

  const { data, error } = await supabase
    .from("site_lock_settings")
    .select(COLUMNS)
    .maybeSingle();

  if (error) {
    console.error("[makro] Site lock copy could not be read:", error.message);
    return DEFAULT_SITE_LOCK_COPY;
  }

  // No row is a database that has never had the migration seeded. The proxy
  // reads that as unlocked, so the page should too — it will redirect home.
  if (!data) return { ...DEFAULT_SITE_LOCK_COPY, enabled: false };

  return {
    enabled: data.enabled,
    eyebrow: data.eyebrow,
    heading: data.heading,
    body: data.body,
    note: data.note,
    showContact: data.show_contact,
  };
}
