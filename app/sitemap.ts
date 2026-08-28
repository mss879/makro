import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { getProjects } from "@/lib/projects-data";
import { getInsights } from "@/lib/blog-data";

/**
 * Sitemap priorities mirror the site's commercial hierarchy:
 * conversion pages (home, projects) highest, editorial next,
 * legal pages lowest. Documented in docs/SEO-HANDOVER.md.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const url = (path: string) => `${SITE.url}${path}`;

  const staticPages: MetadataRoute.Sitemap = [
    { url: url("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: url("/projects"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: url("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: url("/approach"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: url("/sustainability"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: url("/insights"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: url("/faq"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: url("/contact"), lastModified: now, changeFrequency: "yearly", priority: 0.8 },
    { url: url("/careers"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: url("/privacy-policy"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: url("/terms-of-use"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  const projectPages: MetadataRoute.Sitemap = (await getProjects()).map((p) => ({
    url: url(`/projects/${p.slug}`),
    lastModified: now,
    changeFrequency: "monthly",
    priority: p.status === "On-going" ? 0.9 : 0.8,
  }));

  // getInsights rather than getInsightSlugs: <lastmod> needs each article's
  // published_on, which the slug list drops.
  const insightPages: MetadataRoute.Sitemap = (await getInsights()).map((i) => ({
    url: url(`/insights/${i.slug}`),
    lastModified: new Date(i.date),
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  return [...staticPages, ...projectPages, ...insightPages];
}
