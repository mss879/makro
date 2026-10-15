"use client";

import { useActionState, useState } from "react";
import {
  saveHomeHero,
  type HomeHeroFormState,
} from "@/app/admin/(panel)/home-hero/actions";
import { Card, Field, buttonClass, inputClass } from "@/components/admin/ui";
import ImageField from "@/components/admin/selected-work/ImageField";
import VideoField from "@/components/admin/home-hero/VideoField";

/**
 * The home page hero, as one form: the picture, the headline and copy, and the
 * two buttons. One Save for all of it — they are one composition on the page,
 * and a half-saved hero (a new video under the old headline) is not a state
 * worth being able to publish.
 */

/** Everything the form edits, as the strings its inputs hold. */
export type HeroFormValues = {
  video: string;
  videoMobile: string;
  image: string;
  imageMobile: string;
  alt: string;
  /** The headline's lines joined with newlines — one textarea row per line. */
  heading: string;
  body: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
};

const INITIAL_STATE: HomeHeroFormState = { ok: false, message: "" };

/** The small uppercase label over each block, matching the /projects hero screen. */
function BlockLabel({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <p className="font-body text-xs uppercase tracking-[0.18em] text-panel-faint">{title}</p>
      {hint && (
        <p className="mt-1 max-w-2xl font-body text-xs leading-relaxed text-panel-faint">{hint}</p>
      )}
    </div>
  );
}

/**
 * Field's label style, as a plain element. The uploaders cannot sit inside
 * Field: it renders a <label>, and a click anywhere in a label — on the size
 * guidance, on the preview — is forwarded to its first control, which here is
 * the file picker.
 */
function Media({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="font-body text-[0.7rem] uppercase tracking-[0.22em] text-panel-faint">{label}</p>
      {children}
    </div>
  );
}

/**
 * The shape is inferred from the fields, never stored (see the migration), so
 * say out loud which one the current fields add up to — otherwise removing a
 * video silently turns the hero into an image hero with nothing on screen to
 * say so.
 */
function Mode({ hasVideo, hasImage }: { hasVideo: boolean; hasImage: boolean }) {
  const [dot, text] = hasVideo
    ? ["bg-success", "Video hero — the still image shows while the video loads."]
    : hasImage
      ? ["bg-success", "Image hero — there is no video, so the still image is the hero."]
      : ["bg-danger", "No picture yet — add a video or an image before saving."];
  return (
    <p className="flex items-center gap-3 font-body text-sm text-panel-text">
      <span className={`h-2.5 w-2.5 shrink-0 ${dot}`} />
      {text}
    </p>
  );
}

export default function HeroForm({ initial }: { initial: HeroFormValues }) {
  const [state, formAction, pending] = useActionState(saveHomeHero, INITIAL_STATE);

  // The media fields are controlled because the uploaders write into them —
  // a video upload fills in its own still — and the heading because it feeds
  // the preview. The rest are uncontrolled, so a background revalidation
  // cannot stomp what is being typed.
  const [video, setVideo] = useState(initial.video);
  const [videoMobile, setVideoMobile] = useState(initial.videoMobile);
  const [image, setImage] = useState(initial.image);
  const [imageMobile, setImageMobile] = useState(initial.imageMobile);
  const [heading, setHeading] = useState(initial.heading);

  const lines = heading
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const hasVideo = Boolean(video.trim() || videoMobile.trim());
  const hasImage = Boolean(image.trim() || imageMobile.trim());

  return (
    <form action={formAction} className="space-y-6">
      {/* ------------------------------------------------------------- */}
      <Card className="space-y-6">
        <div className="space-y-3">
          <div>
            <h2 className="font-display text-xl text-panel-text">Picture</h2>
            <p className="mt-1 max-w-2xl font-body text-xs leading-relaxed text-panel-faint">
              A looping video with a still image shown while it loads — or, with no
              video, just the image. Phones can have portrait versions of both; leave
              those empty and phones get the landscape ones, cropped.
            </p>
          </div>
          <Mode hasVideo={hasVideo} hasImage={hasImage} />
        </div>

        <div className="space-y-6 border-t border-panel-line pt-6">
          <BlockLabel title="Desktop — landscape" />

          <Media label="Video">
            <VideoField
              variant="desktop"
              name="video"
              value={video}
              onChange={setVideo}
              onStill={setImage}
            />
          </Media>

          <Media label="Still image">
            {/* cardId becomes the storage folder: home-hero/still/<uuid>.webp */}
            <ImageField
              target="home-hero"
              cardId="still"
              name="image"
              value={image}
              onChange={setImage}
            />
          </Media>
        </div>

        <div className="space-y-6 border-t border-panel-line pt-6">
          <BlockLabel
            title="Phones — portrait"
            hint="Optional. On a phone the picture sits in the frame above the headline, roughly 4:5, so a landscape file loses most of its width there."
          />

          <Media label="Video">
            <VideoField
              variant="mobile"
              name="video_mobile"
              value={videoMobile}
              onChange={setVideoMobile}
              onStill={setImageMobile}
            />
          </Media>

          <Media label="Still image">
            <ImageField
              target="home-hero"
              variant="mobile"
              cardId="still"
              name="image_mobile"
              value={imageMobile}
              onChange={setImageMobile}
            />
          </Media>
        </div>

        <div className="border-t border-panel-line pt-6">
          <Field
            label="Alt text"
            hint="Describes the image for screen readers when it is the hero. Not used with a video — the video is decoration and the headline says what the page is. Leave blank if the image is purely decorative."
          >
            <input
              type="text"
              name="alt"
              maxLength={200}
              defaultValue={initial.alt}
              className={inputClass}
            />
          </Field>
        </div>
      </Card>

      {/* ------------------------------------------------------------- */}
      <Card className="space-y-5">
        <div>
          <h2 className="font-display text-xl text-panel-text">Headline and copy</h2>
          <p className="mt-1 font-body text-xs text-panel-faint">
            Set in a band under the picture, at every width — on desktop the
            headline on the left, the text and buttons on the right.
          </p>
        </div>

        <Field
          label="Headline"
          hint="One line per row, up to three. Each line rises into place on its own as the page opens. This is the home page's main heading, so it cannot be empty."
        >
          <textarea
            name="heading"
            rows={3}
            value={heading}
            onChange={(event) => setHeading(event.target.value)}
            required
            className={`${inputClass} resize-y leading-relaxed`}
            placeholder={"The Future,\nBuilt to Endure."}
          />
        </Field>

        {/* Deliberately NOT on the panel's dark tokens: this previews the
            headline as the HOME PAGE sets it — bone Marcellus on the hero's
            ink — so it has to keep the site's colours to be a preview at all. */}
        <div className="border border-panel-line bg-ink px-5 py-6">
          <p className="font-body text-[0.65rem] uppercase tracking-[0.22em] text-bone/40">
            Preview
          </p>
          <p className="mt-3 flex flex-col font-display text-3xl leading-[1.05] text-bone md:text-4xl">
            {lines.length ? (
              lines.map((line, i) => <span key={i}>{line}</span>)
            ) : (
              <span className="text-bone/30">Your headline will appear here.</span>
            )}
          </p>
          {lines.length > 3 && (
            <p className="mt-3 font-body text-xs text-danger">
              {lines.length} lines — the hero takes three at most.
            </p>
          )}
        </div>

        <Field
          label="Text under the headline"
          hint="A sentence or two. On a phone it sits in the band under the picture, and every extra line takes height from the picture. Leave empty to hide it."
        >
          <textarea
            name="body"
            rows={3}
            maxLength={400}
            defaultValue={initial.body}
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </Field>
      </Card>

      {/* ------------------------------------------------------------- */}
      <Card className="space-y-5">
        <div>
          <h2 className="font-display text-xl text-panel-text">Buttons</h2>
          <p className="mt-1 font-body text-xs text-panel-faint">
            Leave a label empty to hide that button. A link is a page on this site,
            like /projects, or a full address starting with https://.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Filled button — label">
            <input
              type="text"
              name="primary_label"
              maxLength={40}
              defaultValue={initial.primaryLabel}
              placeholder="Explore Projects"
              className={inputClass}
            />
          </Field>
          <Field label="Filled button — link">
            <input
              type="text"
              name="primary_href"
              maxLength={300}
              defaultValue={initial.primaryHref}
              placeholder="/projects"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Outlined button — label">
            <input
              type="text"
              name="secondary_label"
              maxLength={40}
              defaultValue={initial.secondaryLabel}
              placeholder="Book a Consultation"
              className={inputClass}
            />
          </Field>
          <Field label="Outlined button — link">
            <input
              type="text"
              name="secondary_href"
              maxLength={300}
              defaultValue={initial.secondaryHref}
              placeholder="/contact"
              className={inputClass}
            />
          </Field>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Saving…" : "Save hero"}
        </button>
        {state.message && (
          <p
            role={state.ok ? "status" : "alert"}
            aria-live="polite"
            className={`font-body text-sm ${state.ok ? "text-success" : "text-danger"}`}
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
