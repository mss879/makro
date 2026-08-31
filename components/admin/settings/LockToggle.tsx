"use client";

import { useState, useTransition } from "react";
import { setSiteLockEnabled } from "@/app/admin/(panel)/settings/actions";

/**
 * The switch: whether the public site is replaced by the "Coming soon" gate.
 *
 * The single most consequential control in the panel, so it follows the pattern
 * the Selected Work toggle established — its own block above everything else,
 * saved on click, and stating the consequence in words rather than leaving it
 * to the position of a switch.
 *
 * Two things it says that the Selected Work toggle does not have to:
 *
 *   * that the change takes up to about fifteen seconds, because the lock is
 *     read from a short-lived cache in the proxy rather than on every request;
 *   * that /admin is never gated, which is what makes this switch safe to throw
 *     at all. A client who thinks locking the site might lock them out of the
 *     panel will not use the feature.
 */
export default function LockToggle({
  enabled,
  hasCode,
  serviceRoleReady,
}: {
  enabled: boolean;
  hasCode: boolean;
  /** False means the proxy cannot read the lock state, so it cannot enforce it. */
  serviceRoleReady: boolean;
}) {
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
        const result = await setSiteLockEnabled(next);
        if (!result.ok) {
          setOn(!next);
          setError(result.message || "That switch could not be saved.");
        }
      } catch (caught) {
        setOn(!next);
        setError(caught instanceof Error ? caught.message : "That switch could not be saved.");
      }
    });
  };

  return (
    <div
      className={`border-2 p-6 transition-colors ${
        on ? "border-warning-line bg-warning-soft" : "border-panel-line bg-panel-raised"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 max-w-xl">
          <h2 className="font-display text-2xl text-panel-text">Lock the website</h2>
          <p className="mt-2 font-body text-sm text-panel-muted">
            {on
              ? "LOCKED — every page on makrodevelopers.com shows the Coming soon page instead. Visitors cannot reach the home page, the projects, the blog or the contact form."
              : "OPEN — the website is live and everyone can see it."}
          </p>
          <p className="mt-2 font-body text-xs text-panel-faint">
            This admin panel is never locked, so you can always come back here and
            switch it off. Changes take about fifteen seconds to reach the live
            site — reload the page if you do not see it straight away.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <span
            className={`font-body text-xs uppercase tracking-[0.22em] ${
              on ? "text-panel-text" : "text-panel-faint"
            }`}
          >
            {pending ? "Saving…" : on ? "Locked" : "Open"}
          </span>

          {/* A real switch, not a checkbox: role + aria-checked so it announces
              as one, and a square knob because the brand has no rounded corners. */}
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label="Lock the website"
            onClick={toggle}
            disabled={pending}
            className={`relative inline-flex h-9 w-[4.5rem] shrink-0 items-center border transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              on ? "border-warning bg-warning" : "border-panel-line-strong bg-panel-high"
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

      {/* The two states worth interrupting for, both only while the lock is on. */}
      {on && !serviceRoleReady && (
        <p
          role="alert"
          className="mt-5 border border-danger-line bg-danger-soft px-4 py-3 font-body text-sm text-danger"
        >
          <strong className="font-semibold">The lock is not being enforced.</strong> The
          site is still fully public. Checking the lock needs the{" "}
          <code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code> setting,
          and it is missing from this deployment — add it and redeploy, and the lock
          starts working with no further changes here.
        </p>
      )}

      {on && serviceRoleReady && !hasCode && (
        <p className="mt-5 border border-warning-line bg-warning-soft px-4 py-3 font-body text-sm text-warning">
          No access code is set, so nobody at all can get past the gate. Set one below
          if you want to be able to let clients or colleagues in.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 border border-danger-line bg-danger-soft px-3 py-2 font-body text-sm text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}
