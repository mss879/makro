import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { NotConfigured, PageHeading, buttonClass, formatDate } from "@/components/admin/ui";
import { formatDay } from "@/components/admin/blog/format";
import BlogForm from "@/components/admin/blog/BlogForm";
import { loadSlugOptions, todayISO } from "../options";

export const dynamic = "force-dynamic";

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  if (!supabase) {
    return (
      <div className="space-y-8">
        <PageHeading title="Edit article" />
        <NotConfigured />
      </div>
    );
  }

  const { data: post, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  // A malformed uuid comes back as a Postgres error rather than an empty row.
  if (error || !post) notFound();

  const { blogSlugs, projectSlugs } = await loadSlugOptions();

  return (
    <div className="space-y-8">
      <PageHeading
        title={post.display_title || post.title}
        subtitle={`${post.category} · ${formatDay(post.published_on)} · last updated ${formatDate(
          post.updated_at,
          true
        )}`}
        action={
          <Link href="/admin/blog" className={buttonClass("secondary")}>
            Back to blogs
          </Link>
        }
      />

      <BlogForm
        post={post}
        blogSlugs={blogSlugs}
        projectSlugs={projectSlugs}
        today={todayISO()}
      />
    </div>
  );
}
