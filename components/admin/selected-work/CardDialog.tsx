"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  deleteSelectedWorkCard,
  saveSelectedWorkCard,
  type SelectedWorkFormState,
} from "@/app/admin/(panel)/selected-work/actions";
import { Field, buttonClass, inputClass } from "@/components/admin/ui";
import type { SelectedWorkCardRow, SelectedWorkKind } from "@/lib/supabase/types";
import ImageField from "./ImageField";

/**
 * Create / edit form for one panel in the rail.
 *
 * The parent mounts this with a `key` per card, so the fields initialise once
 * and never get stomped by a background revalidation.
 *
 * A panel comes in two shapes, and the form says so rather than hiding fields:
 * a 'cover' draws the status pill, the numeral, the kicker and a title, with
 * the caption revealed on hover; a 'gallery' draws the caption alone. Switching
 * kind keeps whatever was already typed, so a cover demoted to gallery can be
 * promoted back without retyping it.
 */

const INITIAL_STATE: SelectedWorkFormState = { ok: false, message: "" };

const KINDS: { value: SelectedWorkKind; label: string; hint: string }[] = [
  {
    value: "cover",
    label: "Cover — the headline panel",
    hint: "Draws the status badge, the numeral, the kicker and the title. The caption is revealed on hover.",
  },
  {
    value: "gallery",
    label: "Gallery — a supporting image",
    hint: "Draws the image and its caption only. Everything under “Cover panel only” is ignored.",
  },
];

export default function CardDialog({
  card,
  onClose,
}: {
  card: SelectedWorkCardRow | null;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveSelectedWorkCard, INITIAL_STATE);

  const [kind, setKind] = useState<SelectedWorkKind>(card?.kind ?? "gallery");
  const [image, setImage] = useState(card?.image ?? "");
  const [projectSlug, setProjectSlug] = useState(card?.project_slug ?? "");
  const [href, setHref] = useState(card?.href ?? "");
  const [published, setPublished] = useState(card?.published ?? true);

  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // The action revalidates this route, so the list behind the dialog is already
  // refreshing by the time a save resolves; closing is all that is left to do.
  useEffect(() => {
    if (state.ok) onClose();
  }, [state, onClose]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Mirrors the resolution in lib/selected-work-data: an explicit link wins,
  // otherwise the project reference builds one, otherwise the panel is unlinked.
  const effectiveHref =
    href.trim() || (projectSlug.trim() ? `/projects/${projectSlug.trim()}` : "");

  const isCover = kind === "cover";
  const busy = pending || deleting;

  const onDelete = () => {
    if (!card) return;
    const label = card.title || card.caption || "this panel";
    if (
      !window.confirm(
        `Delete “${label}”? Its uploaded image goes with it. This cannot be undone.`
      )
    ) {
      return;
    }

    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteSelectedWorkCard(card.id);
      if (!result.ok) {
        setDeleteError(result.message);
        return;
      }
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 md:p-8">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 h-full w-full cursor-default bg-ink/40"
      />

      <form
        action={formAction}
        role="dialog"
        aria-modal="true"
        aria-label={card ? "Edit panel" : "New panel"}
        className="relative w-full max-w-3xl border border-ink/10 bg-cream p-6 md:p-8"
      >
        {card && <input type="hidden" name="id" value={card.id} />}

        <div className="flex items-start justify-between gap-4 border-b border-ink/10 pb-4">
          <h2 className="font-display text-2xl text-ink">
            {card ? "Edit panel" : "New panel"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="font-body text-xs uppercase tracking-[0.18em] text-ink/50 transition-colors hover:text-ink"
          >
            Close
          </button>
        </div>

        {(state.message || deleteError) && (
          <p
            role="alert"
            className="mt-4 border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-700"
          >
            {deleteError ?? state.message}
          </p>
        )}

        {/* ---- kind ---------------------------------------------------- */}
        <fieldset className="mt-5">
          <legend className="font-body text-[0.7rem] uppercase tracking-[0.22em] text-ink/45">
            Panel type
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {KINDS.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 border p-3 transition-colors ${
                  kind === option.value
                    ? "border-rose-deep bg-rose-deep/[0.06]"
                    : "border-ink/15 bg-white/70 hover:border-ink/30"
                }`}
              >
                <input
                  type="radio"
                  name="kind"
                  value={option.value}
                  checked={kind === option.value}
                  onChange={() => setKind(option.value)}
                  className="mt-0.5 h-4 w-4 accent-rose-deep"
                />
                <span>
                  <span className="block font-body text-sm text-ink">{option.label}</span>
                  <span className="mt-0.5 block font-body text-xs text-ink/45">
                    {option.hint}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* ---- image --------------------------------------------------- */}
        <div className="mt-6 border-t border-ink/10 pt-5">
          <ImageField cardId={card?.id} value={image} onChange={setImage} />

          <div className="mt-4">
            <Field
              label="Alt text"
              hint="Required. What a screen reader announces instead of the image — describe the picture, e.g. “Makro Heights — Rooftop amenity deck”."
            >
              <input
                type="text"
                name="alt"
                required
                maxLength={240}
                defaultValue={card?.alt ?? ""}
                placeholder="Makro Heights — Rooftop amenity deck"
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        {/* ---- caption ------------------------------------------------- */}
        <div className="mt-6 border-t border-ink/10 pt-5">
          <Field
            label="Caption"
            hint={
              isCover
                ? "Revealed over the image on hover. Must be different from every other published panel's caption."
                : "Printed along the bottom of the panel. Must be different from every other published panel's caption."
            }
          >
            <input
              type="text"
              name="caption"
              maxLength={240}
              defaultValue={card?.caption ?? ""}
              placeholder="Rooftop amenity deck"
              className={inputClass}
            />
          </Field>
        </div>

        {/* ---- cover-only copy ----------------------------------------- */}
        <div
          className={`mt-6 border-t border-ink/10 pt-5 ${isCover ? "" : "opacity-60"}`}
        >
          <p className="font-body text-[0.7rem] uppercase tracking-[0.22em] text-ink/45">
            Cover panel only
          </p>
          <p className="mt-1.5 font-body text-xs text-ink/45">
            {isCover
              ? "Printed over the image on the cover panel."
              : "This panel is a gallery image, so these four are not rendered. They are kept in case you switch it back to a cover."}
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Numeral" hint="Small figure top-right — “01”.">
              <input
                type="text"
                name="index_label"
                maxLength={8}
                defaultValue={card?.index_label ?? ""}
                placeholder="01"
                className={inputClass}
              />
            </Field>

            <Field label="Status badge" hint="Free text — “In Planning”, “Now Selling”.">
              <input
                type="text"
                name="status_badge"
                maxLength={60}
                defaultValue={card?.status_badge ?? ""}
                placeholder="In Planning"
                className={inputClass}
              />
            </Field>

            <Field label="Kicker" hint="The line above the title — “Residential · Dehiwala”.">
              <input
                type="text"
                name="kicker"
                maxLength={120}
                defaultValue={card?.kicker ?? ""}
                placeholder="Residential · Dehiwala"
                className={inputClass}
              />
            </Field>

            <Field label="Title">
              <input
                type="text"
                name="title"
                maxLength={160}
                defaultValue={card?.title ?? ""}
                placeholder="Makro Heights"
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        {/* ---- link ---------------------------------------------------- */}
        <div className="mt-6 border-t border-ink/10 pt-5">
          <p className="font-body text-[0.7rem] uppercase tracking-[0.22em] text-ink/45">
            Where the panel links
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="Project"
              hint="A project slug. The panel then links to that project's page."
            >
              <input
                type="text"
                name="project_slug"
                maxLength={90}
                value={projectSlug}
                onChange={(event) => setProjectSlug(event.target.value)}
                placeholder="makro-heights"
                className={inputClass}
              />
            </Field>

            <Field label="Link override" hint="Set this to link somewhere else instead.">
              <input
                type="text"
                name="href"
                maxLength={300}
                value={href}
                onChange={(event) => setHref(event.target.value)}
                placeholder="/insights/why-dehiwala"
                className={inputClass}
              />
            </Field>
          </div>

          <p className="mt-3 border border-ink/10 bg-white/70 px-3 py-2 font-body text-xs text-ink/55">
            {effectiveHref ? (
              <>
                This panel links to <span className="font-mono text-ink">{effectiveHref}</span>.
              </>
            ) : (
              "Both empty — this panel renders as a picture, with nothing to click."
            )}
          </p>
        </div>

        {/* ---- published ----------------------------------------------- */}
        <label className="mt-6 flex items-start gap-3 border border-ink/10 bg-white/70 px-4 py-3">
          <input
            type="checkbox"
            name="published"
            checked={published}
            onChange={(event) => setPublished(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-rose-deep"
          />
          <span>
            <span className="block font-body text-sm text-ink">Published</span>
            <span className="block font-body text-xs text-ink/45">
              Unpublished panels stay here but are left out of the rail. Use this to
              draft a replacement alongside the panel it will succeed.
            </span>
          </span>
        </label>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-5">
          {card ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className={buttonClass("danger")}
            >
              {deleting ? "Deleting…" : "Delete panel"}
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className={buttonClass("secondary")}
            >
              Cancel
            </button>
            <button type="submit" disabled={busy} className={buttonClass("primary")}>
              {pending ? "Saving…" : card ? "Save changes" : "Add panel"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
