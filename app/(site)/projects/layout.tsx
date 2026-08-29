/**
 * The portfolio's ground.
 *
 * Client direction, Aug 2026: the projects index and every project detail
 * page sit on their own, distinctly heavier grey than the rest of the site,
 * so the developments read as a separate chapter rather than more home page.
 *
 * All this layout does is open the `.surface-deep` scope (app/globals.css),
 * which re-points --color-paper / --color-shell / --color-shell-deep. Every
 * `.section-light`, `bg-paper` and `bg-shell` below inherits the new values,
 * so no component has to know which route it is rendering on — and a future
 * retune is one block of CSS, not a sweep through the projects components.
 *
 * A plain block wrapper on purpose: no transform, filter or overflow, so it
 * creates no containing block and leaves the `lg:sticky` FAQ rail and the
 * ScrollTrigger work inside untouched. The dark heroes and the ink-ground
 * cross-link band set their own backgrounds and are unaffected.
 */
export default function ProjectsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="surface-deep">{children}</div>;
}
