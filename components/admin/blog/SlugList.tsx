"use client";

import { useId, useRef, useState } from "react";
import { inputClass } from "@/components/admin/ui";
import {
  dangerIconButtonClass,
  iconButtonClass,
} from "@/components/admin/projects/RepeatableList";

/**
 * A repeatable list of slugs — `related` (articles) and `related_projects`.
 *
 * Same getAll() rebuild as StringList, with a datalist of the slugs that
 * currently exist attached to every row. A datalist rather than a <select>
 * because these are soft references with no foreign key: the column is allowed
 * to name something unpublished, renamed or not written yet, and the article
 * sidebar degrades gracefully when a slug misses. Suggesting is right;
 * enforcing is not.
 */
export default function SlugList({
  name,
  initial,
  options,
  addLabel,
  placeholder,
  emptyLabel,
}: {
  name: string;
  initial: string[];
  /** Slugs that exist today, offered as suggestions — never a hard constraint. */
  options: string[];
  addLabel: string;
  placeholder?: string;
  emptyLabel: string;
}) {
  const listId = useId();
  const seq = useRef(0);
  const [rows, setRows] = useState(() =>
    initial.map((value, index) => ({ key: `seed-${index}`, value }))
  );

  const known = new Set(options);

  const setValue = (index: number, value: string) =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, value } : row)));

  return (
    <div className="space-y-2">
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>

      {rows.length === 0 && <p className="font-body text-xs text-panel-faint">{emptyLabel}</p>}

      {rows.map((row, index) => {
        const value = row.value.trim();
        const unknown = value !== "" && !known.has(value);

        return (
          <div key={row.key}>
            <div className="flex items-start gap-2">
              <input
                type="text"
                name={name}
                list={listId}
                value={row.value}
                placeholder={placeholder}
                maxLength={90}
                onChange={(event) => setValue(index, event.target.value)}
                className={inputClass}
              />
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  className={iconButtonClass}
                  onClick={() =>
                    setRows((prev) => {
                      if (index === 0) return prev;
                      const next = [...prev];
                      [next[index - 1], next[index]] = [next[index], next[index - 1]];
                      return next;
                    })
                  }
                  disabled={index === 0}
                  aria-label="Move up"
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={iconButtonClass}
                  onClick={() =>
                    setRows((prev) => {
                      if (index === prev.length - 1) return prev;
                      const next = [...prev];
                      [next[index], next[index + 1]] = [next[index + 1], next[index]];
                      return next;
                    })
                  }
                  disabled={index === rows.length - 1}
                  aria-label="Move down"
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className={dangerIconButtonClass}
                  onClick={() => setRows((prev) => prev.filter((_, at) => at !== index))}
                  aria-label="Remove row"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            </div>

            {unknown && (
              <p className="mt-1 font-body text-xs text-warning">
                No published entry with that slug right now — saved anyway, and it
                starts linking as soon as one exists.
              </p>
            )}
          </div>
        );
      })}

      <button
        type="button"
        className="inline-flex items-center gap-1.5 border border-dashed border-panel-line-strong px-3 py-1.5 font-body text-xs text-panel-muted transition-colors hover:border-rose hover:text-rose"
        onClick={() => {
          seq.current += 1;
          setRows((prev) => [...prev, { key: `row-${seq.current}`, value: "" }]);
        }}
      >
        + {addLabel}
      </button>
    </div>
  );
}
