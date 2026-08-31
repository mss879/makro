"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { createServerSupabase, requireUser } from "@/lib/supabase/server";
import {
  SITE_UNLOCK_COOKIE,
  SITE_UNLOCK_MAX_AGE,
  canonicalCode,
  unlockToken,
} from "@/lib/site-lock/token";
import type { SiteLockSettingsRow } from "@/lib/supabase/types";

/**
 * Settings — the site lock.
 *
 * Every export is a Server Action, so every export starts with `requireUser()`:
 * the proxy gate at /admin is optimistic and a matcher change must never be
 * able to silently unprotect a mutation. It matters more here than anywhere
 * else in the panel — these actions can take the public site down, and one of
 * them reads back a secret.
 *
 * Nothing here calls revalidatePath("/"). The lock is enforced in the proxy off
 * its own short-lived cache (lib/site-lock/state.ts), not off Next's data
 * cache, so purging routes would not make a toggle land any sooner and would
 * imply a promptness this cannot offer. The screen tells the client about the
 * delay instead.
 */

const NOT_CONFIGURED =
  "Supabase is not connected — add the keys to .env.local and restart the dev server.";

export type SettingsFormState = { ok: boolean; message: string };

type AdminClient = NonNullable<Awaited<ReturnType<typeof createServerSupabase>>>;

/** Everything the copy form owns. The code and the switch are handled apart. */
type GateCopy = Pick<
  SiteLockSettingsRow,
  "eyebrow" | "heading" | "body" | "note" | "show_contact"
>;

const DEFAULT_COPY: GateCopy = {
  eyebrow: "Makro Developers",
  heading: "Something considered is on its way.",
  body: "Our new website is being finished with the same care we bring to everything we build. It will be here shortly. In the meantime, we are still very much open — get in touch and we will be glad to talk.",
  note: "Have an access code?",
  show_contact: true,
};

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Writes a patch onto the settings singleton, creating the row if it is missing.
 *
 * Same shape as the Selected Work helper, and missing-row handling is normal
 * rather than exceptional for the same reason: the migration seeds a row, but a
 * database restored from a partial dump has to be able to save. The difference
 * is what a missing row means HERE — an unlocked site — so the insert defaults
 * `enabled` to false and lets the caller's patch turn it on if that is what the
 * caller was doing.
 */
async function writeSettings(
  supabase: AdminClient,
  patch: Partial<SiteLockSettingsRow>
): Promise<string | null> {
  const { data: existing, error: readError } = await supabase
    .from("site_lock_settings")
    .select("id")
    .maybeSingle();

  if (readError) {
    console.error("[makro] Failed to read site lock settings:", readError.message);
    return readError.message;
  }

  if (existing) {
    const { error } = await supabase
      .from("site_lock_settings")
      .update(patch)
      .eq("id", existing.id);

    if (error) console.error("[makro] Failed to save site lock settings:", error.message);
    return error ? friendly(error) : null;
  }

  const { error } = await supabase
    .from("site_lock_settings")
    .insert({ enabled: false, ...DEFAULT_COPY, ...patch });

  // The unique index on ((true)) admits one row ever, so two admins saving a
  // never-configured screen at once means one loses with 23505. The winner's
  // row is as good as ours — adopt it and patch it.
  if (error?.code === "23505") {
    const { data: row } = await supabase
      .from("site_lock_settings")
      .select("id")
      .maybeSingle();

    if (!row) return "These settings could not be saved — reload the page and try again.";

    const { error: updateError } = await supabase
      .from("site_lock_settings")
      .update(patch)
      .eq("id", row.id);

    if (updateError) {
      console.error("[makro] Failed to save site lock settings:", updateError.message);
      return friendly(updateError);
    }
    return null;
  }

  if (error) console.error("[makro] Failed to create site lock settings:", error.message);
  return error ? friendly(error) : null;
}

/** 23514 here is only ever the access-code length CHECK. */
function friendly(error: { code?: string | null; message: string }): string {
  if (error.code === "23514") {
    return "An access code has to be at least 4 characters — or leave it empty to have no code at all.";
  }
  return error.message;
}

// ---------------------------------------------------------------------------
// The switch
// ---------------------------------------------------------------------------

/**
 * Whether the public site is replaced by the "Coming soon" gate.
 *
 * Kept apart from every other control on the screen, and saved on click, for
 * the same reason the Selected Work toggle is: it is the one setting whose
 * consequence is the whole site, and it must not be possible to throw it by
 * accident while fixing a typo in the gate copy.
 */
export async function setSiteLockEnabled(enabled: boolean): Promise<SettingsFormState> {
  await requireUser();

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const failure = await writeSettings(supabase, { enabled });
  if (failure) return { ok: false, message: failure };

  revalidatePath("/admin/settings");
  return {
    ok: true,
    message: enabled
      ? "The site is locked. Visitors now see the Coming soon page."
      : "The site is live again.",
  };
}

// ---------------------------------------------------------------------------
// The code
// ---------------------------------------------------------------------------

/**
 * Sets, changes or clears the access code.
 *
 * CHANGING THE CODE SIGNS EVERYONE OUT. The unlock cookie is a hash of the code
 * and the salt, so every cookie already issued stops matching the moment either
 * one changes — there is no session list to sweep. Said plainly in the returned
 * message, because it is a consequence a client would otherwise discover from a
 * colleague who suddenly cannot get in.
 */
export async function saveAccessCode(
  _prev: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  await requireUser();

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const code = text(formData, "access_code");

  // Checked here as well as in the database so the message is the one written
  // above rather than a constraint name. '' is exempt: it is the deliberate
  // no-code state, not a weak code.
  if (code && code.length < 4) {
    return {
      ok: false,
      message:
        "An access code has to be at least 4 characters — or leave it empty to have no code at all.",
    };
  }

  const failure = await writeSettings(supabase, { access_code: code });
  if (failure) return { ok: false, message: failure };

  revalidatePath("/admin/settings");
  return {
    ok: true,
    message: code
      ? "Access code saved. Anyone who was already let in will have to enter the new code."
      : "The access code has been removed. Nobody can get past the gate now — including anyone who was already let in.",
  };
}

/**
 * Rotates the salt: keeps the code, invalidates every unlock cookie in
 * existence.
 *
 * The reason this exists separately from changing the code: the code may be
 * printed on something, or already spoken to fifty people. This revokes the
 * laptops and phones that have already been let in without asking the client to
 * reissue the code itself.
 */
export async function revokeSiteAccess(): Promise<SettingsFormState> {
  await requireUser();

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  // Minted here rather than by defaulting the column, because an UPDATE does
  // not re-run a column default. crypto.randomUUID() is in Node's global scope.
  const failure = await writeSettings(supabase, { token_salt: crypto.randomUUID() });
  if (failure) return { ok: false, message: failure };

  // This browser's own preview cookie is now stale too — clearing it here keeps
  // the admin from being the one person who cannot tell the revoke worked.
  (await cookies()).delete(SITE_UNLOCK_COOKIE);

  revalidatePath("/admin/settings");
  return {
    ok: true,
    message:
      "Everyone has been signed out. The code itself is unchanged — anyone who has it can enter it again.",
  };
}

// ---------------------------------------------------------------------------
// The gate's copy
// ---------------------------------------------------------------------------

export async function saveGateCopy(
  _prev: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  await requireUser();

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const copy: GateCopy = {
    eyebrow: text(formData, "eyebrow"),
    heading: text(formData, "heading"),
    body: text(formData, "body"),
    note: text(formData, "note"),
    show_contact: formData.get("show_contact") === "on",
  };

  if (!copy.heading) {
    return { ok: false, message: "The gate needs a heading — it is the only line that always shows." };
  }

  const failure = await writeSettings(supabase, copy);
  if (failure) return { ok: false, message: failure };

  revalidatePath("/admin/settings");
  revalidatePath("/coming-soon");
  return { ok: true, message: "Saved." };
}

// ---------------------------------------------------------------------------
// Admin preview
// ---------------------------------------------------------------------------

/**
 * Lets the signed-in admin through their own gate.
 *
 * Mints the unlock cookie directly instead of asking them to type the code,
 * which matters in the state that is otherwise a dead end: the lock is on and
 * NO code is set, so the public door is shut and there is nothing to type. An
 * authenticated admin is exactly who should still be able to see the site then.
 *
 * requireUser() is the whole authorisation — this is the one path that hands
 * out the cookie without presenting the code, so it must never be reachable by
 * anyone who is not signed in to the panel.
 */
export async function unlockForPreview(): Promise<SettingsFormState> {
  await requireUser();

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const { data, error } = await supabase
    .from("site_lock_settings")
    .select("access_code, token_salt")
    .maybeSingle();

  if (error) {
    console.error("[makro] Failed to read site lock settings:", error.message);
    return { ok: false, message: error.message };
  }

  if (!data) {
    return { ok: true, message: "The site is not locked — it is already open." };
  }

  (await cookies()).set({
    name: SITE_UNLOCK_COOKIE,
    value: await unlockToken(data.token_salt, data.access_code),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SITE_UNLOCK_MAX_AGE,
  });

  return {
    ok: true,
    message: canonicalCode(data.access_code)
      ? "This browser can now see the site. Open it in a new tab."
      : "This browser can now see the site, even though no access code is set. Open it in a new tab.",
  };
}
