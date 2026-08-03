"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createPost,
  deletePost,
  updatePost,
  type BlogFormState,
} from "@/app/admin/(panel)/blog/actions";
import { Card, Field, buttonClass, inputClass } from "@/components/admin/ui";
import { StringList } from "@/components/admin/projects/RepeatableList";
import CoverPicker from "./CoverPicker";
import SectionsEditor from "./SectionsEditor";
import SlugList from "./SlugList";
import type { BlogPostRow } from "@/lib/supabase/types";

/**
 * One form for both create and edit — the only differences are which Server
 * Action it posts to, whether the slug tracks the title, and whether there is
 * an article to delete.
 */

const CATEGORIES = ["Buying", "Investing", "Commercial", "Guides"] as const;

const INITIAL_STATE: BlogFormState = { ok: false, message: "" };

/** Matches slugify() in the Server Action, which has the final say. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export default function BlogForm({
  post,
  blogSlugs,
  projectSlugs,
  today,
}: {
  post?: BlogPostRow;
  /** Existing article slugs, offered as `related` suggestions. */
  blogSlugs: string[];
  projectSlugs: string[];
  /** Today's date, resolved on the server so the date input hydrates cleanly. */
  today: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(post);

  const [state, formAction, pending] = useActionState(
    post ? updatePost : createPost,
    INITIAL_STATE
  );

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  // On an existing article the slug is a live URL — and other pages hard-code
  // article slugs in their sidebars — so never rewrite it silently.
  const [slugPinned, setSlugPinned] = useState(isEdit);

  const [published, setPublished] = useState(post?.published ?? false);

  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // jsonb columns: trust the type, but survive a hand-edited row in the DB.
  const keywords = Array.isArray(post?.keywords) ? post.keywords : [];
  const sections = Array.isArray(post?.sections) ? post.sections : [];
  const related = Array.isArray(post?.related) ? post.related : [];
  const relatedProjects = Array.isArray(post?.related_projects)
    ? post.related_projects
    : [];

  // An article should never suggest itself as further reading.
  const otherBlogSlugs = blogSlugs.filter((option) => option !== post?.slug);

  const onTitleChange = (value: string) => {
    setTitle(value);
    if (!slugPinned) setSlug(slugify(value));
  };

  const onDelete = () => {
    if (!post) return;
    const confirmed = window.confirm(
      `Delete “${post.title}”? Its cover image goes with it, and /insights/${post.slug} starts 404ing. This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleteError(null);
    startDelete(async () => {
      const result = await deletePost(post.id);
      if (!result.ok) {
        setDeleteError(result.message);
        return;
      }
      router.push("/admin/blog");
      router.refresh();
    });
  };

  const busy = pending || deleting;

  return (
    <form action={formAction} className="space-y-6">
      {post && <input type="hidden" name="id" value={post.id} />}

      {/* ------------------------------------------------------------- */}
      <Card className="space-y-5">
        <h2 className="font-display text-xl text-ink">Identity</h2>

        <Field
          label="Title"
          hint="The full, keyword-bearing headline — this is what search engines read."
        >
          <input
            type="text"
            name="title"
            required
            maxLength={240}
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Buying an Apartment in Colombo: The Complete Guide"
            className={inputClass}
          />
        </Field>

        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Display title"
            hint="Short heading for cards and the article hero — the brand copy rule keeps this far shorter than the title."
          >
            <input
              type="text"
              name="display_title"
              maxLength={240}
              defaultValue={post?.display_title ?? ""}
              placeholder="Buying an apartment in Colombo."
              className={inputClass}
            />
          </Field>

          <Field
            label="Slug"
            hint={
              slug
                ? `Public URL: /insights/${slug}`
                : "Used for the public URL. Must be unique."
            }
          >
            <input
              type="text"
              name="slug"
              required
              maxLength={90}
              value={slug}
              onChange={(event) => {
                setSlugPinned(true);
                setSlug(event.target.value);
              }}
              placeholder="buying-an-apartment-in-colombo-guide"
              className={inputClass}
            />
          </Field>
        </div>
      </Card>

      {/* ------------------------------------------------------------- */}
      <Card className="space-y-5">
        <h2 className="font-display text-xl text-ink">Publishing</h2>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Category" hint="Shown as the card eyebrow and as the article's section in structured data.">
            <select
              name="category"
              defaultValue={post?.category ?? "Guides"}
              className={inputClass}
            >
              {CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Publish date" hint="Printed on the article and used for both published and modified dates.">
            <input
              type="date"
              name="published_on"
              required
              defaultValue={post?.published_on?.slice(0, 10) ?? today}
              className={inputClass}
            />
          </Field>

          <Field label="Read time" hint="Free text, shown beside the date.">
            <input
              type="text"
              name="read_time"
              maxLength={40}
              defaultValue={post?.read_time ?? ""}
              placeholder="7 min read"
              className={inputClass}
            />
          </Field>

          <Field
            label="Sort order"
            hint="Lower numbers come first. Load-bearing: the /insights grid alternates warm and mono card treatments by row, and the home page takes the first three."
          >
            <input
              type="number"
              name="sort_order"
              step={1}
              defaultValue={post?.sort_order ?? 0}
              className={inputClass}
            />
          </Field>
        </div>

        <label className="flex items-start gap-3 border border-ink/10 bg-cream/60 px-4 py-3">
          <input
            type="checkbox"
            name="published"
            checked={published}
            onChange={(event) => setPublished(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-rose-deep"
          />
          <span>
            <span className="block font-body text-sm text-ink">Published</span>
            <span className="block font-body text-xs text-ink/45">
              Unpublished articles are invisible to the public site and to search
              engines. Leave this off until the copy is final.
            </span>
          </span>
        </label>
      </Card>

      {/* ------------------------------------------------------------- */}
      <Card className="space-y-4">
        <div>
          <h2 className="font-display text-xl text-ink">Cover</h2>
          <p className="mt-1 font-body text-xs text-ink/45">
            Used by the article hero, the /insights cards, the home-page preview
            and the social share image.
          </p>
        </div>
        <CoverPicker initial={post?.cover ?? ""} slug={slug || post?.slug || ""} />
      </Card>

      {/* ------------------------------------------------------------- */}
      <Card className="space-y-5">
        <h2 className="font-display text-xl text-ink">Copy</h2>

        <Field label="Excerpt" hint="One or two lines — the card summary on /insights.">
          <textarea
            name="excerpt"
            rows={2}
            maxLength={600}
            defaultValue={post?.excerpt ?? ""}
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </Field>

        <Field
          label="Meta description"
          hint="The search-result snippet. Around 150–160 characters reads best."
        >
          <textarea
            name="meta_description"
            rows={3}
            maxLength={400}
            defaultValue={post?.meta_description ?? ""}
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </Field>

        <Field label="Intro" hint="The standfirst paragraph, before the first section.">
          <textarea
            name="intro"
            rows={4}
            defaultValue={post?.intro ?? ""}
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </Field>
      </Card>

      {/* ------------------------------------------------------------- */}
      <Card className="space-y-4">
        <div>
          <h2 className="font-display text-xl text-ink">Sections</h2>
          <p className="mt-1 font-body text-xs text-ink/45">
            The body of the article. Each section is a heading, its paragraphs
            and — optionally — a bullet list.
          </p>
        </div>
        <SectionsEditor initial={sections} />
      </Card>

      {/* ------------------------------------------------------------- */}
      <Card className="space-y-5">
        <h2 className="font-display text-xl text-ink">Search &amp; further reading</h2>

        <div>
          <p className="font-body text-[0.7rem] uppercase tracking-[0.22em] text-ink/45">
            Keywords
          </p>
          <p className="mb-3 mt-1.5 font-body text-xs text-ink/45">
            One search phrase per row — the topic this article is meant to own.
          </p>
          <StringList
            name="keywords"
            initial={keywords}
            addLabel="Add keyword"
            placeholder="buying an apartment in Colombo"
            emptyLabel="No keywords yet."
          />
        </div>

        <div>
          <p className="font-body text-[0.7rem] uppercase tracking-[0.22em] text-ink/45">
            Related articles
          </p>
          <p className="mb-3 mt-1.5 font-body text-xs text-ink/45">
            Article slugs, two is the house pattern. Suggestions come from the
            articles that exist now.
          </p>
          <SlugList
            name="related"
            initial={related}
            options={otherBlogSlugs}
            addLabel="Add article"
            placeholder="grade-a-office-space-colombo"
            emptyLabel="No related articles yet."
          />
        </div>

        <div>
          <p className="font-body text-[0.7rem] uppercase tracking-[0.22em] text-ink/45">
            Related projects
          </p>
          <p className="mb-3 mt-1.5 font-body text-xs text-ink/45">
            Project slugs this article should funnel readers toward. Leave empty
            and the sidebar falls back to the whole portfolio.
          </p>
          <SlugList
            name="related_projects"
            initial={relatedProjects}
            options={projectSlugs}
            addLabel="Add project"
            placeholder="makro-heights"
            emptyLabel="No related projects yet."
          />
        </div>
      </Card>

      {/* ------------------------------------------------------------- */}
      <div className="sticky bottom-0 -mx-6 border-t border-ink/10 bg-cream/95 px-6 py-4 backdrop-blur md:-mx-10 md:px-10">
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className={buttonClass("primary")}>
            {pending ? "Saving…" : isEdit ? "Save changes" : "Create article"}
          </button>

          <Link href="/admin/blog" className={buttonClass("secondary")}>
            Cancel
          </Link>

          {post && (
            <>
              <Link
                href={`/insights/${post.slug}`}
                target="_blank"
                rel="noreferrer"
                className={buttonClass("ghost")}
              >
                View on site ↗
              </Link>
              <button
                type="button"
                onClick={onDelete}
                disabled={busy}
                className={buttonClass("danger", "ml-auto")}
              >
                {deleting ? "Deleting…" : "Delete article"}
              </button>
            </>
          )}
        </div>

        {(state.message || deleteError) && (
          <p
            role="status"
            aria-live="polite"
            className={`mt-3 font-body text-sm ${
              state.ok && !deleteError ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {deleteError ?? state.message}
          </p>
        )}
      </div>
    </form>
  );
}
