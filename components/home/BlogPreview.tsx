import Link from "next/link";
import Image from "next/image";
import { getInsights } from "@/lib/blog-data";
import { unsplash } from "@/lib/images";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";

/**
 * Blog preview — first three guides from the Insights hub, surfaced on
 * the home page beneath the FAQ (client request, July 2026). Links use
 * the /insights routes the "Blog" nav item points to.
 *
 * Fetches its own posts rather than taking them as a prop: nothing else on
 * the home page needs the articles, so lifting the await into page.tsx would
 * only add a line there to thread a value straight back down.
 */
export default async function BlogPreview() {
  // Admin sort order decides which three lead, matching /insights.
  const posts = (await getInsights()).slice(0, 3);

  return (
    <section className="section-light relative border-t border-hair section-y md:py-24">
      <div className="container-edge">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-xl">
            <div className="flex items-center gap-4">
              <span className="line-hair w-10" />
              <span className="eyebrow text-rose-deep">The Blog</span>
            </div>
            <TextReveal
              as="h2"
              text="Insights behind informed decision making"
              className="mt-6 font-display text-2xl leading-tight text-ink sm:text-3xl md:text-4xl"
            />
          </div>
          <Reveal>
            <Link
              href="/insights"
              className="group inline-flex items-center gap-3 border-b border-hair-strong pb-1.5 font-body text-sm text-ink transition-colors hover:border-rose-deep hover:text-rose-deep"
            >
              View all articles
              <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
            </Link>
          </Reveal>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 md:mt-12 md:grid-cols-3 md:gap-8">
          {posts.map((post, i) => (
            <Reveal key={post.slug} delay={i * 0.1}>
              <Link href={`/insights/${post.slug}`} className="group block">
                <div className="relative aspect-[16/9] overflow-hidden bg-shell">
                  <Image
                    src={unsplash(post.cover, 800)}
                    alt={post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="img-warm object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                  />
                </div>
                <p className="mt-4 font-body text-[0.7rem] uppercase tracking-[0.2em] text-fog">
                  {post.category} · {post.readTime}
                </p>
                <h3 className="mt-3 font-display text-xl leading-snug text-ink transition-colors group-hover:text-rose-deep md:text-2xl">
                  {post.displayTitle}
                </h3>
                <p className="mt-3 line-clamp-2 font-body text-sm leading-relaxed text-mist">
                  {post.excerpt}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 font-body text-xs font-medium text-ink transition-colors group-hover:text-rose-deep">
                  Read the guide
                  <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
