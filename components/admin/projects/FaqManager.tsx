"use client";

import { useActionState } from "react";
import { Card, Field, buttonClass, inputClass } from "@/components/admin/ui";
import {
  deleteFaqItem,
  reorderFaqItems,
  saveFaqItem,
  saveFaqSettings,
  type ProjectsPageFormState,
} from "@/app/admin/(panel)/projects/page-actions";
import type { ProjectsPageFaqItemRow } from "@/lib/supabase/types";

const IDLE: ProjectsPageFormState = { ok: false, message: "" };

function Result({ state }: { state: ProjectsPageFormState }) {
  if (!state.message) return null;
  return (
    <p className={`font-body text-sm ${state.ok ? "text-panel-muted" : "text-danger"}`}>
      {state.message}
    </p>
  );
}

function ItemEditor({ item }: { item?: ProjectsPageFaqItemRow }) {
  const [state, action, pending] = useActionState(saveFaqItem, IDLE);
  const isNew = !item;

  return (
    <form action={action} className="space-y-4">
      {item && <input type="hidden" name="id" value={item.id} />}

      <Field label="Question" hint="The line the reader clicks to open the answer.">
        <input name="question" defaultValue={item?.question ?? ""} className={inputClass} />
      </Field>

      <Field
        label="Answer"
        hint="Can be left blank while you draft — the entry still saves, and shows on the site as a question that opens onto nothing until you fill it in."
      >
        <textarea name="answer" rows={4} defaultValue={item?.answer ?? ""} className={inputClass} />
      </Field>

      <label className="flex items-center gap-3 font-body text-sm text-panel-muted">
        <input type="checkbox" name="published" defaultChecked={item?.published ?? true} />
        Show this question on the site
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Saving…" : isNew ? "Add question" : "Save question"}
        </button>
        <Result state={state} />
      </div>
    </form>
  );
}

function DeleteItem({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deleteFaqItem, IDLE);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className={buttonClass("secondary")}>
        {pending ? "Deleting…" : "Delete"}
      </button>
      <Result state={state} />
    </form>
  );
}

/** Move one question up or down by posting the whole reordered list of ids. */
function Reorder({ ids, index }: { ids: string[]; index: number }) {
  const [state, action, pending] = useActionState(reorderFaqItems, IDLE);
  const swap = (a: number, b: number) => {
    const next = [...ids];
    [next[a], next[b]] = [next[b], next[a]];
    return next.join(",");
  };
  return (
    <form action={action} className="flex items-center gap-2">
      <button
        type="submit"
        name="ids"
        value={swap(index, index - 1)}
        disabled={pending || index === 0}
        aria-label="Move question up"
        className={buttonClass("secondary")}
      >
        ↑
      </button>
      <button
        type="submit"
        name="ids"
        value={swap(index, index + 1)}
        disabled={pending || index === ids.length - 1}
        aria-label="Move question down"
        className={buttonClass("secondary")}
      >
        ↓
      </button>
      <Result state={state} />
    </form>
  );
}

/**
 * Projects → FAQ.
 *
 * Deliberately the same two-part shape as HeroManager: one card of section
 * settings, then a card per entry with its own save, delete and reorder. The
 * client already knows how the hero screen behaves, and a second, cleverer
 * pattern for the same job would only be a second thing to learn.
 *
 * Every visible string on the public section is here, including both link
 * labels AND their destinations — "the headings to everything", which is what
 * was asked for. The links each take a label and a href because a label the
 * client can rename pointing at a route they cannot is the kind of half
 * measure that becomes a support request.
 */
export default function FaqManager({
  enabled,
  eyebrow,
  heading,
  body,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  items,
}: {
  enabled: boolean;
  eyebrow: string;
  heading: string;
  body: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  items: ProjectsPageFaqItemRow[];
}) {
  const [settingsState, settingsAction, settingsPending] = useActionState(saveFaqSettings, IDLE);
  const ids = items.map((i) => i.id);

  return (
    <div className="space-y-8">
      <Card>
        <form action={settingsAction} className="space-y-5">
          <label className="flex items-center gap-3 font-body text-sm text-panel-muted">
            <input type="checkbox" name="faq_enabled" defaultChecked={enabled} />
            Show this section on /projects
          </label>

          <Field label="Eyebrow" hint="The small label above the heading. Leave blank to hide it.">
            <input name="faq_eyebrow" defaultValue={eyebrow} className={inputClass} />
          </Field>

          <Field label="Heading" hint="Reveals a word at a time as the reader scrolls to it.">
            <input name="faq_heading" defaultValue={heading} className={inputClass} />
          </Field>

          <Field label="Standfirst" hint="The short line under the heading. Leave blank to hide it.">
            <textarea name="faq_body" rows={3} defaultValue={body} className={inputClass} />
          </Field>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="First link — label" hint="Leave the label or the link blank to hide it.">
              <input name="faq_primary_label" defaultValue={primaryLabel} className={inputClass} />
            </Field>
            <Field label="First link — destination" hint="A path on this site, like /contact.">
              <input name="faq_primary_href" defaultValue={primaryHref} className={inputClass} />
            </Field>
            <Field label="Second link — label">
              <input name="faq_secondary_label" defaultValue={secondaryLabel} className={inputClass} />
            </Field>
            <Field label="Second link — destination" hint="A path on this site, like /faq.">
              <input name="faq_secondary_href" defaultValue={secondaryHref} className={inputClass} />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={settingsPending} className={buttonClass("primary")}>
              {settingsPending ? "Saving…" : "Save FAQ settings"}
            </button>
            <Result state={settingsState} />
          </div>
        </form>
      </Card>

      {items.map((item, i) => (
        <Card key={item.id}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-body text-sm text-panel-text">
                Question {i + 1}
              </p>
              {!item.published && (
                <p className="font-body text-xs text-panel-faint">Hidden from the site</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Reorder ids={ids} index={i} />
              <DeleteItem id={item.id} />
            </div>
          </div>
          <ItemEditor item={item} />
        </Card>
      ))}

      <Card>
        <h2 className="mb-5 font-display text-xl text-panel-text">Add a question</h2>
        <ItemEditor />
      </Card>
    </div>
  );
}
