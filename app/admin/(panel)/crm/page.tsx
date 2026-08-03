import type { Metadata } from "next";
import KanbanBoard from "@/components/admin/crm/KanbanBoard";
import PipelineControls from "@/components/admin/crm/PipelineControls";
import { EmptyState, NotConfigured, PageHeading } from "@/components/admin/ui";
import { getBoard } from "@/lib/crm";
import { createServerSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "CRM" };

export const dynamic = "force-dynamic";

const SUBTITLE =
  "Drag a lead between stages to move it along. Contact-form inquiries land in the locked intake stage of the default pipeline.";

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const requested = params.pipeline;
  const pipelineId = Array.isArray(requested) ? requested[0] : requested;

  const supabase = await createServerSupabase();

  if (!supabase) {
    return (
      <>
        <PageHeading title="CRM" subtitle={SUBTITLE} />
        <div className="mt-8">
          <NotConfigured />
        </div>
      </>
    );
  }

  const board = await getBoard(supabase, pipelineId);

  // getBoard returns null when there isn't a single pipeline row — which in
  // practice means supabase/migrations/ has never been applied.
  if (!board) {
    return (
      <>
        <PageHeading title="CRM" subtitle={SUBTITLE} />
        <div className="mt-8">
          <EmptyState
            title="No pipelines yet"
            body="Apply every file in supabase/migrations/ in filename order in the Supabase SQL editor. They seed the default Sales Pipeline and its locked “New Leads” intake stage, then reload this page."
          />
        </div>
      </>
    );
  }

  // Every stage of every pipeline: the lead dialog needs them so changing the
  // pipeline select can repopulate the stage select without a round trip.
  const { data: allStages } = await supabase
    .from("pipeline_stages")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <>
      <PageHeading title="CRM" subtitle={SUBTITLE} />

      <PipelineControls
        pipeline={board.pipeline}
        pipelines={board.pipelines}
        stages={board.stages}
      />

      <KanbanBoard
        pipeline={board.pipeline}
        pipelines={board.pipelines}
        stages={board.stages}
        allStages={allStages ?? board.stages}
      />
    </>
  );
}
