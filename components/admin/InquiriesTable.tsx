"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Badge,
  EmptyState,
  buttonClass,
  formatDate,
} from "@/components/admin/ui";
import type { InquiryRow, InquiryStatus } from "@/lib/supabase/types";
import {
  archiveInquiries,
  deleteInquiries,
  transferToCrm,
} from "@/app/admin/(panel)/inquiries/actions";

/**
 * The inquiries worklist.
 *
 * Filtering and selection are client-side over the rows the page already
 * loaded — the list is capped at 200, so round-tripping to the server to hide
 * a few rows would cost more than it saves. Everything that *writes* goes
 * through a Server Action.
 */

type Filter = "all" | InquiryStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "transferred", label: "Transferred" },
  { value: "archived", label: "Archived" },
];

const STATUS_TONE = {
  new: "accent",
  transferred: "success",
  archived: "muted",
} as const;

const STATUS_LABEL: Record<InquiryStatus, string> = {
  new: "New",
  transferred: "Transferred",
  archived: "Archived",
};

/** An inquiry that already produced a lead is never transferred twice. */
function isTransferred(inquiry: InquiryRow) {
  return inquiry.status === "transferred" || Boolean(inquiry.lead_id);
}

const checkboxClass =
  "h-4 w-4 shrink-0 cursor-pointer accent-rose-deep align-middle";

export default function InquiriesTable({ inquiries }: { inquiries: InquiryRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const selectAllRef = useRef<HTMLInputElement>(null);

  const counts = useMemo(() => {
    const base = { all: inquiries.length, new: 0, transferred: 0, archived: 0 };
    for (const inquiry of inquiries) base[inquiry.status] += 1;
    return base;
  }, [inquiries]);

  const visible = useMemo(
    () => (filter === "all" ? inquiries : inquiries.filter((i) => i.status === filter)),
    [inquiries, filter]
  );

  const selectedIds = useMemo(
    () => visible.filter((i) => selected.has(i.id)).map((i) => i.id),
    [visible, selected]
  );

  const transferableCount = useMemo(
    () => visible.filter((i) => selected.has(i.id) && !isTransferred(i)).length,
    [visible, selected]
  );

  const allVisibleSelected = visible.length > 0 && selectedIds.length === visible.length;

  const open = openId ? inquiries.find((i) => i.id === openId) ?? null : null;

  // Header checkbox shows a dash when the page is only partly selected.
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedIds.length > 0 && selectedIds.length < visible.length;
    }
  }, [selectedIds.length, visible.length]);

  // Drawer: escape closes it, and the page behind it stops scrolling.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const changeFilter = (next: Filter) => {
    setFilter(next);
    // Selecting under one filter and acting under another is a good way to
    // surprise someone. Start clean instead.
    setSelected(new Set());
    setNotice(null);
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setNotice(null);
  };

  const toggleAllVisible = () => {
    setSelected(allVisibleSelected ? new Set() : new Set(visible.map((i) => i.id)));
    setNotice(null);
  };

  const run = (
    action: (ids: string[]) => Promise<{ ok: boolean; count: number; error?: string }>,
    ids: string[],
    describe: (count: number) => string,
    nothingToDo: string
  ) => {
    if (ids.length === 0 || pending) return;
    setNotice(null);
    startTransition(async () => {
      const result = await action(ids);
      if (!result.ok) {
        setNotice({ tone: "error", text: result.error ?? "Something went wrong." });
        return;
      }
      setSelected(new Set());
      setOpenId(null);
      setNotice({
        tone: "ok",
        text: result.count === 0 ? nothingToDo : describe(result.count),
      });
      router.refresh();
    });
  };

  const onTransfer = () =>
    run(
      transferToCrm,
      selectedIds,
      (n) => `${n} ${n === 1 ? "inquiry" : "inquiries"} moved into the CRM.`,
      "Nothing to transfer — those inquiries are already in the CRM."
    );

  const onArchive = () =>
    run(
      archiveInquiries,
      selectedIds,
      (n) => `${n} ${n === 1 ? "inquiry" : "inquiries"} archived.`,
      "Nothing was archived."
    );

  const onDelete = (id: string) => {
    if (!window.confirm("Delete this inquiry permanently? This cannot be undone.")) return;
    run(deleteInquiries, [id], () => "Inquiry deleted.", "Nothing was deleted.");
  };

  if (inquiries.length === 0) {
    return (
      <EmptyState
        title="No inquiries yet"
        body="Submissions from the contact form land here the moment they arrive."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((option) => {
          const active = filter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => changeFilter(option.value)}
              aria-pressed={active}
              className={`border px-3 py-1.5 font-body text-xs uppercase tracking-[0.14em] transition-colors ${
                active
                  ? "border-ink bg-ink text-cream"
                  : "border-ink/15 text-ink/55 hover:border-ink/40 hover:text-ink"
              }`}
            >
              {option.label}
              <span className={`ml-2 ${active ? "text-cream/60" : "text-ink/35"}`}>
                {counts[option.value]}
              </span>
            </button>
          );
        })}
      </div>

      {notice && (
        <p
          role="status"
          className={`border px-4 py-2.5 font-body text-sm ${
            notice.tone === "ok"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {notice.text}
        </p>
      )}

      {visible.length === 0 ? (
        <EmptyState
          title="Nothing here"
          body="No inquiries match this filter."
          action={
            <button type="button" onClick={() => changeFilter("all")} className={buttonClass("secondary")}>
              Show all
            </button>
          }
        />
      ) : (
        <div className="overflow-x-auto border border-ink/10 bg-white/70">
          <table className="w-full min-w-[52rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-ink/10">
                <th scope="col" className="w-10 px-4 py-3">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    aria-label="Select all visible inquiries"
                    className={checkboxClass}
                  />
                </th>
                {["Received", "Name", "Email", "Interest", "Project", "Status"].map((label) => (
                  <th
                    key={label}
                    scope="col"
                    className="px-4 py-3 font-body text-[0.65rem] uppercase tracking-[0.18em] text-ink/45"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((inquiry) => {
                const checked = selected.has(inquiry.id);
                return (
                  <tr
                    key={inquiry.id}
                    onClick={() => setOpenId(inquiry.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setOpenId(inquiry.id);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`Open inquiry from ${inquiry.name}`}
                    className={`cursor-pointer border-b border-ink/[0.07] align-middle outline-none transition-colors last:border-b-0 focus-visible:bg-rose-deep/10 ${
                      checked ? "bg-rose-deep/[0.07]" : "hover:bg-ink/[0.03]"
                    }`}
                  >
                    <td
                      className="px-4 py-3.5"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOne(inquiry.id)}
                        aria-label={`Select inquiry from ${inquiry.name}`}
                        className={checkboxClass}
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-body text-sm text-ink/55">
                      {formatDate(inquiry.created_at)}
                    </td>
                    <td className="px-4 py-3.5 font-body text-sm text-ink">{inquiry.name}</td>
                    <td className="px-4 py-3.5 font-body text-sm text-ink/70">{inquiry.email}</td>
                    <td className="px-4 py-3.5 font-body text-sm text-ink/55">
                      {inquiry.interest || "—"}
                    </td>
                    <td className="px-4 py-3.5 font-body text-sm text-ink/55">
                      {inquiry.project || "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone={STATUS_TONE[inquiry.status]}>
                        {STATUS_LABEL[inquiry.status]}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Sticky action bar — only present while something is selected. */}
      {selectedIds.length > 0 && (
        <div className="sticky bottom-4 z-20">
          <div className="flex flex-wrap items-center gap-3 border border-ink/15 bg-cream px-4 py-3 shadow-[0_8px_30px_rgba(5,2,3,0.12)]">
            <p className="font-body text-sm text-ink">
              <strong className="font-normal">{selectedIds.length}</strong> selected
              {transferableCount !== selectedIds.length && (
                <span className="text-ink/45">
                  {" "}
                  · {selectedIds.length - transferableCount} already in the CRM
                </span>
              )}
            </p>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                disabled={pending}
                className={buttonClass("ghost")}
              >
                Clear
              </button>
              <button
                type="button"
                onClick={onArchive}
                disabled={pending}
                className={buttonClass("secondary")}
              >
                Archive
              </button>
              <button
                type="button"
                onClick={onTransfer}
                disabled={pending || transferableCount === 0}
                className={buttonClass("primary")}
              >
                {pending ? "Working…" : "Transfer to CRM"}
              </button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <InquiryDrawer
          inquiry={open}
          pending={pending}
          onClose={() => setOpenId(null)}
          onTransfer={() =>
            run(
              transferToCrm,
              [open.id],
              () => "Moved into the CRM.",
              "That inquiry is already in the CRM."
            )
          }
          onDelete={() => onDelete(open.id)}
        />
      )}
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-ink/[0.07] py-3">
      <p className="font-body text-[0.65rem] uppercase tracking-[0.18em] text-ink/40">{label}</p>
      <div className="mt-1.5 font-body text-sm text-ink">{children}</div>
    </div>
  );
}

function InquiryDrawer({
  inquiry,
  pending,
  onClose,
  onTransfer,
  onDelete,
}: {
  inquiry: InquiryRow;
  pending: boolean;
  onClose: () => void;
  onTransfer: () => void;
  onDelete: () => void;
}) {
  const transferred = isTransferred(inquiry);

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className="fixed inset-0 z-40 bg-ink/25 backdrop-blur-[1px]"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Inquiry from ${inquiry.name}`}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-ink/10 bg-cream shadow-[0_0_60px_rgba(5,2,3,0.25)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-ink/10 px-6 py-5">
          <div>
            <p className="font-body text-[0.65rem] uppercase tracking-[0.18em] text-ink/40">
              Inquiry
            </p>
            <h2 className="mt-1 font-display text-2xl text-ink">{inquiry.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="font-body text-xs uppercase tracking-[0.18em] text-ink/45 transition-colors hover:text-ink"
          >
            Close
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          <DetailRow label="Status">
            <Badge tone={STATUS_TONE[inquiry.status]}>{STATUS_LABEL[inquiry.status]}</Badge>
          </DetailRow>

          <DetailRow label="Received">{formatDate(inquiry.created_at, true)}</DetailRow>

          <DetailRow label="Email">
            <a
              href={`mailto:${inquiry.email}`}
              className="text-rose-deep underline-offset-4 hover:underline"
            >
              {inquiry.email}
            </a>
          </DetailRow>

          <DetailRow label="Phone">
            {inquiry.phone ? (
              <a
                href={`tel:${inquiry.phone.replace(/[^\d+]/g, "")}`}
                className="text-rose-deep underline-offset-4 hover:underline"
              >
                {inquiry.phone}
              </a>
            ) : (
              <span className="text-ink/40">Not given</span>
            )}
          </DetailRow>

          <DetailRow label="Interested in">
            {inquiry.interest || <span className="text-ink/40">—</span>}
          </DetailRow>

          <DetailRow label="Project">
            {inquiry.project || <span className="text-ink/40">No specific project</span>}
          </DetailRow>

          <DetailRow label="Source">{inquiry.source}</DetailRow>

          <DetailRow label="Message">
            <p className="whitespace-pre-line leading-relaxed text-ink/80">{inquiry.message}</p>
          </DetailRow>

          {transferred && (
            <p className="mt-4 border border-emerald-300 bg-emerald-50 px-4 py-3 font-body text-sm text-emerald-800">
              This inquiry is already in the CRM.{" "}
              <Link href="/admin/crm" className="underline underline-offset-4">
                Open the pipeline
              </Link>
            </p>
          )}
        </div>

        <footer className="flex items-center gap-2 border-t border-ink/10 px-6 py-4">
          {!transferred && (
            <button
              type="button"
              onClick={onTransfer}
              disabled={pending}
              className={buttonClass("primary")}
            >
              {pending ? "Working…" : "Transfer to CRM"}
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className={buttonClass("danger", "ml-auto")}
          >
            Delete
          </button>
        </footer>
      </aside>
    </>
  );
}
