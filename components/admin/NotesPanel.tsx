"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createNote,
  deleteNote,
  updateNote,
  type NoteActionState,
} from "@/app/admin/(panel)/actions";
import {
  Card,
  EmptyState,
  Field,
  buttonClass,
  formatDate,
  inputClass,
} from "@/components/admin/ui";
import type { NoteRow } from "@/lib/supabase/types";

/**
 * Notes tab — a scratchpad for the sales team, backed by public.notes.
 *
 * The list arrives as a prop from the server page (the tabs are client-side, so
 * there is nothing to stream in here). Every mutation runs the matching Server
 * Action and then calls router.refresh(), which re-runs the page's queries and
 * feeds a fresh `notes` array back down.
 */

const GENERIC_ERROR = "Something went wrong. Please try again.";

export default function NotesPanel({ notes }: { notes: NoteRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Runs an action, surfaces its message on failure, refreshes on success. */
  const run = (action: () => Promise<NoteActionState>, onSuccess?: () => void) => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) {
          setError(result.message);
          return;
        }
        onSuccess?.();
        router.refresh();
      } catch (err) {
        console.error("[makro] note action failed", err);
        setError(GENERIC_ERROR);
      }
    });
  };

  const handleCreate = (formData: FormData) =>
    run(
      () =>
        createNote({
          title: String(formData.get("title") ?? ""),
          body: String(formData.get("body") ?? ""),
        }),
      () => setAdding(false)
    );

  const handleUpdate = (id: string, formData: FormData) =>
    run(
      () =>
        updateNote(id, {
          title: String(formData.get("title") ?? ""),
          body: String(formData.get("body") ?? ""),
        }),
      () => setEditingId(null)
    );

  const handleDelete = (note: NoteRow) => {
    const label = note.title.trim() || "this note";
    if (!window.confirm(`Delete “${label}”? This cannot be undone.`)) return;
    run(() => deleteNote(note.id), () => setEditingId((id) => (id === note.id ? null : id)));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-body text-sm text-panel-muted">
          {notes.length === 0
            ? "No notes yet."
            : `${notes.length} note${notes.length === 1 ? "" : "s"}, most recently updated first.`}
        </p>
        {!adding && (
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setError(null);
            }}
            className={buttonClass("primary")}
          >
            Add note
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="font-body text-sm text-danger">
          {error}
        </p>
      )}

      {adding && (
        <Card>
          <NoteForm
            submitLabel="Save note"
            pending={pending}
            onSubmit={handleCreate}
            onCancel={() => {
              setAdding(false);
              setError(null);
            }}
          />
        </Card>
      )}

      {notes.length === 0 && !adding ? (
        <EmptyState
          title="Nothing noted yet"
          body="Notes are shared across the admin panel — use them for handover details, follow-ups, or anything the next person needs to know."
          action={
            <button type="button" onClick={() => setAdding(true)} className={buttonClass("primary")}>
              Add the first note
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {notes.map((note) =>
            editingId === note.id ? (
              <Card key={note.id}>
                <NoteForm
                  initialTitle={note.title}
                  initialBody={note.body ?? ""}
                  submitLabel="Save changes"
                  pending={pending}
                  onSubmit={(formData) => handleUpdate(note.id, formData)}
                  onCancel={() => {
                    setEditingId(null);
                    setError(null);
                  }}
                />
              </Card>
            ) : (
              <Card key={note.id} className="flex flex-col">
                <h3 className="font-display text-xl text-panel-text">{note.title || "Untitled note"}</h3>
                {note.body && (
                  <p className="mt-3 whitespace-pre-line font-body text-sm leading-relaxed text-panel-muted">
                    {note.body}
                  </p>
                )}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
                  <span className="font-body text-xs text-panel-faint">
                    Updated {formatDate(note.updated_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setEditingId(note.id);
                        setError(null);
                      }}
                      className={buttonClass("ghost", "px-2 py-1 text-xs")}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleDelete(note)}
                      className={buttonClass("ghost", "px-2 py-1 text-xs hover:text-danger")}
                    >
                      Delete
                    </button>
                  </span>
                </div>
              </Card>
            )
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Shared add/edit form. Inputs are controlled so a failed save keeps whatever
 * was typed (React resets uncontrolled forms once a form action resolves).
 */
function NoteForm({
  initialTitle = "",
  initialBody = "",
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initialTitle?: string;
  initialBody?: string;
  submitLabel: string;
  pending: boolean;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);

  return (
    <form action={onSubmit} className="flex flex-col gap-4">
      <Field label="Title">
        <input
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={160}
          required
          autoFocus
          placeholder="Follow up with the Rohini Place buyer"
          className={inputClass}
        />
      </Field>

      <Field label="Note">
        <textarea
          name="body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={5}
          maxLength={8000}
          placeholder="Anything the next person needs to know."
          className={`${inputClass} resize-y`}
        />
      </Field>

      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Saving…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className={buttonClass("secondary")}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
