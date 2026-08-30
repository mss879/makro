"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase, requireUser } from "@/lib/supabase/server";
import type { ProjectsPageSettingsRow } from "@/lib/supabase/types";

/**
 * The /projects PAGE — hero, intro and carousel.
 *
 * Separate from ./actions.ts, which owns the projects themselves. These two
 * concerns share an admin menu item and a route prefix but nothing else: that
 * file writes public.projects, this one writes the three projects_page_* tables
 * added in 20260803000900.
 *
 * Every export is a Server Action, so every export starts with `requireUser()`
 * — the proxy gate at /admin is optimistic, and a matcher change must never be
 * able to silently unprotect a mutation.
 *
 * Every mutation revalidates "/projects" as well as the admin screen: this
 * content exists on exactly one public page, so a stale /projects is the whole
 * visible consequence of forgetting.
 */

const NOT_CONFIGURED =
  "Supabase is not connected — add the keys to .env.local and restart the dev server.";

const MISSING_TABLES =
  "The projects-page tables are not in the database yet. Apply supabase/migrations/20260803000900_projects_page.sql (and 20260830000100_projects_page_faq.sql for the FAQ tab), then reload.";

export type ProjectsPageFormState = { ok: boolean; message: string };

type AdminClient = NonNullable<Awaited<ReturnType<typeof createServerSupabase>>>;

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function checkbox(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

/**
 * PGRST205 is "table not in the schema cache" — what PostgREST returns when the
 * migration has not been applied. It is by far the most likely error an admin
 * will hit on this screen, and the default message ("Could not find the table…")
 * gives them nothing to act on.
 */
function friendly(error: { code?: string | null; message: string }): string {
  if (error.code === "PGRST205" || error.message.includes("schema cache")) {
    return MISSING_TABLES;
  }
  if (error.code === "23514") {
    // The CHECKs reachable from these forms: the slide shape rule, the
    // autoplay bounds, and the FAQ's non-empty question.
    return "A slide needs at least one of image, heading or body — an entirely empty slide would render as a blank full-screen panel. A FAQ entry needs a question. The autoplay interval must be between 2 and 30 seconds.";
  }
  if (error.code === "23505") {
    return "That project is already in the carousel.";
  }
  return error.message;
}

function done(message: string): ProjectsPageFormState {
  revalidatePath("/projects");
  revalidatePath("/admin/projects/hero");
  revalidatePath("/admin/projects/intro");
  revalidatePath("/admin/projects/carousel");
  revalidatePath("/admin/projects/faq");
  return { ok: true, message };
}

/**
 * The settings row is a singleton created by the migration's seed, but an
 * install that has not been re-seeded may not have it. Upsert-by-read keeps
 * every caller from having to care which.
 */
async function writeSettings(
  supabase: AdminClient,
  patch: Partial<ProjectsPageSettingsRow>
): Promise<ProjectsPageFormState> {
  const { data: existing, error: readError } = await supabase
    .from("projects_page_settings")
    .select("id")
    .maybeSingle();

  if (readError) return { ok: false, message: friendly(readError) };

  const { error } = existing
    ? await supabase.from("projects_page_settings").update(patch).eq("id", existing.id)
    : await supabase.from("projects_page_settings").insert(patch);

  if (error) return { ok: false, message: friendly(error) };
  return done("Saved.");
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

export async function saveHeroSettings(
  _prev: ProjectsPageFormState,
  formData: FormData
): Promise<ProjectsPageFormState> {
  await requireUser();
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  // Seconds in the form, milliseconds in the column: the admin thinks in
  // seconds and the slideshow timer takes milliseconds, and the conversion
  // belongs at the boundary rather than in the component.
  const seconds = Number(text(formData, "interval_seconds"));
  if (!Number.isFinite(seconds) || seconds < 2 || seconds > 30) {
    return { ok: false, message: "The autoplay interval must be between 2 and 30 seconds." };
  }

  return writeSettings(supabase, {
    hero_enabled: checkbox(formData, "hero_enabled"),
    hero_autoplay: checkbox(formData, "hero_autoplay"),
    hero_interval_ms: Math.round(seconds * 1000),
    hero_show_dots: checkbox(formData, "hero_show_dots"),
  });
}

export async function saveSlide(
  _prev: ProjectsPageFormState,
  formData: FormData
): Promise<ProjectsPageFormState> {
  await requireUser();
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const id = text(formData, "id");
  const image = text(formData, "image");
  const heading = text(formData, "heading");
  const body = text(formData, "body");

  // Checked here as well as by the CHECK constraint so the admin gets this
  // sentence rather than a constraint name.
  if (!image && !heading && !body) {
    return {
      ok: false,
      message:
        "Add an image, a heading or some body copy — a slide with none of the three would render as a blank full-screen panel.",
    };
  }

  const payload = {
    // Empty string normalised to null so the renderer's single `image ?` branch
    // covers a cleared field as well as a never-set one.
    image: image || null,
    alt: text(formData, "alt"),
    heading,
    body,
    published: checkbox(formData, "published"),
  };

  const { error } = id
    ? await supabase.from("projects_page_hero_slides").update(payload).eq("id", id)
    : await supabase.from("projects_page_hero_slides").insert({
        ...payload,
        sort_order: Number(text(formData, "sort_order")) || 0,
      });

  if (error) return { ok: false, message: friendly(error) };
  return done(id ? "Slide updated." : "Slide added.");
}

export async function deleteSlide(
  _prev: ProjectsPageFormState,
  formData: FormData
): Promise<ProjectsPageFormState> {
  await requireUser();
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const id = text(formData, "id");
  if (!id) return { ok: false, message: "That slide no longer exists." };

  const { error } = await supabase.from("projects_page_hero_slides").delete().eq("id", id);
  if (error) return { ok: false, message: friendly(error) };

  // The uploaded file is deliberately left in the bucket. Storage is cheap, an
  // orphaned object is invisible, and deleting it here would destroy the image
  // for anyone who had pasted the same URL into a second slide.
  return done("Slide deleted.");
}

/**
 * Reorder by rewriting the whole list. sort_order carries no unique constraint
 * on this table (see the migration), so a single batched upsert is safe and a
 * per-row PATCH storm is unnecessary.
 */
export async function reorderSlides(
  _prev: ProjectsPageFormState,
  formData: FormData
): Promise<ProjectsPageFormState> {
  await requireUser();
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!ids.length) return { ok: false, message: "Nothing to reorder." };

  const { error } = await supabase
    .from("projects_page_hero_slides")
    .upsert(ids.map((id, i) => ({ id, sort_order: i })));

  if (error) return { ok: false, message: friendly(error) };
  return done("Order saved.");
}

// ---------------------------------------------------------------------------
// Intro
// ---------------------------------------------------------------------------

export async function saveIntro(
  _prev: ProjectsPageFormState,
  formData: FormData
): Promise<ProjectsPageFormState> {
  await requireUser();
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  // One paragraph per blank-line-separated block. The reveal animates
  // paragraphs individually, so they have to reach the database as separate
  // array entries rather than one string with newlines in it.
  const paragraphs = String(formData.get("body") ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim().replace(/\s*\n\s*/g, " "))
    .filter(Boolean);

  return writeSettings(supabase, {
    intro_enabled: checkbox(formData, "intro_enabled"),
    intro_eyebrow: text(formData, "intro_eyebrow"),
    intro_body: paragraphs,
  });
}

// ---------------------------------------------------------------------------
// Carousel
// ---------------------------------------------------------------------------

export async function saveCarouselSettings(
  _prev: ProjectsPageFormState,
  formData: FormData
): Promise<ProjectsPageFormState> {
  await requireUser();
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  return writeSettings(supabase, {
    carousel_enabled: checkbox(formData, "carousel_enabled"),
    carousel_eyebrow: text(formData, "carousel_eyebrow"),
    carousel_heading: text(formData, "carousel_heading"),
  });
}

/**
 * The picker posts the full chosen set, in order, rather than one row per
 * toggle. That makes "which projects are in the carousel, and in what order"
 * a single atomic decision instead of a sequence of writes that can half-apply.
 */
export async function saveCarouselSelection(
  _prev: ProjectsPageFormState,
  formData: FormData
): Promise<ProjectsPageFormState> {
  await requireUser();
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const chosen = formData
    .getAll("project_id")
    .map((v) => String(v).trim())
    .filter(Boolean);

  // Replace wholesale. Deleting first means a project removed from the picker
  // actually leaves, and the unique (project_id) constraint cannot trip on a
  // re-add of something that is still present.
  const { error: clearError } = await supabase
    .from("projects_page_carousel_items")
    .delete()
    .not("id", "is", null);
  if (clearError) return { ok: false, message: friendly(clearError) };

  if (chosen.length) {
    const { error } = await supabase.from("projects_page_carousel_items").insert(
      chosen.map((project_id, i) => ({ project_id, published: true, sort_order: i }))
    );
    if (error) return { ok: false, message: friendly(error) };
  }

  return done(chosen.length ? "Carousel saved." : "Carousel cleared.");
}

// ---------------------------------------------------------------------------
// FAQ
//
// Added in 20260830000100. Two halves, mirroring the hero above: the section's
// copy lives on the settings singleton, the questions in their own table.
// ---------------------------------------------------------------------------

export async function saveFaqSettings(
  _prev: ProjectsPageFormState,
  formData: FormData
): Promise<ProjectsPageFormState> {
  await requireUser();
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  return writeSettings(supabase, {
    faq_enabled: checkbox(formData, "faq_enabled"),
    faq_eyebrow: text(formData, "faq_eyebrow"),
    faq_heading: text(formData, "faq_heading"),
    faq_body: text(formData, "faq_body"),
    faq_primary_label: text(formData, "faq_primary_label"),
    faq_primary_href: text(formData, "faq_primary_href"),
    faq_secondary_label: text(formData, "faq_secondary_label"),
    faq_secondary_href: text(formData, "faq_secondary_href"),
  });
}

export async function saveFaqItem(
  _prev: ProjectsPageFormState,
  formData: FormData
): Promise<ProjectsPageFormState> {
  await requireUser();
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const id = text(formData, "id");
  const question = text(formData, "question");

  // Checked here as well as by the CHECK constraint so the admin reads this
  // sentence instead of a constraint name. The ANSWER is deliberately not
  // required — writing the question first is a normal way to work.
  if (!question) {
    return {
      ok: false,
      message: "Add the question. An entry without one renders as an accordion row with nothing to click.",
    };
  }

  const payload = {
    question,
    answer: text(formData, "answer"),
    published: checkbox(formData, "published"),
  };

  const { error } = id
    ? await supabase.from("projects_page_faq_items").update(payload).eq("id", id)
    : await supabase.from("projects_page_faq_items").insert({
        ...payload,
        sort_order: Number(text(formData, "sort_order")) || 0,
      });

  if (error) return { ok: false, message: friendly(error) };
  return done(id ? "Question updated." : "Question added.");
}

export async function deleteFaqItem(
  _prev: ProjectsPageFormState,
  formData: FormData
): Promise<ProjectsPageFormState> {
  await requireUser();
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const id = text(formData, "id");
  if (!id) return { ok: false, message: "That question no longer exists." };

  const { error } = await supabase.from("projects_page_faq_items").delete().eq("id", id);
  if (error) return { ok: false, message: friendly(error) };
  return done("Question deleted.");
}

/** Reorder by rewriting the whole list — see reorderSlides for why that is safe here. */
export async function reorderFaqItems(
  _prev: ProjectsPageFormState,
  formData: FormData
): Promise<ProjectsPageFormState> {
  await requireUser();
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!ids.length) return { ok: false, message: "Nothing to reorder." };

  const { error } = await supabase
    .from("projects_page_faq_items")
    .upsert(ids.map((id, i) => ({ id, sort_order: i })));

  if (error) return { ok: false, message: friendly(error) };
  return done("Order saved.");
}
