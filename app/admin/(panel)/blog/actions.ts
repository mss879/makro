"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabase, requireUser } from "@/lib/supabase/server";
import { BLOG_IMAGE_BUCKET } from "@/lib/supabase/config";
import type { BlogCategory, BlogSection } from "@/lib/supabase/types";

/**
 * Blog CRUD — the /insights articles.
 *
 * Every export here is a Server Action, so every export starts with
 * `requireUser()`: the proxy gate at /admin is optimistic and a matcher change
 * must never be able to silently unprotect a mutation.
 *
 * Module rule: a "use server" file may only export async functions, so the
 * category list lives in BlogForm (the only consumer) and the zod schemas stay
 * module-private. The schema below is the server-side guard against a tampered
 * payload, not a mirror of the client's own checks.
 */

const NOT_CONFIGURED =
  "Supabase is not connected — add the keys to .env.local and restart the dev server.";

/** State returned to `useActionState` by the article form actions. */
export type BlogFormState = { ok: boolean; message: string };

type AdminClient = NonNullable<Awaited<ReturnType<typeof createServerSupabase>>>;

/** Everything the form owns. Column names, so the payload inserts as-is. */
type PostInput = {
  slug: string;
  title: string;
  display_title: string;
  category: BlogCategory;
  published_on: string;
  read_time: string;
  cover: string;
  excerpt: string;
  meta_description: string;
  keywords: string[];
  intro: string;
  sections: BlogSection[];
  related: string[];
  related_projects: string[];
  published: boolean;
  sort_order: number;
};

// ---------------------------------------------------------------------------
// Validation (module-private: a "use server" file can only export async functions)
// ---------------------------------------------------------------------------

const CATEGORIES = ["Buying", "Investing", "Commercial", "Guides"] as const;

/**
 * One `sections[]` entry.
 *
 * `points` is `.optional()` rather than defaulted, and `.min(1)` on top: zod
 * leaves an absent optional key absent, so a prose-only section survives
 * validation with no `points` key at all — which is the whole invariant. The
 * public renderer guards on `section.points && <ul>`, so a stored `[]` would
 * hang a bare bullet list under every prose-only section.
 */
const sectionSchema = z
  .object({
    heading: z
      .string()
      .trim()
      .min(1, "Every section needs a heading.")
      .max(240, "Section headings are capped at 240 characters."),
    paras: z.array(z.string()).max(40, "That is more paragraphs than a section should carry."),
    points: z.array(z.string()).min(1).max(40, "That is more bullets than a section should carry.").optional(),
  })
  .superRefine((section, ctx) => {
    // Each bullet is a React key within its section.
    const seen = new Set<string>();
    for (const point of section.points ?? []) {
      if (seen.has(point)) {
        ctx.addIssue({
          code: "custom",
          message: `“${section.heading}” lists the bullet “${point}” twice — bullets are used as React keys, so they must be unique within a section.`,
        });
        return;
      }
      seen.add(point);
    }
  });

/** `published_on` is a Postgres `date`; reject 2026-02-31 before Postgres does. */
function isRealDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const postSchema = z.object({
  slug: z
    .string()
    .min(1, "That title does not produce a usable URL slug — enter one manually.")
    .max(90),
  title: z.string().trim().min(1, "An article needs a title.").max(240),
  display_title: z.string().trim().max(240),
  category: z.enum(CATEGORIES, { error: "Choose a category." }),
  published_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a publish date.")
    .refine(isRealDate, "That publish date does not exist."),
  read_time: z.string().trim().max(40),
  cover: z.string().trim().max(600),
  excerpt: z.string().trim().max(600),
  meta_description: z.string().trim().max(400),
  keywords: z.array(z.string()).max(40, "Forty keywords is plenty."),
  intro: z.string().trim().max(4000),
  sections: z
    .array(sectionSchema)
    .max(40, "That is more sections than one article should carry.")
    .superRefine((sections, ctx) => {
      // Each heading is a React key within the article.
      const seen = new Set<string>();
      for (const section of sections) {
        const heading = section.heading.trim();
        if (seen.has(heading)) {
          ctx.addIssue({
            code: "custom",
            message: `Two sections are both titled “${heading}” — headings are used as React keys, so they must be unique within an article.`,
          });
          return;
        }
        seen.add(heading);
      }
    }),
  related: z.array(z.string()).max(12),
  related_projects: z.array(z.string()).max(12),
  published: z.boolean(),
  // A non-numeric sort order arrives as NaN, which z.number() rejects — the
  // constructor message covers that, `.int()` covers 1.5.
  sort_order: z
    .number({ error: "Sort order must be a whole number." })
    .int("Sort order must be a whole number."),
});

// ---------------------------------------------------------------------------
// Form reading
// ---------------------------------------------------------------------------

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Repeated inputs (keywords, paragraphs, bullets) arrive as one name, many values. */
function textList(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .map((value) => String(value).trim())
    .filter(Boolean);
}

/** Mirrors the client-side slugify in BlogForm; the server has the final say. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip the accents NFKD just split off
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

/**
 * Section keys are generated by SectionsEditor and only ever name sibling form
 * fields — `section_heading__<key>`, `section_para__<key>`. Anything outside
 * this shape, or a key seen twice, would read another section's inputs, so it
 * is dropped rather than trusted.
 */
const SECTION_KEY = /^[a-z][a-z0-9]{0,31}$/;

/**
 * Rebuilds the ordered `sections` jsonb from the flat FormData.
 *
 * The repeatable-list convention (`getAll(name)`) only reaches one level, so
 * each section owns a key and its nested lists post under names derived from
 * it. The `section_key` inputs are what carry the order — the browser sends
 * fields in DOM order, so reordering the sections reorders these.
 */
function sectionList(formData: FormData): BlogSection[] {
  const seen = new Set<string>();
  const sections: BlogSection[] = [];

  for (const raw of formData.getAll("section_key")) {
    const key = String(raw);
    if (!SECTION_KEY.test(key) || seen.has(key)) continue;
    seen.add(key);

    const heading = text(formData, `section_heading__${key}`);
    const paras = textList(formData, `section_para__${key}`);
    const points = textList(formData, `section_point__${key}`);

    // A section that was added and never filled in is dropped, not rejected.
    if (!heading && paras.length === 0 && points.length === 0) continue;

    // Omitted, never []. See the note on sectionSchema.
    sections.push(points.length > 0 ? { heading, paras, points } : { heading, paras });
  }

  return sections;
}

function readPost(formData: FormData): { error: string } | { payload: PostInput } {
  const title = text(formData, "title");
  const rawSort = text(formData, "sort_order");

  const parsed = postSchema.safeParse({
    slug: slugify(text(formData, "slug") || title),
    title,
    display_title: text(formData, "display_title"),
    category: text(formData, "category"),
    published_on: text(formData, "published_on"),
    read_time: text(formData, "read_time"),
    cover: text(formData, "cover"),
    excerpt: text(formData, "excerpt"),
    meta_description: text(formData, "meta_description"),
    keywords: textList(formData, "keywords"),
    intro: text(formData, "intro"),
    sections: sectionList(formData),
    related: textList(formData, "related"),
    related_projects: textList(formData, "related_projects"),
    published: formData.get("published") === "on",
    sort_order: rawSort === "" ? 0 : Number(rawSort),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "That article is not valid." };
  }
  return { payload: parsed.data };
}

/** Turns Postgres noise into something an admin can act on. */
function friendly(error: { code?: string | null; message: string }): string {
  if (error.code === "23505") {
    return "That slug is already used by another article — choose a different one.";
  }
  return error.message;
}

/**
 * The admin route plus every public route that reads articles. The home page
 * carries a three-article preview, so it is invalidated too.
 *
 * The article page is a dynamic segment, so it needs the "page" type argument
 * rather than a literal path. It currently sits inside the (site) route group,
 * and revalidatePath matches on route *files* — hence both spellings, so this
 * keeps working if the group is renamed or dropped.
 */
function revalidateBlogRoutes(postId?: string) {
  revalidatePath("/admin/blog");
  if (postId) revalidatePath(`/admin/blog/${postId}`);
  revalidatePath("/insights");
  revalidatePath("/insights/[slug]", "page");
  revalidatePath("/(site)/insights/[slug]", "page");
  revalidatePath("/");
}

/**
 * Best-effort bucket cleanup on replace and on delete. Only covers that
 * actually point into the blog bucket are touched — a seeded article's cover is
 * a bare Unsplash id or a /brand/*.jpg path and is left alone.
 */
async function removeCoverObject(supabase: AdminClient, cover: string) {
  const marker = `/storage/v1/object/public/${BLOG_IMAGE_BUCKET}/`;
  const at = cover.indexOf(marker);
  if (at === -1) return;

  const path = decodeURIComponent(cover.slice(at + marker.length).split("?")[0]);
  const { error } = await supabase.storage.from(BLOG_IMAGE_BUCKET).remove([path]);
  if (error) console.error("[makro] Could not delete blog cover object:", error.message);
}

// ---------------------------------------------------------------------------
// Article actions
// ---------------------------------------------------------------------------

export async function createPost(
  _prev: BlogFormState,
  formData: FormData
): Promise<BlogFormState> {
  await requireUser();

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const parsed = readPost(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error };

  const { data, error } = await supabase
    .from("blog_posts")
    .insert(parsed.payload)
    .select("id")
    .single();

  if (error || !data) {
    console.error("[makro] Failed to create blog post:", error?.message);
    return {
      ok: false,
      message: error ? friendly(error) : "That article could not be created.",
    };
  }

  revalidateBlogRoutes(data.id);
  // Straight into the editor, where the body is written.
  redirect(`/admin/blog/${data.id}`);
}

export async function updatePost(
  _prev: BlogFormState,
  formData: FormData
): Promise<BlogFormState> {
  await requireUser();

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const id = text(formData, "id");
  if (!id) return { ok: false, message: "That article is missing its id — reload the page." };

  const parsed = readPost(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error };

  // Read the outgoing cover before the write, so a replaced upload can be
  // cleaned out of the bucket afterwards.
  const { data: before } = await supabase
    .from("blog_posts")
    .select("cover")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("blog_posts").update(parsed.payload).eq("id", id);

  if (error) {
    console.error("[makro] Failed to update blog post:", error.message);
    return { ok: false, message: friendly(error) };
  }

  const previousCover = before?.cover ?? "";
  if (previousCover && previousCover !== parsed.payload.cover) {
    await removeCoverObject(supabase, previousCover);
  }

  revalidateBlogRoutes(id);
  return { ok: true, message: "Saved." };
}

/** The UI confirms first; this just performs it. */
export async function deletePost(id: string): Promise<BlogFormState> {
  await requireUser();

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const { data: post } = await supabase
    .from("blog_posts")
    .select("cover")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) {
    console.error("[makro] Failed to delete blog post:", error.message);
    return { ok: false, message: friendly(error) };
  }

  if (post?.cover) await removeCoverObject(supabase, post.cover);

  revalidateBlogRoutes();
  return { ok: true, message: "Article deleted." };
}
