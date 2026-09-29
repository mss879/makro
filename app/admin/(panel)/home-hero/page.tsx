import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { DEFAULT_HOME_HERO } from "@/lib/home-hero-data";
import { Card, NotConfigured, PageHeading, buttonClass } from "@/components/admin/ui";
import HeroForm, { type HeroFormValues } from "@/components/admin/home-hero/HeroForm";
import type { HomeHeroSettingsRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

function fromRow(row: HomeHeroSettingsRow): HeroFormValues {
  return {
    video: row.video ?? "",
    videoMobile: row.video_mobile ?? "",
    image: row.image ?? "",
    imageMobile: row.image_mobile ?? "",
    alt: row.alt,
    heading: (Array.isArray(row.heading_lines) ? row.heading_lines : []).join("\n"),
    body: row.body,
    primaryLabel: row.primary_label,
    primaryHref: row.primary_href,
    secondaryLabel: row.secondary_label,
    secondaryHref: row.secondary_href,
  };
}

/**
 * No row yet means the hero has never been saved, so the home page is showing
 * the shipped one — and that is what the form has to open on, or the first
 * save would replace a working hero with an empty form.
 */
function fromDefaults(): HeroFormValues {
  const d = DEFAULT_HOME_HERO;
  return {
    video: d.video ?? "",
    videoMobile: d.videoMobile ?? "",
    image: d.image ?? "",
    imageMobile: d.imageMobile ?? "",
    alt: d.alt,
    heading: d.headingLines.join("\n"),
    body: d.body,
    primaryLabel: d.primary?.label ?? "",
    primaryHref: d.primary?.href ?? "",
    secondaryLabel: d.secondary?.label ?? "",
    secondaryHref: d.secondary?.href ?? "",
  };
}

export default async function HomeHeroPage() {
  const supabase = await createServerSupabase();

  const heading = (
    <PageHeading
      title="Home Hero"
      subtitle="The full-screen opening of the home page — the video or image behind it, the headline, the line under it and its two buttons."
      action={
        <Link href="/" target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
          View home page ↗
        </Link>
      }
    />
  );

  if (!supabase) {
    return (
      <div className="space-y-8">
        {heading}
        <NotConfigured />
      </div>
    );
  }

  const { data, error } = await supabase.from("home_hero_settings").select("*").maybeSingle();

  if (error) {
    // Overwhelmingly the "migration not applied yet" case, so say so rather
    // than surfacing PostgREST's schema-cache wording.
    const missing = error.code === "PGRST205" || error.message.includes("schema cache");
    return (
      <div className="space-y-8">
        {heading}
        <Card>
          <p className="font-body text-sm text-danger">
            {missing
              ? "The home hero table is not in the database yet. Apply supabase/migrations/20260929000100_home_hero.sql, then reload this screen. Until then the home page shows the hero it shipped with."
              : `This screen could not be loaded: ${error.message}`}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {heading}
      <HeroForm initial={data ? fromRow(data) : fromDefaults()} />
    </div>
  );
}
