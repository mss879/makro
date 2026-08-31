"use client";

import { useActionState, useState, useTransition } from "react";
import {
  revokeSiteAccess,
  saveAccessCode,
  unlockForPreview,
  type SettingsFormState,
} from "@/app/admin/(panel)/settings/actions";
import { Card, Field, buttonClass, inputClass } from "@/components/admin/ui";

/**
 * The access code, and the two things you do to it once it exists: revoke the
 * browsers already using it, and let this one in.
 *
 * The code is shown in plain text behind a reveal toggle rather than write-only.
 * That is a deliberate choice and worth defending: this is a shared code the
 * client reads down a phone and puts in emails, not a password. A field they
 * cannot read back is a field they have to reset — and every reset locks out
 * everyone already using the old one. It is only ever rendered inside /admin,
 * which is authenticated, never indexed, and where the person looking at it is
 * the person who chose it.
 */

const INITIAL_STATE: SettingsFormState = { ok: false, message: "" };

export default function AccessCodeForm({ code }: { code: string }) {
  const [state, formAction, saving] = useActionState(saveAccessCode, INITIAL_STATE);

  const [value, setValue] = useState(code);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Server truth wins after a save or a background revalidation.
  const [serverCode, setServerCode] = useState(code);
  if (serverCode !== code) {
    setServerCode(code);
    setValue(code);
  }

  // The two side actions share one slot: only one of them is ever mid-flight,
  // and two separate result lines in a card this size reads as clutter.
  const [sideState, setSideState] = useState<SettingsFormState | null>(null);
  const [sidePending, startSide] = useTransition();

  const run = (action: () => Promise<SettingsFormState>) => {
    setSideState(null);
    startSide(async () => {
      try {
        setSideState(await action());
      } catch (caught) {
        setSideState({
          ok: false,
          message: caught instanceof Error ? caught.message : "That did not work.",
        });
      }
    });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied, or an insecure origin. The code is on
      // screen and selectable, so there is nothing to recover from and nothing
      // worth interrupting the client about.
    }
  };

  return (
    <Card className="space-y-6">
      <div>
        <h2 className="font-display text-xl text-panel-text">Access code</h2>
        <p className="mt-1 font-body text-xs text-panel-faint">
          Anyone who types this on the Coming soon page gets to see the real site,
          on that device, until you change the code or sign everyone out.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <Field
          label="Code"
          hint="At least 4 characters. Capitals do not matter — “Makro2026” and “makro2026” both work. Leave it empty for a gate nobody can open."
        >
          <div className="flex flex-wrap items-center gap-2">
            <input
              // Never type="password": this field is meant to be read. The
              // reveal toggle swaps to `text` so browsers do not offer to save
              // it as a credential.
              type={revealed ? "text" : "password"}
              name="access_code"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={64}
              placeholder="No code set"
              className={`${inputClass} min-w-0 flex-1 font-mono`}
            />
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              className={buttonClass("secondary")}
            >
              {revealed ? "Hide" : "Show"}
            </button>
            <button
              type="button"
              onClick={copy}
              disabled={!value}
              className={buttonClass("ghost")}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={saving} className={buttonClass("primary")}>
            {saving ? "Saving…" : "Save code"}
          </button>
          {state.message && (
            <p
              role={state.ok ? undefined : "alert"}
              className={`font-body text-sm ${state.ok ? "text-success" : "text-danger"}`}
            >
              {state.message}
            </p>
          )}
        </div>
      </form>

      <div className="space-y-4 border-t border-panel-line pt-5">
        <div className="flex flex-wrap items-start gap-3">
          <button
            type="button"
            onClick={() => run(unlockForPreview)}
            disabled={sidePending}
            className={buttonClass("secondary")}
          >
            Let this browser in
          </button>
          <button
            type="button"
            onClick={() => run(revokeSiteAccess)}
            disabled={sidePending}
            className={buttonClass("danger")}
          >
            Sign everyone out
          </button>
        </div>

        <p className="font-body text-xs text-panel-faint">
          <strong className="text-panel-muted">Let this browser in</strong> gives this
          browser access without typing the code — useful for checking the live site
          while it is locked, and the only way in when no code is set.{" "}
          <strong className="text-panel-muted">Sign everyone out</strong> revokes every
          device that has been let in so far, including this one, while keeping the
          code itself the same.
        </p>

        {sideState?.message && (
          <p
            role={sideState.ok ? undefined : "alert"}
            className={`font-body text-sm ${sideState.ok ? "text-success" : "text-danger"}`}
          >
            {sideState.message}
          </p>
        )}
      </div>
    </Card>
  );
}
