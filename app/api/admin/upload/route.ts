import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { createAdminSupabase, getSessionUser } from "@/lib/supabase/server";
import {
  BLOG_IMAGE_BUCKET,
  MAX_PROJECT_IMAGES,
  PROJECT_IMAGE_BUCKET,
  SELECTED_WORK_IMAGE_BUCKET,
} from "@/lib/supabase/config";

/**
 * Admin image upload — the one place in the app that writes to a bucket.
 *
 * Everything that lands in a bucket is normalised to WebP first — the client
 * uploads whatever they have (HEIC off a phone, a 12 MB PNG export) and the
 * site only ever serves a resized, stripped, ~82-quality WebP.
 *
 * Three content areas share the route, each with its own bucket so art can be
 * purged or re-permissioned without touching the others. The caller names a
 * *target*, not a bucket: caller input is never interpolated into a bucket id,
 * it only ever picks one of the rows below.
 */

const TARGETS = {
  project: { bucket: PROJECT_IMAGE_BUCKET, prefix: "projects" },
  "selected-work": { bucket: SELECTED_WORK_IMAGE_BUCKET, prefix: "selected-work" },
  blog: { bucket: BLOG_IMAGE_BUCKET, prefix: "blog" },
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
    return NextResponse.json({ error: "That image is larger than 25 MB." }, { status: 413 });
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

  let webp: Buffer;
  try {
    webp = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: "none" })
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

  const path = `${target.prefix}/${slug}/${randomUUID()}.webp`;
  const { error } = await supabase.storage
    .from(target.bucket)
    .upload(path, webp, { contentType: "image/webp", upsert: false });

  if (error) {
    console.error("[makro] Upload failed:", error.message);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(target.bucket).getPublicUrl(path);

  return NextResponse.json({ url: publicUrl, path, bytes: webp.byteLength });
}
