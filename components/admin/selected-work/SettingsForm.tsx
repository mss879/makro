"use client";

import { useActionState, useState } from "react";
import {
  saveSelectedWorkSettings,
  type SelectedWorkFormState,
} from "@/app/admin/(panel)/selected-work/actions";
import { Card, Field, buttonClass, inputClass } from "@/components/admin/ui";
import type { SelectedWorkCopy } from "./copy";

/**
 * The section's own copy — the intro panel the rail opens on, and the end cap
 * it closes with. The panels themselves are managed below this form.
 *
 * The three heading inputs are the only fiddly part of the screen, so they get
 * a live preview: the heading is one sentence with a rose highlight in the
 * middle of it, and no single plain-text field can express that.
 */

const INITIAL_STATE: SelectedWorkFormState = { ok: false, message: "" };

/**
 * Renders the sentence the way the home page will, highlight included, so the
 * spaces around the highlighted word are visibly right before saving — they
 * are stored verbatim and are easy to lose.
 */
function HeadingPreview({
  before,
  highlight,
  after,
}: {
  before: string;
  highlight: string;
  after: string;
}) {
  const empty = !before && !highlight && !after;

  return (
    // Deliberately NOT on the panel's dark tokens: this is a live preview of
    // how the heading renders on the HOME PAGE, whose Selected Work band is
    // ink with bone type. It has to keep the site's colours to be a preview
    // at all — leave bg-ink / text-bone alone here.
    <div className="border border-panel-line bg-ink px-5 py-6">
      <p className="font-body text-[0.65rem] uppercase tracking-[0.22em] text-bone/40">
        Preview
      </p>
      <p className="mt-3 font-display text-2xl leading-tight text-bone md:text-3xl">
        {empty ? (
          <span className="text-bone/30">Your heading will appear here.</span>
        ) : (
          <>
            {before}
            {/* The same utility the home page uses, so the sheen matches. */}
            <span className="metal-rose">{highlight}</span>
            {after}
          </>
        )}
      </p>
    </div>
  );
}

export default function SettingsForm({ copy }: { copy: SelectedWorkCopy }) {
  const [state, formAction, pending] = useActionState(
    saveSelectedWorkSettings,
    INITIAL_STATE
  );

  // Only the three heading parts are controlled, because they feed the preview.
  // Everything else is uncontrolled, so a background revalidation cannot stomp
  // what is being typed.
  const [before, setBefore] = useState(copy.heading_before);
  const [highlight, setHighlight] = useState(copy.heading_highlight);
  const [after, setAfter] = useState(copy.heading_after);

  return (
    <form action={formAction} className="space-y-6">
      {/* ------------------------------------------------------------- */}
      <Card className="space-y-5">
        <div>
          <h2 className="font-display text-xl text-panel-text">Intro panel</h2>
          <p className="mt-1 font-body text-xs text-panel-faint">
            The first thing in the rail, before the panels start.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Index label" hint="The small numeral beside the eyebrow — “02”.">
            <input
              type="text"
              name="index_label"
              maxLength={8}
              defaultValue={copy.index_label}
              placeholder="02"
              className={inputClass}
            />
          </Field>

          <Field label="Eyebrow" hint="The small rose label above the heading.">
            <input
              type="text"
              name="eyebrow"
              maxLength={80}
              defaultValue={copy.eyebrow}
              placeholder="Selected Work"
              className={inputClass}
            />
          </Field>
        </div>

        {/* ---- the split heading -------------------------------------- */}
        <div className="space-y-4 border border-panel-line bg-panel/60 p-4">
          <div>
            <p className="font-body text-[0.7rem] uppercase tracking-[0.22em] text-panel-faint">
              Heading
            </p>
            <p className="mt-1.5 font-body text-xs text-panel-faint">
              One sentence in three fields, because the highlighted words sit in the
              middle of it. They are joined exactly as typed — so keep the spaces:
              “A portfolio built on&nbsp;” ends with one, “, not haste.” starts with a
              comma.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Before" hint="Plain text, before the highlight.">
              <input
                type="text"
                name="heading_before"
                maxLength={120}
                value={before}
                onChange={(event) => setBefore(event.target.value)}
                placeholder="A portfolio built on "
                className={inputClass}
              />
            </Field>

            <Field
              label="Highlighted words"
              hint="These render in rose, mid-sentence."
            >
              <input
                type="text"
                name="heading_highlight"
                maxLength={120}
                value={highlight}
                onChange={(event) => setHighlight(event.target.value)}
                placeholder="discipline"
                className={`${inputClass} border-rose/40 bg-rose/10`}
              />
            </Field>

            <Field label="After" hint="Plain text, after the highlight.">
              <input
                type="text"
                name="heading_after"
                maxLength={120}
                value={after}
                onChange={(event) => setAfter(event.target.value)}
                placeholder=", not haste."
                className={inputClass}
              />
            </Field>
          </div>

          <HeadingPreview before={before} highlight={highlight} after={after} />
        </div>

        <Field label="Body" hint="One paragraph under the heading.">
          <textarea
            name="body"
            rows={5}
            defaultValue={copy.body}
            className={`${inputClass} resize-y leading-relaxed`}
            placeholder="Every Makro project, regardless of scale or location, is measured against the same discipline…"
          />
        </Field>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Button label">
            <input
              type="text"
              name="cta_label"
              maxLength={80}
              defaultValue={copy.cta_label}
              placeholder="View all projects"
              className={inputClass}
            />
          </Field>

          <Field label="Button link" hint="A path on this site, like /projects.">
            <input
              type="text"
              name="cta_href"
              maxLength={200}
              defaultValue={copy.cta_href}
              placeholder="/projects"
              className={inputClass}
            />
          </Field>
        </div>

        <Field
          label="Scroll hint"
          hint="The nudge that tells visitors the rail moves sideways."
        >
          <input
            type="text"
            name="scroll_hint"
            maxLength={80}
            defaultValue={copy.scroll_hint}
            placeholder="Scroll to explore →"
            className={inputClass}
          />
        </Field>
      </Card>

      {/* ------------------------------------------------------------- */}
      <Card className="space-y-5">
        <div>
          <h2 className="font-display text-xl text-panel-text">End cap</h2>
          <p className="mt-1 font-body text-xs text-panel-faint">
            The last panel in the rail, after every card.
          </p>
        </div>

        <Field label="Heading">
          <input
            type="text"
            name="endcap_heading"
            maxLength={120}
            defaultValue={copy.endcap_heading}
            placeholder="See the full portfolio"
            className={inputClass}
          />
        </Field>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Link label">
            <input
              type="text"
              name="endcap_link_label"
              maxLength={80}
              defaultValue={copy.endcap_link_label}
              placeholder="All projects →"
              className={inputClass}
            />
          </Field>

          <Field label="Link" hint="A path on this site, like /projects.">
            <input
              type="text"
              name="endcap_href"
              maxLength={200}
              defaultValue={copy.endcap_href}
              placeholder="/projects"
              className={inputClass}
            />
          </Field>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Saving…" : "Save section copy"}
        </button>

        {state.message && (
          <p
            role="status"
            aria-live="polite"
            className={`font-body text-sm ${
              state.ok ? "text-success" : "text-danger"
            }`}
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
