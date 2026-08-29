import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { createAdminSupabase, getSessionUser } from "@/lib/supabase/server";
import {
  BLOG_IMAGE_BUCKET,
  MAX_PROJECT_IMAGES,
  PROJECT_CATALOGUE_BUCKET,
  PROJECT_IMAGE_BUCKET,
  PROJECTS_PAGE_IMAGE_BUCKET,
  SELECTED_WORK_IMAGE_BUCKET,
} from "@/lib/supabase/config";

/**
 * Admin image upload — the one place in the app that writes to a bucket.
 *
 * Every IMAGE that lands in a bucket is normalised to WebP first — the client
 * uploads whatever they have (HEIC off a phone, a 40 MB PNG export) and the
 * site stores one high-quality WebP master per upload. Project catalogues are
 * the exception and are stored byte-for-byte; see `kind` below.
 *
 * Each content area has its own bucket so art can be purged or re-permissioned
 * without touching the others. The caller names a *target*, not a bucket:
 * caller input is never interpolated into a bucket id, it only ever picks one
 * of the rows below.
 */

/**
 * `kind` decides whether the file is normalised or stored as-is. Every image
 * target goes through sharp; the catalogue target must not — a PDF has no
 * raster to resize, and sharp would reject it outright.
 */
const TARGETS = {
  project: { bucket: PROJECT_IMAGE_BUCKET, prefix: "projects", kind: "image" },
  "selected-work": { bucket: SELECTED_WORK_IMAGE_BUCKET, prefix: "selected-work", kind: "image" },
  blog: { bucket: BLOG_IMAGE_BUCKET, prefix: "blog", kind: "image" },
  // Hero art for /projects. Its own bucket so it can be purged without
  // touching a single project gallery.
  "projects-page": { bucket: PROJECTS_PAGE_IMAGE_BUCKET, prefix: "projects-page", kind: "image" },
  // The gated download. Stored byte-for-byte — see the kind note above.
  catalogue: { bucket: PROJECT_CATALOGUE_BUCKET, prefix: "catalogues", kind: "pdf" },
} as const;

type TargetName = keyof typeof TARGETS;

/** Omitting `bucket` means "project", so the existing gallery callers keep working. */
const DEFAULT_TARGET: TargetName = "project";

/**
 * No app-side size gate.
 *
 * Client direction, Aug 2026: remove the ceiling — any size file can be
 * uploaded. This used to reject anything over 50 MB with a clean 413 before
 * the file was read, which is what blocked the project catalogue.
 *
 * What still bounds an upload, in the order it bites:
 *
 *   1. THE HOSTING PLATFORM'S REQUEST BODY LIMIT. This is a normal multipart
 *      POST, so the whole file has to fit in one serverless request. That
 *      limit is not configurable from this repo and rejects the request at
 *      the edge, before any code here runs — so it cannot be turned into a
 *      helpful message from in here. If a large catalogue still fails after
 *      this change, this is the reason, and the fix is to stop proxying the
 *      bytes: hand the browser a Supabase signed upload URL and let it PUT
 *      straight to Storage, which bypasses the function entirely.
 *   2. The bucket's file_size_limit, plus the project's global Storage limit
 *      (supabase/migrations/20260829000200_remove_upload_size_limits.sql
 *      clears the per-bucket half; the global one lives in the dashboard).
 *      A rejection here DOES come back as a readable message — see
 *      explainStorageFailure().
 *
 * The 413 branches in the admin components are deliberately kept: the
 * platform can still answer 413 on its own, and that is worth naming.
 */

/**
 * Long-edge cap for the stored master, and the quality it is encoded at.
 *
 * Both were raised in Aug 2026 because uploaded photography was visibly
 * over-compressed on the live site. The old numbers were 2000px / q82, and the
 * damage compounded: a 2000px master is already short of what a full-bleed hero
 * needs on a retina laptop (next/image's largest breakpoint is 3840), so the
 * browser was upscaling a lossy file — and then next/image re-encoded it a
 * SECOND time at its default quality of 75. Two lossy passes, the harsher of
 * them last. See `images.qualities` in next.config.ts for the other half of
 * this fix; changing one without the other does very little.
 *
 * 3840 matches the largest deviceSize, so the master is never the limiting
 * factor and never bigger than something that can actually be served. Nothing
 * is upscaled on the way in (`withoutEnlargement`), so a small upload stays
 * small rather than being blown up into a soft master.
 */
const MAX_EDGE = 3840; // px on the long side — next/image's largest breakpoint
/**
 * 95, not the 92 the site SERVES at, and the gap is deliberate.
 *
 * This file is a master, never delivered to a browser: every <Image> re-encodes
 * it (to AVIF, at quality 92 — see next.config.ts). That makes two lossy passes,
 * and the second one faithfully reproduces whatever the first one damaged. At 95
 * the master is effectively transparent to the upload, so the only generation
 * the visitor sees is Next's. The extra bytes cost storage and one server-side
 * decode; they never cost the visitor anything.
 */
const WEBP_QUALITY = 95;

/**
 * The folder segment of the key — a project slug, a card id, a post slug.
 *
 * Mirrors slugify() in the projects Server Action, and doubles as the path
 * guard: with '/' and '.' outside the allowed set, a caller cannot climb out of
 * the target's prefix with '../'.
 */
function segment(value: string): string {
  const cleaned = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip the accents NFKD just split off
    .replace(/[^a-z0-9]+/g, "-") // collapses runs, so '..' and '/' cannot survive
    .replace(/^-+|-+$/g, "")
    .slice(0, 90)
    .replace(/-+$/, ""); // the slice may have left a dangling dash
  return cleaned || "unsorted";
}

/**
 * Turns a Storage error into something the person looking at the screen can
 * act on.
 *
 * This used to answer every storage failure with "Upload failed. Please try
 * again." — which is actively misleading, because the two failures that
 * actually happen in practice are both PERMANENT. A missing bucket and a
 * rejected key do not come good on the third attempt, so the one instruction
 * the message gave was the one thing guaranteed not to work, and the real
 * reason sat in a server log the client cannot read.
 *
 * Returning the underlying detail is safe here in a way it would not be on a
 * public route: POST /api/admin/upload is behind getSessionUser(), so the only
 * person who can read this is the site's own administrator — exactly the person
 * who needs to know which bucket is missing from which project.
 */
function explainStorageFailure(message: string, bucket: string): string {
  const m = message.toLowerCase();

  if (m.includes("bucket") && (m.includes("not found") || m.includes("does not exist"))) {
    return `The storage bucket "${bucket}" does not exist in the Supabase project this site is connected to. Apply the files in supabase/migrations/ to THAT project — the buckets are created by the migration that owns each screen.`;
  }
  if (m.includes("jwt") || m.includes("signature") || m.includes("unauthorized") || m.includes("invalid api key")) {
    return "Supabase rejected the storage credentials. Check that SUPABASE_SERVICE_ROLE_KEY belongs to the same project as NEXT_PUBLIC_SUPABASE_URL, and that it is the service-role key rather than the anon key.";
  }
  if (m.includes("maximum allowed size") || m.includes("payload too large")) {
    return `The converted image was rejected as too large for the "${bucket}" bucket. Raise that bucket's file size limit in Supabase → Storage → Settings.`;
  }
  if (m.includes("mime")) {
    return `The "${bucket}" bucket does not allow image/webp. Add it to the bucket's allowed MIME types in Supabase → Storage → Settings.`;
  }
  if (m.includes("already exists")) {
    return "A file with that name already exists. Try the upload again — the name is randomised, so a second attempt will not collide.";
  }
  // Anything unrecognised: hand over the raw text rather than inventing a
  // diagnosis. An admin with the real message can search for it; an admin with
  // "please try again" has nothing.
  return `Supabase Storage rejected the upload: ${message}`;
}

/**
 * Copies bytes into a freshly allocated, non-shared Uint8Array.
 *
 * WHY THIS EXISTS. supabase-js hands the upload body straight to fetch, and
 * the WHATWG body converter refuses a typed array whose underlying buffer is a
 * SharedArrayBuffer — it throws literally
 *
 *     ArrayBuffer: SharedArrayBuffer is not allowed.
 *
 * The deployed runtime (Netlify) returns exactly that: sharp's `toBuffer()`
 * comes back backed by libvips' shared allocator, so every converted image was
 * rejected before it left the server. It does NOT reproduce locally, where
 * sharp hands back a plain ArrayBuffer — which is why this only ever appeared
 * after deploying, and why it is written host-agnostically: the guarantee we
 * need is "a normal ArrayBuffer", not "not Netlify".
 *
 * `.set()` on a newly allocated view is the fix rather than `.slice()` or
 * `.subarray()`, because slicing a SharedArrayBuffer yields another
 * SharedArrayBuffer. Allocating first guarantees a normal ArrayBuffer whatever
 * the input was. It also normalises the two neighbouring cases the same
 * converter rejects: a pooled Buffer with a non-zero byteOffset, and a
 * resizable or growable ArrayBuffer.
 *
 * Costs one extra copy of the image on an upload that is already doing far
 * more work than that.
 */
function toPlainBytes(input: Uint8Array): Uint8Array {
  const copy = new Uint8Array(input.byteLength);
  copy.set(input);
  return copy;
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const supabase = createAdminSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured. Add SUPABASE_SERVICE_ROLE_KEY to .env.local." },
      { status: 503 }
    );
  }

  const form = await request.formData();
  const requested = String(form.get("bucket") ?? "").trim() || DEFAULT_TARGET;

  if (!Object.hasOwn(TARGETS, requested)) {
    return NextResponse.json({ error: "Unknown upload target." }, { status: 400 });
  }
  const target = TARGETS[requested as TargetName];

  const file = form.get("file");
  const slug = segment(String(form.get("slug") ?? ""));
  const projectId = String(form.get("projectId") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  // Enforce the 5-image cap here too, so the user gets a clean message instead
  // of the database trigger's error. Projects only — a Selected Work card and a
  // blog post each carry a single cover, so there is nothing to count.
  if (requested === "project" && projectId) {
    const { count } = await supabase
      .from("project_images")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId);

    if ((count ?? 0) >= MAX_PROJECT_IMAGES) {
      return NextResponse.json(
        { error: `A project can have at most ${MAX_PROJECT_IMAGES} images.` },
        { status: 409 }
      );
    }
  }

  const raw = Buffer.from(await file.arrayBuffer());

  let body: Buffer;
  let extension: string;
  let contentType: string;

  if (target.kind === "pdf") {
    // Sniff the magic bytes rather than trusting file.type, which is supplied
    // by the browser from the file extension and is trivially wrong. The
    // bucket also refuses non-PDFs (allowed_mime_types), so this is the second
    // of two gates, not the only one — but it is the one that can explain
    // itself to the person who picked the wrong file.
    if (raw.subarray(0, 5).toString("latin1") !== "%PDF-") {
      return NextResponse.json(
        { error: "That file is not a PDF. Catalogues must be PDF files." },
        { status: 415 }
      );
    }
    body = raw;
    extension = "pdf";
    contentType = "application/pdf";
  } else {
    try {
      body = await sharp(raw, { failOn: "none" })
        .rotate() // honour EXIF orientation before metadata is stripped
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
        // Convert to sRGB and SHIP THE PROFILE. Cameras and Lightroom exports
        // are routinely Display P3 or Adobe RGB; dropping the profile without
        // converting leaves a browser to read wide-gamut numbers as sRGB, and
        // the result is the flat, faded look that reads as "over-compressed"
        // long before any encoder artefact does.
        .toColourspace("srgb")
        .withIccProfile("srgb")
        .webp({
          quality: WEBP_QUALITY,
          // Lossy WebP is 4:2:0 by default, which smears colour across the
          // hard edges this photography is full of — glazing mullions,
          // railings, the rose-gold linework. smartSubsample keeps those
          // transitions clean for a few percent more bytes.
          smartSubsample: true,
          effort: 6, // slower encode, smaller file at the same quality
        })
        .toBuffer();
    } catch (err) {
      console.error("[makro] Image conversion failed:", err);
      return NextResponse.json(
        { error: "That file could not be read as an image." },
        { status: 415 }
      );
    }
    extension = "webp";
    contentType = "image/webp";
  }

  const path = `${target.prefix}/${slug}/${randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(target.bucket)
    .upload(path, toPlainBytes(body), { contentType, upsert: false });

  if (error) {
    console.error("[makro] Upload failed:", error.message, `(bucket: ${target.bucket})`);
    return NextResponse.json(
      { error: explainStorageFailure(error.message, target.bucket) },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(target.bucket).getPublicUrl(path);

  return NextResponse.json({ url: publicUrl, path, bytes: body.byteLength, name: file.name });
}
