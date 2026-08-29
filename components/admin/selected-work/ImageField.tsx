"use client";

import { useState } from "react";
import Image from "next/image";
import { unsplash } from "@/lib/images";
import { Field, inputClass } from "@/components/admin/ui";
import ImageSpecHint from "@/components/admin/ImageSpecHint";

/**
 * The one image a Selected Work panel carries.
 *
 * Upload goes to POST /api/admin/upload with `bucket: "selected-work"`, which
 * is the only place that touches the bucket: it converts whatever is picked to
 * WebP, caps the long edge at 3840px and returns the public URL. That URL is
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
  413: "That image was rejected as too large by the server.",
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
  /**
   * The folder segment uploads land in — a card id for Selected Work, a project
   * slug for a project hero. Undefined until the record exists, in which case
   * the route files them under `unsorted/`.
   */
  cardId?: string;
  /**
   * Which upload target (and therefore which bucket) this field writes to.
   * Defaults to selected-work so every existing caller is unchanged; the
   * /projects hero passes "projects-page", and a project's own hero passes
   * "project" so its art sits in the same bucket as that project's gallery.
   */
  target?: "selected-work" | "projects-page" | "project";
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
      {/* The preview is cropped to whatever the destination actually crops to:
          the Selected Work rail is a tall 4:5 panel, a project or /projects
          hero is full-bleed and lands nearer 16:10. Showing the wrong frame
          here is worse than showing none — it is a promise about the crop. */}
      <div
        className={`group relative w-full overflow-hidden border border-panel-line bg-panel-high ${
          target === "selected-work" ? "aspect-[4/5]" : "aspect-[16/10]"
        }`}
      >
        {value ? (
          <>
            <Image
              src={unsplash(value)}
              alt=""
              fill
              sizes="9rem"
              className="object-cover"
            />
            {/* Clearing the text field by hand was the only way to drop an
                image, which nobody guesses. Matches the × on each gallery
                tile in ImageManager so the two read as the same control.

                It clears the value rather than deleting the object: this
                field also holds seeded /brand/… paths and Unsplash ids, which
                have nothing in storage to delete, and an uploaded file that is
                still referenced elsewhere must not vanish underneath it. */}
            <button
              type="button"
              onClick={() => {
                onChange("");
                setNotice(null);
                setError(null);
              }}
              disabled={busy}
              aria-label="Remove this image"
              title="Remove this image"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center border border-panel-line bg-panel/85 font-body text-sm leading-none text-panel-text backdrop-blur transition-colors hover:border-danger-line hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
            >
              ×
            </button>
          </>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center px-2 text-center font-body text-xs text-panel-faint">
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
          className="block w-full cursor-pointer border border-dashed border-panel-line-strong bg-panel-raised p-3 font-body text-xs text-panel-muted transition-colors file:mr-3 file:cursor-pointer file:border file:border-panel-line file:bg-panel file:px-3 file:py-1.5 file:font-body file:text-xs file:text-panel-text hover:border-panel-line-strong disabled:cursor-not-allowed disabled:opacity-50"
        />

        {/* Collapsed by default (client, Aug 2026 — "I don't need a path, I
            just need to upload the image"). Its placeholder read as an
            instruction to type one, when the file picker above is the whole
            job for anyone adding art.

            NOT removed, and not conditionally rendered: this input carries
            `name="image"`, which is how the Selected Work dialog submits its
            value, and the column deliberately accepts three shapes — an
            uploaded Storage URL, a bundled /brand/… path (what the seeded
            panels use), or a bare Unsplash id. <details> keeps its children
            mounted while closed, so the field still submits either way. */}
        <details className="group/adv">
          <summary className="cursor-pointer list-none font-body text-xs text-panel-faint transition-colors hover:text-panel-muted">
            <span className="underline decoration-panel-line-strong underline-offset-4">
              Set a path or photo id instead
            </span>
          </summary>
          <div className="mt-3">
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
          </div>
        </details>

        {/* One field, three slots — a Selected Work panel, the /projects hero
            and a project's own hero all crop differently and want different
            shapes, so the guidance is keyed off the same `target` that decides
            the bucket rather than written as one sentence that fits none of
            them. */}
        <ImageSpecHint
          spec={
            target === "selected-work"
              ? "selectedWork"
              : target === "projects-page"
                ? "projectsPageHero"
                : "projectHero"
          }
        />

        <p className="font-body text-xs leading-relaxed text-panel-faint">
          Uploads are converted to WebP at high quality, resized only if wider
          than 3840px. A smaller file is never enlarged, so
          upload the original rather than an export you have already shrunk.
        </p>

        {busy && <p className="font-body text-xs text-panel-faint">Uploading…</p>}
        {error && (
          <p role="alert" className="font-body text-sm text-danger">
            {error}
          </p>
        )}
        {notice && !error && <p className="font-body text-sm text-success">{notice}</p>}
      </div>
    </div>
  );
}
