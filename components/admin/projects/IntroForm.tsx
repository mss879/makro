"use client";

import { useActionState } from "react";
import { Card, Field, buttonClass, inputClass } from "@/components/admin/ui";
import {
  saveIntro,
  type ProjectsPageFormState,
} from "@/app/admin/(panel)/projects/page-actions";

const IDLE: ProjectsPageFormState = { ok: false, message: "" };

/**
 * The short passage between the hero and the carousel.
 *
 * Stored as an array of paragraphs, edited as one textarea: the reveal animates
 * each paragraph separately, so they have to reach the database as separate
 * entries — but asking an admin to manage a repeatable list for two sentences
 * would be worse than asking them to leave a blank line. The action splits on
 * blank lines; this form joins them back with one for editing.
 */
export default function IntroForm({
  enabled,
  eyebrow,
  body,
}: {
  enabled: boolean;
  eyebrow: string;
  body: string[];
}) {
  const [state, action, pending] = useActionState(saveIntro, IDLE);

  return (
    <Card>
      <form action={action} className="space-y-5">
        <label className="flex items-center gap-3 font-body text-sm text-panel-muted">
          <input type="checkbox" name="intro_enabled" defaultChecked={enabled} />
          Show this section on /projects
        </label>

        <Field label="Eyebrow" hint="The small label above the text. Leave blank to hide it.">
          <input name="intro_eyebrow" defaultValue={eyebrow} className={inputClass} />
        </Field>

        <Field
          label="Paragraphs"
          hint="Separate paragraphs with a blank line. Each one fades up in turn as the reader scrolls to it."
        >
          <textarea
            name="body"
            rows={10}
            defaultValue={body.join("\n\n")}
            className={inputClass}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className={buttonClass("primary")}>
            {pending ? "Saving…" : "Save intro"}
          </button>
          {state.message && (
            <p className={`font-body text-sm ${state.ok ? "text-panel-muted" : "text-danger"}`}>
              {state.message}
            </p>
          )}
        </div>
      </form>
    </Card>
  );
}
