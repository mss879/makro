"use client";

import { useRef, useState } from "react";
import { inputClass } from "@/components/admin/ui";

/**
 * Repeatable form rows for the jsonb columns on public.projects.
 *
 * Every row renders a real input carrying the *same* `name`, so the Server
 * Action reads them back with `formData.getAll(name)` — no JSON round-trip and
 * no hidden serialised blob to keep in sync. Spec rows use two parallel names
 * (`spec_label` / `spec_value`) that the action zips together by index.
 *
 * Rows are keyed by a local counter rather than by index so React does not
 * reuse a DOM node when one is removed from the middle.
 */

/**
 * Square arrow/remove controls, shared with ImageManager. Two complete strings
 * rather than a base plus an override: two `hover:border-*` utilities in one
 * class list resolve by stylesheet order, not by which was appended last.
 */
const ICON_BASE =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center border border-panel-line bg-panel-raised font-body text-xs leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-35";

export const iconButtonClass = `${ICON_BASE} text-panel-muted hover:border-rose hover:text-rose`;

export const dangerIconButtonClass = `${ICON_BASE} text-panel-muted hover:border-danger-line hover:text-danger`;

const addButtonClass =
  "inline-flex items-center gap-1.5 border border-dashed border-panel-line-strong px-3 py-1.5 font-body text-xs text-panel-muted transition-colors hover:border-rose hover:text-rose";

function useRowKeys() {
  const seq = useRef(0);
  return () => {
    seq.current += 1;
    return `row-${seq.current}`;
  };
}

function RowControls({
  index,
  count,
  onMove,
  onRemove,
}: {
  index: number;
  count: number;
  onMove: (index: number, delta: number) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        className={iconButtonClass}
        onClick={() => onMove(index, -1)}
        disabled={index === 0}
        aria-label="Move up"
        title="Move up"
      >
        ↑
      </button>
      <button
        type="button"
        className={iconButtonClass}
        onClick={() => onMove(index, 1)}
        disabled={index === count - 1}
        aria-label="Move down"
        title="Move down"
      >
        ↓
      </button>
      <button
        type="button"
        className={dangerIconButtonClass}
        onClick={() => onRemove(index)}
        aria-label="Remove row"
        title="Remove"
      >
        ×
      </button>
    </div>
  );
}

function move<T>(rows: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= rows.length) return rows;
  const next = [...rows];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

type TextRow = { key: string; value: string };

/** A repeatable list of strings — `features`, or `description` paragraphs. */
export function StringList({
  name,
  initial,
  multiline = false,
  placeholder,
  addLabel,
  emptyLabel = "Nothing here yet.",
}: {
  name: string;
  initial: string[];
  multiline?: boolean;
  placeholder?: string;
  addLabel: string;
  emptyLabel?: string;
}) {
  const makeKey = useRowKeys();
  const [rows, setRows] = useState<TextRow[]>(() =>
    initial.map((value, index) => ({ key: `seed-${index}`, value }))
  );

  const setValue = (index: number, value: string) =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, value } : row)));

  return (
    <div className="space-y-2">
      {rows.length === 0 && (
        <p className="font-body text-xs text-panel-faint">{emptyLabel}</p>
      )}

      {rows.map((row, index) => (
        <div key={row.key} className="flex items-start gap-2">
          {multiline ? (
            <textarea
              name={name}
              rows={5}
              value={row.value}
              placeholder={placeholder}
              onChange={(event) => setValue(index, event.target.value)}
              className={`${inputClass} resize-y leading-relaxed`}
            />
          ) : (
            <input
              type="text"
              name={name}
              value={row.value}
              placeholder={placeholder}
              onChange={(event) => setValue(index, event.target.value)}
              className={inputClass}
            />
          )}
          <RowControls
            index={index}
            count={rows.length}
            onMove={(i, delta) => setRows((prev) => move(prev, i, delta))}
            onRemove={(i) => setRows((prev) => prev.filter((_, at) => at !== i))}
          />
        </div>
      ))}

      <button
        type="button"
        className={addButtonClass}
        onClick={() => setRows((prev) => [...prev, { key: makeKey(), value: "" }])}
      >
        + {addLabel}
      </button>
    </div>
  );
}

type SpecFormRow = { key: string; label: string; value: string };

/** The `specs` jsonb column: an ordered list of { label, value } pairs. */
export function SpecList({ initial }: { initial: { label: string; value: string }[] }) {
  const makeKey = useRowKeys();
  const [rows, setRows] = useState<SpecFormRow[]>(() =>
    initial.map((spec, index) => ({
      key: `seed-${index}`,
      label: spec.label ?? "",
      value: spec.value ?? "",
    }))
  );

  const setField = (index: number, field: "label" | "value", next: string) =>
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        return field === "label" ? { ...row, label: next } : { ...row, value: next };
      })
    );

  return (
    <div className="space-y-2">
      {rows.length === 0 && (
        <p className="font-body text-xs text-panel-faint">
          No specs yet — these are the At-a-glance pairs on the project page.
        </p>
      )}

      {rows.map((row, index) => (
        <div key={row.key} className="flex items-start gap-2">
          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
            <input
              type="text"
              name="spec_label"
              value={row.label}
              placeholder="Label — e.g. Residences"
              onChange={(event) => setField(index, "label", event.target.value)}
              className={inputClass}
            />
            <input
              type="text"
              name="spec_value"
              value={row.value}
              placeholder="Value — e.g. ~120"
              onChange={(event) => setField(index, "value", event.target.value)}
              className={inputClass}
            />
          </div>
          <RowControls
            index={index}
            count={rows.length}
            onMove={(i, delta) => setRows((prev) => move(prev, i, delta))}
            onRemove={(i) => setRows((prev) => prev.filter((_, at) => at !== i))}
          />
        </div>
      ))}

      <button
        type="button"
        className={addButtonClass}
        onClick={() =>
          setRows((prev) => [...prev, { key: makeKey(), label: "", value: "" }])
        }
      >
        + Add spec
      </button>
    </div>
  );
}
