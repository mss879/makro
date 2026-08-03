"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase, requireUser } from "@/lib/supabase/server";
import { SELECTED_WORK_IMAGE_BUCKET } from "@/lib/supabase/config";
import { DEFAULT_SELECTED_WORK_SETTINGS } from "@/lib/selected-work-data";
import { toCopyColumns } from "@/components/admin/selected-work/copy";
import type { SelectedWorkCopy } from "@/components/admin/selected-work/copy";
import type { SelectedWorkCardRow, SelectedWorkKind } from "@/lib/supabase/types";

/**
 * Selected Work — the home page rail.
 *
 * Every export is a Server Action, so every export starts with `requireUser()`:
 * the proxy gate at /admin is optimistic and a matcher change must never be
 * able to silently unprotect a mutation.
 *
 * Every mutation revalidates BOTH this screen and "/" — unlike projects, this
 * content exists only on the home page, so a stale "/" is the whole visible
 * consequence of forgetting.
 */

const NOT_CONFIGURED =
  "Supabase is not connected — add the keys to .env.local and restart the dev server.";

/** State returned to `useActionState` by the forms on this screen. */
export type SelectedWorkFormState = { ok: boolean; message: string };

type AdminClient = NonNullable<Awaited<ReturnType<typeof createServerSupabase>>>;

const KINDS: readonly SelectedWorkKind[] = ["cover", "gallery"];

/** Everything the card dialog owns. `sort_order` is the reorder control's alone. */
type CardInput = {
  kind: SelectedWorkKind;
  image: string;
  alt: string;
  index_label: string;
  status_badge: string;
  kicker: string;
  title: string;
  caption: string;
  project_slug: string;
  href: string;
  published: boolean;
};

// ---------------------------------------------------------------------------
// Helpers (module-private: a "use server" file can only export async functions)
// ---------------------------------------------------------------------------

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Turns Postgres noise into something an admin can act on.
 *
 * 23505 is only reachable from a CARD write here — it is the partial unique
 * index on (caption) where caption <> '' and published. The settings table has
 * a unique index too, on the constant expression that makes it a singleton, but
 * that one is caught inline in writeSettings() where it means something else
 * entirely ("someone else created the row first").
 */
function friendly(error: { code?: string | null; message: string }): string {
  if (error.code === "23505") {
    return "Another published card already uses that caption. The rail keys its panels on the caption, so two published cards cannot share one — reword it, or unpublish the other card first.";
  }
  if (error.code === "23514") {
    return "That card kind is not valid — choose Cover or Gallery.";
  }
  return error.message;
}

/** The admin screen plus the home page, which is the section's only audience. */
function revalidateSelectedWork() {
  revalidatePath("/admin/selected-work");
  revalidatePath("/");
}

/**
 * Writes a patch onto the settings singleton, creating the row if it is missing.
 *
 * Returns an error message, or null. A missing row is normal rather than
 * exceptional: the migration seeds one, but a project restored from a partial
 * dump — or one where the row was deleted by hand — has to be able to save.
 */
async function writeSettings(
  supabase: AdminClient,
  patch: Partial<SelectedWorkCopy & { enabled: boolean }>
): Promise<string | null> {
  const { data: existing, error: readError } = await supabase
    .from("selected_work_settings")
    .select("id")
    .maybeSingle();

  if (readError) {
    console.error("[makro] Failed to read selected work settings:", readError.message);
    return readError.message;
  }

  if (existing) {
    const { error } = await supabase
      .from("selected_work_settings")
      .update(patch)
      .eq("id", existing.id);

    if (error) console.error("[makro] Failed to save selected work settings:", error.message);
    return error ? error.message : null;
  }

  // The seeded copy underneath the patch, so the columns this caller did not
  // touch read the way the migration intended rather than falling back to the
  // thinner column defaults (`body` in particular defaults to '' in the table).
  const { error } = await supabase
    .from("selected_work_settings")
    .insert({ enabled: true, ...toCopyColumns(DEFAULT_SELECTED_WORK_SETTINGS), ...patch });

  // The unique index on ((true)) admits exactly one row ever, so two admins
  // saving a never-configured section at once means one of them loses with
  // 23505. The winner's row is as good as ours — adopt it and patch it.
  if (error?.code === "23505") {
    const { data: row } = await supabase
      .from("selected_work_settings")
      .select("id")
      .maybeSingle();

    if (!row) return "The section settings could not be saved — reload the page and try again.";

    const { error: updateError } = await supabase
      .from("selected_work_settings")
      .update(patch)
      .eq("id", row.id);

    if (updateError) {
      console.error("[makro] Failed to save selected work settings:", updateError.message);
      return updateError.message;
    }
    return null;
  }

  if (error) console.error("[makro] Failed to create selected work settings:", error.message);
  return error ? error.message : null;
}

/**
 * A project slug pasted as a path is the obvious mistake — the field sits right
 * next to a link field, and the card composes `/projects/<slug>` itself. Strip
 * the prefix rather than building `/projects//projects/makro-heights`.
 */
function projectSlug(value: string): string {
  return value
    .replace(/^\/?projects\//, "")
    .replace(/^\/+|\/+$/g, "")
    .trim();
}

function readCard(formData: FormData): { error: string } | { payload: CardInput } {
  const kind = text(formData, "kind") as SelectedWorkKind;
  if (!KINDS.includes(kind)) return { error: "Choose whether this is a cover or a gallery panel." };

  const image = text(formData, "image");
  if (!image) return { error: "This panel needs an image — upload one, or paste an image URL." };

  const alt = text(formData, "alt");
  if (!alt) {
    return {
      error:
        "Alt text is required — it is what a screen reader announces in place of the image.",
    };
  }

  return {
    payload: {
      kind,
      image,
      alt,
      index_label: text(formData, "index_label"),
      status_badge: text(formData, "status_badge"),
      kicker: text(formData, "kicker"),
      title: text(formData, "title"),
      caption: text(formData, "caption"),
      project_slug: projectSlug(text(formData, "project_slug")),
      href: text(formData, "href"),
      published: formData.get("published") === "on",
    },
  };
}

/**
 * Best-effort bucket cleanup, so a deleted or replaced panel does not orphan
 * its object. Only URLs that actually point into the Selected Work bucket are
 * touched — seeded rows reference /brand/*.jpg and are left alone, as are
 * pasted Unsplash ids.
 */
async function removeStorageObjects(supabase: AdminClient, urls: string[]) {
  const marker = `/storage/v1/object/public/${SELECTED_WORK_IMAGE_BUCKET}/`;
  const paths = urls
    .map((url) => {
      const at = url.indexOf(marker);
      if (at === -1) return null;
      return decodeURIComponent(url.slice(at + marker.length).split("?")[0]);
    })
    .filter((path): path is string => Boolean(path));

  if (paths.length === 0) return;

  const { error } = await supabase.storage.from(SELECTED_WORK_IMAGE_BUCKET).remove(paths);
  if (error) console.error("[makro] Could not delete selected work images:", error.message);
}

async function listCards(supabase: AdminClient): Promise<SelectedWorkCardRow[]> {
  const { data, error } = await supabase
    .from("selected_work_cards")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) console.error("[makro] Failed to read selected work cards:", error.message);
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Section toggle + copy
// ---------------------------------------------------------------------------

/**
 * The headline control: whether the home page renders this section at all.
 *
 * Kept apart from the copy form on purpose. It is a one-click, immediately live
 * change, and it must not be possible to flip it by accident while saving a
 * typo fix in the heading.
 */
export async function setSelectedWorkEnabled(
  enabled: boolean
): Promise<SelectedWorkFormState> {
  await requireUser();

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const failure = await writeSettings(supabase, { enabled });
  if (failure) return { ok: false, message: failure };

  revalidateSelectedWork();
  return {
    ok: true,
    message: enabled
      ? "Selected Work is back on the home page."
      : "Selected Work has been removed from the home page.",
  };
}

export async function saveSelectedWorkSettings(
  _prev: SelectedWorkFormState,
  formData: FormData
): Promise<SelectedWorkFormState> {
  await requireUser();

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  // The three heading parts are concatenated verbatim by the component, so
  // their leading and trailing spaces are meaningful — "A portfolio built on "
  // needs its trailing space, ", not haste." needs its leading comma. This is
  // the one payload on the screen that is NOT trimmed.
  const copy: SelectedWorkCopy = {
    index_label: text(formData, "index_label"),
    eyebrow: text(formData, "eyebrow"),
    heading_before: String(formData.get("heading_before") ?? ""),
    heading_highlight: String(formData.get("heading_highlight") ?? ""),
    heading_after: String(formData.get("heading_after") ?? ""),
    body: text(formData, "body"),
    cta_label: text(formData, "cta_label"),
    cta_href: text(formData, "cta_href"),
    scroll_hint: text(formData, "scroll_hint"),
    endcap_heading: text(formData, "endcap_heading"),
    endcap_link_label: text(formData, "endcap_link_label"),
    endcap_href: text(formData, "endcap_href"),
  };

  const failure = await writeSettings(supabase, copy);
  if (failure) return { ok: false, message: failure };

  revalidateSelectedWork();
  return { ok: true, message: "Saved." };
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

/**
 * Create and edit in one action — the dialog is one form, and the only
 * difference is whether it carries an id.
 */
export async function saveSelectedWorkCard(
  _prev: SelectedWorkFormState,
  formData: FormData
): Promise<SelectedWorkFormState> {
  await requireUser();

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const parsed = readCard(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error };

  const id = text(formData, "id");

  if (!id) {
    // New cards land at the end of the rail; the reorder controls are the only
    // way sort_order is ever chosen by hand.
    const { data: last } = await supabase
      .from("selected_work_cards")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase
      .from("selected_work_cards")
      .insert({ ...parsed.payload, sort_order: (last?.sort_order ?? -1) + 1 });

    if (error) {
      console.error("[makro] Failed to create selected work card:", error.message);
      return { ok: false, message: friendly(error) };
    }

    revalidateSelectedWork();
    return { ok: true, message: "Card added." };
  }

  // Read the outgoing image first: if this save replaces it, the old object is
  // unreferenced the moment the update lands and nothing else would clean it up.
  const { data: previous } = await supabase
    .from("selected_work_cards")
    .select("image")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("selected_work_cards")
    .update(parsed.payload)
    .eq("id", id);

  if (error) {
    console.error("[makro] Failed to update selected work card:", error.message);
    return { ok: false, message: friendly(error) };
  }

  if (previous?.image && previous.image !== parsed.payload.image) {
    await removeStorageObjects(supabase, [previous.image]);
  }

  revalidateSelectedWork();
  return { ok: true, message: "Saved." };
}

/** The dialog confirms first; this just performs it. */
export async function deleteSelectedWorkCard(id: string): Promise<SelectedWorkFormState> {
  await requireUser();

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const { data: card } = await supabase
    .from("selected_work_cards")
    .select("image")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("selected_work_cards").delete().eq("id", id);
  if (error) {
    console.error("[makro] Failed to delete selected work card:", error.message);
    return { ok: false, message: friendly(error) };
  }

  if (card?.image) await removeStorageObjects(supabase, [card.image]);

  revalidateSelectedWork();
  return { ok: true, message: "Card deleted." };
}

/**
 * Writes 0..n-1 onto the given order.
 *
 * Takes the WHOLE list rather than a single move, so the numbers are rewritten
 * from scratch every time and can never drift into ties — which the rail would
 * resolve by created_at, i.e. not at all visibly.
 */
export async function reorderSelectedWorkCards(
  orderedIds: string[]
): Promise<SelectedWorkFormState> {
  await requireUser();

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const current = await listCards(supabase);
  const currentIds = current.map((card) => card.id);

  // The client sends a permutation of what it was given; anything else means
  // the rail moved underneath it (another tab, another admin).
  const isPermutation =
    orderedIds.length === currentIds.length &&
    new Set(orderedIds).size === orderedIds.length &&
    orderedIds.every((id) => currentIds.includes(id));

  if (!isPermutation) {
    return {
      ok: false,
      message: "This rail changed elsewhere — reload the page and try again.",
    };
  }

  for (let i = 0; i < orderedIds.length; i += 1) {
    const { error } = await supabase
      .from("selected_work_cards")
      .update({ sort_order: i })
      .eq("id", orderedIds[i]);

    if (error) {
      console.error("[makro] Failed to reorder selected work cards:", error.message);
      return { ok: false, message: friendly(error) };
    }
  }

  revalidateSelectedWork();
  return { ok: true, message: "" };
}
