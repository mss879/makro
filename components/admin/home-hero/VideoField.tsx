"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/admin/ui";
import ImageSpecHint from "@/components/admin/ImageSpecHint";
import { IMAGE_SPECS } from "@/lib/image-specs";
import { SUPABASE_ANON_KEY } from "@/lib/supabase/config";

/**
 * One of the home hero's two videos — the landscape loop, or the portrait one
 * for phones.
 *
 * Picking a file runs three steps, in this order on purpose:
 *
 *   1. READ THE FIRST FRAME, locally, before anything is sent. The hero paints
 *      a still under the video while it buffers, and it has to be the video's
 *      own opening frame or the picture visibly jumps when playback starts.
 *      Nobody remembers to export one, so it is taken from the file here —
 *      which also catches a video this browser cannot decode before minutes
 *      have gone into uploading it.
 *   2. UPLOAD THE VIDEO straight to Storage through a signed URL from
 *      /api/admin/video-upload. It cannot go through /api/admin/upload like
 *      the images do: the host caps a serverless request at a few MB, and see
 *      that route for the rest. XMLHttpRequest rather than supabase-js's
 *      uploadToSignedUrl(), for one reason — upload progress, which fetch
 *      cannot report and which a 20 MB file on a phone connection needs.
 *   3. UPLOAD THE FRAME through /api/admin/upload like any other still (it is
 *      converted to WebP there) and hand its URL to the form as this video's
 *      still.
 *
 * Nothing is saved until the form is: every step only fills in fields.
 */

type Variant = "desktop" | "mobile";

type Probe = {
  width: number;
  height: number;
  duration: number;
  /** Null when this browser could not draw the frame. */
  frame: Blob | null;
};

type Note = { tone: "ok" | "warn"; text: string };

/** What the <input> offers and the route accepts. The bucket allows the same two. */
const ACCEPT = "video/mp4,video/webm";
const ACCEPTED = new Set(ACCEPT.split(","));

/**
 * Past this, say something. The loop the site shipped with is 3 MB, and every
 * visitor downloads the hero before it moves — the preloader holds for it. A
 * warning rather than a limit: the client asked for no upload ceilings.
 */
const HEAVY_BYTES = 12 * 1024 * 1024;

/**
 * The captured still is only ever shown for the moment before the video plays,
 * so it never needs more pixels than the video has — and it travels to the
 * upload route in ONE serverless request, which the host caps at a few MB. A
 * 2560px JPEG at 0.95 lands well inside that; a 4K frame might not.
 */
const MAX_FRAME_EDGE = 2560;

/** Used only when a route replies without a JSON body of its own. */
const STATUS_FALLBACK: Record<number, string> = {
  401: "Your admin session has expired — sign in again, then retry the upload.",
  413: "The file was rejected as too large by the server.",
  503: "Uploads need SUPABASE_SERVICE_ROLE_KEY in .env.local.",
};

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  return seconds < 60 ? `${Math.round(seconds)} s` : `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`;
}

/** Resolves once `event` fires on the video, or after `ms` whatever happens. */
function settle(video: HTMLVideoElement, event: string, ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    const done = (ok: boolean) => {
      window.clearTimeout(timer);
      video.removeEventListener(event, onEvent);
      video.removeEventListener("error", onError);
      resolve(ok);
    };
    const onEvent = () => done(true);
    const onError = () => done(false);
    const timer = window.setTimeout(() => done(false), ms);
    video.addEventListener(event, onEvent);
    video.addEventListener("error", onError);
  });
}

/**
 * Size, length and first frame of a picked file, read in this browser.
 *
 * Needs `blob:` in the CSP's media-src (next.config.ts) — the file is played
 * from an object URL, which is what keeps the canvas untainted and means
 * nothing has to be uploaded to read it.
 */
async function probe(file: File): Promise<Probe | null> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  try {
    const loaded = settle(video, "loadeddata", 20000);
    video.src = url;
    if (!(await loaded)) return null;

    const { videoWidth: width, videoHeight: height, duration } = video;

    // A seek to a point still inside frame 0 before drawing. Safari can hand
    // drawImage() a blank frame straight after loadeddata; waiting for a seek
    // to land makes every engine commit the frame first. 1ms is frame 0 at any
    // real frame rate — the same frame the hero restarts on.
    const seeked = settle(video, "seeked", 3000);
    video.currentTime = 0.001;
    await seeked;

    let frame: Blob | null = null;
    if (width && height) {
      const scale = Math.min(1, MAX_FRAME_EDGE / Math.max(width, height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        // JPEG, not WebP: Safari's canvas cannot encode WebP and silently
        // hands back a PNG several times the size. The upload route turns it
        // into WebP either way.
        frame = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.95)
        );
      }
    }

    return { width, height, duration, frame };
  } catch {
    return null;
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

/** Turns Storage's JSON error body into a sentence the admin can act on. */
function storageFailure(xhr: XMLHttpRequest): string {
  let message = "";
  try {
    const parsed: unknown = JSON.parse(xhr.responseText);
    if (parsed && typeof parsed === "object" && "message" in parsed) {
      message = String((parsed as { message: unknown }).message ?? "");
    }
  } catch {
    // Not JSON — fall through to the status line.
  }
  const m = message.toLowerCase();
  if (m.includes("mime")) {
    return "Storage only accepts MP4 or WebM videos in this bucket. Export the video as an MP4 (H.264) and try again.";
  }
  if (m.includes("maximum allowed size") || xhr.status === 413) {
    return "The video is larger than the upload limit set in Supabase (Storage → Settings). Export a smaller file, or raise that limit.";
  }
  if (m.includes("bucket") && m.includes("not found")) {
    return "The home-hero-media bucket does not exist yet. Apply supabase/migrations/20260929000100_home_hero.sql, then try again.";
  }
  return message
    ? `Supabase Storage refused the video: ${message}`
    : `The video upload failed (HTTP ${xhr.status}).`;
}

async function uploadVideo(
  file: File,
  variant: Variant,
  onProgress: (fraction: number) => void
): Promise<string> {
  const response = await fetch("/api/admin/video-upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: file.type, variant }),
  });
  const parsed: unknown = await response.json().catch(() => null);
  const payload = (parsed && typeof parsed === "object" ? parsed : {}) as {
    signedUrl?: unknown;
    publicUrl?: unknown;
    error?: unknown;
  };

  if (!response.ok) {
    throw new Error(
      (typeof payload.error === "string" && payload.error) ||
        STATUS_FALLBACK[response.status] ||
        `The upload could not be started (HTTP ${response.status}).`
    );
  }
  if (typeof payload.signedUrl !== "string" || typeof payload.publicUrl !== "string") {
    throw new Error("The upload could not be started — the server returned no upload address.");
  }
  const { signedUrl, publicUrl } = payload;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    // The same request supabase-js's uploadToSignedUrl() makes for a File:
    // a multipart body with the file under an empty field name and
    // cacheControl beside it, plus x-upsert. The signed token in the URL is
    // the authorisation; apikey is sent for parity with the client library.
    xhr.setRequestHeader("x-upsert", "false");
    if (SUPABASE_ANON_KEY) xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(storageFailure(xhr)));
    xhr.onerror = () =>
      reject(new Error("The video upload failed — check your connection and try again."));

    const body = new FormData();
    // A year. The key is a fresh uuid that is never written twice, so the
    // file behind this URL can never change, and a returning visitor should
    // not have to ask whether it has.
    body.append("cacheControl", "31536000");
    body.append("", file);
    xhr.send(body);
  });

  return publicUrl;
}

/** The captured frame goes through the image route like any other still. */
async function uploadStill(frame: Blob): Promise<string> {
  const body = new FormData();
  body.append("file", new File([frame], "first-frame.jpg", { type: "image/jpeg" }));
  body.append("bucket", "home-hero");
  body.append("slug", "still");

  const response = await fetch("/api/admin/upload", { method: "POST", body });
  const parsed: unknown = await response.json().catch(() => null);
  const payload = (parsed && typeof parsed === "object" ? parsed : {}) as {
    url?: unknown;
    error?: unknown;
  };

  if (!response.ok || typeof payload.url !== "string" || !payload.url) {
    throw new Error(
      (typeof payload.error === "string" && payload.error) ||
        STATUS_FALLBACK[response.status] ||
        `HTTP ${response.status}`
    );
  }
  return payload.url;
}

export default function VideoField({
  variant,
  name,
  value,
  onChange,
  onStill,
}: {
  variant: Variant;
  /** The form field the text input submits under — two of these share one form. */
  name: string;
  value: string;
  onChange: (next: string) => void;
  /** Receives the uploaded first frame, which becomes this video's still. */
  onStill: (url: string) => void;
}) {
  const spec = variant === "mobile" ? "homeHeroVideoMobile" : "homeHeroVideo";

  // Non-null while a step is running; doubles as the busy flag.
  const [stage, setStage] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset immediately so re-picking the same file still fires onChange.
    event.target.value = "";
    if (!file) return;

    setError(null);
    setNotes([]);

    if (!ACCEPTED.has(file.type)) {
      setError(
        "Upload the video as an MP4 (H.264) or a WebM. Other formats — a .mov straight off a phone, for one — do not play in every browser."
      );
      return;
    }

    setStage("Reading the video…");
    const info = await probe(file);

    const next: Note[] = [];
    try {
      setStage(`Uploading ${formatBytes(file.size)}…`);
      setProgress(0);
      const url = await uploadVideo(file, variant, setProgress);
      onChange(url);
      setProgress(null);

      const facts = [
        info?.width && info.height ? `${info.width} × ${info.height}` : "",
        info ? formatDuration(info.duration) : "",
        formatBytes(file.size),
      ].filter(Boolean);
      next.push({ tone: "ok", text: `Video uploaded — ${facts.join(" · ")}.` });

      if (file.size > HEAVY_BYTES) {
        next.push({
          tone: "warn",
          text: `At ${formatBytes(file.size)} this will work, but every visitor downloads it before the hero starts moving (the original was 3 MB). A 1080p export at a lower bitrate usually brings a hero loop under 10 MB.`,
        });
      }
      if (info?.width && info.height) {
        if (variant === "desktop" && info.height > info.width) {
          next.push({
            tone: "warn",
            text: "This video is portrait, so on desktop it will be cropped to a wide band across its middle. Upload it as the phone video instead, and a landscape one here.",
          });
        }
        if (variant === "mobile" && info.width > info.height) {
          next.push({
            tone: "warn",
            text: "This video is landscape, so phones will show a narrow slice of it — the same as leaving this empty. A portrait (4:5) video is what this slot is for.",
          });
        }
      }

      if (info?.frame) {
        setStage("Saving its first frame as the still…");
        try {
          onStill(await uploadStill(info.frame));
          next.push({
            tone: "ok",
            text: "Its first frame is now the still image below, so nothing jumps when playback starts.",
          });
        } catch (reason) {
          next.push({
            tone: "warn",
            text: `The first frame could not be saved as the still (${
              reason instanceof Error ? reason.message : "unknown error"
            }). Upload a still of the video's opening frame below, or the old picture will flash before the new video starts.`,
          });
        }
      } else if (!info) {
        // Not even the metadata loaded. Almost always the codec: an MP4
        // holding H.265/HEVC plays in Safari and not in most other browsers.
        next.push({
          tone: "warn",
          text: "This browser could not play the video, so its first frame could not be taken either and the still below was left as it was. A video that will not play here will not play for many visitors — re-export it as an H.264 MP4 and upload it again.",
        });
      } else {
        next.push({
          tone: "warn",
          text: "This browser could not read the video's first frame, so the still below was left as it was. Upload a still of the opening frame, or the old picture will flash before the new video starts.",
        });
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The video upload failed.");
    } finally {
      setStage(null);
      setProgress(null);
      setNotes(next);
    }
  };

  const busy = stage !== null;

  return (
    <div className="grid gap-4 sm:grid-cols-[9rem_minmax(0,1fr)]">
      {/* Cropped to what the hero crops to, like ImageField's preview: the
          desktop frame is the screen, the phone frame is the 4:5 space above
          the copy. */}
      <div
        className={`relative w-full overflow-hidden border border-panel-line bg-panel-high ${
          variant === "mobile" ? "aspect-[4/5]" : "aspect-[16/10]"
        }`}
      >
        {value ? (
          <>
            {/* key: a new URL is a new element, so the preview actually
                reloads rather than keeping the old file's frames. */}
            <video
              key={value}
              src={value}
              muted
              loop
              playsInline
              autoPlay
              preload="metadata"
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* Clears the field, never the file — the same contract as the ×
                on ImageField: a bundled /public path has nothing in storage
                to delete, and the live page may still be serving this URL
                until the save lands. */}
            <button
              type="button"
              onClick={() => {
                onChange("");
                setNotes([]);
                setError(null);
              }}
              disabled={busy}
              aria-label="Remove this video"
              title="Remove this video"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center border border-panel-line bg-panel/85 font-body text-sm leading-none text-panel-text backdrop-blur transition-colors hover:border-danger-line hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
            >
              ×
            </button>
          </>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center px-2 text-center font-body text-xs text-panel-faint">
            No video
          </span>
        )}
      </div>

      <div className="min-w-0 space-y-3">
        <input
          type="file"
          accept={ACCEPT}
          onChange={onFile}
          disabled={busy}
          aria-label={`Upload the ${IMAGE_SPECS[spec].label.toLowerCase()}`}
          className="block w-full cursor-pointer border border-dashed border-panel-line-strong bg-panel-raised p-3 font-body text-xs text-panel-muted transition-colors file:mr-3 file:cursor-pointer file:border file:border-panel-line file:bg-panel file:px-3 file:py-1.5 file:font-body file:text-xs file:text-panel-text hover:border-panel-line-strong disabled:cursor-not-allowed disabled:opacity-50"
        />

        {/* Collapsed, mounted, and submitting — the same arrangement as
            ImageField's, for the same reasons: the file picker is the whole
            job for almost everyone, but the column also takes a bundled
            /public path, which is how the shipped loop is stored. */}
        <details>
          <summary className="cursor-pointer list-none font-body text-xs text-panel-faint transition-colors hover:text-panel-muted">
            <span className="underline decoration-panel-line-strong underline-offset-4">
              Set a path instead
            </span>
          </summary>
          <div className="mt-3">
            <Field
              label="Video"
              hint="Filled in by the upload above. A /public path like /hero-architectural-1080.mp4 also works."
            >
              <input
                type="text"
                name={name}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder="/hero-architectural-1080.mp4"
                className={`${inputClass} font-mono text-xs`}
              />
            </Field>
          </div>
        </details>

        <ImageSpecHint spec={spec} />

        <p className="font-body text-xs leading-relaxed text-panel-faint">
          Videos are stored exactly as uploaded — nothing re-encodes them — so
          export for the web first. Uploading replaces the still image below
          with the video&rsquo;s first frame.
        </p>

        {stage && (
          <div className="space-y-1.5" role="status" aria-live="polite">
            <p className="font-body text-xs text-panel-faint">
              {stage}
              {progress !== null && ` ${Math.round(progress * 100)}%`}
            </p>
            {progress !== null && (
              <div className="h-1 w-full bg-panel-line">
                <div
                  className="h-full bg-rose transition-[width] duration-200"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="font-body text-sm text-danger">
            {error}
          </p>
        )}
        {!error &&
          notes.map((note) => (
            <p
              key={note.text}
              className={`font-body text-sm ${note.tone === "ok" ? "text-success" : "text-warning"}`}
            >
              {note.text}
            </p>
          ))}
      </div>
    </div>
  );
}
