"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Badge, buttonClass, formatDate } from "@/components/admin/ui";
import { createClient } from "@/lib/supabase/client";
import type { InquiryRow, LeadRow } from "@/lib/supabase/types";
import { formatValue } from "./LeadCard";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-panel-line py-3">
      <p className="font-body text-[0.65rem] uppercase tracking-[0.2em] text-panel-faint">
        {label}
      </p>
      <div className="mt-1 font-body text-sm text-panel-text">{children}</div>
    </div>
  );
}

/**
 * Read-only detail view. Everything on the lead, plus the message from the
 * contact-form inquiry it came from — fetched here with the browser client so
 * the board doesn't have to carry every inquiry body around with it.
 */
export default function LeadDrawer({
  lead,
  pipelineName,
  stageName,
  onClose,
  onEdit,
}: {
  lead: LeadRow | null;
  pipelineName: string;
  stageName: string;
  onClose: () => void;
  onEdit: () => void;
}) {
  // The board mounts this with a `key` per lead, so `inquiryId` is fixed for
  // the lifetime of the component and the fetch state can simply start correct.
  const inquiryId = lead?.inquiry_id ?? null;
  const [inquiry, setInquiry] = useState<InquiryRow | null>(null);
  const [loading, setLoading] = useState(Boolean(inquiryId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inquiryId) return;

    let cancelled = false;

    (async () => {
      try {
        const { data, error: queryError } = await createClient()
          .from("inquiries")
          .select("*")
          .eq("id", inquiryId)
          .maybeSingle();
        if (cancelled) return;
        if (queryError) setError(queryError.message);
        else setInquiry(data ?? null);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Could not load the inquiry.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [inquiryId]);

  useEffect(() => {
    if (!lead) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lead, onClose]);

  if (!lead) return null;

  const value = formatValue(lead.value);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close lead"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-ink/70"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Lead — ${lead.name}`}
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-panel-line bg-panel"
      >
        <header className="flex items-start justify-between gap-4 border-b border-panel-line px-6 py-5">
          <div className="min-w-0">
            <p className="font-body text-[0.65rem] uppercase tracking-[0.2em] text-panel-faint">
              Lead
            </p>
            <h2 className="mt-1 break-words font-display text-2xl text-panel-text">{lead.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={lead.inquiry_id ? "accent" : "muted"}>
                {lead.inquiry_id ? "Inquiry" : "Manual"}
              </Badge>
              <Badge>{stageName}</Badge>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 font-body text-xs uppercase tracking-[0.18em] text-panel-muted transition-colors hover:text-panel-text"
          >
            Close
          </button>
        </header>

        <div className="flex-1 px-6 py-2">
          <Row label="Email">
            {lead.email ? (
              <a href={`mailto:${lead.email}`} className="underline-offset-4 hover:underline">
                {lead.email}
              </a>
            ) : (
              <span className="text-panel-faint">—</span>
            )}
          </Row>
          <Row label="Phone">
            {lead.phone ? (
              <a href={`tel:${lead.phone}`} className="underline-offset-4 hover:underline">
                {lead.phone}
              </a>
            ) : (
              <span className="text-panel-faint">—</span>
            )}
          </Row>
          <Row label="Interest">{lead.interest ?? <span className="text-panel-faint">—</span>}</Row>
          <Row label="Project">{lead.project ?? <span className="text-panel-faint">—</span>}</Row>
          <Row label="Value">{value ?? <span className="text-panel-faint">—</span>}</Row>
          <Row label="Pipeline">{pipelineName}</Row>
          <Row label="Stage">{stageName}</Row>
          <Row label="Created">{formatDate(lead.created_at, true)}</Row>
          <Row label="Last updated">{formatDate(lead.updated_at, true)}</Row>
          <Row label="Notes">
            {lead.notes ? (
              <span className="whitespace-pre-wrap text-panel-text">{lead.notes}</span>
            ) : (
              <span className="text-panel-faint">No notes yet.</span>
            )}
          </Row>

          {lead.inquiry_id && (
            <div className="py-4">
              <p className="font-body text-[0.65rem] uppercase tracking-[0.2em] text-panel-faint">
                Original inquiry
              </p>
              {loading && (
                <p className="mt-2 font-body text-sm text-panel-faint">Loading the message…</p>
              )}
              {error && (
                <p className="mt-2 border border-danger-line bg-danger-soft px-3 py-2 font-body text-sm text-danger">
                  {error}
                </p>
              )}
              {!loading && !error && !inquiry && (
                <p className="mt-2 font-body text-sm text-panel-faint">
                  That inquiry has since been deleted.
                </p>
              )}
              {inquiry && (
                <div className="mt-2 border border-panel-line bg-panel-raised px-4 py-3">
                  <p className="font-body text-xs text-panel-faint">
                    {formatDate(inquiry.created_at, true)} · via {inquiry.source}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap font-body text-sm text-panel-text">
                    {inquiry.message}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="sticky bottom-0 border-t border-panel-line bg-panel px-6 py-4">
          <button type="button" onClick={onEdit} className={buttonClass("primary", "w-full")}>
            Edit lead
          </button>
        </footer>
      </aside>
    </div>
  );
}
