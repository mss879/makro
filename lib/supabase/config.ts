/**
 * Supabase connection settings, read once so every caller agrees on whether
 * the backend is wired up yet.
 *
 * The site is designed to run *without* credentials: public pages fall back to
 * the bundled project data and write-paths become no-ops that log loudly. That
 * keeps `npm run dev` and client demos working before the Supabase project
 * exists — but it also means nothing is persisted until `.env.local` is filled
 * in. See docs/BACKEND.md.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** True once the public URL + anon key are present. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** True once the service-role key is also present (uploads, view tracking). */
export const isServiceRoleConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);

/**
 * Storage buckets, one per content type so art can be purged or re-permissioned
 * without touching the others. Named here rather than inline at the call sites
 * because the upload route builds keys from them and the delete-on-replace
 * helper matches the `/storage/v1/object/public/<bucket>/` marker in a stored
 * URL — the two have to agree on the literal or a replaced file leaks.
 */
export const PROJECT_IMAGE_BUCKET = "project-images";
/** Hero art for the /projects page. Separate from the per-project galleries. */
export const PROJECTS_PAGE_IMAGE_BUCKET = "projects-page-images";
export const SELECTED_WORK_IMAGE_BUCKET = "selected-work-images";
export const BLOG_IMAGE_BUCKET = "blog-images";
/** Project catalogue PDFs. Separate from the image buckets: nothing here is
    converted, and the bucket itself refuses anything that is not a PDF. */
export const PROJECT_CATALOGUE_BUCKET = "project-catalogues";

/**
 * Hard cap on images per project. Raised 5 -> 8 (client, Aug 2026).
 *
 * NOT the only place the number lives: it is also a CHECK on
 * project_images.position and a row-count trigger in Postgres, so changing it
 * here alone lets the UI offer a slot the database will refuse. The pair is
 * kept in step by supabase/migrations/20260830000200_project_images_cap.sql —
 * move both, or neither.
 */
export const MAX_PROJECT_IMAGES = 8;

let warned = false;
/** Logs once per process so unconfigured local runs are obvious but not noisy. */
export function warnUnconfigured(context: string) {
  if (warned) return;
  warned = true;
  console.warn(
    `[makro] Supabase is not configured — ${context} was skipped. ` +
      `Fill in .env.local (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) to enable persistence.`
  );
}
