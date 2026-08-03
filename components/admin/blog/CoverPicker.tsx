"use client";

import { useState } from "react";
import Image from "next/image";
import { inputClass } from "@/components/admin/ui";
import { unsplash } from "@/lib/images";

/**
 * The `cover` column — a single image, not a gallery, so there is no join table
 * and nothing to reorder. The value posts as a plain text field with the rest
 * of the form.
 *
 * Three shapes are legal here, all of which lib/images.ts::unsplash() resolves:
 * a bare Unsplash id, a local /brand/*.jpg path, or a full Storage public URL.
 * Uploads always produce the third. Never a bare storage key — unsplash() would
 * read it as an Unsplash id and build a broken photo URL.
 *
 * The upload writes to the bucket immediately, but the column only changes when
 * the form is saved; the Server Action deletes the outgoing object then, so a
 * replaced cover is cleaned up once the replacement is actually committed.
 */

/** Used only when the route replies without a JSON body of its own. */
const STATUS_FALLBACK: Record<number, string> = {
  400: "That upload target was rejected — reload the page and try again.",
  401: "Your admin session has expired — sign in again, then retry the upload.",
  413: "That image is larger than 25 MB.",
  415: "That file could not be read as an image.",
  503: "Uploads need SUPABASE_SERVICE_ROLE_KEY in .env.local.",
};

type UploadPayload = { url?: unknown; bytes?: unknown; error?: unknown };

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function CoverPicker({
  initial,
  slug,
}: {
  initial: string;
  /** Folder segment for the storage key; the route sanitises it again. */
  slug: string;
}) {
  const [value, setValue] = useState(initial);
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
      body.append("bucket", "blog");
      body.append("slug", slug);

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

      const url = typeof payload.url === "string" ? payload.url : "";
      if (!url) {
        setError("The upload finished but returned no image URL.");
        return;
      }

      setValue(url);
      const bytes = typeof payload.bytes === "number" ? payload.bytes : 0;
      setNotice(
        bytes
          ? `Uploaded and converted to WebP (${formatBytes(bytes)}). Save the article to keep it.`
          : "Uploaded and converted to WebP. Save the article to keep it."
      );
    } catch {
      setError("The upload failed — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-4">
        <div className="relative aspect-[16/10] w-full max-w-xs shrink-0 overflow-hidden border border-ink/10 bg-ink/5">
          {value ? (
            <Image
              src={unsplash(value, 800)}
              alt=""
              fill
              sizes="20rem"
              className="object-cover"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center font-body text-xs text-ink/35">
              No cover yet
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <input
            type="file"
            accept="image/*"
            onChange={onFile}
            disabled={busy}
            aria-label="Upload a cover image"
            className="block w-full cursor-pointer border border-dashed border-ink/20 bg-white/60 p-3 font-body text-xs text-ink/60 transition-colors file:mr-3 file:cursor-pointer file:border file:border-ink/15 file:bg-cream file:px-3 file:py-1.5 file:font-body file:text-xs file:text-ink hover:border-ink/35 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <p className="font-body text-xs text-ink/45">
            Converted to WebP and resized to 2000px on the long edge; 25 MB in,
            maximum. Replacing a cover deletes the old file when you save.
          </p>

          <label className="block">
            <span className="font-body text-[0.7rem] uppercase tracking-[0.22em] text-ink/45">
              Or an image reference
            </span>
            <input
              type="text"
              name="cover"
              value={value}
              maxLength={600}
              onChange={(event) => setValue(event.target.value)}
              placeholder="/brand/texture-peaks.jpg"
              className={`${inputClass} mt-2`}
            />
          </label>
          <p className="font-body text-xs text-ink/45">
            An uploaded cover fills this in for you. Otherwise: a{" "}
            <code className="font-mono text-[0.7rem]">/brand/…</code> asset path or a
            bare Unsplash photo id.
          </p>
        </div>
      </div>

      {busy && <p className="font-body text-xs text-ink/45">Uploading…</p>}
      {error && (
        <p role="alert" className="font-body text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && !error && <p className="font-body text-sm text-emerald-700">{notice}</p>}
    </div>
  );
}
