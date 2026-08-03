"use server";

import { revalidatePath } from "next/cache";
import { positionFor } from "@/lib/crm";
import type { Supa } from "@/lib/crm";
import { createServerSupabase, requireUser } from "@/lib/supabase/server";
import type { PipelineStageRow } from "@/lib/supabase/types";

/**
 * CRM server actions.
 *
 * Every export is an async Server Action (a `"use server"` module may export
 * nothing else), every one of them opens with `await requireUser()`, and none
 * of them let a Postgres error escape as an unhandled exception: the database
 * enforces the locked intake stage and the undeletable default pipeline with
 * triggers, and those raise genuinely readable messages, so we pass the text
 * straight back to the board.
 */

const CRM_PATH = "/admin/crm";

type ActionResult = {
  ok: boolean;
  error?: string;
  /** Set by createPipeline so the client can navigate to the new board. */
  pipelineId?: string;
};

const NOT_CONFIGURED: ActionResult = {
  ok: false,
  error:
    "Supabase is not connected yet — add the keys to .env.local and apply supabase/migrations/ in filename order.",
};

/** Turns anything thrown (Error, PostgrestError, …) into a readable message. */
function fail(error: unknown): ActionResult {
  if (error instanceof Error && error.message) return { ok: false, error: error.message };
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return { ok: false, error: message };
  }
  return { ok: false, error: "Something went wrong. Please try again." };
}

/** Trims a form value down to `null` when it is blank. */
function optional(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Parses the money field; anything unparseable becomes null rather than NaN. */
function numeric(value: string | null | undefined): number | null {
  const trimmed = (value ?? "").trim().replace(/,/g, "");
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampIndex(index: number, max: number): number {
  if (!Number.isFinite(index)) return max;
  return Math.max(0, Math.min(Math.trunc(index), max));
}

/**
 * Resolves the stage a lead should land on. Guarantees the returned stage
 * belongs to `pipelineId` — if the requested stage belongs to a different
 * pipeline (or has been deleted), the pipeline's first stage wins.
 */
async function resolveStage(
  supabase: Supa,
  pipelineId: string,
  stageId: string | null
): Promise<PipelineStageRow | null> {
  const { data, error } = await supabase
    .from("pipeline_stages")
    .select("*")
    .eq("pipeline_id", pipelineId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  if (!data?.length) return null;
  return data.find((stage) => stage.id === stageId) ?? data[0];
}

/** A fractional position that puts a card at the bottom of `stageId`. */
async function endPosition(supabase: Supa, stageId: string): Promise<number> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("stage_id", stageId)
    .order("position", { ascending: true });

  if (error) throw new Error(error.message);
  const siblings = data ?? [];
  return positionFor(siblings, siblings.length);
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

// Input shapes stay local: a `"use server"` module may only export async
// functions, and callers get these types back through inference anyway.
interface MoveLeadInput {
  leadId: string;
  stageId: string;
  index: number;
}

/**
 * Drops a lead into `stageId` at `index`. The new position is the midpoint
 * between its neighbours, so exactly one row is written — the column is never
 * renumbered.
 */
export async function moveLead(input: MoveLeadInput): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createServerSupabase();
    if (!supabase) return NOT_CONFIGURED;

    const { data: stage, error: stageError } = await supabase
      .from("pipeline_stages")
      .select("*")
      .eq("id", input.stageId)
      .maybeSingle();
    if (stageError) throw new Error(stageError.message);
    if (!stage) {
      return { ok: false, error: "That stage no longer exists — refresh the board." };
    }

    // Siblings exclude the card being moved, which is what positionFor expects.
    const { data: siblingRows, error: siblingsError } = await supabase
      .from("leads")
      .select("*")
      .eq("stage_id", stage.id)
      .neq("id", input.leadId)
      .order("position", { ascending: true });
    if (siblingsError) throw new Error(siblingsError.message);

    const siblings = siblingRows ?? [];
    const position = positionFor(siblings, clampIndex(input.index, siblings.length));

    const { error } = await supabase
      .from("leads")
      .update({ stage_id: stage.id, pipeline_id: stage.pipeline_id, position })
      .eq("id", input.leadId);
    if (error) throw new Error(error.message);

    revalidatePath(CRM_PATH);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

interface LeadInput {
  name: string;
  email?: string;
  phone?: string;
  interest?: string;
  project?: string;
  value?: string;
  notes?: string;
  pipelineId: string;
  stageId: string;
}

export async function createLead(input: LeadInput): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createServerSupabase();
    if (!supabase) return NOT_CONFIGURED;

    const name = input.name.trim();
    if (!name) return { ok: false, error: "A name is required." };

    const stage = await resolveStage(supabase, input.pipelineId, input.stageId);
    if (!stage) {
      return { ok: false, error: "That pipeline has no stages yet — add one first." };
    }

    const { error } = await supabase.from("leads").insert({
      name,
      email: optional(input.email),
      phone: optional(input.phone),
      interest: optional(input.interest),
      project: optional(input.project),
      notes: optional(input.notes),
      value: numeric(input.value),
      pipeline_id: stage.pipeline_id,
      stage_id: stage.id,
      position: await endPosition(supabase, stage.id),
    });
    if (error) throw new Error(error.message);

    revalidatePath(CRM_PATH);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/**
 * Edits a lead. The pipeline and stage selects can send the lead to a whole
 * different pipeline; resolveStage() makes sure it always lands on a stage
 * that actually belongs to the chosen pipeline.
 */
export async function updateLead(input: LeadInput & { id: string }): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createServerSupabase();
    if (!supabase) return NOT_CONFIGURED;

    const name = input.name.trim();
    if (!name) return { ok: false, error: "A name is required." };

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", input.id)
      .maybeSingle();
    if (leadError) throw new Error(leadError.message);
    if (!lead) return { ok: false, error: "That lead no longer exists." };

    const stage = await resolveStage(supabase, input.pipelineId, input.stageId);
    if (!stage) {
      return { ok: false, error: "That pipeline has no stages yet — add one first." };
    }

    // Only re-position when the card actually changes column.
    const position =
      stage.id === lead.stage_id ? lead.position : await endPosition(supabase, stage.id);

    const { error } = await supabase
      .from("leads")
      .update({
        name,
        email: optional(input.email),
        phone: optional(input.phone),
        interest: optional(input.interest),
        project: optional(input.project),
        notes: optional(input.notes),
        value: numeric(input.value),
        pipeline_id: stage.pipeline_id,
        stage_id: stage.id,
        position,
      })
      .eq("id", input.id);
    if (error) throw new Error(error.message);

    revalidatePath(CRM_PATH);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteLead(leadId: string): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createServerSupabase();
    if (!supabase) return NOT_CONFIGURED;

    const { error } = await supabase.from("leads").delete().eq("id", leadId);
    if (error) throw new Error(error.message);

    revalidatePath(CRM_PATH);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Pipelines
// ---------------------------------------------------------------------------

interface CreatePipelineInput {
  name: string;
  stages: string[];
}

export async function createPipeline(input: CreatePipelineInput): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createServerSupabase();
    if (!supabase) return NOT_CONFIGURED;

    const name = input.name.trim();
    if (!name) return { ok: false, error: "Give the pipeline a name." };

    const stageNames = input.stages.map((stage) => stage.trim()).filter(Boolean);
    if (!stageNames.length) return { ok: false, error: "Add at least one stage." };

    const { data: pipeline, error: pipelineError } = await supabase
      .from("pipelines")
      .insert({ name, is_default: false })
      .select("*")
      .single();
    if (pipelineError) throw new Error(pipelineError.message);
    if (!pipeline) return { ok: false, error: "The pipeline could not be created." };

    const { error: stagesError } = await supabase.from("pipeline_stages").insert(
      stageNames.map((stageName, index) => ({
        pipeline_id: pipeline.id,
        name: stageName,
        position: index,
        // Only the default pipeline's intake stage is ever locked.
        is_locked: false,
      }))
    );

    if (stagesError) {
      // Don't leave a stageless pipeline behind.
      await supabase.from("pipelines").delete().eq("id", pipeline.id);
      throw new Error(stagesError.message);
    }

    revalidatePath(CRM_PATH);
    return { ok: true, pipelineId: pipeline.id };
  } catch (error) {
    return fail(error);
  }
}

export async function deletePipeline(pipelineId: string): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createServerSupabase();
    if (!supabase) return NOT_CONFIGURED;

    const { data: pipeline, error: pipelineError } = await supabase
      .from("pipelines")
      .select("*")
      .eq("id", pipelineId)
      .maybeSingle();
    if (pipelineError) throw new Error(pipelineError.message);
    if (!pipeline) return { ok: false, error: "That pipeline no longer exists." };

    if (pipeline.is_default) {
      return {
        ok: false,
        error:
          "The default pipeline cannot be deleted — it is where contact-form inquiries land.",
      };
    }

    const { count, error: countError } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("pipeline_id", pipelineId);
    if (countError) throw new Error(countError.message);

    if (count && count > 0) {
      return {
        ok: false,
        error: `“${pipeline.name}” still holds ${count} lead${
          count === 1 ? "" : "s"
        }. Move them to another pipeline first.`,
      };
    }

    const { error } = await supabase.from("pipelines").delete().eq("id", pipelineId);
    if (error) throw new Error(error.message);

    revalidatePath(CRM_PATH);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Stages
// ---------------------------------------------------------------------------

export async function createStage(input: {
  pipelineId: string;
  name: string;
}): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createServerSupabase();
    if (!supabase) return NOT_CONFIGURED;

    const name = input.name.trim();
    if (!name) return { ok: false, error: "Give the stage a name." };

    const { data: stages, error: stagesError } = await supabase
      .from("pipeline_stages")
      .select("*")
      .eq("pipeline_id", input.pipelineId);
    if (stagesError) throw new Error(stagesError.message);

    const position = stages?.length
      ? Math.max(...stages.map((stage) => stage.position)) + 1
      : 0;

    const { error } = await supabase
      .from("pipeline_stages")
      .insert({ pipeline_id: input.pipelineId, name, position, is_locked: false });
    if (error) throw new Error(error.message);

    revalidatePath(CRM_PATH);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function renameStage(input: {
  stageId: string;
  name: string;
}): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createServerSupabase();
    if (!supabase) return NOT_CONFIGURED;

    const name = input.name.trim();
    if (!name) return { ok: false, error: "A stage needs a name." };

    // The guard_locked_stage trigger refuses this too — this is the friendlier
    // first line of defence.
    const { error } = await supabase
      .from("pipeline_stages")
      .update({ name })
      .eq("id", input.stageId);
    if (error) throw new Error(error.message);

    revalidatePath(CRM_PATH);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteStage(stageId: string): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createServerSupabase();
    if (!supabase) return NOT_CONFIGURED;

    const { data: stage, error: stageError } = await supabase
      .from("pipeline_stages")
      .select("*")
      .eq("id", stageId)
      .maybeSingle();
    if (stageError) throw new Error(stageError.message);
    if (!stage) return { ok: false, error: "That stage no longer exists." };

    if (stage.is_locked) {
      return {
        ok: false,
        error: `“${stage.name}” is the intake stage for the contact form and cannot be deleted.`,
      };
    }

    // leads.stage_id cascades on delete — refuse rather than silently binning
    // whoever is sitting in the column.
    const { count, error: countError } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("stage_id", stageId);
    if (countError) throw new Error(countError.message);

    if (count && count > 0) {
      return {
        ok: false,
        error: `“${stage.name}” still holds ${count} lead${
          count === 1 ? "" : "s"
        }. Move them to another stage first — deleting a stage deletes its leads.`,
      };
    }

    const { count: stageCount, error: stageCountError } = await supabase
      .from("pipeline_stages")
      .select("*", { count: "exact", head: true })
      .eq("pipeline_id", stage.pipeline_id);
    if (stageCountError) throw new Error(stageCountError.message);

    if (stageCount !== null && stageCount <= 1) {
      return { ok: false, error: "A pipeline needs at least one stage." };
    }

    const { error } = await supabase.from("pipeline_stages").delete().eq("id", stageId);
    if (error) throw new Error(error.message);

    revalidatePath(CRM_PATH);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/**
 * Nudges a stage one place up or down. Positions are normalised to the array
 * index afterwards, so hand-edited or tied positions self-heal; rows that
 * already sit at the right index are not written, which keeps the locked
 * intake stage untouched as long as it stays first.
 */
export async function reorderStage(input: {
  stageId: string;
  direction: "up" | "down";
}): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createServerSupabase();
    if (!supabase) return NOT_CONFIGURED;

    const { data: stage, error: stageError } = await supabase
      .from("pipeline_stages")
      .select("*")
      .eq("id", input.stageId)
      .maybeSingle();
    if (stageError) throw new Error(stageError.message);
    if (!stage) return { ok: false, error: "That stage no longer exists." };

    if (stage.is_locked) {
      return {
        ok: false,
        error: `“${stage.name}” is the intake stage for the contact form and always sits first.`,
      };
    }

    const { data: stages, error: stagesError } = await supabase
      .from("pipeline_stages")
      .select("*")
      .eq("pipeline_id", stage.pipeline_id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (stagesError) throw new Error(stagesError.message);
    if (!stages?.length) return { ok: false, error: "That pipeline has no stages." };

    const from = stages.findIndex((row) => row.id === stage.id);
    const to = input.direction === "up" ? from - 1 : from + 1;
    if (from < 0 || to < 0 || to >= stages.length) return { ok: true };

    const neighbour = stages[to];
    if (neighbour.is_locked) {
      return {
        ok: false,
        error: `“${neighbour.name}” is the intake stage for the contact form and always sits first.`,
      };
    }

    const ordered = [...stages];
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);

    for (let index = 0; index < ordered.length; index += 1) {
      const row = ordered[index];
      if (row.position === index) continue;
      if (row.is_locked) {
        return {
          ok: false,
          error: `“${row.name}” is the intake stage for the contact form and cannot be moved.`,
        };
      }
      const { error } = await supabase
        .from("pipeline_stages")
        .update({ position: index })
        .eq("id", row.id);
      if (error) throw new Error(error.message);
    }

    revalidatePath(CRM_PATH);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
