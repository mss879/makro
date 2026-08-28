"use client";

import { useState } from "react";

/**
 * The project's catalogue PDF.
 *
 * Uploads to POST /api/admin/upload with `bucket: "catalogue"`, which is the
 * one target that does NOT convert what it is given — see the `kind` note in
 * that route. The URL it returns is what the column stores.
 *
 * Two values, not one: the URL is a uuid key, so the original filename is kept
 * alongside it and offered to the visitor at download time. Without it every
 * catalogue on every device saves as `a3f1…-9c2b.pdf`.
 */

const STATUS_FALLBACK: Record<number, string> = {
  401: "Your admin session has expired — sign in again, then retry the upload.",
  413: "That file is larger than 25 MB.",
  415: "That file is not a PDF.",
  503: "Uploads need SUPABASE_SERVICE_ROLE_KEY in .env.local.",
};

type UploadPayload = { url?: unknown; bytes?: unknown; name?: unknown; error?: unknown };

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function CatalogueField({
  slug,
  url,
  name,
  onChange,
}: {
  /** Folder segment for the storage key. Undefined before the project exists. */
  slug?: string;
  url: string;
  name: string;
  onChange: (next: { url: string; name: string }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset immediately so re-picking the same file still fires onChange.
    event.target.value = "";
    if (!file) return;

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const body = new FormData();
      body.append("file", file);
      body.append("bucket", "catalogue");
      if (slug) body.append("slug", slug);

      const response = await fetch("/api/admin/upload", { method: "POST", body });
      const parsed: unknown = await response.json().catch(() => null);
      const payload = (parsed && typeof parsed === "object" ? parsed : {}) as UploadPayload;
      const routeError = typeof payload.error === "string" ? payload.error : "";

      if (!response.ok) {
        setError(
          routeError ||
            STATUS_FALLBACK[response.status] ||
            `The upload failed (HTTP ${response.status}).`
        );
        return;
      }

      const uploaded = typeof payload.url === "string" ? payload.url : "";
      if (!uploaded) {
        setError("The upload finished but returned no file URL.");
        return;
      }

      onChange({
        url: uploaded,
        name: typeof payload.name === "string" ? payload.name : file.name,
      });

      const bytes = typeof payload.bytes === "number" ? payload.bytes : 0;
      setNotice(bytes ? `Uploaded (${formatBytes(bytes)}).` : "Uploaded.");
    } catch {
      setError("The upload failed — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {url ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-panel-line bg-panel-raised px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-body text-sm text-panel-text">
              {name || "Catalogue.pdf"}
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener"
              className="font-body text-xs text-rose underline underline-offset-4"
            >
              Open the PDF
            </a>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange({ url: "", name: "" });
              setNotice(null);
              setError(null);
            }}
            disabled={busy}
            aria-label="Remove the catalogue"
            title="Remove the catalogue"
            className="flex h-7 w-7 shrink-0 items-center justify-center border border-panel-line font-body text-sm leading-none text-panel-muted transition-colors hover:border-danger-line hover:bg-danger-soft hover:text-danger disabled:opacity-50"
          >
            ×
          </button>
        </div>
      ) : (
        <p className="border border-dashed border-panel-line px-4 py-6 text-center font-body text-sm text-panel-faint">
          No catalogue yet. The download button stays hidden on the project page
          until one is uploaded.
        </p>
      )}

      <input
        type="file"
        accept="application/pdf,.pdf"
        onChange={onFile}
        disabled={busy}
        aria-label="Upload the catalogue PDF"
        className="block w-full cursor-pointer border border-dashed border-panel-line-strong bg-panel-raised p-3 font-body text-xs text-panel-muted transition-colors file:mr-3 file:cursor-pointer file:border file:border-panel-line file:bg-panel file:px-3 file:py-1.5 file:font-body file:text-xs file:text-panel-text hover:border-panel-line-strong disabled:cursor-not-allowed disabled:opacity-50"
      />

      {/* Both values ride the same server action as the rest of the form. */}
      <input type="hidden" name="catalogue_url" value={url} />
      <input type="hidden" name="catalogue_name" value={name} />

      <p className="font-body text-xs leading-relaxed text-panel-faint">
        PDF only, 25 MB maximum. Visitors give an email address before it
        downloads, and that address goes to the Email List tagged with this
        project.
      </p>

      {busy && <p className="font-body text-xs text-panel-faint">Uploading…</p>}
      {error && (
        <p role="alert" className="font-body text-sm text-danger">
          {error}
        </p>
      )}
      {notice && !error && <p className="font-body text-sm text-success">{notice}</p>}
    </div>
  );
}

