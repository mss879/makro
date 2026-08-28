"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EmptyState, buttonClass, formatDate, inputClass } from "@/components/admin/ui";
import type { SubscriberRow } from "@/lib/supabase/types";
import {
  addSubscriber,
  deleteSubscribers,
} from "@/app/admin/(panel)/email-list/actions";

/**
 * The newsletter subscriber list.
 *
 * Search and selection are client-side over the rows the page already loaded
 * (capped at 1000) — round-tripping to the server to hide a few rows would
 * cost more than it saves. Everything that *writes* goes through a Server
 * Action, which re-checks auth.
 *
 * The point of this screen is getting addresses *out*: copy-to-clipboard and
 * CSV export both act on the current selection, falling back to everything
 * matching the search when nothing is ticked.
 */

const checkboxClass = "h-4 w-4 shrink-0 cursor-pointer accent-rose align-middle";

type Feedback = { tone: "ok" | "error"; message: string };

/**
 * RFC 4180 quoting — an address should never contain a comma, but be safe.
 * A leading = + - or @ also gets an apostrophe: spreadsheets treat those as
 * the start of a formula, so an address like `=cmd|…` would execute on open.
 */
function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export default function SubscribersTable({
  subscribers,
}: {
  subscribers: SubscriberRow[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subscribers;
    // Searches the source too, so "makro heights" finds everyone who came in
    // through that project's catalogue — which is the question the tag exists
    // to answer.
    return subscribers.filter(
      (s) =>
        s.email.toLowerCase().includes(q) ||
        (s.source ?? "").toLowerCase().includes(q)
    );
  }, [subscribers, query]);

  // Clear the "Copied" flag on a timer. The setState is inside the timeout
  // rather than the effect body, so this does not trip react-hooks/set-state-in-effect.
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  /** Selection is scoped to what is visible, so searching resets it. */
  const search = (value: string) => {
    setQuery(value);
    setSelected(new Set());
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((s) => selected.has(s.id));
  const someVisibleSelected = filtered.some((s) => selected.has(s.id));

  const toggleAll = () => {
    setSelected(allVisibleSelected ? new Set() : new Set(filtered.map((s) => s.id)));
  };

  /** Selection wins; with nothing ticked the actions apply to the search results. */
  const targets = useMemo(
    () => (selected.size > 0 ? filtered.filter((s) => selected.has(s.id)) : filtered),
    [filtered, selected]
  );

  const run = (action: () => Promise<{ ok: boolean; message: string }>) => {
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await action();
        setFeedback({ tone: result.ok ? "ok" : "error", message: result.message });
        if (result.ok) {
          setSelected(new Set());
          router.refresh();
        }
      } catch {
        setFeedback({ tone: "error", message: "Something went wrong. Please try again." });
      }
    });
  };

  const copyEmails = async () => {
    if (targets.length === 0) return;
    const text = targets.map((s) => s.email).join(", ");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setFeedback({
        tone: "error",
        message: "Could not reach the clipboard. Use Export CSV instead.",
      });
    }
  };

  const exportCsv = () => {
    if (targets.length === 0) return;
    const rows = [
      "email,source,subscribed_at",
      ...targets.map(
        (s) => `${csvCell(s.email)},${csvCell(s.source ?? "")},${csvCell(s.created_at)}`
      ),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `makro-email-list-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const removeSelected = () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    const noun = ids.length === 1 ? "this subscriber" : `these ${ids.length} subscribers`;
    if (!window.confirm(`Remove ${noun} from the email list? This cannot be undone.`)) {
      return;
    }
    run(() => deleteSubscribers(ids));
  };

  const submitNew = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = newEmail.trim();
    if (!email) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await addSubscriber(email);
        setFeedback({ tone: result.ok ? "ok" : "error", message: result.message });
        if (result.ok) {
          setNewEmail("");
          router.refresh();
        }
      } catch {
        setFeedback({ tone: "error", message: "Something went wrong. Please try again." });
      }
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Add + search */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <form onSubmit={submitNew} className="flex flex-wrap items-center gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="name@example.com"
            aria-label="Add a subscriber"
            className={`${inputClass} sm:w-64`}
          />
          <button type="submit" disabled={pending} className={buttonClass("primary")}>
            Add
          </button>
        </form>

        <input
          type="search"
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Search addresses or source…"
          aria-label="Search subscribers"
          className={`${inputClass} sm:w-64`}
        />
      </div>

      {feedback && (
        <p
          role="alert"
          className={`border px-4 py-3 font-body text-sm ${
            feedback.tone === "ok"
              ? "border-success-line bg-success-soft text-success"
              : "border-danger-line bg-danger-soft text-danger"
          }`}
        >
          {feedback.message}
        </p>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-panel-line pb-4">
        <p className="font-body text-sm text-panel-muted">
          {selected.size > 0
            ? `${selected.size} selected`
            : `${filtered.length} ${filtered.length === 1 ? "subscriber" : "subscribers"}`}
          {query && subscribers.length !== filtered.length && (
            <span className="text-panel-faint"> of {subscribers.length}</span>
          )}
        </p>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyEmails}
            disabled={targets.length === 0}
            className={buttonClass("secondary")}
          >
            {copied ? "Copied" : `Copy ${targets.length > 0 ? targets.length : ""} emails`}
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={targets.length === 0}
            className={buttonClass("secondary")}
          >
            Export CSV
          </button>
          {selected.size > 0 && (
            <button
              type="button"
              onClick={removeSelected}
              disabled={pending}
              className={buttonClass("danger")}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={query ? "No matching addresses" : "No subscribers yet"}
          body={
            query
              ? "Try a different search term."
              : "Signups from the newsletter form in the site footer will appear here."
          }
        />
      ) : (
        <div className="overflow-x-auto border border-panel-line">
          <table className="w-full min-w-[32rem] border-collapse">
            <thead>
              <tr className="border-b border-panel-line bg-panel-raised text-left">
                <th scope="col" className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
                    }}
                    onChange={toggleAll}
                    aria-label="Select all visible subscribers"
                    className={checkboxClass}
                  />
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 font-body text-[0.7rem] uppercase tracking-[0.18em] text-panel-faint"
                >
                  Email
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 font-body text-[0.7rem] uppercase tracking-[0.18em] text-panel-faint"
                >
                  Source
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 font-body text-[0.7rem] uppercase tracking-[0.18em] text-panel-faint"
                >
                  Subscribed
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  className={`border-b border-panel-line last:border-b-0 transition-colors ${
                    selected.has(s.id) ? "bg-rose/12" : "hover:bg-panel-high"
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(s.id)}
                      onChange={() => toggle(s.id)}
                      aria-label={`Select ${s.email}`}
                      className={checkboxClass}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`mailto:${s.email}`}
                      className="font-body text-sm text-panel-text transition-colors hover:text-rose"
                    >
                      {s.email}
                    </a>
                  </td>
                  {/* Where the address came from — "Catalogue — Makro Heights"
                      for a gated download, blank for the footer signups that
                      predate the column. Comma-separated when someone has come
                      in through more than one route. */}
                  <td className="px-4 py-3 font-body text-sm text-panel-muted">
                    {s.source || <span className="text-panel-faint">Newsletter</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-body text-sm text-panel-muted">
                    {formatDate(s.created_at, true)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
