import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { DEFAULT_PROJECTS_PAGE } from "@/lib/projects-page-data";
import { Card, NotConfigured, PageHeading, buttonClass } from "@/components/admin/ui";
import PageTabs from "@/components/admin/projects/PageTabs";
import CarouselPicker, {
  type PickableProject,
} from "@/components/admin/projects/CarouselPicker";
import type { ProjectsPageSettingsRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function ProjectsCarouselPage() {
  const supabase = await createServerSupabase();

  const heading = (
    <PageHeading
      title="Projects — carousel"
      subtitle="Which developments appear in the featured rail, and in what order. Card content comes from the project itself."
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

  const [settingsRes, itemsRes, projectsRes] = await Promise.all([
    supabase.from("projects_page_settings").select("*").maybeSingle(),
    supabase
      .from("projects_page_carousel_items")
      .select("project_id, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("projects")
      .select("id, name, city, status, published")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  const failure = settingsRes.error ?? itemsRes.error ?? projectsRes.error;
  if (failure) {
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
  const defaults = DEFAULT_PROJECTS_PAGE.carousel;

  // Drafts are offered too, flagged as such: staging the running order before
  // a launch is exactly when this screen gets used, and the public page hides
  // them anyway (both the RLS predicate and the data layer drop them).
  const projects = (projectsRes.data ?? []) as PickableProject[];
  const selectedIds = ((itemsRes.data ?? []) as { project_id: string }[]).map(
    (row) => row.project_id
  );

  return (
    <div className="space-y-8">
      {heading}
      <PageTabs />
      <CarouselPicker
        enabled={settings?.carousel_enabled ?? defaults.enabled}
        eyebrow={settings?.carousel_eyebrow ?? defaults.eyebrow}
        heading={settings?.carousel_heading ?? defaults.heading}
        projects={projects}
        selectedIds={selectedIds}
      />
    </div>
  );
}
