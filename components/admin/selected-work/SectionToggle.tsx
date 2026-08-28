"use client";

import { useState, useTransition } from "react";
import { setSelectedWorkEnabled } from "@/app/admin/(panel)/selected-work/actions";

/**
 * The headline control on the screen: whether the home page renders the
 * Selected Work rail at all.
 *
 * Deliberately not a checkbox inside the copy form. It is the one setting with
 * an immediate, whole-section consequence, so it saves on click, states that
 * consequence in words rather than relying on the switch's position, and sits
 * above everything else on the page.
 *
 * The switch is optimistic and reverts on failure — the client should see the
 * section go dark the instant they click, not after a round trip.
 */
export default function SectionToggle({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Server truth wins whenever the page revalidates. Adjusting state during
  // render is React's documented way to reset local state from a changed prop.
  const [serverEnabled, setServerEnabled] = useState(enabled);
  if (serverEnabled !== enabled) {
    setServerEnabled(enabled);
    setOn(enabled);
  }

  const toggle = () => {
    const next = !on;
    setOn(next);
    setError(null);

    startTransition(async () => {
      try {
        const result = await setSelectedWorkEnabled(next);
        if (!result.ok) {
          setOn(!next);
          setError(result.message || "That switch could not be saved.");
        }
      } catch (caught) {
        setOn(!next);
        setError(
          caught instanceof Error ? caught.message : "That switch could not be saved."
        );
      }
    });
  };

  return (
    <div
      className={`border-2 p-6 transition-colors ${
        on ? "border-rose/40 bg-rose/10" : "border-panel-line bg-panel-raised"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 max-w-xl">
          <h2 className="font-display text-2xl text-panel-text">
            Show Selected Work on the home page
          </h2>
          <p className="mt-2 font-body text-sm text-panel-muted">
            {on
              ? "ON — the black, side-scrolling Selected Work section is live on the home page, between the brand statement and what follows it."
              : "OFF — the section is removed from the home page entirely. Visitors scroll straight past it, and none of the copy or panels below are published anywhere."}
          </p>
          <p className="mt-2 font-body text-xs text-panel-faint">
            This saves the moment you click it and takes effect on the live site
            immediately. The copy and panels below are kept either way, so switching
            it back on restores exactly what is here now.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <span
            className={`font-body text-xs uppercase tracking-[0.22em] ${
              on ? "text-panel-text" : "text-panel-faint"
            }`}
          >
            {pending ? "Saving…" : on ? "On" : "Off"}
          </span>

          {/*
            A real switch, not a checkbox: role + aria-checked so it announces
            as one, and a square knob because the brand has no rounded corners.
          */}
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label="Show Selected Work on the home page"
            onClick={toggle}
            disabled={pending}
            className={`relative inline-flex h-9 w-[4.5rem] shrink-0 items-center border transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              on ? "border-rose bg-rose" : "border-panel-line-strong bg-panel-high"
            }`}
          >
            <span
              aria-hidden="true"
              className={`absolute top-1 h-7 w-8 transition-all ${
                on ? "left-[2.125rem] bg-ink" : "left-1 bg-panel-faint"
              }`}
            />
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 border border-danger-line bg-danger-soft px-3 py-2 font-body text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
