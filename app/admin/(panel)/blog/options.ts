import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Shared server-side lookups for the two article editors.
 *
 * `related` and `related_projects` are soft references — no foreign keys, by
 * design — so these lists are suggestions for a datalist, never a constraint.
 * A slug that is not here still saves, and starts linking the moment something
 * claims it.
 */
export type SlugOptions = { blogSlugs: string[]; projectSlugs: string[] };

export async function loadSlugOptions(): Promise<SlugOptions> {
  const supabase = await createServerSupabase();
  if (!supabase) return { blogSlugs: [], projectSlugs: [] };

  // Drafts included on purpose: an article often ships alongside the project or
  // companion guide it points at, and both are unpublished while being written.
  const [posts, projects] = await Promise.all([
    supabase.from("blog_posts").select("slug").order("slug", { ascending: true }),
    supabase.from("projects").select("slug").order("slug", { ascending: true }),
  ]);

  if (posts.error) {
    console.error("[makro] Failed to load article slugs:", posts.error.message);
  }
  if (projects.error) {
    console.error("[makro] Failed to load project slugs:", projects.error.message);
  }

  return {
    blogSlugs: (posts.data ?? []).map((row) => row.slug),
    projectSlugs: (projects.data ?? []).map((row) => row.slug),
  };
}

/**
 * Today, as the "YYYY-MM-DD" an `<input type="date">` wants.
 *
 * Built from the local parts rather than `toISOString()`, which would shift to
 * UTC and default a late-evening article to tomorrow — and resolved here, on
 * the server, so the client component hydrates against a value it agrees with.
 */
export function todayISO(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
