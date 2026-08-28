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
import { formatDay } from "@/components/admin/blog/format";
import { unsplash } from "@/lib/images";
import type { BlogPostRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const HEAD_CELL =
  "px-4 py-3 text-left font-body text-[0.65rem] uppercase tracking-[0.18em] text-panel-faint";
const CELL = "px-4 py-4 align-middle font-body text-sm text-panel-muted";

function NewPostButton({ variant = "primary" }: { variant?: "primary" | "secondary" }) {
  return (
    <Link href="/admin/blog/new" className={buttonClass(variant)}>
      New article
    </Link>
  );
}

export default async function BlogPage() {
  const supabase = await createServerSupabase();

  const heading = (
    <PageHeading
      title="Blogs"
      subtitle="The /insights articles. Only published articles appear on the public site, and the order here is the order they appear in — the first three also fill the home-page preview."
      action={supabase ? <NewPostButton /> : undefined}
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

  // Same ordering as the public read in lib/blog-data.ts, so the list is a true
  // preview of the running order rather than a second opinion about it.
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("published_on", { ascending: false });

  if (error) {
    console.error("[makro] Failed to load blog posts:", error.message);
    return (
      <div className="space-y-8">
        {heading}
        <Card>
          <p className="font-body text-sm text-danger">
            The article list could not be loaded: {error.message}
          </p>
        </Card>
      </div>
    );
  }

  const posts: BlogPostRow[] = data ?? [];

  return (
    <div className="space-y-8">
      {heading}

      {posts.length === 0 ? (
        <EmptyState
          title="No articles yet"
          body="Write the first guide — evergreen, keyword-targeted, and linked back to the projects it should send readers to."
          action={<NewPostButton />}
        />
      ) : (
        <div className="overflow-x-auto border border-panel-line bg-panel-raised">
          <table className="w-full min-w-[52rem] border-collapse">
            <thead>
              <tr className="border-b border-panel-line">
                <th className={HEAD_CELL}>Article</th>
                <th className={HEAD_CELL}>Category</th>
                <th className={HEAD_CELL}>Published on</th>
                <th className={HEAD_CELL}>Visibility</th>
                <th className={HEAD_CELL}>Updated</th>
                <th className={`${HEAD_CELL} text-right`}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b border-panel-line last:border-b-0">
                  <td className={CELL}>
                    <div className="flex items-center gap-3">
                      <div className="relative h-11 w-16 shrink-0 overflow-hidden bg-panel-high">
                        {post.cover && (
                          <Image
                            src={unsplash(post.cover, 240)}
                            alt=""
                            fill
                            sizes="4rem"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-body text-sm text-panel-text">
                          {post.display_title || post.title}
                        </p>
                        <p className="truncate font-body text-xs text-panel-faint">
                          /insights/{post.slug}
                          {post.read_time ? ` · ${post.read_time}` : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={CELL}>{post.category}</td>
                  <td className={CELL}>{formatDay(post.published_on)}</td>
                  <td className={CELL}>
                    {post.published ? (
                      <Badge tone="success">Published</Badge>
                    ) : (
                      <Badge tone="muted">Draft</Badge>
                    )}
                  </td>
                  <td className={CELL}>{formatDate(post.updated_at)}</td>
                  <td className={`${CELL} text-right`}>
                    <Link
                      href={`/admin/blog/${post.id}`}
                      className="font-body text-sm text-panel-muted underline-offset-4 transition-colors hover:text-rose hover:underline"
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
