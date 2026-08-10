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

  const isHome = pathname === "/";
  /**
   * Seated transparently on the home hero's video frame, morphing to the
   * cream bar on scroll (client direction, Aug 2026). Never while the mobile
   * overlay is open — that surface is cream, and bone-on-cream would vanish.
   */
  const onHero = isHome && !scrolled && !open;

  const linkTone = onHero
    ? { active: "text-bone", idle: "text-bone/65 hover:text-bone" }
    : { active: "text-ink", idle: "text-ink/55 hover:text-ink" };

  return (
    <>
      <header
        className={`z-[500] border-b transition-[background-color,border-color,box-shadow] duration-500 ${
          // Fixed on home so the hero runs the full viewport beneath it;
          // sticky elsewhere, where heroes still subtract --nav-h.
          isHome ? "fixed inset-x-0 top-0" : "sticky top-0"
        } ${
          onHero
            ? "border-transparent bg-transparent"
            : scrolled
              ? "border-ink/10 bg-cream shadow-[0_10px_30px_-18px_rgba(5,2,3,0.25)]"
              : "border-ink/8 bg-cream"
        }`}
      >
        <div
          className={`container-edge mx-auto max-w-[1600px] ${
            // Nudged down by the frame's inset so the bar reads as sitting on
            // the video rather than straddling its top edge.
            onHero
              ? "pt-[calc(env(safe-area-inset-top)+var(--hero-inset))]"
              : "pt-[env(safe-area-inset-top)]"
          }`}
        >
          {/* On the hero the row becomes a floating panel — a tinted, blurred
              plate with a hairline edge (client direction, Aug 2026) so the
              bone logo and links stay legible over whatever frame of the video
              is behind them, and the bar reads as an object sitting on the
              footage rather than text scattered across it. Sharp corners, in
              keeping with the frame and the Contact button. */}
          <div
            className={`flex h-[var(--nav-h)] items-center justify-between transition-[background-color,border-color,margin] duration-500 ${
              onHero
                ? "mt-2 border border-bone/20 bg-ink/30 px-5 backdrop-blur-md md:mt-3 md:px-7"
                : "border border-transparent"
            }`}
          >
          {/* Logo — left. The real brand lockup asset, where the twin peaks
              form the M of MAKRO. Not a reconstruction: the mark and the
              wordmark are drawn as one piece and must not be rebuilt from
              separate parts. */}
          <Link
            href="/"
            aria-label={`${SITE.name} — home`}
            className="shrink-0 transition-opacity hover:opacity-75"
          >
            {/* Fixed display size, so width/height are given at 2× rather
                than the asset's native 900×244. next/image then emits a 1×/2×
                srcset instead of fifteen candidates up to 3840px for a mark
                that is never wider than 96 CSS pixels. */}
            <Image
              src="/logo-black.png"
              alt={SITE.name}
              width={192}
              height={52}
              priority
              className={`w-auto transition-[filter,height] duration-500 ${
                // The lockup ships black; inverting is how it reads on the
                // dark hero without shipping a second asset. It also runs a
                // step larger while seated on the hero (client direction, Aug
                // 2026) and settles back to the bar size once the bar is cream.
                onHero
                  ? "h-[32px] invert md:h-[38px]"
                  : "h-[22px] md:h-[26px]"
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
                    overlay={onHero}
                  />
                );
              }

              // Contact is the bar's one action, so it carries a sharp-edged
              // outline rather than another underlined link (client
              // direction, Aug 2026 — the peak glyph that used to precede it
              // was dropped in the same pass).
              if (item.href === "/contact") {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex items-center border px-4 py-2 font-body text-[0.72rem] font-medium uppercase tracking-[0.18em] transition-colors duration-300 ${
                      onHero
                        ? "border-bone/45 text-bone hover:border-rose hover:bg-rose hover:text-ink"
                        : "border-ink/30 text-ink hover:border-ink hover:bg-ink hover:text-cream"
                    }`}
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
                    className={`absolute -bottom-1.5 left-0 h-px transition-all duration-400 ${
                      onHero ? "bg-rose" : "bg-rose-deep"
                    } ${active ? "w-full" : "w-0 group-hover:w-full"}`}
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
            className={`-mr-2 flex h-10 w-10 items-center justify-center transition-colors duration-500 md:hidden ${
              onHero ? "text-bone" : "text-ink"
            }`}
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
