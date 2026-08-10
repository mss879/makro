import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { DEFAULT_PROJECTS_PAGE } from "@/lib/projects-page-data";
import { Card, NotConfigured, PageHeading, buttonClass } from "@/components/admin/ui";
import PageTabs from "@/components/admin/projects/PageTabs";
import HeroManager from "@/components/admin/projects/HeroManager";
import type {
  ProjectsPageHeroSlideRow,
  ProjectsPageSettingsRow,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function ProjectsHeroPage() {
  const supabase = await createServerSupabase();

  const heading = (
    <PageHeading
      title="Projects — page hero"
      subtitle="The full-screen panel at the top of /projects. A slide can be an image, an image with copy along the bottom, or copy on its own."
      action={
        <Link href="/projects" target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
          View projects page ↗
        </Link>
      }
    />
  );

  if (!supabase) {
    return (
      <div className="space-y-8">
        {heading}
        <PageTabs />
        <NotConfigured />
      </div>
    );
  }

  const [settingsRes, slidesRes] = await Promise.all([
    supabase.from("projects_page_settings").select("*").maybeSingle(),
    supabase
      .from("projects_page_hero_slides")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  const failure = settingsRes.error ?? slidesRes.error;
  if (failure) {
    // Overwhelmingly the "migration not applied yet" case, so say so rather
    // than surfacing PostgREST's schema-cache wording.
    const missing =
      failure.code === "PGRST205" || failure.message.includes("schema cache");
    return (
      <div className="space-y-8">
        {heading}
        <PageTabs />
        <Card>
          <p className="font-body text-sm text-red-700">
            {missing
              ? "The projects-page tables are not in the database yet. Apply supabase/migrations/20260803000900_projects_page.sql, then reload this screen."
              : `This screen could not be loaded: ${failure.message}`}
          </p>
        </Card>
      </div>
    );
  }

  const settings = settingsRes.data as ProjectsPageSettingsRow | null;
  // No row yet means the section has never been edited, so the form opens on
  // the same copy the public page is currently rendering.
  const defaults = DEFAULT_PROJECTS_PAGE.hero;

  return (
    <div className="space-y-8">
      {heading}
      <PageTabs />
      <HeroManager
        enabled={settings?.hero_enabled ?? defaults.enabled}
        autoplay={settings?.hero_autoplay ?? defaults.autoplay}
        intervalMs={settings?.hero_interval_ms ?? defaults.intervalMs}
        showDots={settings?.hero_show_dots ?? defaults.showDots}
        // Drafts included: this is where they are staged, unlike the public
        // page, which reads published rows only.
        slides={(slidesRes.data ?? []) as ProjectsPageHeroSlideRow[]}
      />
    </div>
  );
}
