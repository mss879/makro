"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { unsplash } from "@/lib/images";
import { Card, Field, buttonClass, inputClass } from "@/components/admin/ui";
import ImageField from "@/components/admin/selected-work/ImageField";
import {
  deleteSlide,
  reorderSlides,
  saveHeroSettings,
  saveSlide,
  type ProjectsPageFormState,
} from "@/app/admin/(panel)/projects/page-actions";
import type { ProjectsPageHeroSlideRow } from "@/lib/supabase/types";

const IDLE: ProjectsPageFormState = { ok: false, message: "" };

function Result({ state }: { state: ProjectsPageFormState }) {
  if (!state.message) return null;
  return (
    <p className={`font-body text-sm ${state.ok ? "text-panel-muted" : "text-danger"}`}>
      {state.message}
    </p>
  );
}

/** A slide's shape is inferred from its fields, not stored — mirror that here. */
function shapeOf(slide: { image: string | null; heading: string; body: string }): string {
  const hasText = Boolean(slide.heading || slide.body);
  if (slide.image && hasText) return "Image + text";
  if (slide.image) return "Image only";
  return "Text only";
}

function SlideEditor({ slide }: { slide?: ProjectsPageHeroSlideRow }) {
  const [state, action, pending] = useActionState(saveSlide, IDLE);
  const [image, setImage] = useState(slide?.image ?? "");
  const isNew = !slide;

  return (
    <form action={action} className="space-y-4">
      {slide && <input type="hidden" name="id" value={slide.id} />}

      <ImageField
        cardId={slide?.id}
        value={image}
        onChange={setImage}
        target="projects-page"
      />
      <input type="hidden" name="image" value={image} />

      <Field label="Alt text" hint="Describes the image for screen readers. Leave blank if the image is purely decorative.">
        <input name="alt" defaultValue={slide?.alt ?? ""} className={inputClass} />
      </Field>

      <Field label="Heading" hint="Sits along the bottom of the slide. Leave blank for an image-only slide.">
        <input name="heading" defaultValue={slide?.heading ?? ""} className={inputClass} />
      </Field>

      <Field label="Body">
        <textarea name="body" rows={3} defaultValue={slide?.body ?? ""} className={inputClass} />
      </Field>

      <label className="flex items-center gap-3 font-body text-sm text-panel-muted">
        <input type="checkbox" name="published" defaultChecked={slide?.published ?? true} />
        Show this slide on the site
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Saving…" : isNew ? "Add slide" : "Save slide"}
        </button>
        <Result state={state} />
      </div>
    </form>
  );
}

function DeleteSlide({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deleteSlide, IDLE);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className={buttonClass("secondary")}>
        {pending ? "Deleting…" : "Delete"}
      </button>
      <Result state={state} />
    </form>
  );
}

/** Move one slide up or down by posting the whole reordered list of ids. */
function Reorder({ ids, index }: { ids: string[]; index: number }) {
  const [state, action, pending] = useActionState(reorderSlides, IDLE);
  const swap = (a: number, b: number) => {
    const next = [...ids];
    [next[a], next[b]] = [next[b], next[a]];
    return next.join(",");
  };
  return (
    <form action={action} className="flex items-center gap-2">
      <button
        type="submit"
        name="ids"
        value={swap(index, index - 1)}
        disabled={pending || index === 0}
        aria-label="Move slide up"
        className={buttonClass("secondary")}
      >
        ↑
      </button>
      <button
        type="submit"
        name="ids"
        value={swap(index, index + 1)}
        disabled={pending || index === ids.length - 1}
        aria-label="Move slide down"
        className={buttonClass("secondary")}
      >
        ↓
      </button>
      <Result state={state} />
    </form>
  );
}

export default function HeroManager({
  enabled,
  autoplay,
  intervalMs,
  showDots,
  slides,
}: {
  enabled: boolean;
  autoplay: boolean;
  intervalMs: number;
  showDots: boolean;
  slides: ProjectsPageHeroSlideRow[];
}) {
  const [settingsState, settingsAction, settingsPending] = useActionState(saveHeroSettings, IDLE);
  const ids = slides.map((s) => s.id);

  return (
    <div className="space-y-8">
      <Card>
        <form action={settingsAction} className="space-y-5">
          <label className="flex items-center gap-3 font-body text-sm text-panel-muted">
            <input type="checkbox" name="hero_enabled" defaultChecked={enabled} />
            Show the hero on /projects
          </label>
          <label className="flex items-center gap-3 font-body text-sm text-panel-muted">
            <input type="checkbox" name="hero_autoplay" defaultChecked={autoplay} />
            Advance slides automatically
          </label>
          <label className="flex items-center gap-3 font-body text-sm text-panel-muted">
            <input type="checkbox" name="hero_show_dots" defaultChecked={showDots} />
            Show the slide indicators
          </label>

          <Field label="Seconds per slide" hint="Between 2 and 30. Ignored when autoplay is off, and for visitors who have asked for reduced motion.">
            <input
              name="interval_seconds"
              type="number"
              min={2}
              max={30}
              step={1}
              defaultValue={Math.round(intervalMs / 1000)}
              className={inputClass}
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={settingsPending} className={buttonClass("primary")}>
              {settingsPending ? "Saving…" : "Save hero settings"}
            </button>
            <Result state={settingsState} />
          </div>
        </form>
      </Card>

      {slides.map((slide, i) => (
        <Card key={slide.id}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {slide.image && (
                <div className="relative h-14 w-20 shrink-0 overflow-hidden bg-panel-high">
                  <Image
                    src={unsplash(slide.image, 200)}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
              )}
              <div>
                <p className="font-body text-sm text-panel-text">
                  Slide {i + 1} · {shapeOf(slide)}
                </p>
                {!slide.published && (
                  <p className="font-body text-xs text-panel-faint">Hidden from the site</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Reorder ids={ids} index={i} />
              <DeleteSlide id={slide.id} />
            </div>
          </div>
          <SlideEditor slide={slide} />
        </Card>
      ))}

      <Card>
        <h2 className="mb-5 font-display text-xl text-panel-text">Add a slide</h2>
        <input type="hidden" />
        <SlideEditor />
      </Card>
    </div>
  );
}
