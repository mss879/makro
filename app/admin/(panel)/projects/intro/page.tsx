import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { DEFAULT_PROJECTS_PAGE } from "@/lib/projects-page-data";
import { Card, NotConfigured, PageHeading, buttonClass } from "@/components/admin/ui";
import PageTabs from "@/components/admin/projects/PageTabs";
import IntroForm from "@/components/admin/projects/IntroForm";
import type { ProjectsPageSettingsRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function ProjectsIntroPage() {
  const supabase = await createServerSupabase();

  const heading = (
    <PageHeading
      title="Projects — intro text"
      subtitle="The short passage below the hero. Each paragraph fades up in turn as the reader scrolls to it."
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

  const { data, error } = await supabase
    .from("projects_page_settings")
    .select("*")
    .maybeSingle();

  if (error) {
    const missing = error.code === "PGRST205" || error.message.includes("schema cache");
    return (
      <div className="space-y-8">
        {heading}
        <PageTabs />
        <Card>
          <p className="font-body text-sm text-danger">
            {missing
              ? "The projects-page tables are not in the database yet. Apply supabase/migrations/20260803000900_projects_page.sql, then reload this screen."
              : `This screen could not be loaded: ${error.message}`}
          </p>
        </Card>
      </div>
    );
  }

  const settings = data as ProjectsPageSettingsRow | null;
  const defaults = DEFAULT_PROJECTS_PAGE.intro;

  return (
    <div className="space-y-8">
      {heading}
      <PageTabs />
      <IntroForm
        enabled={settings?.intro_enabled ?? defaults.enabled}
        eyebrow={settings?.intro_eyebrow ?? defaults.eyebrow}
        body={Array.isArray(settings?.intro_body) ? settings.intro_body : defaults.body}
      />
    </div>
  );
}
