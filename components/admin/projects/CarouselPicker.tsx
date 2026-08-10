"use client";

import { useActionState, useState } from "react";
import { Card, Field, buttonClass, inputClass } from "@/components/admin/ui";
import {
  saveCarouselSelection,
  saveCarouselSettings,
  type ProjectsPageFormState,
} from "@/app/admin/(panel)/projects/page-actions";

const IDLE: ProjectsPageFormState = { ok: false, message: "" };

export type PickableProject = {
  id: string;
  name: string;
  city: string;
  status: string;
  published: boolean;
};

function Result({ state }: { state: ProjectsPageFormState }) {
  if (!state.message) return null;
  return (
    <p className={`font-body text-sm ${state.ok ? "text-ink/60" : "text-red-700"}`}>
      {state.message}
    </p>
  );
}

/**
 * Which projects the carousel shows, and in what order.
 *
 * There is no per-card content here on purpose: the card renders the project's
 * own cover, name, location and specs, so this screen only ever decides
 * curation. Edit a project and the carousel follows automatically.
 *
 * The chosen set is held in component state and posted in one go, so ordering
 * and membership are a single atomic save rather than a row-per-toggle write
 * that could half-apply.
 */
export default function CarouselPicker({
  enabled,
  eyebrow,
  heading,
  projects,
  selectedIds,
}: {
  enabled: boolean;
  eyebrow: string;
  heading: string;
  projects: PickableProject[];
  selectedIds: string[];
}) {
  const [settingsState, settingsAction, settingsPending] = useActionState(
    saveCarouselSettings,
    IDLE
  );
  const [selectionState, selectionAction, selectionPending] = useActionState(
    saveCarouselSelection,
    IDLE
  );

  // Order matters, so the selection is a list, not a Set.
  const [chosen, setChosen] = useState<string[]>(selectedIds);

  const toggle = (id: string) =>
    setChosen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const move = (index: number, delta: number) =>
    setChosen((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const byId = new Map(projects.map((p) => [p.id, p]));
  const unchosen = projects.filter((p) => !chosen.includes(p.id));

  return (
    <div className="space-y-8">
      <Card>
        <form action={settingsAction} className="space-y-5">
          <label className="flex items-center gap-3 font-body text-sm text-ink/70">
            <input type="checkbox" name="carousel_enabled" defaultChecked={enabled} />
            Show the carousel on /projects
          </label>
          <Field label="Eyebrow" hint="Small label above the heading. Leave blank to hide it.">
            <input name="carousel_eyebrow" defaultValue={eyebrow} className={inputClass} />
          </Field>
          <Field label="Heading">
            <input name="carousel_heading" defaultValue={heading} className={inputClass} />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={settingsPending} className={buttonClass("primary")}>
              {settingsPending ? "Saving…" : "Save heading"}
            </button>
            <Result state={settingsState} />
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="font-display text-xl text-ink">In the carousel</h2>
        <p className="mt-2 font-body text-sm text-ink/50">
          Each card shows the project&rsquo;s own cover image, name, location and the first four
          of its specs. Edit those on the project itself.
        </p>

        <form action={selectionAction} className="mt-6 space-y-3">
          {chosen.length === 0 && (
            <p className="font-body text-sm text-ink/40">
              Nothing selected — the carousel will not render.
            </p>
          )}

          {chosen.map((id, i) => {
            const project = byId.get(id);
            return (
              <div
                key={id}
                className="flex flex-wrap items-center justify-between gap-3 border border-ink/10 px-4 py-3"
              >
                <input type="hidden" name="project_id" value={id} />
                <div>
                  <p className="font-body text-sm text-ink">
                    {i + 1}. {project?.name ?? "Unknown project"}
                  </p>
                  <p className="font-body text-xs text-ink/45">
                    {project?.city}
                    {project && !project.published && " · draft, will not appear publicly"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label={`Move ${project?.name ?? "project"} earlier`}
                    className={buttonClass("secondary")}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === chosen.length - 1}
                    aria-label={`Move ${project?.name ?? "project"} later`}
                    className={buttonClass("secondary")}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    className={buttonClass("secondary")}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button type="submit" disabled={selectionPending} className={buttonClass("primary")}>
              {selectionPending ? "Saving…" : "Save carousel"}
            </button>
            <Result state={selectionState} />
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="font-display text-xl text-ink">Available projects</h2>
        {unchosen.length === 0 ? (
          <p className="mt-4 font-body text-sm text-ink/40">Every project is already in the carousel.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {unchosen.map((project) => (
              <li
                key={project.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-ink/10 px-4 py-3"
              >
                <div>
                  <p className="font-body text-sm text-ink">{project.name}</p>
                  <p className="font-body text-xs text-ink/45">
                    {project.city} · {project.status}
                    {!project.published && " · draft"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(project.id)}
                  className={buttonClass("secondary")}
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 font-body text-xs text-ink/40">
          Adding or reordering here is not saved until you press “Save carousel” above.
        </p>
      </Card>
    </div>
  );
}
