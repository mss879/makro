import "server-only";

import { createAnonSupabase } from "@/lib/supabase/server";
import { INSIGHTS, type Insight, type InsightSection } from "@/lib/insights";
import type { BlogPostRow, BlogSection } from "@/lib/supabase/types";

/**
 * Server-side accessor for /insights article content.
 *
 * Articles are managed in the admin panel and stored in Supabase, but the
 * bundled INSIGHTS array stays as a fallback so the marketing site renders
 * correctly before credentials exist — and keeps rendering if the database is
 * ever unreachable. Server Components import from here; client components
 * receive the result as props (lib/insights.ts itself must stay client-safe,
 * and its `Insight` type remains the app's shared shape).
 */

/**
 * `published_on` is a Postgres `date`, so PostgREST hands back "YYYY-MM-DD"
 * already — the exact ISO form the `Insight` interface documents. Slicing
 * rather than parsing keeps it that way: `new Date(...)` would read the value
 * as UTC midnight, and the article hero's local-time formatter would print the
 * previous day for every reader west of Greenwich.
 */
function toIsoDate(value: string): string {
  return typeof value === "string" ? value.slice(0, 10) : "";
}

function toSection(section: BlogSection): InsightSection {
  const base: InsightSection = {
    heading: section.heading,
    paras: Array.isArray(section.paras) ? section.paras : [],
  };

  // `points` is sparse on purpose, in the column and here. The renderer guards
  // on `section.points && <ul>`, so emitting an empty array would hang a bare
  // bullet list under every section that has no bullets.
  return Array.isArray(section.points) && section.points.length > 0
    ? { ...base, points: section.points }
    : base;
}

function toInsight(row: BlogPostRow): Insight {
  return {
    slug: row.slug,
    title: row.title,
    displayTitle: row.display_title,
    category: row.category,
    date: toIsoDate(row.published_on),
    readTime: row.read_time,
    cover: row.cover,
    excerpt: row.excerpt,
    metaDescription: row.meta_description,
    keywords: Array.isArray(row.keywords) ? row.keywords : [],
    intro: row.intro,
    sections: Array.isArray(row.sections) ? row.sections.map(toSection) : [],
    related: Array.isArray(row.related) ? row.related : [],
    relatedProjects: Array.isArray(row.related_projects) ? row.related_projects : [],
  };
}

/** Published articles, ordered the way the admin panel arranges them. */
export async function getInsights(): Promise<Insight[]> {
  const supabase = createAnonSupabase();
  if (!supabase) return INSIGHTS;

  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .order("published_on", { ascending: false });

  if (error) {
    console.error("[makro] Falling back to bundled insights:", error.message);
    return INSIGHTS;
  }

  // No empty-result fallback, for the same reason as getProjects: once Supabase
  // is answering it is the source of truth, and unpublishing every article has
  // to actually empty the hub rather than resurrect the four seeded guides.
  return (data ?? []).map((row) => toInsight(row as unknown as BlogPostRow));
}

export async function getInsightBySlug(slug: string): Promise<Insight | undefined> {
  const insights = await getInsights();
  return insights.find((i) => i.slug === slug);
}

export async function getInsightSlugs(): Promise<string[]> {
  const insights = await getInsights();
  return insights.map((i) => i.slug);
}
