"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * The project's catalogue PDF.
 *
 * Uploaded DIRECT TO STORAGE, not through POST /api/admin/upload like every
 * image on the site. A serverless function's request body is capped in the
 * single-digit megabytes by the host (Netlify 6 MB, Vercel 4.5 MB), and a real
 * catalogue is tens of megabytes — the client's is 27 MB. Proxied through the
 * function it was rejected at the edge before any of our code ran, which is a
 * failure no app-side or Supabase-side limit can lift, because neither ever
 * saw the request.
 *
 * So the two halves are split: /api/admin/catalogue/sign mints a signed upload
 * URL (a few hundred bytes of JSON through the function), and the file itself
 * goes browser → Supabase Storage, never touching our server. What bounds the
 * size now is the bucket's file_size_limit and the project's global Storage
 * limit, both of which are configurable.
 *
 * Two values are stored, not one: the URL is a uuid key, so the original
 * filename is kept alongside it and offered to the visitor at download time.
 * Without it every catalogue on every device saves as `a3f1…-9c2b.pdf`.
 */

const STATUS_FALLBACK: Record<number, string> = {
  401: "Your admin session has expired — sign in again, then retry the upload.",
  // Kept even though nothing of ours answers 413 any more: Storage enforces
  // the bucket's ceiling and can still say no.
  413: "That file was rejected as too large by the server.",
  503: "Uploads need SUPABASE_SERVICE_ROLE_KEY in .env.local.",
};

type SignPayload = { path?: unknown; token?: unknown; publicUrl?: unknown; error?: unknown };

/**
 * Reads the first five bytes and checks for the PDF magic number.
 *
 * The server used to do this on the whole uploaded buffer. Now that it never
 * sees the bytes, the check moves here — not as a security control (the
 * bucket's allowed_mime_types is what actually enforces "PDFs only", and it
 * runs on Supabase where a browser cannot reach it) but as a courtesy: it
 * costs one disk read and saves someone from watching a 27 MB upload finish
 * before being told they picked the wrong file.
 */
async function looksLikePdf(file: File): Promise<boolean> {
  const head = await file.slice(0, 5).arrayBuffer();
  return new TextDecoder("latin1").decode(head) === "%PDF-";
}

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
      if (!(await looksLikePdf(file))) {
        setError("That file is not a PDF. Catalogues must be PDF files.");
        return;
      }

      // 1. Ask our server for a signed upload URL. Only JSON crosses the
      //    function, so the host's request body cap is irrelevant here.
      const response = await fetch("/api/admin/catalogue/sign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: slug ?? "" }),
      });
      const parsed: unknown = await response.json().catch(() => null);
      const payload = (parsed && typeof parsed === "object" ? parsed : {}) as SignPayload;
      const routeError = typeof payload.error === "string" ? payload.error : "";

      if (!response.ok) {
        setError(
          routeError ||
            STATUS_FALLBACK[response.status] ||
            `The upload could not be started (HTTP ${response.status}).`
        );
        return;
      }

      const path = typeof payload.path === "string" ? payload.path : "";
      const token = typeof payload.token === "string" ? payload.token : "";
      const publicUrl = typeof payload.publicUrl === "string" ? payload.publicUrl : "";
      if (!path || !token || !publicUrl) {
        setError("The server did not return a usable upload URL.");
        return;
      }

      // 2. Send the file itself straight to Storage. contentType must be set
      //    explicitly — the bucket only admits application/pdf, and a PUT that
      //    guesses octet-stream is refused.
      const { error: uploadError } = await createClient()
        .storage.from("project-catalogues")
        .uploadToSignedUrl(path, token, file, { contentType: "application/pdf" });

      if (uploadError) {
        const m = uploadError.message.toLowerCase();
        setError(
          m.includes("maximum allowed size") || m.includes("too large")
            ? "Supabase Storage rejected the file as too large. Raise the project's global upload limit in Supabase → Storage → Settings, and check the bucket's own file size limit."
            : m.includes("mime") || m.includes("content type")
              ? "Supabase Storage refused the file's type. The project-catalogues bucket only accepts application/pdf."
              : `Supabase Storage rejected the upload: ${uploadError.message}`
        );
        return;
      }

      onChange({ url: publicUrl, name: file.name });
      setNotice(`Uploaded (${formatBytes(file.size)}).`);
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
        PDF only. Visitors give an email address before it
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

