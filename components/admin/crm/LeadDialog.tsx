"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createLead, deleteLead, updateLead } from "@/app/admin/(panel)/crm/actions";
import { Field, buttonClass, inputClass } from "@/components/admin/ui";
import type { LeadRow, PipelineRow, PipelineStageRow } from "@/lib/supabase/types";

/**
 * Create / edit form for a lead.
 *
 * The parent mounts this with a `key` per lead, so the fields initialise once
 * and never get stomped by a background revalidation.
 *
 * The pipeline and stage selects are the "move to another pipeline" path:
 * choosing a different pipeline repopulates the stage list, and the server
 * action re-resolves the stage against the chosen pipeline regardless of what
 * the form sends.
 */
export default function LeadDialog({
  lead,
  pipelines,
  stages,
  initialPipelineId,
  initialStageId,
  onClose,
}: {
  lead: LeadRow | null;
  pipelines: PipelineRow[];
  stages: PipelineStageRow[];
  initialPipelineId: string;
  initialStageId: string | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(lead?.name ?? "");
  const [email, setEmail] = useState(lead?.email ?? "");
  const [phone, setPhone] = useState(lead?.phone ?? "");
  const [interest, setInterest] = useState(lead?.interest ?? "");
  const [project, setProject] = useState(lead?.project ?? "");
  const [value, setValue] = useState(lead?.value != null ? String(lead.value) : "");
  const [notes, setNotes] = useState(lead?.notes ?? "");
  const [pipelineId, setPipelineId] = useState(lead?.pipeline_id ?? initialPipelineId);
  const [stageId, setStageId] = useState(lead?.stage_id ?? initialStageId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stageOptions = useMemo(
    () =>
      stages
        .filter((stage) => stage.pipeline_id === pipelineId)
        .sort((a, b) => a.position - b.position),
    [stages, pipelineId]
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function changePipeline(nextPipelineId: string) {
    setPipelineId(nextPipelineId);
    const first = stages
      .filter((stage) => stage.pipeline_id === nextPipelineId)
      .sort((a, b) => a.position - b.position)[0];
    setStageId(first?.id ?? "");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const payload = {
      name,
      email,
      phone,
      interest,
      project,
      value,
      notes,
      pipelineId,
      stageId,
    };

    try {
      const result = lead
        ? await updateLead({ ...payload, id: lead.id })
        : await createLead(payload);
      if (!result.ok) {
        setError(result.error ?? "Could not save that lead.");
        return;
      }
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save that lead.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!lead) return;
    if (!window.confirm(`Delete “${lead.name}”? This cannot be undone.`)) return;

    setBusy(true);
    setError(null);
    try {
      const result = await deleteLead(lead.id);
      if (!result.ok) {
        setError(result.error ?? "Could not delete that lead.");
        return;
      }
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete that lead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 md:p-8">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 h-full w-full cursor-default bg-ink/40"
      />

      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-label={lead ? `Edit ${lead.name}` : "New lead"}
        className="relative w-full max-w-2xl border border-ink/10 bg-cream p-6 md:p-8"
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink/10 pb-4">
          <h2 className="font-display text-2xl text-ink">{lead ? "Edit lead" : "New lead"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="font-body text-xs uppercase tracking-[0.18em] text-ink/50 transition-colors hover:text-ink"
          >
            Close
          </button>
        </div>

        {error && (
          <p className="mt-4 border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Name">
              <input
                name="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={inputClass}
                placeholder="Full name"
              />
            </Field>
          </div>

          <Field label="Email">
            <input
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
              placeholder="name@example.com"
            />
          </Field>

          <Field label="Phone">
            <input
              name="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className={inputClass}
              placeholder="+94 …"
            />
          </Field>

          <Field label="Interest">
            <input
              name="interest"
              value={interest}
              onChange={(event) => setInterest(event.target.value)}
              className={inputClass}
              placeholder="2 Bedroom"
            />
          </Field>

          <Field label="Project">
            <input
              name="project"
              value={project}
              onChange={(event) => setProject(event.target.value)}
              className={inputClass}
              placeholder="Makro Heights"
            />
          </Field>

          <Field label="Value" hint="Numbers only — currency is up to you.">
            <input
              name="value"
              inputMode="decimal"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className={inputClass}
              placeholder="0"
            />
          </Field>

          <Field label="Pipeline">
            <select
              name="pipelineId"
              value={pipelineId}
              onChange={(event) => changePipeline(event.target.value)}
              className={inputClass}
            >
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="sm:col-span-2">
            <Field
              label="Stage"
              hint={
                stageOptions.length
                  ? undefined
                  : "This pipeline has no stages yet — add one before moving a lead into it."
              }
            >
              <select
                name="stageId"
                value={stageId}
                onChange={(event) => setStageId(event.target.value)}
                className={inputClass}
                disabled={!stageOptions.length}
              >
                {stageOptions.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Notes">
              <textarea
                name="notes"
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className={`${inputClass} resize-y`}
                placeholder="Call summaries, budget, next step…"
              />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-5">
          {lead ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className={buttonClass("danger")}
            >
              Delete lead
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
            <button
              type="submit"
              disabled={busy || !stageOptions.length}
              className={buttonClass("primary")}
            >
              {busy ? "Saving…" : lead ? "Save changes" : "Create lead"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
