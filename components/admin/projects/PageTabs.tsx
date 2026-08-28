"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Tabs across the Projects admin.
 *
 * "Projects" is the portfolio itself (public.projects); the other three are the
 * sections of the /projects page around it, added in 20260803000900. They share
 * a menu item because that is how the client thinks about them — everything to
 * do with projects lives under Projects — but they write different tables.
 *
 * Static segments beat the [id] route in the App Router, so /admin/projects/hero
 * resolves here and not to the project editor. Any future tab must therefore
 * never share a name with a project id, which is a uuid, so this is safe.
 */
const TABS = [
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/projects/hero", label: "Page hero" },
  { href: "/admin/projects/intro", label: "Intro text" },
  { href: "/admin/projects/carousel", label: "Carousel" },
];

export default function PageTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Projects sections" className="flex flex-wrap gap-1 border-b border-panel-line">
      {TABS.map((tab) => {
        // Exact match only. A `startsWith` would light "Projects" up on every
        // one of the others, since they all sit beneath it.
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-3 font-body text-sm transition-colors ${
              active
                ? "border-panel-line-strong text-panel-text"
                : "border-transparent text-panel-muted hover:border-panel-line-strong hover:text-panel-text"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
