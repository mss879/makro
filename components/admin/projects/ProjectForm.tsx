"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createProject,
  deleteProject,
  updateProject,
  type ProjectFormState,
} from "@/app/admin/(panel)/projects/actions";
import { Card, Field, buttonClass, inputClass } from "@/components/admin/ui";
import { SpecList, StringList } from "./RepeatableList";
import ImageManager from "./ImageManager";
import type { ProjectImageRow, ProjectRow } from "@/lib/supabase/types";

/**
 * One form for both create and edit — the only differences are which Server
 * Action it posts to, whether the slug tracks the name, and whether there is a
 * project to hang a gallery (and a delete button) off.
 */

const TYPES = ["Residential", "Commercial", "Mixed-Use"] as const;
const STATUSES = [
  "Completed",
  "Now Selling",
  "Under Construction",
  "In Planning",
] as const;

/**
 * The public index groups by life stage, derived from status — say so here so
 * nobody has to guess which bucket a project will land in.
 */
const STATUS_HINT =
  "Under Construction and Now Selling show under “On-going”; In Planning shows under “Upcoming”; Completed shows under “Past”.";

const INITIAL_STATE: ProjectFormState = { ok: false, message: "" };

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

export default function ProjectForm({
  project,
  images = [],
}: {
  project?: ProjectRow;
  images?: ProjectImageRow[];
}) {
  const router = useRouter();
  const isEdit = Boolean(project);

  const [state, formAction, pending] = useActionState(
    project ? updateProject : createProject,
    INITIAL_STATE
  );

  const [name, setName] = useState(project?.name ?? "");
  const [slug, setSlug] = useState(project?.slug ?? "");
  // On an existing project the slug is a live URL: never rewrite it silently.
  const [slugPinned, setSlugPinned] = useState(isEdit);

  const [published, setPublished] = useState(project?.published ?? false);

  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // jsonb columns: trust the type, but survive a hand-edited row in the DB.
  const description = Array.isArray(project?.description) ? project.description : [];
  const specs = Array.isArray(project?.specs) ? project.specs : [];
  const features = Array.isArray(project?.features) ? project.features : [];

  const onNameChange = (value: string) => {
    setName(value);
    if (!slugPinned) setSlug(slugify(value));
  };

  const onDelete = () => {
    if (!project) return;
    const confirmed = window.confirm(
      `Delete “${project.name}”? Its gallery and uploaded images go with it. This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteProject(project.id);
      if (!result.ok) {
        setDeleteError(result.message);
        return;
      }
      router.push("/admin/projects");
      router.refresh();
    });
  };

  const busy = pending || deleting;

  return (
    <form action={formAction} className="space-y-6">
      {project && <input type="hidden" name="id" value={project.id} />}

      {/* ------------------------------------------------------------- */}
      <Card className="space-y-5">
        <h2 className="font-display text-xl text-ink">Identity</h2>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Name">
            <input
              type="text"
              name="name"
              required
              maxLength={160}
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Makro Heights"
              className={inputClass}
            />
          </Field>

          <Field
            label="Slug"
            hint={
              slug
                ? `Public URL: /projects/${slug}`
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
              placeholder="makro-heights"
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Tagline" hint="One line, shown under the name on the hero.">
          <input
            type="text"
            name="tagline"
            maxLength={200}
            defaultValue={project?.tagline ?? ""}
            placeholder="The Standard Above, brought to Dehiwala."
            className={inputClass}
          />
        </Field>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Location" hint="Full address line — street, city, country.">
            <input
              type="text"
              name="location"
              maxLength={200}
              defaultValue={project?.location ?? ""}
              placeholder="Rohini Place, Dehiwala, Sri Lanka"
              className={inputClass}
            />
          </Field>

          <Field label="City" hint="City alone — this is what cards show.">
            <input
              type="text"
              name="city"
              maxLength={120}
              defaultValue={project?.city ?? ""}
              placeholder="Dehiwala"
              className={inputClass}
            />
          </Field>
        </div>
      </Card>

      {/* ------------------------------------------------------------- */}
      <Card className="space-y-5">
        <h2 className="font-display text-xl text-ink">Classification</h2>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Type">
            <select
              name="type"
              defaultValue={project?.type ?? "Residential"}
              className={inputClass}
            >
              {TYPES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status" hint={STATUS_HINT}>
            <select
              name="status"
              defaultValue={project?.status ?? "In Planning"}
              className={inputClass}
            >
              {STATUSES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Year" hint="Free text — “2026”, “2027–28”, “TBC”.">
            <input
              type="text"
              name="year"
              maxLength={40}
              defaultValue={project?.year ?? ""}
              placeholder="2026"
              className={inputClass}
            />
          </Field>

          <Field label="Sort order" hint="Lower numbers come first on the public index.">
            <input
              type="number"
              name="sort_order"
              step={1}
              defaultValue={project?.sort_order ?? 0}
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
              Unpublished projects are invisible to the public site and to search
              engines. Leave this off until the copy and gallery are final.
            </span>
          </span>
        </label>
      </Card>

      {/* ------------------------------------------------------------- */}
      <Card className="space-y-5">
        <h2 className="font-display text-xl text-ink">Copy</h2>

        <Field label="Headline" hint="Short display heading on the project page.">
          <input
            type="text"
            name="headline"
            maxLength={200}
            defaultValue={project?.headline ?? ""}
            placeholder="Approximately 120 residences. One uncompromising standard."
            className={inputClass}
          />
        </Field>

        <Field
          label="Summary"
          hint="One paragraph. Also used as the SEO meta description."
        >
          <textarea
            name="summary"
            rows={3}
            defaultValue={project?.summary ?? ""}
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </Field>

        <div>
          <p className="font-body text-[0.7rem] uppercase tracking-[0.22em] text-ink/45">
            Description
          </p>
          <p className="mb-3 mt-1.5 font-body text-xs text-ink/45">
            One block per paragraph, in the order they should read.
          </p>
          <StringList
            name="description"
            initial={description}
            multiline
            addLabel="Add paragraph"
            placeholder="Write a paragraph…"
            emptyLabel="No paragraphs yet."
          />
        </div>
      </Card>

      {/* ------------------------------------------------------------- */}
      <Card className="space-y-5">
        <h2 className="font-display text-xl text-ink">At a glance</h2>

        <div>
          <p className="font-body text-[0.7rem] uppercase tracking-[0.22em] text-ink/45">
            Specs
          </p>
          <p className="mb-3 mt-1.5 font-body text-xs text-ink/45">
            Label and value pairs — Residences / ~120, Floors / G+15.
          </p>
          <SpecList initial={specs} />
        </div>

        <Field label="Specs note" hint="Optional qualifier under the spec list.">
          <input
            type="text"
            name="specs_note"
            maxLength={240}
            defaultValue={project?.specs_note ?? ""}
            placeholder="Approx. 3.5-year construction programme once commenced."
            className={inputClass}
          />
        </Field>

        <div>
          <p className="font-body text-[0.7rem] uppercase tracking-[0.22em] text-ink/45">
            Features
          </p>
          <p className="mb-3 mt-1.5 font-body text-xs text-ink/45">
            One line each, listed in order on the project page.
          </p>
          <StringList
            name="features"
            initial={features}
            addLabel="Add feature"
            placeholder="Rooftop amenity deck"
            emptyLabel="No features yet."
          />
        </div>
      </Card>

      {/* ------------------------------------------------------------- */}
      <Card className="space-y-4">
        <div>
          <h2 className="font-display text-xl text-ink">Images</h2>
          <p className="mt-1 font-body text-xs text-ink/45">
            The first image is the cover — it is what the home page, the index
            cards and the project hero use.
          </p>
        </div>

        {project ? (
          <ImageManager projectId={project.id} slug={project.slug} initial={images} />
        ) : (
          <p className="border border-dashed border-ink/15 px-4 py-8 text-center font-body text-sm text-ink/45">
            Save the project first — images can be uploaded as soon as it exists.
          </p>
        )}
      </Card>

      {/* ------------------------------------------------------------- */}
      <div className="sticky bottom-0 -mx-6 border-t border-ink/10 bg-cream/95 px-6 py-4 backdrop-blur md:-mx-10 md:px-10">
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className={buttonClass("primary")}>
            {pending ? "Saving…" : isEdit ? "Save changes" : "Create project"}
          </button>

          <Link href="/admin/projects" className={buttonClass("secondary")}>
            Cancel
          </Link>

          {project && (
            <>
              <Link
                href={`/projects/${project.slug}`}
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
                {deleting ? "Deleting…" : "Delete project"}
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
