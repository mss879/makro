"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase, requireUser } from "@/lib/supabase/server";
import type { HomeHeroSettingsRow } from "@/lib/supabase/types";

/**
 * Home Hero — the opening of the home page (20260929000100_home_hero.sql).
 *
 * Every export is a Server Action, so every export starts with `requireUser()`
 * — the proxy gate at /admin is optimistic, and a matcher change must never be
 * able to silently unprotect a mutation.
 *
 * A save revalidates "/" as well as this screen: the hero exists on exactly
 * one public page.
 *
 * THE FILES A SAVE REPLACES ARE LEFT IN THE BUCKET, deliberately — unlike
 * Selected Work, which deletes a replaced card image on the spot. The home page
 * can go on serving the previous HTML for up to a minute after a save (its
 * revalidate backstop, plus any CDN in front of it), and that HTML still points
 * at the old video and still. Deleting them here would blank the most visible
 * element on the site for everyone who loads it in that window. An orphaned
 * file costs a little storage; old ones can be cleared from the
 * home-hero-media bucket in the Supabase dashboard at any time.
 */

const NOT_CONFIGURED =
  "Supabase is not connected — add the keys to .env.local and restart the dev server.";

const MISSING_TABLE =
  "The home hero table is not in the database yet. Apply supabase/migrations/20260929000100_home_hero.sql, then reload this screen.";

/** Three rows is already a tall block on a phone, where it comes out of the picture. */
const MAX_HEADING_LINES = 3;

export type HomeHeroFormState = { ok: boolean; message: string };

type AdminClient = NonNullable<Awaited<ReturnType<typeof createServerSupabase>>>;

type HeroPayload = Omit<HomeHeroSettingsRow, "id" | "created_at" | "updated_at">;

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * A page on this site ("/projects", but never "//host", which a browser reads
 * as another site), an anchor, a full web address, or a mail/phone link.
 * Anything else — "www.example.com", "projects" — would resolve relative to
 * the home page and go nowhere, and `javascript:` has no business in a button.
 */
function isLink(href: string): boolean {
  return /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i.test(href);
}

/** A bundled /public path or an uploaded file's full https URL. */
function isVideoSource(src: string): boolean {
  return /^(\/(?!\/)|https:\/\/)/i.test(src);
}

/** As a video, plus a bare Unsplash photo id — the third shape every image column takes. */
function isImageSource(src: string): boolean {
  return isVideoSource(src) || /^[A-Za-z0-9_-]+$/.test(src);
}

/**
 * PGRST205 is "table not in the schema cache" — the migration has not been
 * applied, by far the likeliest error on a new screen. 23514 is one of the two
 * CHECKs, which the validation below already reports in plainer words; this is
 * only reachable if the two ever drift.
 */
function friendly(error: { code?: string | null; message: string }): string {
  if (error.code === "PGRST205" || error.message.includes("schema cache")) return MISSING_TABLE;
  if (error.code === "23514") {
    return "The hero needs a headline and at least one video or image.";
  }
  return error.message;
}

function readButton(
  formData: FormData,
  prefix: "primary" | "secondary",
  name: string
): { error: string } | { label: string; href: string } {
  const label = text(formData, `${prefix}_label`);
  const href = text(formData, `${prefix}_href`);

  if (label && !href) {
    return { error: `Add a link for the ${name} button, or clear its label to hide it.` };
  }
  if (href && !isLink(href)) {
    return {
      error: `The ${name} button's link has to be a page on this site starting with / (like /projects), or a full address starting with https://.`,
    };
  }
  return { label, href };
}

function readHero(formData: FormData): { error: string } | { payload: HeroPayload } {
  // One line per row. Runs of spaces inside a line are collapsed; blank rows
  // are dropped rather than rendered as empty lines of the heading.
  const headingLines = String(formData.get("heading") ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter(Boolean);

  if (!headingLines.length) {
    return {
      error: "Add a headline. It is the home page's main heading, and the page should never open without one.",
    };
  }
  if (headingLines.length > MAX_HEADING_LINES) {
    return {
      error: `Keep the headline to ${MAX_HEADING_LINES} lines at most — on a phone, every extra line comes out of the picture above it.`,
    };
  }

  const video = text(formData, "video");
  const videoMobile = text(formData, "video_mobile");
  const image = text(formData, "image");
  const imageMobile = text(formData, "image_mobile");

  const badVideo = [
    [video, "desktop video"],
    [videoMobile, "phone video"],
  ].find(([src]) => src && !isVideoSource(src));
  if (badVideo) {
    return {
      error: `The ${badVideo[1]} has to be an upload, or a path to a file in /public starting with / — "${badVideo[0]}" is neither.`,
    };
  }

  const badImage = [
    [image, "desktop still"],
    [imageMobile, "phone still"],
  ].find(([src]) => src && !isImageSource(src));
  if (badImage) {
    return {
      error: `The ${badImage[1]} has to be an upload, a path starting with /, or an Unsplash photo id — "${badImage[0]}" is none of those.`,
    };
  }

  if (!video && !videoMobile && !image && !imageMobile) {
    return {
      error: "The hero needs a picture — upload a video or an image. With neither, the home page would open on a blank black screen.",
    };
  }

  const primary = readButton(formData, "primary", "filled");
  if ("error" in primary) return primary;
  const secondary = readButton(formData, "secondary", "outlined");
  if ("error" in secondary) return secondary;

  return {
    payload: {
      // Empty normalised to null, so "never set" and "cleared" are one state
      // and the renderer has one test to make.
      video: video || null,
      video_mobile: videoMobile || null,
      image: image || null,
      image_mobile: imageMobile || null,
      alt: text(formData, "alt"),
      heading_lines: headingLines,
      // One paragraph: a line break typed into the textarea would collapse to
      // a space on the page anyway, so it is stored the way it renders.
      body: text(formData, "body").replace(/\s*\n\s*/g, " "),
      primary_label: primary.label,
      primary_href: primary.href,
      secondary_label: secondary.label,
      secondary_href: secondary.href,
    },
  };
}

/**
 * Writes the singleton, creating it if it is missing. The migration seeds the
 * row, but a project restored from a partial dump — or one where the row was
 * deleted by hand — still has to be able to save.
 *
 * Returns an error message, or null.
 */
async function writeHero(supabase: AdminClient, payload: HeroPayload): Promise<string | null> {
  const { data: existing, error: readError } = await supabase
    .from("home_hero_settings")
    .select("id")
    .maybeSingle();

  if (readError) return friendly(readError);

  const { error } = existing
    ? await supabase.from("home_hero_settings").update(payload).eq("id", existing.id)
    : await supabase.from("home_hero_settings").insert(payload);

  // The unique index on ((true)) admits one row ever, so two admins saving a
  // never-created hero at once means one of them loses with 23505. The
  // winner's row is as good as ours — adopt it and write over it.
  if (error?.code === "23505") {
    const { data: row } = await supabase.from("home_hero_settings").select("id").maybeSingle();
    if (!row) return "The hero could not be saved — reload the page and try again.";

    const { error: retryError } = await supabase
      .from("home_hero_settings")
      .update(payload)
      .eq("id", row.id);
    return retryError ? friendly(retryError) : null;
  }

  if (error) console.error("[makro] Failed to save the home hero:", error.message);
  return error ? friendly(error) : null;
}

export async function saveHomeHero(
  _prev: HomeHeroFormState,
  formData: FormData
): Promise<HomeHeroFormState> {
  await requireUser();

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const parsed = readHero(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error };

  const failure = await writeHero(supabase, parsed.payload);
  if (failure) return { ok: false, message: failure };

  revalidatePath("/");
  revalidatePath("/admin/home-hero");

  // Legal, and worth a word: without a still, visitors look at the hero's
  // black ground until the video's first frame arrives.
  const { video, video_mobile, image, image_mobile } = parsed.payload;
  if ((video || video_mobile) && !image && !image_mobile) {
    return {
      ok: true,
      message:
        "Saved. There is no still image, so visitors see black until the video starts — upload one to fill that moment.",
    };
  }
  return { ok: true, message: "Saved." };
}
