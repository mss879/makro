import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { DEFAULT_PROJECTS_PAGE } from "@/lib/projects-page-data";
import { Card, NotConfigured, PageHeading, buttonClass } from "@/components/admin/ui";
import PageTabs from "@/components/admin/projects/PageTabs";
import FaqManager from "@/components/admin/projects/FaqManager";
import type {
  ProjectsPageFaqItemRow,
  ProjectsPageSettingsRow,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function ProjectsFaqPage() {
  const supabase = await createServerSupabase();

  const heading = (
    <PageHeading
      title="Projects — FAQ"
      subtitle="The question block that closes /projects. The heading, the standfirst, both links and every question are editable here."
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

  const [settingsRes, itemsRes] = await Promise.all([
    supabase.from("projects_page_settings").select("*").maybeSingle(),
    supabase
      .from("projects_page_faq_items")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  const failure = settingsRes.error ?? itemsRes.error;
  if (failure) {
    // Overwhelmingly the "migration not applied yet" case, and on THIS screen it
    // is almost always the FAQ migration specifically — the other three tabs
    // work without it, so an admin arriving here from a working Carousel tab
    // needs to be told which file is missing, not that "the tables" are.
    const missing =
      failure.code === "PGRST205" || failure.message.includes("schema cache");
    return (
      <div className="space-y-8">
        {heading}
        <PageTabs />
        <Card>
          <p className="font-body text-sm text-danger">
            {missing
              ? "The FAQ table is not in the database yet. Apply supabase/migrations/20260830000100_projects_page_faq.sql, then reload this screen. Until then /projects keeps rendering the six questions the site shipped with."
              : `This screen could not be loaded: ${failure.message}`}
          </p>
        </Card>
      </div>
    );
  }

  const settings = settingsRes.data as ProjectsPageSettingsRow | null;
  // No row yet means the section has never been edited, so the form opens on
  // the same copy the public page is currently rendering.
  const defaults = DEFAULT_PROJECTS_PAGE.faq;

  return (
    <div className="space-y-8">
      {heading}
      <PageTabs />
      <FaqManager
        enabled={settings?.faq_enabled ?? defaults.enabled}
        eyebrow={settings?.faq_eyebrow ?? defaults.eyebrow}
        heading={settings?.faq_heading ?? defaults.heading}
        body={settings?.faq_body ?? defaults.body}
        primaryLabel={settings?.faq_primary_label ?? defaults.primaryLabel}
        primaryHref={settings?.faq_primary_href ?? defaults.primaryHref}
        secondaryLabel={settings?.faq_secondary_label ?? defaults.secondaryLabel}
        secondaryHref={settings?.faq_secondary_href ?? defaults.secondaryHref}
        // Drafts included: this is where they are staged, unlike the public
        // page, which reads published rows only.
        items={(itemsRes.data ?? []) as ProjectsPageFaqItemRow[]}
      />
    </div>
  );
}
