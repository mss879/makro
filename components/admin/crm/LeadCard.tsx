"use client";

import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge, formatDate } from "@/components/admin/ui";
import type { LeadRow } from "@/lib/supabase/types";

/** Money-ish display for the optional `value` column. No currency is assumed. */
export function formatValue(value: number | null) {
  if (value === null || !Number.isFinite(value)) return null;
  return value.toLocaleString("en-GB", { maximumFractionDigits: 2 });
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  );
}

/**
 * Icon button that deliberately swallows pointer and key events so the drag
 * sensors never see them — clicking "view" must open the drawer, not pick the
 * card up.
 */
function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="inline-flex h-7 w-7 items-center justify-center border border-transparent text-ink/35 transition-colors hover:border-ink/15 hover:text-rose-deep focus-visible:border-ink/15 focus-visible:text-rose-deep"
    >
      {children}
    </button>
  );
}

interface LeadCardProps {
  lead: LeadRow;
  onView: () => void;
  onEdit: () => void;
}

/** The card itself — also used bare inside the <DragOverlay>. */
export function LeadCardBody({
  lead,
  onView,
  onEdit,
  overlay = false,
}: LeadCardProps & { overlay?: boolean }) {
  const value = formatValue(lead.value);
  const detail = lead.project ?? lead.interest;

  return (
    <article
      className={`border border-ink/10 bg-white px-3.5 py-3 transition-shadow ${
        overlay ? "shadow-lg shadow-ink/15" : "hover:border-ink/25"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 break-words font-body text-sm font-medium leading-snug text-ink">
          {lead.name}
        </p>
        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton label={`View ${lead.name}`} onClick={onView}>
            <EyeIcon />
          </IconButton>
          <IconButton label={`Edit ${lead.name}`} onClick={onEdit}>
            <PencilIcon />
          </IconButton>
        </div>
      </div>

      {detail && (
        <p className="mt-1.5 line-clamp-2 font-body text-xs text-ink/55">{detail}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <Badge tone={lead.inquiry_id ? "accent" : "muted"}>
          {lead.inquiry_id ? "Inquiry" : "Manual"}
        </Badge>
        <span className="font-body text-[0.65rem] uppercase tracking-[0.12em] text-ink/40">
          {formatDate(lead.created_at)}
        </span>
      </div>

      {value && (
        <p className="mt-2 border-t border-ink/10 pt-2 font-body text-xs text-ink/60">
          Value <span className="text-ink">{value}</span>
        </p>
      )}
    </article>
  );
}

/** Draggable/sortable wrapper. The whole card is the drag handle. */
export default function LeadCard({
  lead,
  stageId,
  onView,
  onEdit,
}: LeadCardProps & { stageId: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id, data: { type: "lead", stageId } });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`touch-none ${isDragging ? "opacity-40" : ""}`}
      {...attributes}
      {...listeners}
    >
      <LeadCardBody lead={lead} onView={onView} onEdit={onEdit} />
    </div>
  );
}
