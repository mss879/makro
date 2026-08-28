import "server-only";

import { createAnonSupabase } from "@/lib/supabase/server";
import { PROJECTS, type Project } from "@/lib/projects";
import type { ProjectRow } from "@/lib/supabase/types";

/**
 * Server-side accessor for project content.
 *
 * Projects are managed in the admin panel and stored in Supabase, but the
 * bundled PROJECTS array stays as a fallback so the marketing site renders
 * correctly before credentials exist — and keeps rendering if the database is
 * ever unreachable. Server Components import from here; client components
 * receive the result as props (lib/projects.ts itself must stay client-safe).
 */

function toProject(row: ProjectRow, gallery: string[]): Project {
  return {
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    location: row.location,
    city: row.city,
    type: row.type,
    status: row.status,
    year: row.year,
    cover: row.cover ?? gallery[0] ?? "",
    // Hero falls back to the cover, then to the first gallery image, so a
    // project that predates the split — or one where the client has simply not
    // set a hero yet — renders exactly as it did before.
    heroImage: row.hero_image ?? row.cover ?? gallery[0] ?? "",
    catalogueUrl: row.catalogue_url ?? "",
    catalogueName: row.catalogue_name ?? "",
    gallery: gallery.length ? gallery : row.cover ? [row.cover] : [],
    headline: row.headline,
    summary: row.summary,
    description: Array.isArray(row.description) ? row.description : [],
    specs: Array.isArray(row.specs) ? row.specs : [],
    specsNote: row.specs_note ?? undefined,
    features: Array.isArray(row.features) ? row.features : [],
  };
}

/** Published projects, ordered the way the admin panel arranges them. */
export async function getProjects(): Promise<Project[]> {
  const supabase = createAnonSupabase();
  if (!supabase) return PROJECTS;

  const { data, error } = await supabase
    .from("projects")
    .select("*, project_images(path, position)")
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("[makro] Falling back to bundled projects:", error.message);
    return PROJECTS;
  }

  // No empty-result fallback on purpose. Once Supabase is answering, it is the
  // source of truth — unpublishing every project has to actually empty the
  // portfolio, or the admin panel would say "0 published" while the live site
  // kept showing the seeded flagship, with no way to take it down.
  return (data ?? []).map((row) => {
    const images = (row.project_images ?? []) as { path: string; position: number }[];
    const gallery = [...images]
      .sort((a, b) => a.position - b.position)
      .map((i) => i.path);
    return toProject(row as unknown as ProjectRow, gallery);
  });
}

export async function getProjectBySlug(slug: string): Promise<Project | undefined> {
  const projects = await getProjects();
  return projects.find((p) => p.slug === slug);
}

export async function getProjectSlugs(): Promise<string[]> {
  const projects = await getProjects();
  return projects.map((p) => p.slug);
}
