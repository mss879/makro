"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap";
import { NAV, SITE } from "@/lib/site";
import { GROUP_ORDER, GROUP_SLUG } from "@/lib/projects";
import ProjectsMenu from "@/components/layout/ProjectsMenu";

/**
 * Cream navbar — logo left, links right, Contact as an outlined button.
 *
 * On the home page it is fixed and starts transparent, seated on the hero's
 * video frame, then morphs to cream once the visitor scrolls past the top.
 * Everywhere else it is sticky and cream from the first paint, so those
 * heroes still size themselves with `calc(100svh - var(--nav-h))`.
 */
export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const overlay = useRef<HTMLDivElement>(null);
  /** True once this component has actually locked scrolling for the overlay. */
  const openedRef = useRef(false);

  // Lenis owns the scroll, and while it is running the browser fires no
  // native scroll events on window — a listener here never runs. ScrollTrigger
  // is the project's scroll authority (Lenis drives it via
  // `lenis.on("scroll", ScrollTrigger.update)`) and is also correct for
  // reduced-motion visitors, where Lenis never mounts.
  useGSAP(() => {
    setScrolled(window.scrollY > 10);
    ScrollTrigger.create({
      start: 10,
      end: "max",
      onToggle: (self) => setScrolled(self.isActive),
    });
  }, []);

  // Close the mobile overlay on navigation. This is the render-phase
  // adjustment pattern rather than an effect: syncing a prop into state with
  // useEffect renders the stale value first and trips react-hooks/set-state-in-effect.
  const [navigatedFrom, setNavigatedFrom] = useState(pathname);
  if (navigatedFrom !== pathname) {
    setNavigatedFrom(pathname);
    setOpen(false);
  }

  // Close the overlay if the viewport grows past the breakpoint that hides
  // the toggle — otherwise the menu is left open with no button to dismiss it
  // and the scroll lock below never releases.
  useEffect(() => {
    if (!open) return;
    const desktop = window.matchMedia("(min-width: 768px)");
    const close = () => setOpen(false);
    desktop.addEventListener("change", close);
    return () => desktop.removeEventListener("change", close);
  }, [open]);

  useGSAP(
    () => {
      const el = overlay.current;
      if (!el) return;
      if (open) {
        document.body.style.overflow = "hidden";
        openedRef.current = true;
        gsap.set(el, { display: "flex" });
        gsap.fromTo(el, { yPercent: -100 }, { yPercent: 0, duration: 0.7, ease: "power4.inOut" });
        gsap.fromTo(
          el.querySelectorAll("[data-mlink]"),
          { yPercent: 130, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.6, ease: "power3.out", stagger: 0.06, delay: 0.2 }
        );
      } else {
        // Only release the lock this component took. On mount `open` is
        // false, and clearing unconditionally here would wipe the scroll lock
        // the Preloader sets moments earlier — letting the page scroll behind
        // the intro curtain.
        if (openedRef.current) {
          document.body.style.overflow = "";
          openedRef.current = false;
        }
        gsap.to(el, {
          yPercent: -100,
          duration: 0.55,
          ease: "power4.inOut",
          onComplete: () => gsap.set(el, { display: "none" }),
        });
      }
    },
    { dependencies: [open], scope: overlay }
  );

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  /**
   * Floating navbar — seated on top of the viewport across all pages,
   * retaining its glassmorphic floating panel design even when scrolling
   * (client direction, Aug 2026).
   */
  const linkTone = { active: "text-bone", idle: "text-bone/65 hover:text-bone" };

  return (
    <>
      {/* No transition-all, no border, no background: none of those ever
          changed on this element, and transition-all on a fixed full-width
          element makes the browser watch every animatable property on it. The
          state change lives entirely on the panel below. */}
      <header className="fixed inset-x-0 top-0 z-[500] pointer-events-none">
        <div className="container-edge mx-auto max-w-[1600px] pt-[calc(env(safe-area-inset-top)+var(--hero-inset))]">
          {/* Black glassmorphism floating panel — dark frosted glass plate with hairline border & heavy backdrop blur. */}
          <div
            /* An explicit property list, not transition-all — and ONE shadow
               geometry across both states, varying only in alpha. The two
               states used to carry different offsets and blurs, so every
               crossing of the scroll threshold re-rasterised a full-width
               shadow at ~30 intermediate geometries; alpha-only makes it a
               colour interpolation instead. Under an 80%-opaque bar the
               geometry change was not visible anyway. */
            className={`pointer-events-auto flex h-[var(--nav-h)] items-center justify-between transition-[background-color,border-color,box-shadow] duration-500 mt-2 border px-5 backdrop-blur-xl md:mt-3 md:px-7 ${
              scrolled
                ? "border-white/25 bg-ink/80 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]"
                : "border-white/20 bg-ink/50 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.35)]"
            }`}
          >
            {/* Logo — left. The real brand lockup asset. */}
            <Link
              href="/"
              aria-label={`${SITE.name} — home`}
              className="shrink-0 transition-opacity hover:opacity-75"
            >
              <Image
                src="/logo-black.png"
                alt={SITE.name}
                width={192}
                height={52}
                priority
                /* Scale, not height. This used to transition the element's
                   LAYOUT height (32->28 / 38->34), i.e. 500ms of layout plus a
                   bitmap re-raster at every intermediate size, reflowing the
                   fixed bar's flex row on each frame. The box now stays put and
                   the mark scales inside it: 28/32 = 0.875, 34/38 = 0.895
                   (= 34.01px), so both states land where they always did.
                   origin-left resolves to left-center and the row is
                   items-center, so the left edge and the optical centre both
                   hold. `filter` was in the old transition list but never
                   changed. */
                className={`h-[32px] w-auto origin-left transition-transform duration-500 invert md:h-[38px] ${
                  scrolled ? "scale-[0.875] md:scale-[0.895]" : ""
                }`}
              />
            </Link>

            {/* Desktop links — right */}
            <nav className="hidden items-center gap-9 md:flex" aria-label="Primary">
              {NAV.map((item) => {
                const active = isActive(item.href);

                if (item.href === "/projects") {
                  return (
                    <ProjectsMenu
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      active={active}
                      overlay={true}
                    />
                  );
                }

                // Contact is the bar's one action, carrying a sharp-edged outline.
                if (item.href === "/contact") {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className="inline-flex items-center border border-bone/45 px-4 py-2 font-body text-[0.72rem] font-medium uppercase tracking-[0.18em] text-bone transition-colors duration-300 hover:border-rose hover:bg-rose hover:text-ink"
                    >
                      {item.label}
                    </Link>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`group relative font-body text-[0.72rem] font-medium uppercase tracking-[0.18em] transition-colors duration-300 ${
                      active ? linkTone.active : linkTone.idle
                    }`}
                  >
                    {item.label}
                    <span
                      className={`absolute -bottom-1.5 left-0 h-px bg-rose transition-all duration-400 ${
                        active ? "w-full" : "w-0 group-hover:w-full"
                      }`}
                    />
                  </Link>
                );
              })}
            </nav>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={open}
              aria-controls="mobile-menu"
              className="-mr-2 flex h-10 w-10 items-center justify-center text-bone transition-colors duration-500 md:hidden"
            >
              <span className="relative flex h-[9px] w-5 flex-col justify-between">
                <span
                  className={`h-px w-full bg-current transition-all duration-300 ${
                    open ? "translate-y-[4px] rotate-45" : ""
                  }`}
                />
                <span
                  className={`h-px w-full bg-current transition-all duration-300 ${
                    open ? "-translate-y-[4px] -rotate-45" : ""
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile full-screen menu — cream, matching the bar */}
      <div
        ref={overlay}
        id="mobile-menu"
        className="section-light fixed inset-0 z-[490] hidden flex-col justify-between gap-10 overflow-y-auto container-edge pb-12 pt-[calc(var(--nav-h)+2rem)] md:hidden"
        style={{ display: "none" }}
      >
        <nav className="flex flex-1 flex-col justify-evenly" aria-label="Mobile">
          {NAV.map((item, i) => (
            <div key={item.href} className="reveal-mask">
              <Link
                data-mlink
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-baseline gap-5 font-display text-[clamp(2rem,4.4vh,3.2rem)] leading-[1.2] transition-colors ${
                  isActive(item.href) ? "text-rose-deep" : "text-ink hover:text-rose-deep"
                }`}
              >
                <span className="font-body text-xs tracking-normal text-fog">
                  0{i + 1}
                </span>
                {item.label}
              </Link>

              {/* The portfolio's two stages, indented under Projects. No
                  dropdown on mobile — the overlay is already a full-screen
                  menu, so nesting a second one inside it would be a menu in a
                  menu for two entries. */}
              {item.href === "/projects" && (
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 pl-9">
                  {GROUP_ORDER.map((group) => (
                    <Link
                      key={group}
                      href={`${item.href}#${GROUP_SLUG[group]}`}
                      scroll={false}
                      onClick={() => setOpen(false)}
                      className="font-body text-xs uppercase tracking-[0.18em] text-mist transition-colors hover:text-rose-deep"
                    >
                      {group}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div
          data-mlink
          className="flex flex-wrap items-end justify-between gap-6 border-t border-ink/10 pt-8"
        >
          <div>
            <p className="eyebrow text-fog">Enquiries</p>
            <a
              href={`mailto:${SITE.email}`}
              className="mt-1 block font-display text-lg text-ink"
            >
              {SITE.email}
            </a>
          </div>
          <p className="font-body text-sm text-mist">{SITE.address}</p>
        </div>
      </div>
    </>
  );
}
