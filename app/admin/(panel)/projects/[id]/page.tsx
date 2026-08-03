import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { NotConfigured, PageHeading, buttonClass, formatDate } from "@/components/admin/ui";
import ProjectForm from "@/components/admin/projects/ProjectForm";
import type { ProjectImageRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  if (!supabase) {
    return (
      <div className="space-y-8">
        <PageHeading title="Edit project" />
        <NotConfigured />
      </div>
    );
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  // A malformed uuid comes back as a Postgres error rather than an empty row.
  if (error || !project) notFound();

  const { data: images } = await supabase
    .from("project_images")
    .select("*")
    .eq("project_id", id)
    .order("position", { ascending: true });

  const gallery: ProjectImageRow[] = images ?? [];

  return (
    <div className="space-y-8">
      <PageHeading
        title={project.name}
        subtitle={`${project.type} · ${project.status} · last updated ${formatDate(
          project.updated_at,
          true
        )}`}
        action={
          <Link href="/admin/projects" className={buttonClass("secondary")}>
            Back to projects
          </Link>
        }
      />

      <ProjectForm project={project} images={gallery} />
    </div>
  );
}
