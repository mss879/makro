"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap, useGSAP } from "@/lib/gsap";
import { PROJECTS } from "@/lib/projects";
import { unsplash } from "@/lib/images";

const FILTERS = ["All", "Residential", "Commercial", "Mixed-Use"] as const;
type Filter = (typeof FILTERS)[number];

/** Only offer filters that match at least one project; hide the buttons entirely when there is a single type. */
const ACTIVE_FILTERS = FILTERS.filter(
  (f) => f === "All" || PROJECTS.some((p) => p.type === f)
);
const SHOW_FILTERS = ACTIVE_FILTERS.length > 2;

export default function ProjectsGrid() {
  const [filter, setFilter] = useState<Filter>("All");
  const grid = useRef<HTMLDivElement>(null);

  const visible = useMemo(
    () => PROJECTS.filter((p) => filter === "All" || p.type === filter),
    [filter]
  );

  useGSAP(
    () => {
      if (!grid.current) return;
      gsap.fromTo(
        grid.current.querySelectorAll("[data-card]"),
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.08 }
      );
    },
    { dependencies: [filter], scope: grid }
  );

  return (
    <section className="relative bg-ink py-16 md:py-24">
      <div className="container-edge">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 border-b border-hair pb-8">
          {SHOW_FILTERS &&
            ACTIVE_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`border px-5 py-2.5 font-body text-sm transition-colors duration-300 ${
                  filter === f
                    ? "border-rose bg-rose text-ink"
                    : "border-hair-strong text-mist hover:border-rose hover:text-bone"
                }`}
              >
                {f}
              </button>
            ))}
          <span className="ml-auto font-body text-sm text-fog">
            {visible.length} {visible.length === 1 ? "development" : "developments"}
          </span>
        </div>

        {/* Grid */}
        <div
          ref={grid}
          className="mt-12 grid grid-cols-1 gap-x-8 gap-y-16 md:grid-cols-2"
        >
          {visible.map((p, i) => (
            <Link
              key={p.slug}
              data-card
              href={`/projects/${p.slug}`}
              className={`group ${i % 3 === 0 ? "md:col-span-2" : ""}`}
            >
              <div
                className={`relative overflow-hidden bg-ink-700 ${
                  i % 3 === 0 ? "aspect-[16/9]" : "aspect-[4/3]"
                }`}
              >
                <Image
                  src={unsplash(p.cover, i % 3 === 0 ? 1800 : 1200)}
                  alt={p.name}
                  fill
                  sizes={i % 3 === 0 ? "100vw" : "50vw"}
                  className="img-warm object-cover transition-transform duration-[1.3s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
                <div className="absolute left-5 top-5 flex items-center gap-2 border border-hair-strong bg-ink/40 px-3 py-1.5 backdrop-blur-md">
                  <span className="h-1.5 w-1.5 bg-rose" />
                  <span className="font-body text-xs text-bone">{p.status}</span>
                </div>
              </div>

              <div className="mt-6 flex items-start justify-between gap-6">
                <div>
                  <p className="font-body text-xs uppercase tracking-[0.25em] text-rose">
                    {p.type} · {p.city}, Sri Lanka
                  </p>
                  <h3 className="mt-3 font-display text-4xl text-bone transition-colors group-hover:text-rose">
                    {p.name}
                  </h3>
                  <p className="mt-3 max-w-xl font-body text-base leading-relaxed text-mist">
                    {p.summary}
                  </p>
                </div>
                <span className="hidden shrink-0 items-center gap-2 pt-3 font-body text-sm text-bone transition-transform duration-500 group-hover:translate-x-1 md:flex">
                  View <span className="text-rose">→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
