import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminSupabase, getSessionUser } from "@/lib/supabase/server";
import { HOME_HERO_MEDIA_BUCKET } from "@/lib/supabase/config";

/**
 * Hands the admin a one-time URL to upload a home hero video STRAIGHT to
 * Supabase Storage.
 *
 * WHY NOT /api/admin/upload. That route takes the file in its request body and
 * re-encodes it with sharp — right for a photograph, and impossible for a
 * video: the whole file would have to fit in one serverless request, and the
 * host caps those (~6 MB on Netlify, ~4.5 MB on Vercel) before any code of ours
 * runs, with an error we cannot word. The loop the site shipped with is 3 MB;
 * the client's own footage will usually be more. So this route never sees the
 * video. It checks the session, chooses the key, and asks Storage — with the
 * service-role key, which never leaves the server — for a signed upload URL.
 * The browser then PUTs the file to that URL itself.
 *
 * What stands in for the checks the upload route makes on an image:
 *   - the session check below: a signed URL is a capability, so only a
 *     signed-in admin is ever handed one;
 *   - the type check below, against the file's declared MIME type;
 *   - the bucket's allowed_mime_types (20260929000100_home_hero.sql), which
 *     refuses anything but MP4 and WebM whatever a caller claims here.
 *
 * Videos are stored byte for byte. Re-encoding them would need ffmpeg in a
 * serverless function, and the file the client exports for the web is already
 * the one to serve.
 */

/**
 * Declared MIME type → the extension the key gets. A Map rather than an object
 * literal so a caller-supplied "constructor" or "__proto__" cannot resolve to
 * something off Object.prototype. The bucket allows the same two types.
 */
const VIDEO_TYPES = new Map([
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
]);

/**
 * The two failures that actually happen here are both permanent — a bucket
 * that was never created and a key from the wrong project — so, as in the
 * upload route, the admin is told which one it is rather than to "try again".
 */
function explain(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("bucket") && (m.includes("not found") || m.includes("does not exist"))) {
    return `The storage bucket "${HOME_HERO_MEDIA_BUCKET}" does not exist in the Supabase project this site is connected to. Apply supabase/migrations/20260929000100_home_hero.sql to that project, then try again.`;
  }
  if (m.includes("jwt") || m.includes("signature") || m.includes("unauthorized") || m.includes("invalid api key")) {
    return "Supabase rejected the storage credentials. Check that SUPABASE_SERVICE_ROLE_KEY is the service-role key of the same project as NEXT_PUBLIC_SUPABASE_URL.";
  }
  return `Supabase Storage refused the upload: ${message}`;
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const supabase = createAdminSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Uploads need SUPABASE_SERVICE_ROLE_KEY in .env.local." },
      { status: 503 }
    );
  }

  const input: unknown = await request.json().catch(() => null);
  const { type, variant } = (input && typeof input === "object" ? input : {}) as {
    type?: unknown;
    variant?: unknown;
  };

  const extension = typeof type === "string" ? VIDEO_TYPES.get(type) : undefined;
  if (!extension) {
    return NextResponse.json(
      {
        error:
          "Upload the video as an MP4 (H.264) or a WebM. Other formats — a .mov straight off a phone, for one — do not play in every browser.",
      },
      { status: 415 }
    );
  }

  // One of two literals, never caller text, so the key cannot be steered.
  const folder = variant === "mobile" ? "video-mobile" : "video-desktop";
  const path = `home-hero/${folder}/${randomUUID()}.${extension}`;

  const bucket = supabase.storage.from(HOME_HERO_MEDIA_BUCKET);
  const { data, error } = await bucket.createSignedUploadUrl(path);

  if (error || !data) {
    const message = error?.message ?? "no signed URL was returned";
    console.error("[makro] Could not sign a video upload:", message, `(bucket: ${HOME_HERO_MEDIA_BUCKET})`);
    return NextResponse.json({ error: explain(message) }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = bucket.getPublicUrl(path);

  return NextResponse.json({ signedUrl: data.signedUrl, publicUrl });
}
