"use client";

import { useState } from "react";
import Image from "next/image";
import { unsplash } from "@/lib/images";
import { Field, inputClass } from "@/components/admin/ui";

/**
 * The one image a Selected Work panel carries.
 *
 * Upload goes to POST /api/admin/upload with `bucket: "selected-work"`, which
 * is the only place that touches the bucket: it converts whatever is picked to
 * WebP, caps the long edge at 2000px and returns the public URL. That URL is
 * what lands in the field — the column stores the full URL, never a storage key.
 *
 * The field itself stays a plain text input rather than hiding behind the
 * uploader, because the column deliberately accepts three shapes: an uploaded
 * Storage URL, a bundled `/brand/…` path (which is what the seeded panels use),
 * or a bare Unsplash photo id.
 */

/** Used only when the route replies without a JSON body of its own. */
const STATUS_FALLBACK: Record<number, string> = {
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

export default function ImageField({
  cardId,
  value,
  onChange,
  target = "selected-work",
}: {
  /** Undefined until the card exists; uploads then land under `unsorted/`. */
  cardId?: string;
  /**
   * Which upload target (and therefore which bucket) this field writes to.
   * Defaults to selected-work so every existing caller is unchanged; the
   * /projects hero passes "projects-page".
   */
  target?: "selected-work" | "projects-page";
  value: string;
  onChange: (next: string) => void;
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
      body.append("bucket", target);
      if (cardId) body.append("slug", cardId);

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

      onChange(url);

      const bytes = typeof payload.bytes === "number" ? payload.bytes : 0;
      setNotice(
        bytes
          ? `Uploaded and converted to WebP (${formatBytes(bytes)}).`
          : "Uploaded and converted to WebP."
      );
    } catch {
      setError("The upload failed — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-[9rem_minmax(0,1fr)]">
      {/* The rail crops every panel to 4/5, so the preview does too. */}
      <div className="relative aspect-[4/5] w-full overflow-hidden border border-ink/10 bg-ink/5">
        {value ? (
          <Image
            src={unsplash(value)}
            alt=""
            fill
            sizes="9rem"
            className="object-cover"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center px-2 text-center font-body text-xs text-ink/35">
            No image yet
          </span>
        )}
      </div>

      <div className="min-w-0 space-y-3">
        <input
          type="file"
          accept="image/*"
          onChange={onFile}
          disabled={busy}
          aria-label="Upload a panel image"
          className="block w-full cursor-pointer border border-dashed border-ink/20 bg-white/60 p-3 font-body text-xs text-ink/60 transition-colors file:mr-3 file:cursor-pointer file:border file:border-ink/15 file:bg-cream file:px-3 file:py-1.5 file:font-body file:text-xs file:text-ink hover:border-ink/35 disabled:cursor-not-allowed disabled:opacity-50"
        />

        <Field
          label="Image"
          hint="Filled in by the upload above. A /brand/… path or an Unsplash photo id also works."
        >
          <input
            type="text"
            name="image"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="/brand/sw-tower.jpg"
            className={`${inputClass} font-mono text-xs`}
          />
        </Field>

        <p className="font-body text-xs text-ink/45">
          Uploads are converted to WebP and resized to 2000px on the long edge; 25 MB
          in, maximum. Panels are cropped to a tall 4:5 frame, so shoot or pick
          accordingly.
        </p>

        {busy && <p className="font-body text-xs text-ink/45">Uploading…</p>}
        {error && (
          <p role="alert" className="font-body text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && !error && <p className="font-body text-sm text-emerald-700">{notice}</p>}
      </div>
    </div>
  );
}
