"use client";

import { useEffect, useRef, useState } from "react";
import { scrollToSection } from "@/lib/scroll-to-section";

export type JumpOption = {
  /** Group label shown in the trigger and the list. */
  label: string;
  /** Element id the option scrolls to. */
  slug: string;
  /** Count rendered beside the label, so an empty stage is honest. */
  count: number;
};

/**
 * Jump-to-section dropdown for the portfolio index (client request, Aug 2026):
 * one page split into Completed and In Progress, with a control that scrolls to
 * whichever the visitor picks rather than routing to a second page.
 *
 * Deliberately not a native <select>. A select cannot carry the count column,
 * and its popup is rendered by the OS — on a page this typographically
 * particular a system dropdown is the one element that would look borrowed.
 */
export default function SectionJump({ options }: { options: JumpOption[] }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape. Both listeners are only attached
  // while the menu is open, so the page carries no idle handlers.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Shared with the navbar dropdown and the deep-link handler, so all three
  // land in exactly the same place. See lib/scroll-to-section.
  const jump = (slug: string) => {
    setOpen(false);
    scrollToSection(slug);
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-3 border border-hair-strong px-5 py-2.5 font-body text-sm text-ink transition-colors duration-300 hover:border-rose-deep hover:text-rose-deep"
      >
        Jump to
        <span
          aria-hidden="true"
          className={`text-rose-deep transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        >
          ↓
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Jump to a section of the portfolio"
          /* min-w matches the trigger so the panel never looks narrower than
             the control it drops from. Sharp edges, cream ground, hairline
             border — the same construction as every other panel on the site. */
          className="absolute left-0 top-[calc(100%+0.5rem)] z-20 min-w-full whitespace-nowrap border border-hair-strong bg-cream"
        >
          {options.map((o) => (
            <li key={o.slug} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => jump(o.slug)}
                className="flex w-full items-center justify-between gap-8 px-5 py-3 text-left font-body text-sm text-ink transition-colors duration-200 hover:bg-shell hover:text-rose-deep"
              >
                {o.label}
                <span className="text-fog">{o.count}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
