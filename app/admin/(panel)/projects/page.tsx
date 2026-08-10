import Link from "next/link";
import Image from "next/image";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  Badge,
  Card,
  EmptyState,
  NotConfigured,
  PageHeading,
  buttonClass,
  formatDate,
} from "@/components/admin/ui";
import PageTabs from "@/components/admin/projects/PageTabs";
import type { ProjectRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const HEAD_CELL =
  "px-4 py-3 text-left font-body text-[0.65rem] uppercase tracking-[0.18em] text-ink/40";
const CELL = "px-4 py-4 align-middle font-body text-sm text-ink/70";

function NewProjectButton({ variant = "primary" }: { variant?: "primary" | "secondary" }) {
  return (
    <Link href="/admin/projects/new" className={buttonClass(variant)}>
      New project
    </Link>
  );
}

export default async function ProjectsPage() {
  const supabase = await createServerSupabase();

  const heading = (
    <PageHeading
      title="Projects"
      subtitle="Completed and upcoming developments, their copy and their galleries. Only published projects appear on the public site."
      action={supabase ? <NewProjectButton /> : undefined}
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
    .from("projects")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("[makro] Failed to load projects:", error.message);
    return (
      <div className="space-y-8">
        {heading}
        <PageTabs />
        <Card>
          <p className="font-body text-sm text-red-700">
            The project list could not be loaded: {error.message}
          </p>
        </Card>
      </div>
    );
  }

  const projects: ProjectRow[] = data ?? [];

  return (
    <div className="space-y-8">
      {heading}
      <PageTabs />

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          body="Add your first development — completed, selling, under construction or still in planning."
          action={<NewProjectButton />}
        />
      ) : (
        <div className="overflow-x-auto border border-ink/10 bg-white/70">
          <table className="w-full min-w-[52rem] border-collapse">
            <thead>
              <tr className="border-b border-ink/10">
                <th className={HEAD_CELL}>Project</th>
                <th className={HEAD_CELL}>Type</th>
                <th className={HEAD_CELL}>Status</th>
                <th className={HEAD_CELL}>Visibility</th>
                <th className={HEAD_CELL}>Updated</th>
                <th className={`${HEAD_CELL} text-right`}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-b border-ink/5 last:border-b-0">
                  <td className={CELL}>
                    <div className="flex items-center gap-3">
                      <div className="relative h-11 w-16 shrink-0 overflow-hidden bg-ink/5">
                        {project.cover && (
                          <Image
                            src={project.cover}
                            alt=""
                            fill
                            sizes="4rem"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-body text-sm text-ink">{project.name}</p>
                        <p className="truncate font-body text-xs text-ink/40">
                          /projects/{project.slug}
                          {project.city ? ` · ${project.city}` : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={CELL}>{project.type}</td>
                  <td className={CELL}>{project.status}</td>
                  <td className={CELL}>
                    {project.published ? (
                      <Badge tone="success">Published</Badge>
                    ) : (
                      <Badge tone="muted">Draft</Badge>
                    )}
                  </td>
                  <td className={CELL}>{formatDate(project.updated_at)}</td>
                  <td className={`${CELL} text-right`}>
                    <Link
                      href={`/admin/projects/${project.id}`}
                      className="font-body text-sm text-ink/60 underline-offset-4 transition-colors hover:text-rose-deep hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
