"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { gsap, useGSAP } from "@/lib/gsap";
import { NAV, SITE } from "@/lib/site";

/**
 * Cream sticky navbar — logo left, five links right.
 * Sits in normal flow (sticky), so page heroes size themselves with
 * `calc(100svh - var(--nav-h))` rather than hiding under a fixed bar.
 */
export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const overlay = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useGSAP(
    () => {
      const el = overlay.current;
      if (!el) return;
      if (open) {
        document.body.style.overflow = "hidden";
        gsap.set(el, { display: "flex" });
        gsap.fromTo(el, { yPercent: -100 }, { yPercent: 0, duration: 0.7, ease: "power4.inOut" });
        gsap.fromTo(
          el.querySelectorAll("[data-mlink]"),
          { yPercent: 130, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.6, ease: "power3.out", stagger: 0.06, delay: 0.2 }
        );
      } else {
        document.body.style.overflow = "";
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

  return (
    <>
      <header
        className={`sticky top-0 z-[500] border-b bg-cream transition-shadow duration-500 ${
          scrolled
            ? "border-ink/10 shadow-[0_10px_30px_-18px_rgba(5,2,3,0.25)]"
            : "border-ink/8"
        }`}
      >
        <div className="container-edge mx-auto flex h-[var(--nav-h)] max-w-[1600px] items-center justify-between pt-[env(safe-area-inset-top)]">
          {/* Logo — left */}
          <Link
            href="/"
            aria-label="Makro Developers — home"
            className="flex shrink-0 items-center transition-opacity duration-300 hover:opacity-75"
          >
            <Image
              src="/logo-black.png"
              alt="Makro Developers"
              width={900}
              height={244}
              priority
              className="h-[22px] w-auto md:h-[26px]"
            />
          </Link>

          {/* Desktop links — right */}
          <nav className="hidden items-center gap-9 md:flex" aria-label="Primary">
            {NAV.filter((i) => i.href !== "/contact").map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`group relative font-body text-[0.72rem] font-medium uppercase tracking-[0.18em] transition-colors duration-300 ${
                    active ? "text-ink" : "text-ink/55 hover:text-ink"
                  }`}
                >
                  {item.label}
                  <span
                    className={`absolute -bottom-1.5 left-0 h-px bg-rose-deep transition-all duration-400 ${
                      active ? "w-full" : "w-0 group-hover:w-full"
                    }`}
                  />
                </Link>
              );
            })}
            <Link
              href="/contact"
              className="bg-ink px-5 py-2.5 font-body text-[0.72rem] font-medium uppercase tracking-[0.18em] text-bone transition-colors duration-300 hover:bg-rose-deep hover:text-ink"
            >
              Contact
            </Link>
          </nav>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
            className="-mr-2 flex h-10 w-10 items-center justify-center text-ink md:hidden"
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
      </header>

      {/* Mobile full-screen menu — cream, matching the bar */}
      <div
        ref={overlay}
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
