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
 * uploads whatever they have (HEIC off a phone, a 12 MB PNG export) and the
 * site only ever serves a resized, stripped, ~82-quality WebP. Project
 * catalogues are the exception and are stored byte-for-byte; see `kind` below.
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

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB in, before conversion
const MAX_EDGE = 2000; // px on the long side

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
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "That file is larger than 25 MB." }, { status: 413 });
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
        .webp({ quality: 82 })
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
    .upload(path, body, { contentType, upsert: false });

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
