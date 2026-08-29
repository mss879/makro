import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminSupabase, getSessionUser } from "@/lib/supabase/server";
import { PROJECT_CATALOGUE_BUCKET } from "@/lib/supabase/config";

/**
 * Issues a short-lived signed upload URL for a project catalogue.
 *
 * WHY THIS EXISTS. POST /api/admin/upload proxies the file's bytes through a
 * serverless function, and every mainstream host caps a function's request
 * body in the single-digit megabytes (Netlify 6 MB, Vercel 4.5 MB). A 27 MB
 * catalogue is rejected at the edge before any of our code runs, so there is
 * no app-side or Supabase-side setting that can accept it — the request never
 * reaches either. Raising a limit cannot fix a request that was never
 * delivered.
 *
 * So the bytes stop travelling through the function. This route hands back a
 * signed URL and the browser PUTs the file straight to Supabase Storage; the
 * only thing crossing the function is a few hundred bytes of JSON. The host's
 * body cap stops applying, and the real ceiling becomes Storage's own — the
 * bucket's file_size_limit (cleared in
 * supabase/migrations/20260829000200_remove_upload_size_limits.sql) and the
 * project's global limit in the Supabase dashboard. Both of those are
 * configurable, which the platform's is not.
 *
 * Images deliberately keep the proxied route: that path exists to re-encode
 * them to a WebP master with sharp, which is server-side work and cannot be
 * skipped by uploading direct. Catalogues are stored byte for byte, so they
 * have nothing to lose here.
 *
 * SECURITY. The signed URL is a write capability, so it is only minted for a
 * signed-in admin, and only ever for a key this route constructs: the caller
 * supplies a slug, never a path. `segment()` below is the same guard the
 * upload route uses — with '/' and '.' outside the allowed character set, a
 * caller cannot climb out of the catalogues/ prefix. The bucket's
 * allowed_mime_types is {application/pdf}, which is what actually enforces
 * "catalogues are PDFs" now that no server-side code sees the bytes; the
 * client checks the %PDF- magic bytes too, but only so the person who picked
 * the wrong file gets told before waiting for a 27 MB upload.
 */

/** Mirrors segment() in app/api/admin/upload/route.ts — see the path-guard note there. */
function segment(value: string): string {
  const cleaned = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90)
    .replace(/-+$/, "");
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

  let slug = "";
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object") {
      slug = String((body as { slug?: unknown }).slug ?? "");
    }
  } catch {
    // A malformed body is not worth a distinct code path — the slug simply
    // falls back to "unsorted" the same way an omitted one does.
  }

  const path = `catalogues/${segment(slug)}/${randomUUID()}.pdf`;

  const { data, error } = await supabase.storage
    .from(PROJECT_CATALOGUE_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    const message = error?.message ?? "Storage did not return a signed upload URL.";
    console.error("[makro] Catalogue sign failed:", message);

    // The two failures that actually happen here are both permanent, so say
    // which one it is rather than inviting a pointless retry.
    const m = message.toLowerCase();
    if (m.includes("bucket") && (m.includes("not found") || m.includes("does not exist"))) {
      return NextResponse.json(
        {
          error: `The storage bucket "${PROJECT_CATALOGUE_BUCKET}" does not exist in the Supabase project this site is connected to. Apply the files in supabase/migrations/ to THAT project.`,
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: `Supabase Storage: ${message}` }, { status: 500 });
  }

  // Resolved here rather than in the browser so the public URL is built from
  // the same client that owns the bucket, and the caller never has to know how
  // a Storage public URL is shaped.
  const {
    data: { publicUrl },
  } = supabase.storage.from(PROJECT_CATALOGUE_BUCKET).getPublicUrl(path);

  return NextResponse.json({
    path,
    token: data.token,
    bucket: PROJECT_CATALOGUE_BUCKET,
    publicUrl,
  });
}
