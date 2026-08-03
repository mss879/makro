"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createPipeline,
  createStage,
  deletePipeline,
  deleteStage,
  renameStage,
  reorderStage,
} from "@/app/admin/(panel)/crm/actions";
import { Field, buttonClass, inputClass } from "@/components/admin/ui";
import type { PipelineRow, PipelineStageRow } from "@/lib/supabase/types";

/**
 * Why the intake stage's controls are dead. The database enforces this with a
 * trigger too — this is just the explanation the trigger can't give you until
 * after you've tried.
 */
const LOCK_REASON =
  "This is the intake stage for the contact form — every inquiry lands here, so it cannot be renamed, moved or deleted.";

function ChevronIcon({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      {direction === "up" ? <path d="M6 14l6-6 6 6" /> : <path d="M6 10l6 6 6-6" />}
    </svg>
  );
}

function StageRow({
  stage,
  isFirst,
  isLast,
  onError,
}: {
  stage: PipelineStageRow;
  isFirst: boolean;
  isLast: boolean;
  onError: (message: string | null) => void;
}) {
  const [name, setName] = useState(stage.name);
  const [busy, setBusy] = useState(false);

  const locked = stage.is_locked;
  const dirty = name.trim() !== stage.name && name.trim().length > 0;

  async function run(work: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    onError(null);
    try {
      const result = await work();
      if (!result.ok) onError(result.error ?? "That change could not be saved.");
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "That change could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-2 border-b border-ink/10 py-2.5 last:border-b-0">
      <div className="min-w-40 flex-1">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={locked || busy}
          title={locked ? LOCK_REASON : undefined}
          aria-label={`Stage name — ${stage.name}`}
          className={`${inputClass} disabled:cursor-not-allowed disabled:bg-ink/5 disabled:text-ink/40`}
        />
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          title={locked ? LOCK_REASON : "Move up"}
          aria-label={`Move ${stage.name} up`}
          disabled={locked || busy || isFirst}
          onClick={() => run(() => reorderStage({ stageId: stage.id, direction: "up" }))}
          className={buttonClass("secondary")}
        >
          <ChevronIcon direction="up" />
        </button>
        <button
          type="button"
          title={locked ? LOCK_REASON : "Move down"}
          aria-label={`Move ${stage.name} down`}
          disabled={locked || busy || isLast}
          onClick={() => run(() => reorderStage({ stageId: stage.id, direction: "down" }))}
          className={buttonClass("secondary")}
        >
          <ChevronIcon direction="down" />
        </button>

        <button
          type="button"
          title={locked ? LOCK_REASON : "Save the new name"}
          disabled={locked || busy || !dirty}
          onClick={() => run(() => renameStage({ stageId: stage.id, name: name.trim() }))}
          className={buttonClass("secondary")}
        >
          Rename
        </button>

        <button
          type="button"
          title={locked ? LOCK_REASON : "Delete this stage"}
          disabled={locked || busy}
          onClick={() => {
            if (!window.confirm(`Delete the “${stage.name}” stage?`)) return;
            void run(() => deleteStage(stage.id));
          }}
          className={buttonClass("danger")}
        >
          Delete
        </button>
      </div>
    </li>
  );
}

export default function PipelineControls({
  pipeline,
  pipelines,
  stages,
}: {
  pipeline: PipelineRow;
  pipelines: PipelineRow[];
  stages: PipelineStageRow[];
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<"none" | "stages" | "new-pipeline">("none");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [pipelineName, setPipelineName] = useState("");
  const [newStages, setNewStages] = useState<string[]>([""]);
  const [stageName, setStageName] = useState("");

  function togglePanel(next: "stages" | "new-pipeline") {
    setError(null);
    setPanel((current) => (current === next ? "none" : next));
  }

  async function handleCreatePipeline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await createPipeline({ name: pipelineName, stages: newStages });
      if (!result.ok) {
        setError(result.error ?? "That pipeline could not be created.");
        return;
      }
      setPipelineName("");
      setNewStages([""]);
      setPanel("none");
      if (result.pipelineId) router.push(`/admin/crm?pipeline=${result.pipelineId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That pipeline could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeletePipeline() {
    if (
      !window.confirm(
        `Delete the “${pipeline.name}” pipeline and all of its stages? This cannot be undone.`
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await deletePipeline(pipeline.id);
      if (!result.ok) {
        setError(result.error ?? "That pipeline could not be deleted.");
        return;
      }
      router.push("/admin/crm");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That pipeline could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddStage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await createStage({ pipelineId: pipeline.id, name: stageName });
      if (!result.ok) {
        setError(result.error ?? "That stage could not be added.");
        return;
      }
      setStageName("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That stage could not be added.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 border border-ink/10 bg-white/70 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 font-body text-[0.65rem] uppercase tracking-[0.2em] text-ink/40">
          Pipeline
        </span>

        {pipelines.map((option) => {
          const active = option.id === pipeline.id;
          return (
            <Link
              key={option.id}
              href={`/admin/crm?pipeline=${option.id}`}
              aria-current={active ? "page" : undefined}
              className={`inline-flex items-center gap-2 border px-4 py-2 font-body text-sm transition-colors ${
                active
                  ? "border-ink bg-ink text-cream"
                  : "border-ink/15 text-ink/60 hover:border-rose-deep hover:text-rose-deep"
              }`}
            >
              {option.name}
              {option.is_default && (
                <span
                  className={`font-body text-[0.6rem] uppercase tracking-[0.16em] ${
                    active ? "text-cream/60" : "text-ink/35"
                  }`}
                >
                  default
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => togglePanel("stages")}
          className={buttonClass("secondary")}
        >
          {panel === "stages" ? "Done editing stages" : "Edit stages"}
        </button>
        <button
          type="button"
          onClick={() => togglePanel("new-pipeline")}
          className={buttonClass("secondary")}
        >
          New pipeline
        </button>
        {!pipeline.is_default && (
          <button
            type="button"
            onClick={handleDeletePipeline}
            disabled={busy}
            className={buttonClass("danger")}
          >
            Delete pipeline
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-start justify-between gap-4 border border-red-200 bg-red-50 px-4 py-3">
          <p className="font-body text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="shrink-0 font-body text-xs uppercase tracking-[0.16em] text-red-700/70 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {panel === "stages" && (
        <div className="mt-5 border-t border-ink/10 pt-5">
          <p className="font-body text-[0.65rem] uppercase tracking-[0.2em] text-ink/40">
            Stages in {pipeline.name}
          </p>

          {stages.length === 0 ? (
            <p className="mt-3 font-body text-sm text-ink/50">
              No stages yet — add the first one below.
            </p>
          ) : (
            <ul className="mt-3">
              {stages.map((stage, index) => (
                <StageRow
                  key={stage.id}
                  stage={stage}
                  isFirst={index === 0}
                  isLast={index === stages.length - 1}
                  onError={setError}
                />
              ))}
            </ul>
          )}

          <form onSubmit={handleAddStage} className="mt-4 flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <Field label="Add a stage">
                <input
                  value={stageName}
                  onChange={(event) => setStageName(event.target.value)}
                  className={inputClass}
                  placeholder="Site visit"
                  required
                />
              </Field>
            </div>
            <button type="submit" disabled={busy} className={buttonClass("primary")}>
              Add stage
            </button>
          </form>
        </div>
      )}

      {panel === "new-pipeline" && (
        <form onSubmit={handleCreatePipeline} className="mt-5 border-t border-ink/10 pt-5">
          <div className="max-w-md">
            <Field label="Pipeline name">
              <input
                value={pipelineName}
                onChange={(event) => setPipelineName(event.target.value)}
                className={inputClass}
                placeholder="Commercial leasing"
                required
              />
            </Field>
          </div>

          <p className="mt-5 font-body text-[0.65rem] uppercase tracking-[0.2em] text-ink/40">
            Stages
          </p>
          <ul className="mt-2 max-w-md">
            {newStages.map((value, index) => (
              // These rows have no stable id yet, so the index is the key.
              <li key={index} className="flex items-center gap-2 py-1.5">
                <span className="w-5 shrink-0 font-body text-xs text-ink/35">{index + 1}</span>
                <input
                  value={value}
                  onChange={(event) =>
                    setNewStages((current) =>
                      current.map((entry, i) => (i === index ? event.target.value : entry))
                    )
                  }
                  className={inputClass}
                  placeholder={index === 0 ? "New enquiries" : "Stage name"}
                />
                <button
                  type="button"
                  aria-label={`Remove stage ${index + 1}`}
                  title={
                    newStages.length === 1
                      ? "A pipeline needs at least one stage."
                      : "Remove this stage"
                  }
                  disabled={newStages.length === 1}
                  onClick={() =>
                    setNewStages((current) => current.filter((_, i) => i !== index))
                  }
                  className={buttonClass("ghost")}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setNewStages((current) => [...current, ""])}
            className="mt-2 font-body text-xs text-ink/55 underline-offset-4 transition-colors hover:text-rose-deep hover:underline"
          >
            + Add another stage
          </button>

          <div className="mt-6 flex items-center gap-2">
            <button type="submit" disabled={busy} className={buttonClass("primary")}>
              {busy ? "Creating…" : "Create pipeline"}
            </button>
            <button
              type="button"
              onClick={() => setPanel("none")}
              disabled={busy}
              className={buttonClass("secondary")}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
