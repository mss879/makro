"use client";

import { useRef, useState } from "react";
import { inputClass } from "@/components/admin/ui";
import {
  StringList,
  dangerIconButtonClass,
  iconButtonClass,
} from "@/components/admin/projects/RepeatableList";
import type { BlogSection } from "@/lib/supabase/types";

/**
 * The `sections` jsonb column — an ordered list of { heading, paras[], points? }.
 *
 * The repeatable-list convention elsewhere in the panel is one shared `name`
 * read back with `formData.getAll(name)`. That only reaches one level, and a
 * section owns two lists of its own, so each section gets a stable key and its
 * nested lists post under names derived from it:
 *
 *   section_key            once per section, in DOM order — this is the order
 *   section_heading__<key> the heading
 *   section_para__<key>    one value per paragraph
 *   section_point__<key>   one value per bullet, absent when there are none
 *
 * Still real inputs, still no serialised blob to keep in sync — the Server
 * Action walks `section_key` and pulls each section's fields by name.
 *
 * Keys, not indexes, because a section is reorderable: React keeps each
 * StringList's internal state attached to its section as the list moves, and
 * an index-derived name would re-point every nested field on every swap.
 */

const addSectionClass =
  "inline-flex items-center gap-1.5 border border-dashed border-ink/25 px-3 py-2 font-body text-sm text-ink/60 transition-colors hover:border-rose-deep hover:text-rose-deep";

type SectionRow = {
  key: string;
  heading: string;
  /** Seed values only — once mounted, each StringList owns its own rows. */
  paras: string[];
  points: string[];
};

export default function SectionsEditor({ initial }: { initial: BlogSection[] }) {
  // Seeded rows take `s…` keys and added rows take `n…`, so the two sequences
  // can never collide; both satisfy the SECTION_KEY guard in the action.
  const seq = useRef(0);
  const [rows, setRows] = useState<SectionRow[]>(() =>
    initial.map((section, index) => ({
      key: `s${index}`,
      heading: section.heading ?? "",
      paras: Array.isArray(section.paras) ? section.paras : [],
      // Local state may hold [] freely — it is the *stored* jsonb that must
      // omit the key, which the Server Action does when nothing was typed.
      points: Array.isArray(section.points) ? section.points : [],
    }))
  );

  const setHeading = (index: number, heading: string) =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, heading } : row)));

  const move = (index: number, delta: number) =>
    setRows((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const remove = (index: number) =>
    setRows((prev) => prev.filter((_, at) => at !== index));

  const add = () => {
    seq.current += 1;
    setRows((prev) => [
      ...prev,
      { key: `n${seq.current}`, heading: "", paras: [""], points: [] },
    ]);
  };

  /**
   * Headings are React keys on the public article page, so a repeat breaks the
   * render. The action rejects it too — this just says so before the round-trip.
   */
  const counts = new Map<string, number>();
  for (const row of rows) {
    const heading = row.heading.trim();
    if (heading) counts.set(heading, (counts.get(heading) ?? 0) + 1);
  }

  return (
    <div className="space-y-4">
      {rows.length === 0 && (
        <p className="border border-dashed border-ink/15 px-4 py-8 text-center font-body text-sm text-ink/45">
          No sections yet. Each one becomes a headed block on the article page.
        </p>
      )}

      {rows.map((row, index) => {
        const heading = row.heading.trim();
        const duplicate = heading !== "" && (counts.get(heading) ?? 0) > 1;

        return (
          <div key={row.key} className="space-y-4 border border-ink/15 bg-cream/50 p-4">
            <input type="hidden" name="section_key" value={row.key} />

            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <span className="font-body text-[0.7rem] uppercase tracking-[0.22em] text-ink/45">
                  Section {index + 1} — heading
                </span>
                <input
                  type="text"
                  name={`section_heading__${row.key}`}
                  value={row.heading}
                  maxLength={240}
                  onChange={(event) => setHeading(index, event.target.value)}
                  placeholder="Location is a decade-long decision."
                  className={`${inputClass} mt-2`}
                />
                {duplicate && (
                  <p className="mt-1.5 font-body text-xs text-red-700">
                    Another section already uses this heading — headings must be
                    unique within an article.
                  </p>
                )}
              </div>

              <div className="mt-7 flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  className={iconButtonClass}
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Move section up"
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={iconButtonClass}
                  onClick={() => move(index, 1)}
                  disabled={index === rows.length - 1}
                  aria-label="Move section down"
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className={dangerIconButtonClass}
                  onClick={() => remove(index)}
                  aria-label="Remove section"
                  title="Remove section"
                >
                  ×
                </button>
              </div>
            </div>

            <div>
              <p className="font-body text-[0.7rem] uppercase tracking-[0.22em] text-ink/45">
                Paragraphs
              </p>
              <p className="mb-3 mt-1.5 font-body text-xs text-ink/45">
                One block per paragraph, in the order they should read.
              </p>
              <StringList
                name={`section_para__${row.key}`}
                initial={row.paras}
                multiline
                addLabel="Add paragraph"
                placeholder="Write a paragraph…"
                emptyLabel="No paragraphs yet."
              />
            </div>

            <div>
              <p className="font-body text-[0.7rem] uppercase tracking-[0.22em] text-ink/45">
                Bullets — optional
              </p>
              <p className="mb-3 mt-1.5 font-body text-xs text-ink/45">
                Rendered as a list under the paragraphs. Leave empty for a
                prose-only section; each bullet must be distinct from the others.
              </p>
              <StringList
                name={`section_point__${row.key}`}
                initial={row.points}
                addLabel="Add bullet"
                placeholder="Visit a completed project"
                emptyLabel="No bullets — this section renders as prose only."
              />
            </div>
          </div>
        );
      })}

      <button type="button" className={addSectionClass} onClick={add}>
        + Add section
      </button>
    </div>
  );
}
