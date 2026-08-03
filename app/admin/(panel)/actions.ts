"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabase, requireUser } from "@/lib/supabase/server";

/**
 * Dashboard notes — create / update / delete.
 *
 * The notes tab lives inside a Client Component (the tabs keep their state in
 * React, not the URL), so these actions take plain serialisable arguments and
 * return a result object instead of redirecting. The panel calls
 * `router.refresh()` afterwards to pull the revalidated server render back in.
 */

export type NoteActionState = { ok: boolean; message: string };

export interface NoteInput {
  title: string;
  body: string;
}

const noteSchema = z.object({
  title: z.string().trim().min(1, "Give the note a title.").max(160, "Titles are capped at 160 characters."),
  body: z.string().trim().max(8000, "That note is too long — 8,000 characters maximum."),
});

const NOT_CONNECTED = "Supabase is not connected, so the note was not saved.";

/** Turns whatever the form handed us into a validated payload. */
function parse(input: NoteInput) {
  return noteSchema.safeParse({
    title: input?.title ?? "",
    body: input?.body ?? "",
  });
}

export async function createNote(input: NoteInput): Promise<NoteActionState> {
  await requireUser();

  const parsed = parse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "That note is not valid." };
  }

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONNECTED };

  const { error } = await supabase.from("notes").insert({
    title: parsed.data.title,
    body: parsed.data.body || null,
  });

  if (error) {
    console.error("[makro] createNote failed", error);
    return { ok: false, message: "The note could not be saved. Please try again." };
  }

  revalidatePath("/admin");
  return { ok: true, message: "Note added." };
}

export async function updateNote(id: string, input: NoteInput): Promise<NoteActionState> {
  await requireUser();

  if (!id) return { ok: false, message: "That note no longer exists." };

  const parsed = parse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "That note is not valid." };
  }

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONNECTED };

  // updated_at is maintained by the notes_touch_updated_at trigger.
  const { error } = await supabase
    .from("notes")
    .update({ title: parsed.data.title, body: parsed.data.body || null })
    .eq("id", id);

  if (error) {
    console.error("[makro] updateNote failed", error);
    return { ok: false, message: "The note could not be updated. Please try again." };
  }

  revalidatePath("/admin");
  return { ok: true, message: "Note updated." };
}

export async function deleteNote(id: string): Promise<NoteActionState> {
  await requireUser();

  if (!id) return { ok: false, message: "That note no longer exists." };

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONNECTED };

  const { error } = await supabase.from("notes").delete().eq("id", id);

  if (error) {
    console.error("[makro] deleteNote failed", error);
    return { ok: false, message: "The note could not be deleted. Please try again." };
  }

  revalidatePath("/admin");
  return { ok: true, message: "Note deleted." };
}
