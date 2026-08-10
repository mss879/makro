"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GROUP_ORDER, GROUP_SLUG } from "@/lib/projects";
import { scrollToSection } from "@/lib/scroll-to-section";

/**
 * The Projects item in the desktop navbar, with a dropdown to the two stages
 * of the portfolio (client request, Aug 2026). Picking one goes to /projects
 * and scrolls to that section — one page, never two.
 *
 * "Projects" itself stays a real link to the index. The dropdown is additive:
 * a visitor who wants the whole portfolio should not have to open a menu and
 * choose a stage first.
 */
export default function ProjectsMenu({
  href,
  label,
  active,
  overlay = false,
}: {
  href: string;
  label: string;
  active: boolean;
  /** Bar is transparent over the home hero — invert the trigger's tones. */
  overlay?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const onProjects = pathname.startsWith("/projects");

  // Escape closes, and so does a click anywhere else. Only bound while open so
  // the bar carries no idle listeners.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const go = (slug: string) => (e: React.MouseEvent) => {
    setOpen(false);
    // Already on /projects: scroll instead of navigating. A same-page hash
    // change would not fire hashchange when the hash is unchanged, so the
    // second click on the same entry would silently do nothing.
    if (onProjects) {
      e.preventDefault();
      scrollToSection(slug);
    }
  };

  return (
    <div
      ref={root}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      // focus-within keeps the panel open for keyboard users, who never
      // generate a mouseenter.
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <span className="flex items-center gap-1.5">
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={`group relative font-body text-[0.72rem] font-medium uppercase tracking-[0.18em] transition-colors duration-300 ${
            overlay
              ? active
                ? "text-bone"
                : "text-bone/65 hover:text-bone"
              : active
                ? "text-ink"
                : "text-ink/55 hover:text-ink"
          }`}
        >
          {label}
          <span
            className={`absolute -bottom-1.5 left-0 h-px transition-all duration-400 ${
              overlay ? "bg-rose" : "bg-rose-deep"
            } ${active ? "w-full" : "w-0 group-hover:w-full"}`}
          />
        </Link>
        {/* An SVG chevron rather than a ▾ glyph: the character sits on the
            text baseline like a superscript and cannot be optically centred
            against 0.72rem uppercase type. */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="true"
          aria-expanded={open}
          aria-controls="projects-sections-menu"
          aria-label={`${label} sections`}
          className={`flex h-4 w-4 items-center justify-center transition-all duration-300 ${
            open
              ? `rotate-180 ${overlay ? "text-rose" : "text-rose-deep"}`
              : overlay
                ? "text-bone/50 hover:text-bone"
                : "text-ink/40 hover:text-ink"
          }`}
        >
          <svg viewBox="0 0 10 6" className="h-[5px] w-[9px]" fill="none" aria-hidden="true">
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
      </span>

      {open && (
        <div
          /* pt-4 rather than a margin: the gap has to be part of the panel's
             hit area or the pointer crosses dead space on its way down and
             mouseleave closes the menu before it can be used. */
          className="absolute left-0 top-full z-10 pt-4"
        >
          {/* Ink panel dropping out of the cream bar. Cream-on-cream had no
              edge against the page behind it; black reads as a deliberate
              object and matches the dark inner-page heroes it opens over. */}
          <ul id="projects-sections-menu" className="bg-ink shadow-[0_18px_40px_-24px_rgba(5,2,3,0.55)]">
            {GROUP_ORDER.map((group, i) => (
              <li key={group}>
                <Link
                  href={`${href}#${GROUP_SLUG[group]}`}
                  // scroll={false} so Next does not jump to the top of the
                  // route and fight Lenis; the landing is handled by
                  // HashScroll on arrival, or by go() when already here.
                  scroll={false}
                  onClick={go(GROUP_SLUG[group])}
                  /* whitespace-nowrap is load-bearing: "In Progress" wrapped
                     onto two lines and read as two separate entries. The panel
                     sizes to the longest label instead of the label folding to
                     fit the panel. */
                  className={`block whitespace-nowrap px-6 py-3.5 font-body text-[0.72rem] font-medium uppercase tracking-[0.18em] text-bone/65 transition-colors duration-200 hover:bg-ink-700 hover:text-rose ${
                    i > 0 ? "border-t border-white/10" : ""
                  }`}
                >
                  {group}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
