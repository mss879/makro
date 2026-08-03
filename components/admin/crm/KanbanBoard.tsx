"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { moveLead } from "@/app/admin/(panel)/crm/actions";
import { EmptyState, buttonClass } from "@/components/admin/ui";
import type { LeadRow, PipelineRow, PipelineStageRow } from "@/lib/supabase/types";
import LeadCard, { LeadCardBody } from "./LeadCard";
import LeadDialog from "./LeadDialog";
import LeadDrawer from "./LeadDrawer";

/**
 * A stage plus the leads sitting in it. Mirrors `BoardStage` from lib/crm,
 * redeclared here because lib/crm is server-only and this is a client file.
 */
export interface BoardColumn extends PipelineStageRow {
  leads: LeadRow[];
}

/** Which column an id belongs to — the id may be a column's or a lead's. */
function findColumnId(id: string, columns: BoardColumn[]): string | null {
  if (columns.some((column) => column.id === id)) return id;
  return columns.find((column) => column.leads.some((lead) => lead.id === id))?.id ?? null;
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="1.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function Column({
  column,
  onView,
  onEdit,
  onAdd,
}: {
  column: BoardColumn;
  onView: (lead: LeadRow) => void;
  onEdit: (lead: LeadRow) => void;
  onAdd: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: "column" } });
  const ids = useMemo(() => column.leads.map((lead) => lead.id), [column.leads]);

  return (
    <section className="flex w-[17.5rem] shrink-0 flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-ink/15 pb-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <h2
            title={column.name}
            className="truncate font-body text-xs uppercase tracking-[0.18em] text-ink/70"
          >
            {column.name}
          </h2>
          {column.is_locked && (
            <span
              className="shrink-0 text-ink/35"
              title="Intake stage — every contact-form inquiry lands here."
            >
              <LockIcon />
            </span>
          )}
        </div>
        <span className="shrink-0 font-body text-xs tabular-nums text-ink/40">
          {column.leads.length}
        </span>
      </header>

      <div
        ref={setNodeRef}
        className={`mt-3 flex min-h-24 flex-1 flex-col gap-2 border border-dashed p-2 transition-colors ${
          isOver ? "border-rose-deep/50 bg-rose-deep/5" : "border-transparent"
        }`}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {column.leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              stageId={column.id}
              onView={() => onView(lead)}
              onEdit={() => onEdit(lead)}
            />
          ))}
        </SortableContext>

        {column.leads.length === 0 && (
          <p className="px-1 py-6 text-center font-body text-xs text-ink/35">
            Drop a lead here
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="mt-2 border border-dashed border-ink/20 px-3 py-2 font-body text-xs text-ink/55 transition-colors hover:border-rose-deep hover:text-rose-deep"
      >
        + Add lead
      </button>
    </section>
  );
}

export default function KanbanBoard({
  pipeline,
  pipelines,
  stages,
  allStages,
}: {
  pipeline: PipelineRow;
  pipelines: PipelineRow[];
  stages: BoardColumn[];
  allStages: PipelineStageRow[];
}) {
  const [columns, setColumns] = useState<BoardColumn[]>(stages);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drawerLeadId, setDrawerLeadId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ leadId: string | null; stageId: string | null } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  // Server truth wins whenever the page revalidates. Adjusting state during
  // render (rather than in an effect) is React's documented way to reset local
  // state from a changed prop — see "You Might Not Need an Effect".
  const [serverStages, setServerStages] = useState<BoardColumn[]>(stages);
  if (serverStages !== stages) {
    setServerStages(stages);
    setColumns(stages);
  }

  // Drag handlers read the freshest columns without going through a stale
  // render closure; the snapshot is what an optimistic move reverts to.
  const columnsRef = useRef<BoardColumn[]>(columns);
  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);
  const snapshot = useRef<BoardColumn[] | null>(null);

  const sensors = useSensors(
    // A few pixels of slop so the view/edit icons stay clickable.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const allLeads = useMemo(() => columns.flatMap((column) => column.leads), [columns]);
  const activeLead = activeId ? allLeads.find((lead) => lead.id === activeId) ?? null : null;
  const drawerLead = drawerLeadId
    ? allLeads.find((lead) => lead.id === drawerLeadId) ?? null
    : null;
  const drawerStage = drawerLead
    ? columns.find((column) => column.id === drawerLead.stage_id)
    : undefined;
  const dialogLead = dialog?.leadId
    ? allLeads.find((lead) => lead.id === dialog.leadId) ?? null
    : null;

  function handleDragStart(event: DragStartEvent) {
    snapshot.current = columnsRef.current;
    setActiveId(String(event.active.id));
    setError(null);
  }

  /** Moves the card between columns live, so the gap follows the cursor. */
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const leadId = String(active.id);
    const overId = String(over.id);

    setColumns((previous) => {
      const fromId = findColumnId(leadId, previous);
      const toId = findColumnId(overId, previous);
      if (!fromId || !toId || fromId === toId) return previous;

      const from = previous.find((column) => column.id === fromId);
      const to = previous.find((column) => column.id === toId);
      if (!from || !to) return previous;

      const lead = from.leads.find((row) => row.id === leadId);
      if (!lead) return previous;

      let insertAt = to.leads.length;
      const overIndex = to.leads.findIndex((row) => row.id === overId);
      if (overIndex >= 0) {
        const activeRect = active.rect.current.translated;
        const below =
          activeRect && over.rect
            ? activeRect.top > over.rect.top + over.rect.height / 2
            : false;
        insertAt = overIndex + (below ? 1 : 0);
      }

      return previous.map((column) => {
        if (column.id === fromId) {
          return { ...column, leads: column.leads.filter((row) => row.id !== leadId) };
        }
        if (column.id === toId) {
          const leads = [...column.leads];
          leads.splice(insertAt, 0, lead);
          return { ...column, leads };
        }
        return column;
      });
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    const before = snapshot.current;
    snapshot.current = null;

    const revert = () => {
      if (before) {
        setColumns(before);
        columnsRef.current = before;
      }
    };

    if (!over) {
      revert();
      return;
    }

    const leadId = String(active.id);
    const overId = String(over.id);
    const current = columnsRef.current;

    const columnId = findColumnId(leadId, current);
    const overColumnId = findColumnId(overId, current);
    if (!columnId || !overColumnId || columnId !== overColumnId) {
      revert();
      return;
    }

    const column = current.find((row) => row.id === columnId);
    if (!column) {
      revert();
      return;
    }

    const oldIndex = column.leads.findIndex((row) => row.id === leadId);
    if (oldIndex < 0) {
      revert();
      return;
    }

    // Dropping on the column (rather than on a card) means "last".
    const overIndex =
      overId === columnId ? column.leads.length - 1 : column.leads.findIndex((row) => row.id === overId);
    const newIndex = Math.max(
      0,
      Math.min(overIndex < 0 ? column.leads.length - 1 : overIndex, column.leads.length - 1)
    );

    const next = current.map((row) =>
      row.id === columnId ? { ...row, leads: arrayMove(row.leads, oldIndex, newIndex) } : row
    );
    setColumns(next);
    columnsRef.current = next;

    // Nothing actually changed — don't write a row for a click.
    const previousColumn = before?.find((row) => row.leads.some((lead) => lead.id === leadId));
    if (
      previousColumn &&
      previousColumn.id === columnId &&
      previousColumn.leads.findIndex((lead) => lead.id === leadId) === newIndex
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await moveLead({ leadId, stageId: columnId, index: newIndex });
        if (!result.ok) {
          revert();
          setError(result.error ?? "Could not move that lead.");
        }
      } catch (caught) {
        revert();
        setError(caught instanceof Error ? caught.message : "Could not move that lead.");
      }
    });
  }

  function handleDragCancel() {
    setActiveId(null);
    if (snapshot.current) {
      setColumns(snapshot.current);
      columnsRef.current = snapshot.current;
      snapshot.current = null;
    }
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-body text-xs uppercase tracking-[0.18em] text-ink/45">
          {allLeads.length} lead{allLeads.length === 1 ? "" : "s"} in {pipeline.name}
          {isPending && <span className="ml-2 normal-case tracking-normal">Saving…</span>}
        </p>
        <button
          type="button"
          onClick={() => setDialog({ leadId: null, stageId: columns[0]?.id ?? null })}
          disabled={!columns.length}
          className={buttonClass("primary")}
        >
          New lead
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-start justify-between gap-4 border border-red-200 bg-red-50 px-4 py-3">
          <p className="font-body text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="shrink-0 font-body text-xs uppercase tracking-[0.16em] text-red-700/70 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {columns.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="This pipeline has no stages"
            body="Add a stage above and the board will appear here."
          />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="mt-6 flex items-stretch gap-4 overflow-x-auto pb-4">
            {columns.map((column) => (
              <Column
                key={column.id}
                column={column}
                onView={(lead) => setDrawerLeadId(lead.id)}
                onEdit={(lead) => setDialog({ leadId: lead.id, stageId: lead.stage_id })}
                onAdd={() => setDialog({ leadId: null, stageId: column.id })}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeLead ? (
              <div className="w-[16.5rem] rotate-1">
                <LeadCardBody
                  lead={activeLead}
                  onView={() => undefined}
                  onEdit={() => undefined}
                  overlay
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {drawerLead && (
        <LeadDrawer
          key={drawerLead.id}
          lead={drawerLead}
          pipelineName={pipeline.name}
          stageName={drawerStage?.name ?? "—"}
          onClose={() => setDrawerLeadId(null)}
          onEdit={() => {
            setDialog({ leadId: drawerLead.id, stageId: drawerLead.stage_id });
            setDrawerLeadId(null);
          }}
        />
      )}

      {dialog && (
        <LeadDialog
          key={dialog.leadId ?? `new-${dialog.stageId ?? "none"}`}
          lead={dialogLead}
          pipelines={pipelines}
          stages={allStages}
          initialPipelineId={pipeline.id}
          initialStageId={dialog.stageId}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
