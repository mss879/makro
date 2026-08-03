import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { NotConfigured, PageHeading, buttonClass } from "@/components/admin/ui";
import BlogForm from "@/components/admin/blog/BlogForm";
import { loadSlugOptions, todayISO } from "../options";

export const dynamic = "force-dynamic";

export default async function NewBlogPostPage() {
  // The slug suggestions need a query, so unlike the projects equivalent this
  // page is async — the guard still comes first so an unconfigured install
  // never issues one.
  const { blogSlugs, projectSlugs } = isSupabaseConfigured
    ? await loadSlugOptions()
    : { blogSlugs: [], projectSlugs: [] };

  return (
    <div className="space-y-8">
      <PageHeading
        title="New article"
        subtitle="The slug is derived from the title as you type, and stays editable. A cover can be uploaded before the first save."
        action={
          <Link href="/admin/blog" className={buttonClass("secondary")}>
            Back to blogs
          </Link>
        }
      />

      {isSupabaseConfigured ? (
        <BlogForm blogSlugs={blogSlugs} projectSlugs={projectSlugs} today={todayISO()} />
      ) : (
        <NotConfigured />
      )}
    </div>
  );
}
