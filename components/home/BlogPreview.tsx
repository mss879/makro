import Link from "next/link";
import Image from "next/image";
import { INSIGHTS } from "@/lib/insights";
import { unsplash } from "@/lib/images";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";

/**
 * Blog preview — latest three guides from the Insights hub, surfaced on
 * the home page beneath the FAQ (client request, July 2026). Links use
 * the /insights routes the "Blog" nav item points to.
 */
export default function BlogPreview() {
  const posts = INSIGHTS.slice(0, 3);

  return (
    <section className="section-light relative border-t border-hair py-24 md:py-32">
      <div className="container-edge">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="flex items-center gap-4">
              <span className="line-hair w-10" />
              <span className="eyebrow text-rose-deep">The Blog</span>
            </div>
            <TextReveal
              as="h2"
              text="Guides for buying and investing well."
              className="mt-6 font-display display-md text-ink"
            />
          </div>
          <Reveal>
            <Link
              href="/insights"
              className="group inline-flex items-center gap-3 border-b border-hair-strong pb-2 font-body text-ink transition-colors hover:border-rose-deep hover:text-rose-deep"
            >
              View all articles
              <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
            </Link>
          </Reveal>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {posts.map((post, i) => (
            <Reveal key={post.slug} delay={i * 0.1}>
              <Link href={`/insights/${post.slug}`} className="group block">
                <div className="relative aspect-[3/2] overflow-hidden bg-shell">
                  <Image
                    src={unsplash(post.cover, 1200)}
                    alt={post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="img-warm object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                  />
                </div>
                <p className="mt-6 font-body text-xs uppercase tracking-[0.22em] text-fog">
                  {post.category} · {post.readTime}
                </p>
                <h3 className="mt-3 font-display text-2xl leading-snug text-ink transition-colors group-hover:text-rose-deep">
                  {post.displayTitle}
                </h3>
                <span className="mt-4 inline-flex items-center gap-2 font-body text-sm text-mist transition-colors group-hover:text-rose-deep">
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
