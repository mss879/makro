"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { gsap, useGSAP } from "@/lib/gsap";
import { NAV, SITE } from "@/lib/site";
import Magnetic from "@/components/anim/Magnetic";
import { PeakMark } from "@/components/brand/PeakMark";

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const overlay = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
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
        gsap.fromTo(el, { yPercent: -100 }, { yPercent: 0, duration: 0.8, ease: "power4.inOut" });
        gsap.fromTo(
          el.querySelectorAll("[data-mlink]"),
          { yPercent: 150, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.7, ease: "power3.out", stagger: 0.07, delay: 0.25 }
        );
      } else {
        document.body.style.overflow = "";
        gsap.to(el, {
          yPercent: -100,
          duration: 0.6,
          ease: "power4.inOut",
          onComplete: () => gsap.set(el, { display: "none" }),
        });
      }
    },
    { dependencies: [open], scope: overlay }
  );

  const pillBg = scrolled
    ? "border-hair-strong bg-ink/70 backdrop-blur-2xl shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)]"
    : "border-hair bg-ink/30 backdrop-blur-xl";

  // On the homepage at the very top the white logo tab in the hero shows the
  // wordmark, so the navbar's own logo stays hidden to avoid a double. It
  // fades in once scrolled, or immediately on every other page.
  const isHome = pathname === "/";
  const showCenterLogo = scrolled || !isHome;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[500] px-[clamp(16px,2.5vw,48px)] pt-7">
        <div className="relative mx-auto flex max-w-[1500px] items-center justify-between">
          {/* Left island — circular home mark + outlined pill links */}
          <nav
            className={`hidden items-center gap-1.5 rounded-full border p-1.5 transition-all duration-500 xl:flex ${pillBg}`}
          >
            <Link
              href="/"
              aria-label="Makro Developers — home"
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors duration-300 ${
                pathname === "/"
                  ? "border-rose text-rose"
                  : "border-hair-strong text-bone hover:border-rose hover:text-rose"
              }`}
            >
              <PeakMark className="h-3.5 w-auto" strokeWidth={11} />
            </Link>
            {NAV.filter((i) => i.href !== "/" && i.href !== "/contact").map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full border px-3 py-2 font-body text-[0.65rem] uppercase tracking-[0.1em] transition-colors duration-300 ${
                    active
                      ? "border-transparent bg-rose text-ink"
                      : "border-hair-strong text-mist hover:border-rose hover:text-bone"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Spacer keeps the right island pinned right below xl */}
          <span className="xl:hidden" />

          {/* Center island — logo. Hidden on the homepage hero (the white tab
              shows the wordmark there); fades in on scroll / other pages. */}
          <Link
            href="/"
            aria-label="Makro Developers — home"
            className={`group absolute left-1/2 top-0 flex -translate-x-1/2 items-center pt-2.5 transition-opacity duration-500 ${
              showCenterLogo ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <Image
              src="/logo-black.png"
              alt=""
              width={900}
              height={244}
              className="h-6 w-auto invert transition-opacity duration-500 group-hover:opacity-80 md:h-7"
            />
          </Link>

          {/* Right island — CTA + menu */}
          <div
            className={`flex items-center gap-1.5 rounded-full border p-1.5 transition-all duration-500 ${pillBg}`}
          >
            <Magnetic strength={0.5}>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-hair-strong px-4 py-2 font-body text-[0.65rem] uppercase tracking-[0.1em] text-bone transition-colors duration-300 hover:border-rose hover:text-rose"
              >
                Enquire
                <span className="text-rose">→</span>
              </Link>
            </Magnetic>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={open}
              className="flex h-9 w-9 items-center justify-center rounded-full text-bone transition-colors duration-300 hover:text-rose"
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

      {/* Mobile / tablet full-screen menu */}
      <div
        ref={overlay}
        className="fixed inset-0 z-[490] hidden flex-col justify-between bg-carbon container-edge py-24"
        style={{ display: "none" }}
      >
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]">
          <PeakMark className="h-[70vh] w-auto text-rose" strokeWidth={2} />
        </div>
        <nav className="relative flex flex-col">
          {NAV.map((item, i) => (
            <div key={item.href} className="reveal-mask">
              <Link
                data-mlink
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-baseline gap-5 font-body text-5xl font-light leading-[1.25] tracking-tight text-bone transition-colors hover:text-rose sm:text-6xl"
              >
                <span className="font-body text-xs tracking-normal text-fog">0{i + 1}</span>
                {item.label}
              </Link>
            </div>
          ))}
        </nav>
        <div data-mlink className="relative flex flex-wrap items-end justify-between gap-6 border-t border-hair pt-8">
          <div>
            <p className="eyebrow text-fog">Enquiries</p>
            <a href={`mailto:${SITE.email}`} className="mt-1 block font-display text-2xl text-bone">
              {SITE.email}
            </a>
          </div>
          <p className="font-body text-sm text-mist">{SITE.address}</p>
        </div>
      </div>
    </>
  );
}
