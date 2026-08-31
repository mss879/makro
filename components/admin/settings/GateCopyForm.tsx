"use client";

import { useActionState, useState } from "react";
import {
  saveGateCopy,
  type SettingsFormState,
} from "@/app/admin/(panel)/settings/actions";
import { Card, Field, buttonClass, inputClass } from "@/components/admin/ui";

/**
 * What the Coming soon page says.
 *
 * Editable while the site is open, on purpose — writing the holding page is the
 * thing you want to do BEFORE you lock the site, not after. "Preview the gate"
 * on the screen above opens the real page for a signed-in admin whether the
 * lock is on or off.
 */

const INITIAL_STATE: SettingsFormState = { ok: false, message: "" };

export type GateCopy = {
  eyebrow: string;
  heading: string;
  body: string;
  note: string;
  show_contact: boolean;
};

export default function GateCopyForm({ copy }: { copy: GateCopy }) {
  const [state, formAction, pending] = useActionState(saveGateCopy, INITIAL_STATE);

  // Only the heading is controlled, because it feeds the preview below.
  // Everything else is uncontrolled, so a background revalidation cannot stomp
  // what is being typed.
  const [heading, setHeading] = useState(copy.heading);

  return (
    <form action={formAction} className="space-y-6">
      <Card className="space-y-5">
        <div>
          <h2 className="font-display text-xl text-panel-text">Coming soon page</h2>
          <p className="mt-1 font-body text-xs text-panel-faint">
            What visitors see at every address on the site while the lock is on. It
            carries no navigation on purpose — there is nowhere for them to go.
          </p>
        </div>

        <Field label="Eyebrow" hint="The small line above the heading. Leave empty to hide it.">
          <input
            type="text"
            name="eyebrow"
            defaultValue={copy.eyebrow}
            maxLength={80}
            className={inputClass}
          />
        </Field>

        <Field label="Heading" hint="The one line that always shows. Keep it short — it sets in the display face at a large size.">
          <input
            type="text"
            name="heading"
            value={heading}
            onChange={(event) => setHeading(event.target.value)}
            maxLength={140}
            required
            className={inputClass}
          />
        </Field>

        {/* Deliberately NOT on the panel's dark tokens: this previews how the
            heading renders on the GATE, which is ink with bone type. It has to
            keep the site's colours to be a preview at all. */}
        <div className="border border-panel-line bg-ink px-5 py-6">
          <p className="font-body text-[0.65rem] uppercase tracking-[0.22em] text-bone/40">
            Preview
          </p>
          <p className="mt-3 font-display text-2xl leading-tight text-bone md:text-3xl">
            {heading || <span className="text-bone/30">Your heading will appear here.</span>}
          </p>
        </div>

        <Field label="Body" hint="A short paragraph under the heading. Leave empty to hide it.">
          <textarea
            name="body"
            defaultValue={copy.body}
            rows={4}
            maxLength={600}
            className={`${inputClass} resize-y`}
          />
        </Field>

        <Field
          label="Access code prompt"
          hint="The label above the code field, e.g. “Have an access code?”. LEAVE IT EMPTY TO HIDE THE CODE FIELD ALTOGETHER — visitors then have no way in and no reason to think there is one."
        >
          <input
            type="text"
            name="note"
            defaultValue={copy.note}
            maxLength={120}
            className={inputClass}
          />
        </Field>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="show_contact"
            defaultChecked={copy.show_contact}
            className="mt-0.5 h-4 w-4 shrink-0 accent-rose"
          />
          <span>
            <span className="font-body text-sm text-panel-text">Show contact details</span>
            <span className="mt-0.5 block font-body text-xs text-panel-faint">
              Prints the office email and phone number at the foot of the page, so a
              locked site is still a reachable company. The values come from the
              site&rsquo;s own contact details — they are not edited here.
            </span>
          </span>
        </label>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Saving…" : "Save page"}
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
  );
}
