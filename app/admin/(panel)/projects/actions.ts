"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase, requireUser } from "@/lib/supabase/server";
import { MAX_PROJECT_IMAGES, PROJECT_IMAGE_BUCKET } from "@/lib/supabase/config";
import type {
  ProjectImageRow,
  ProjectStatusRow,
  ProjectTypeRow,
  SpecRow,
} from "@/lib/supabase/types";

/**
 * Projects CRUD.
 *
 * Every export here is a Server Action, so every export starts with
 * `requireUser()` — the proxy gate at /admin is optimistic and a matcher change
 * must never be able to silently unprotect a mutation.
 *
 * Note the module rule: a "use server" file may only export async functions.
 * The select option lists therefore live in ProjectForm (the only consumer);
 * the copies below are the server-side guard against a tampered payload.
 */

const TYPES: readonly ProjectTypeRow[] = ["Residential", "Commercial", "Mixed-Use"];
const STATUSES: readonly ProjectStatusRow[] = [
  "Upcoming",
  "On-going",
  "Delivered",
];

const NOT_CONFIGURED =
  "Supabase is not connected — add the keys to .env.local and restart the dev server.";

/** State returned to `useActionState` by the project form actions. */
export type ProjectFormState = { ok: boolean; message: string };

/** Image actions hand back the authoritative gallery so the UI never guesses. */
export type ImageActionState = {
  ok: boolean;
  message: string;
  images: ProjectImageRow[];
};

type AdminClient = NonNullable<Awaited<ReturnType<typeof createServerSupabase>>>;

/** Everything the form owns. `cover` is derived from the gallery, never typed. */
type ProjectInput = {
  slug: string;
  name: string;
  tagline: string;
  location: string;
  city: string;
  type: ProjectTypeRow;
  status: ProjectStatusRow;
  year: string;
  headline: string;
  summary: string;
  description: string[];
  specs: SpecRow[];
  specs_note: string | null;
  features: string[];
  hero_image: string | null;
  hero_image_mobile: string | null;
  catalogue_url: string | null;
  catalogue_name: string | null;
  published: boolean;
  sort_order: number;
};

// ---------------------------------------------------------------------------
// Helpers (module-private: a "use server" file can only export async functions)
// ---------------------------------------------------------------------------

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Repeated inputs (description paragraphs, features) arrive as one name, many values. */
function textList(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .map((value) => String(value).trim())
    .filter(Boolean);
}

/** Spec rows post as two parallel arrays, zipped back together by index. */
function specList(formData: FormData): SpecRow[] {
  const labels = formData.getAll("spec_label").map(String);
  const values = formData.getAll("spec_value").map(String);
  const rows: SpecRow[] = [];

  for (let i = 0; i < labels.length; i += 1) {
    const label = labels[i].trim();
    const value = (values[i] ?? "").trim();
    if (label || value) rows.push({ label, value });
  }
  return rows;
}

/** Mirrors the client-side slugify in ProjectForm; the server has the final say. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip the accents NFKD just split off
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function readProject(formData: FormData): { error: string } | { payload: ProjectInput } {
  const name = text(formData, "name");
  if (!name) return { error: "A project name is required." };

  const slug = slugify(text(formData, "slug") || name);
  if (!slug) {
    return { error: "That name does not produce a usable URL slug — enter one manually." };
  }

  const type = text(formData, "type") as ProjectTypeRow;
  if (!TYPES.includes(type)) return { error: "Choose a project type." };

  const status = text(formData, "status") as ProjectStatusRow;
  if (!STATUSES.includes(status)) return { error: "Choose a project status." };

  const rawSort = text(formData, "sort_order");
  const sortOrder = rawSort === "" ? 0 : Number(rawSort);
  if (!Number.isInteger(sortOrder)) return { error: "Sort order must be a whole number." };

  return {
    payload: {
      slug,
      name,
      tagline: text(formData, "tagline"),
      location: text(formData, "location"),
      city: text(formData, "city"),
      type,
      status,
      year: text(formData, "year"),
      headline: text(formData, "headline"),
      summary: text(formData, "summary"),
      description: textList(formData, "description"),
      specs: specList(formData),
      specs_note: text(formData, "specs_note") || null,
      features: textList(formData, "features"),
      // Empty means "no hero of its own" — the read path then falls back to
      // cover, so clearing the field restores the previous behaviour rather
      // than blanking the hero.
      hero_image: text(formData, "hero_image") || null,
      // The portrait variant for phones. Empty means "no portrait file", and
      // the renderer then crops the landscape hero as it always did — which is
      // why this needs no validation of its own and no pairing rule with the
      // field above.
      hero_image_mobile: text(formData, "hero_image_mobile") || null,
      catalogue_url: text(formData, "catalogue_url") || null,
      catalogue_name: text(formData, "catalogue_name") || null,
      published: formData.get("published") === "on",
      sort_order: sortOrder,
    },
  };
}

/** Turns Postgres noise into something an admin can act on. */
function friendly(error: { code?: string | null; message: string }): string {
  if (error.code === "23505") {
    return "That slug is already used by another project — choose a different one.";
  }
  // Matched by SHAPE, not by the number in it. This used to test for the
  // literal "at most 5 images", which silently stopped matching the moment the
  // cap moved — the admin would have got the raw Postgres exception instead of
  // this sentence, and nothing would have failed loudly enough to notice.
  if (/at most \d+ images/.test(error.message)) {
    return `A project can have at most ${MAX_PROJECT_IMAGES} images.`;
  }
  return error.message;
}

/**
 * The admin route plus every public route that reads projects. The home page
 * shows featured work, so it is invalidated too.
 *
 * The detail page is a dynamic segment, so it needs the "page" type argument
 * rather than a literal path. It currently sits inside the (site) route group,
 * and revalidatePath matches on route *files* — hence both spellings, so this
 * keeps working if the group is renamed or dropped.
 */
function revalidateProjectRoutes(projectId?: string) {
  revalidatePath("/admin/projects");
  if (projectId) revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/projects/[slug]", "page");
  revalidatePath("/(site)/projects/[slug]", "page");
  revalidatePath("/");
}

async function listImages(
  supabase: AdminClient,
  projectId: string
): Promise<ProjectImageRow[]> {
  const { data, error } = await supabase
    .from("project_images")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true });

  if (error) console.error("[makro] Failed to read project images:", error.message);
  return data ?? [];
}

/** projects.cover always mirrors the image at position 0. */
async function syncCover(
  supabase: AdminClient,
  projectId: string,
  images: ProjectImageRow[]
) {
  const { error } = await supabase
    .from("projects")
    .update({ cover: images[0]?.path ?? null })
    .eq("id", projectId);

  if (error) console.error("[makro] Failed to sync project cover:", error.message);
}

/**
 * Writes 0..n-1 onto the given order in a SINGLE request. Returns an error
 * message, or null.
 *
 * project_images carries a DEFERRABLE INITIALLY DEFERRED unique on
 * (project_id, position), so the collision every permutation passes through is
 * only checked at COMMIT — and PostgREST wraps each request in its own
 * transaction. One PATCH per image would commit the first intermediate state on
 * its own and be rejected there, so the whole set has to move together.
 *
 * Upsert because it is the only multi-row, differing-values write PostgREST
 * offers. Rows go up WHOLE: `on conflict … do update` still evaluates the
 * proposed row's NOT NULLs first, so a {id, position} shorthand would fail on
 * path/project_id before the conflict is ever detected. Conflicting on `id` is
 * likewise forced — a deferrable unique constraint cannot serve as an arbiter.
 */
async function writePositions(
  supabase: AdminClient,
  ordered: ProjectImageRow[]
): Promise<string | null> {
  if (ordered.length === 0) return null;

  const { error } = await supabase
    .from("project_images")
    .upsert(
      ordered.map((image, index) => ({ ...image, position: index })),
      { onConflict: "id" }
    );

  if (error) {
    console.error("[makro] Failed to reorder project images:", error.message);
    return friendly(error);
  }
  return null;
}

/**
 * Best-effort bucket cleanup so deleted images do not orphan their objects.
 * Only URLs that actually point into the project bucket are touched — seeded
 * rows reference /brand/*.jpg and are left alone.
 */
async function removeStorageObjects(supabase: AdminClient, urls: string[]) {
  const marker = `/storage/v1/object/public/${PROJECT_IMAGE_BUCKET}/`;
  const paths = urls
    .map((url) => {
      const at = url.indexOf(marker);
      if (at === -1) return null;
      return decodeURIComponent(url.slice(at + marker.length).split("?")[0]);
    })
    .filter((path): path is string => Boolean(path));

  if (paths.length === 0) return;

  const { error } = await supabase.storage.from(PROJECT_IMAGE_BUCKET).remove(paths);
  if (error) console.error("[makro] Could not delete storage objects:", error.message);
}

// ---------------------------------------------------------------------------
// Project actions
// ---------------------------------------------------------------------------

export async function createProject(
  _prev: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  await requireUser();

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const parsed = readProject(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error };

  const { data, error } = await supabase
    .from("projects")
    .insert(parsed.payload)
    .select("id")
    .single();

  if (error || !data) {
    console.error("[makro] Failed to create project:", error?.message);
    return {
      ok: false,
      message: error ? friendly(error) : "That project could not be created.",
    };
  }

  revalidateProjectRoutes(data.id);
  // Straight into the editor, where the gallery can be filled in.
  redirect(`/admin/projects/${data.id}`);
}

export async function updateProject(
  _prev: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  await requireUser();

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const id = text(formData, "id");
  if (!id) return { ok: false, message: "That project is missing its id — reload the page." };

  const parsed = readProject(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error };

  const { error } = await supabase.from("projects").update(parsed.payload).eq("id", id);

  if (error) {
    console.error("[makro] Failed to update project:", error.message);
    return { ok: false, message: friendly(error) };
  }

  revalidateProjectRoutes(id);
  return { ok: true, message: "Saved." };
}

/** The UI confirms first; this just performs it. Images cascade in the schema. */
export async function deleteProject(id: string): Promise<ProjectFormState> {
  await requireUser();

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const { data: images } = await supabase
    .from("project_images")
    .select("path")
    .eq("project_id", id);

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) {
    console.error("[makro] Failed to delete project:", error.message);
    return { ok: false, message: friendly(error) };
  }

  await removeStorageObjects(supabase, (images ?? []).map((image) => image.path));
  revalidateProjectRoutes();
  return { ok: true, message: "Project deleted." };
}

// ---------------------------------------------------------------------------
// Gallery actions — the upload itself happens in POST /api/admin/upload, which
// converts to WebP and returns the public URL we store here.
// ---------------------------------------------------------------------------

export async function addProjectImage(
  projectId: string,
  url: string
): Promise<ImageActionState> {
  await requireUser();

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED, images: [] };

  const path = url.trim();
  const current = await listImages(supabase, projectId);

  if (!path) {
    return { ok: false, message: "That upload returned no image URL.", images: current };
  }
  if (current.length >= MAX_PROJECT_IMAGES) {
    return {
      ok: false,
      message: `A project can have at most ${MAX_PROJECT_IMAGES} images.`,
      images: current,
    };
  }

  const { error } = await supabase
    .from("project_images")
    .insert({ project_id: projectId, path, position: current.length });

  if (error) {
    console.error("[makro] Failed to attach project image:", error.message);
    return { ok: false, message: friendly(error), images: current };
  }

  const images = await listImages(supabase, projectId);
  await syncCover(supabase, projectId, images);
  revalidateProjectRoutes(projectId);
  return { ok: true, message: "", images };
}

export async function removeProjectImage(imageId: string): Promise<ImageActionState> {
  await requireUser();

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED, images: [] };

  const { data: row } = await supabase
    .from("project_images")
    .select("id, project_id, path")
    .eq("id", imageId)
    .maybeSingle();

  if (!row) {
    return { ok: false, message: "That image no longer exists — reload the page.", images: [] };
  }

  const { error } = await supabase.from("project_images").delete().eq("id", imageId);
  if (error) {
    console.error("[makro] Failed to delete project image:", error.message);
    return {
      ok: false,
      message: friendly(error),
      images: await listImages(supabase, row.project_id),
    };
  }

  // Close the gap the deletion left so positions stay 0..n-1.
  const remaining = await listImages(supabase, row.project_id);
  const failure = await writePositions(supabase, remaining);

  const images = remaining.map((image, index) => ({ ...image, position: index }));
  await syncCover(supabase, row.project_id, images);
  await removeStorageObjects(supabase, [row.path]);
  revalidateProjectRoutes(row.project_id);

  return { ok: !failure, message: failure ?? "", images };
}

export async function reorderProjectImages(
  projectId: string,
  orderedIds: string[]
): Promise<ImageActionState> {
  await requireUser();

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED, images: [] };

  const current = await listImages(supabase, projectId);
  const currentIds = current.map((image) => image.id);

  // The client sends a permutation of what it was given; anything else means
  // the gallery moved underneath it (another tab, another admin).
  const isPermutation =
    orderedIds.length === currentIds.length &&
    new Set(orderedIds).size === orderedIds.length &&
    orderedIds.every((id) => currentIds.includes(id));

  if (!isPermutation) {
    return {
      ok: false,
      message: "This gallery changed elsewhere — reload the page and try again.",
      images: current,
    };
  }

  // Resolved before the write, not after: writePositions sends whole rows, so
  // it needs the row bodies in the requested order, not just their ids.
  const byId = new Map(current.map((image) => [image.id, image]));
  const ordered = orderedIds
    .map((id) => byId.get(id))
    .filter((image): image is ProjectImageRow => Boolean(image));

  const failure = await writePositions(supabase, ordered);
  if (failure) return { ok: false, message: failure, images: current };

  const images = ordered.map((image, index) => ({ ...image, position: index }));

  await syncCover(supabase, projectId, images);
  revalidateProjectRoutes(projectId);
  return { ok: true, message: "", images };
}
