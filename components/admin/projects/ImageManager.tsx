"use client";

import { useState } from "react";
import Image from "next/image";
import { MAX_PROJECT_IMAGES } from "@/lib/supabase/config";
import ImageSpecHint from "@/components/admin/ImageSpecHint";
import { Badge } from "@/components/admin/ui";
import { dangerIconButtonClass, iconButtonClass } from "./RepeatableList";
import {
  addProjectImage,
  removeProjectImage,
  reorderProjectImages,
  type ImageActionState,
} from "@/app/admin/(panel)/projects/actions";
import type { ProjectImageRow } from "@/lib/supabase/types";

/**
 * The project gallery — capped at MAX_PROJECT_IMAGES.
 *
 * Upload goes to POST /api/admin/upload, which is the only place that touches
 * the bucket: it converts whatever is picked to WebP, caps the long edge at
 * 3840px and returns the public URL. That URL is then attached to the project
 * by a Server Action, which also keeps projects.cover pointed at position 0.
 *
 * The actions return the authoritative gallery, so this component's state is
 * always what the database just said it was rather than a local guess.
 */

/** Used only when the route replies without a JSON body of its own. */
const STATUS_FALLBACK: Record<number, string> = {
  401: "Your admin session has expired — sign in again, then retry the upload.",
  409: `A project can have at most ${MAX_PROJECT_IMAGES} images.`,
  413: "That image is larger than 50 MB.",
  415: "That file could not be read as an image.",
  503: "Uploads need SUPABASE_SERVICE_ROLE_KEY in .env.local.",
};

type UploadPayload = { url?: unknown; bytes?: unknown; error?: unknown };

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function ImageManager({
  projectId,
  slug,
  initial,
}: {
  projectId: string;
  slug: string;
  initial: ProjectImageRow[];
}) {
  const [images, setImages] = useState<ProjectImageRow[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const atCap = images.length >= MAX_PROJECT_IMAGES;

  /** Runs a gallery action and adopts whatever list the server reports back. */
  const run = async (action: () => Promise<ImageActionState>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await action();
      // A failed call may return an empty list (e.g. no credentials) — do not
      // let that wipe what is on screen.
      if (result.ok || result.images.length > 0) setImages(result.images);
      if (!result.ok) setError(result.message || "That did not work. Please try again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work. Please try again.");
    } finally {
      setBusy(false);
    }
  };

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
      body.append("slug", slug);
      body.append("projectId", projectId);

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

      const result = await addProjectImage(projectId, url);
      if (result.ok || result.images.length > 0) setImages(result.images);
      if (!result.ok) {
        setError(result.message || "That image could not be attached to the project.");
        return;
      }

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

  const onMove = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;

    const reordered = [...images];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    // Optimistic: the action returns the confirmed order a moment later.
    setImages(reordered.map((image, at) => ({ ...image, position: at })));

    void run(() =>
      reorderProjectImages(
        projectId,
        reordered.map((image) => image.id)
      )
    );
  };

  const onRemove = (image: ProjectImageRow) => {
    const confirmed = window.confirm(
      "Delete this image? It is removed from the project and from storage. This cannot be undone."
    );
    if (!confirmed) return;
    void run(() => removeProjectImage(image.id));
  };

  return (
    <div className="space-y-4">
      {images.length === 0 ? (
        <p className="border border-dashed border-panel-line px-4 py-8 text-center font-body text-sm text-panel-faint">
          No images yet. The first one you upload becomes the cover.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image, index) => (
            <li key={image.id} className="border border-panel-line bg-panel-raised p-2">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-panel-high">
                <Image
                  src={image.path}
                  alt={`${slug} image ${index + 1}`}
                  fill
                  sizes="(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 90vw"
                  className="object-cover"
                />
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                {index === 0 ? (
                  <Badge tone="accent">Cover</Badge>
                ) : (
                  <span className="font-body text-xs text-panel-faint">
                    Position {index + 1}
                  </span>
                )}

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className={iconButtonClass}
                    onClick={() => onMove(index, -1)}
                    disabled={busy || index === 0}
                    aria-label="Move earlier"
                    title="Move earlier"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className={iconButtonClass}
                    onClick={() => onMove(index, 1)}
                    disabled={busy || index === images.length - 1}
                    aria-label="Move later"
                    title="Move later"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    className={dangerIconButtonClass}
                    onClick={() => onRemove(image)}
                    disabled={busy}
                    aria-label="Delete image"
                    title="Delete image"
                  >
                    ×
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div>
        <input
          type="file"
          accept="image/*"
          onChange={onFile}
          disabled={busy || atCap}
          aria-label="Upload a project image"
          className="block w-full cursor-pointer border border-dashed border-panel-line-strong bg-panel-raised p-3 font-body text-xs text-panel-muted transition-colors file:mr-3 file:cursor-pointer file:border file:border-panel-line file:bg-panel file:px-3 file:py-1.5 file:font-body file:text-xs file:text-panel-text hover:border-panel-line-strong disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="mt-2 font-body text-xs text-panel-faint">
          {atCap
            ? `Maximum of ${MAX_PROJECT_IMAGES} images reached — delete one before uploading another.`
            : `${images.length} of ${MAX_PROJECT_IMAGES} used. Uploads are converted to WebP at high quality and resized only if wider than 3840px; 50 MB in, maximum. A smaller file is never enlarged, so upload the original rather than an export you have already shrunk.`}
        </p>
      </div>

      {/* Two specs, because the first image has two jobs. Everything in the
          gallery band is shown uncropped at its own shape — but image one is
          also the project's cover, and the cards crop it. Showing only the
          relaxed rule would quietly set them up to lose the sides of the one
          image that appears everywhere else on the site. */}
      <div className="space-y-3">
        <ImageSpecHint spec="projectGallery" />
        {images.length === 0 && <ImageSpecHint spec="projectCover" />}
      </div>

      {busy && <p className="font-body text-xs text-panel-faint">Working…</p>}
      {error && (
        <p role="alert" className="font-body text-sm text-danger">
          {error}
        </p>
      )}
      {notice && !error && (
        <p className="font-body text-sm text-success">{notice}</p>
      )}
    </div>
  );
}
