"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase, requireUser } from "@/lib/supabase/server";
import { getIntakeStage, positionFor } from "@/lib/crm";
import type { InquiryRow } from "@/lib/supabase/types";

/**
 * Inquiry mutations.
 *
 * Every action re-checks the session with `requireUser()` — the proxy gate is
 * optimistic and must never be the only thing standing between an anonymous
 * request and a write.
 */

export interface InquiryActionResult {
  ok: boolean;
  count: number;
  error?: string;
}

const NOT_CONFIGURED =
  "Supabase is not connected. Add your credentials to .env.local and restart the server.";

const NO_PIPELINE =
  'No default pipeline was found. Apply every file in supabase/migrations/ in filename order in the Supabase SQL editor — they seed the default "Sales Pipeline" and its locked "New Leads" intake stage — then try again.';

function failed(error: string, count = 0): InquiryActionResult {
  return { ok: false, count, error };
}

/** Strips anything that is not a plausible id before it reaches the database. */
function cleanIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter((id) => typeof id === "string" && id.length > 0)));
}

function refresh() {
  revalidatePath("/admin/inquiries");
  revalidatePath("/admin/crm");
}

/** An inquiry that already produced a lead is never transferred twice. */
function alreadyTransferred(inquiry: InquiryRow) {
  return inquiry.status === "transferred" || Boolean(inquiry.lead_id);
}

/**
 * Pushes the selected inquiries into the CRM.
 *
 * Each one becomes a lead at the TOP of the default pipeline's intake stage
 * ("New Leads"), carrying its contact details across and seeding the lead's
 * notes with the original message. The inquiry is then marked `transferred`
 * and linked to the lead it created, so the two stay tied together.
 *
 * Inquiries that were transferred earlier are skipped silently rather than
 * duplicated — selecting a whole page and hitting transfer is a normal thing
 * to do, and it should only pick up what is genuinely new.
 */
export async function transferToCrm(ids: string[]): Promise<InquiryActionResult> {
  await requireUser();

  const targets = cleanIds(ids);
  if (targets.length === 0) return { ok: true, count: 0 };

  const supabase = await createServerSupabase();
  if (!supabase) return failed(NOT_CONFIGURED);

  const intake = await getIntakeStage(supabase);
  if (!intake) return failed(NO_PIPELINE);

  const { data: inquiries, error: readError } = await supabase
    .from("inquiries")
    .select("*")
    .in("id", targets);

  if (readError) return failed(readError.message);

  // Oldest first, so that after the loop the newest inquiry sits topmost.
  const pending = (inquiries ?? [])
    .filter((inquiry) => !alreadyTransferred(inquiry))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  if (pending.length === 0) return { ok: true, count: 0 };

  // Existing cards in the destination column, ascending. Kept in memory and
  // extended as we go so a multi-select transfer stacks cleanly instead of
  // every new lead computing the same position.
  const { data: existing } = await supabase
    .from("leads")
    .select("position")
    .eq("stage_id", intake.stage.id)
    .order("position", { ascending: true });

  const siblings: { position: number }[] = existing ?? [];

  let count = 0;

  for (const inquiry of pending) {
    const position = positionFor(siblings, 0);

    const { data: lead, error: insertError } = await supabase
      .from("leads")
      .insert({
        name: inquiry.name,
        email: inquiry.email,
        phone: inquiry.phone,
        interest: inquiry.interest,
        project: inquiry.project,
        notes: inquiry.message,
        pipeline_id: intake.pipeline.id,
        stage_id: intake.stage.id,
        position,
        inquiry_id: inquiry.id,
      })
      .select("id")
      .single();

    if (insertError || !lead) {
      refresh();
      return failed(
        insertError?.message ?? "The lead could not be created.",
        count
      );
    }

    const { error: updateError } = await supabase
      .from("inquiries")
      .update({ status: "transferred", lead_id: lead.id })
      .eq("id", inquiry.id);

    if (updateError) {
      refresh();
      return failed(updateError.message, count);
    }

    siblings.unshift({ position });
    count += 1;
  }

  refresh();
  return { ok: true, count };
}

/** Moves inquiries out of the working list without losing them. */
export async function archiveInquiries(ids: string[]): Promise<InquiryActionResult> {
  await requireUser();

  const targets = cleanIds(ids);
  if (targets.length === 0) return { ok: true, count: 0 };

  const supabase = await createServerSupabase();
  if (!supabase) return failed(NOT_CONFIGURED);

  const { data, error } = await supabase
    .from("inquiries")
    .update({ status: "archived" })
    .in("id", targets)
    .select("id");

  if (error) return failed(error.message);

  refresh();
  return { ok: true, count: data?.length ?? 0 };
}

/**
 * Permanent delete. Any lead created from the inquiry survives — the schema
 * sets `leads.inquiry_id` to null rather than cascading.
 */
export async function deleteInquiries(ids: string[]): Promise<InquiryActionResult> {
  await requireUser();

  const targets = cleanIds(ids);
  if (targets.length === 0) return { ok: true, count: 0 };

  const supabase = await createServerSupabase();
  if (!supabase) return failed(NOT_CONFIGURED);

  const { data, error } = await supabase
    .from("inquiries")
    .delete()
    .in("id", targets)
    .select("id");

  if (error) return failed(error.message);

  refresh();
  return { ok: true, count: data?.length ?? 0 };
}
