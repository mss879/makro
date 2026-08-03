import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { NotConfigured, PageHeading, buttonClass } from "@/components/admin/ui";
import ProjectForm from "@/components/admin/projects/ProjectForm";

export const dynamic = "force-dynamic";

export default function NewProjectPage() {
  return (
    <div className="space-y-8">
      <PageHeading
        title="New project"
        subtitle="The slug is derived from the name as you type, and stays editable. Images can be added once the project is saved."
        action={
          <Link href="/admin/projects" className={buttonClass("secondary")}>
            Back to projects
          </Link>
        }
      />

      {isSupabaseConfigured ? <ProjectForm /> : <NotConfigured />}
    </div>
  );
}
