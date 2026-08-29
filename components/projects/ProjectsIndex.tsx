"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap, useGSAP } from "@/lib/gsap";
import {
  GROUP_ORDER,
  GROUP_SLUG,
  projectsInGroup,
  type Project,
} from "@/lib/projects";
import { unsplash } from "@/lib/images";
import SectionJump from "@/components/projects/SectionJump";

const FILTERS = ["All", "Residential", "Commercial", "Mixed-Use"] as const;
type Filter = (typeof FILTERS)[number];

/** "N development(s)" — shared by the filter bar and every group header. */
function countLabel(n: number): string {
  return `${n} ${n === 1 ? "development" : "developments"}`;
}

/** Meta strip for the single-project feature card — the first three
    At-a-glance specs, with only the leading figure keeping its label
    (e.g. "~120 Residences · 2 & 3 Bed · G+15"). */
function specStrip(p: Project): string {
  return p.specs
    .slice(0, 3)
    .map((s, i) => (i === 0 ? `${s.value} ${s.label}` : s.value))
    .join(" · ");
}

/** Projects come from the admin panel via the server page — see lib/projects-data.ts. */
export default function ProjectsIndex({ projects }: { projects: Project[] }) {
  const [filter, setFilter] = useState<Filter>("All");
  const grid = useRef<HTMLDivElement>(null);

  /** Only offer filters that match at least one project; hide the buttons
      entirely when there is a single type. */
  const activeFilters = useMemo(
    () => FILTERS.filter((f) => f === "All" || projects.some((p) => p.type === f)),
    [projects]
  );
  const showFilters = activeFilters.length > 2;

  const visible = useMemo(
    () => projects.filter((p) => filter === "All" || p.type === filter),
    [projects, filter]
  );

  /** ONLY stages that actually hold a development (client, Aug 2026 —
      previously every stage rendered, and an empty On-going or Delivered
      announced itself with "No developments at this stage yet"). The earlier
      reasoning was that an empty stage is honest where a hidden one implies a
      back catalogue; the client's position is that a heading over nothing
      reads as a page still being built. Their call, and it is their track
      record being described.

      Note this is computed from `visible`, not from every project, so it
      follows the type filter too: narrowing to Commercial drops any stage with
      no commercial work rather than leaving it standing and empty. */
  const groups = useMemo(
    () =>
      GROUP_ORDER.map((group) => ({ group, items: projectsInGroup(group, visible) })).filter(
        ({ items }) => items.length > 0
      ),
    [visible]
  );

  /** The dropdown mirrors what is actually on the page — which is now only
      the stages that render, so it can no longer offer an option that scrolls
      to nothing. */
  const jumpOptions = useMemo(
    () => groups.map(({ group, items }) => ({ label: group, slug: GROUP_SLUG[group], count: items.length })),
    [groups]
  );

  useGSAP(
    () => {
      const el = grid.current;
      if (!el) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          el.querySelectorAll("[data-card]"),
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.08 }
        );
      });

      // Reduced motion — cards land already in place on every filter change.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(el.querySelectorAll("[data-card]"), { opacity: 1, y: 0 });
      });

      return () => mm.revert();
    },
    { dependencies: [filter], scope: grid }
  );

  return (
    <section className="section-light relative py-16 md:py-24">
      <div className="container-edge">
        {/* The "Index" strip that used to open this section was removed
            (client, Aug 2026 — "confusing for the user"). It listed every
            development as a text row directly above the same developments
            rendered as cards, so the page stated its contents twice before
            showing them once. The teaser rows for unannounced work went with
            it; TEASERS is still defined in lib/projects.ts if it is wanted
            back. */}

        {/* Filters + the jump control. The dropdown sits first because it
            navigates the page, while the type buttons only narrow what is on
            it — a visitor scanning left to right meets "where do I want to be"
            before "what do I want to see". */}
        <div className="mt-16 flex flex-wrap items-center gap-3 border-b border-hair pb-8">
          {/* A jump control needs somewhere to jump. With one stage left
              standing it would be a dropdown holding the section the visitor
              is already looking at — the same reason `showFilters` hides the
              type buttons when there is only one type. */}
          {groups.length > 1 && <SectionJump options={jumpOptions} />}
          {showFilters &&
            activeFilters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`border px-5 py-2.5 font-body text-sm transition-colors duration-300 ${
                  filter === f
                    ? "border-ink bg-ink text-paper"
                    : "border-hair-strong text-mist hover:border-rose-deep hover:text-ink"
                }`}
              >
                {f}
              </button>
            ))}
          <span className="ml-auto font-body text-sm text-fog">
            {countLabel(visible.length)}
          </span>
        </div>

        {/* One block per NON-EMPTY stage, in GROUP_ORDER — Upcoming, On-going,
            Delivered. See the note on `groups` above.

            Hiding empty stages means the whole list can now come back empty,
            which the old markup could never do: a filter matching nothing used
            to produce three "No developments at this stage yet" blocks, and
            would now produce a bare page under a filter bar. One statement in
            the filter's own terms replaces all three. */}
        {groups.length === 0 && (
          <p className="mt-16 border-t border-hair pt-8 font-body text-base text-mist">
            {filter === "All"
              ? "No developments to show yet."
              : `No ${filter.toLowerCase()} developments yet.`}
          </p>
        )}

        <div ref={grid}>
          {groups.map(({ group, items }, gi) => {
            const feature = items.length === 1;
            return (
              <div
                key={group}
                id={GROUP_SLUG[group]}
                /* scroll-mt clears the sticky navbar for the no-Lenis path
                   (reduced motion) and for a deep link landing on #completed
                   directly, where there is no scroll animation to offset. */
                className="mt-16 scroll-mt-[calc(var(--nav-h)+2rem)] first:mt-12"
              >
                <div className="flex flex-wrap items-center gap-4">
                  <span className="font-body text-xs text-rose-deep">
                    {String(gi + 1).padStart(2, "0")}
                  </span>
                  <span className="line-hair w-10" />
                  <span className="eyebrow text-rose-deep">{group}</span>
                  <span className="ml-auto font-body text-sm text-fog">
                    {countLabel(items.length)}
                  </span>
                </div>

                <div
                  className={`mt-10 grid grid-cols-1 ${
                    feature ? "" : "gap-x-8 gap-y-16 md:grid-cols-2"
                  }`}
                >
                  {items.map((p) => (
                    <Link
                      key={p.slug}
                      data-card
                      href={`/projects/${p.slug}`}
                      className="group"
                    >
                      <div
                        className={`relative overflow-hidden bg-shell ${
                          feature ? "aspect-[16/9]" : "aspect-[4/3]"
                        }`}
                      >
                        {/* Empty rather than a placeholder — see ProjectHero.
                            The frame keeps its aspect either way, so the grid
                            does not reflow when art is added. */}
                        {p.cover && (
                          <Image
                            src={unsplash(p.cover, feature ? 1800 : 1200)}
                            alt={p.name}
                            fill
                            sizes={feature ? "100vw" : "(max-width: 768px) 100vw, 50vw"}
                            className="img-warm object-cover transition-transform duration-[1.3s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
                        <div className="absolute left-5 top-5 flex items-center gap-2 border border-hair-strong bg-paper/70 px-3 py-1.5 backdrop-blur-md">
                          <span className="h-1.5 w-1.5 bg-rose-deep" />
                          <span className="font-body text-xs text-ink">{p.status}</span>
                        </div>
                      </div>

                      <div className="mt-6 flex items-start justify-between gap-6">
                        <div>
                          <p className="font-body text-xs uppercase tracking-[0.25em] text-rose-deep">
                            {p.type} · {p.city}, Sri Lanka
                          </p>
                          <h3 className="mt-3 font-display text-4xl text-ink transition-colors group-hover:text-rose-deep">
                            {p.name}
                          </h3>
                          <p className="mt-3 max-w-xl font-body text-base leading-relaxed text-mist">
                            {p.summary}
                          </p>
                          {feature && (
                            <p className="mt-5 border-t border-hair pt-4 font-body text-sm text-fog">
                              {specStrip(p)}
                            </p>
                          )}
                        </div>
                        <span className="hidden shrink-0 items-center gap-2 pt-3 font-body text-sm text-ink transition-transform duration-500 group-hover:translate-x-1 md:flex">
                          View <span className="text-rose-deep">→</span>
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
