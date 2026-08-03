import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, LeadRow, PipelineRow, PipelineStageRow } from "@/lib/supabase/types";

export type Supa = SupabaseClient<Database>;

/** Gap between adjacent cards. Wide enough that midpoints stay clean for a long time. */
export const POSITION_STEP = 1000;

export interface BoardStage extends PipelineStageRow {
  leads: LeadRow[];
}

export interface Board {
  pipelines: PipelineRow[];
  pipeline: PipelineRow;
  stages: BoardStage[];
}

/**
 * The stage every new inquiry lands in: the locked stage of the default
 * pipeline. Both the CRM and the Inquiries transfer action resolve it through
 * here so they can never disagree about where a lead starts.
 */
export async function getIntakeStage(
  supabase: Supa
): Promise<{ pipeline: PipelineRow; stage: PipelineStageRow } | null> {
  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("*")
    .eq("is_default", true)
    .maybeSingle();

  if (!pipeline) return null;

  // Prefer the locked intake stage; fall back to whichever comes first so a
  // hand-edited pipeline still works.
  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("*")
    .eq("pipeline_id", pipeline.id)
    .order("position", { ascending: true });

  const stage = stages?.find((s) => s.is_locked) ?? stages?.[0];
  if (!stage) return null;

  return { pipeline, stage };
}

/** Loads a full board: every pipeline, plus the chosen one's stages and leads. */
export async function getBoard(supabase: Supa, pipelineId?: string): Promise<Board | null> {
  const { data: pipelines } = await supabase
    .from("pipelines")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (!pipelines?.length) return null;

  const pipeline = pipelines.find((p) => p.id === pipelineId) ?? pipelines[0];

  const [{ data: stages }, { data: leads }] = await Promise.all([
    supabase
      .from("pipeline_stages")
      .select("*")
      .eq("pipeline_id", pipeline.id)
      .order("position", { ascending: true }),
    supabase
      .from("leads")
      .select("*")
      .eq("pipeline_id", pipeline.id)
      .order("position", { ascending: true }),
  ]);

  return {
    pipelines,
    pipeline,
    stages: (stages ?? []).map((stage) => ({
      ...stage,
      leads: (leads ?? []).filter((l) => l.stage_id === stage.id),
    })),
  };
}

/**
 * Position for a card dropped at `index` within `siblings` (the destination
 * column, already excluding the card being moved). Takes the midpoint between
 * neighbours so only the moved row is written.
 */
export function positionFor(siblings: { position: number }[], index: number): number {
  const before = siblings[index - 1]?.position;
  const after = siblings[index]?.position;

  if (before === undefined && after === undefined) return POSITION_STEP;
  if (before === undefined) return after! - POSITION_STEP;
  if (after === undefined) return before + POSITION_STEP;
  return (before + after) / 2;
}
