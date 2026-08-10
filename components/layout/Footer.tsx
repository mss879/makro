import Image from "next/image";
import Link from "next/link";
import { CREATOR, NAV, NAV_LEGAL, SITE, SOCIALS } from "@/lib/site";
import { PeakMark } from "@/components/brand/PeakMark";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";
import Drift from "@/components/anim/Drift";
import NewsletterForm from "@/components/layout/NewsletterForm";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-hair bg-carbon">
      {/* Peak watermark */}
      <Drift className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 opacity-[0.05]">
        <PeakMark className="h-[42rem] w-auto text-rose" strokeWidth={1.5} />
      </Drift>

      <div className="container-edge relative py-12 md:py-16">
        {/* CTA */}
        <div className="flex flex-col items-start justify-between gap-10 border-b border-hair pb-8 md:pb-10 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow text-rose">Let&rsquo;s build something lasting</p>
            {/* Deliberately below the display-md section scale (client
                direction, Aug 2026): the footer CTA should invite rather
                than shout, and it sits under whatever section closed the
                page. */}
            <TextReveal
              as="h2"
              text="Have a site, a vision or a question?"
              className="mt-5 font-display text-2xl leading-tight text-bone md:text-3xl lg:text-4xl"
            />
          </div>
          <Link
            href="/contact"
            className="group inline-flex items-center gap-3 border-b border-hair-strong pb-2 font-body text-bone transition-colors hover:border-rose hover:text-rose"
          >
            <span className="text-lg">Start a conversation</span>
            <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
          </Link>
        </div>

        {/* Columns */}
        <Reveal className="grid grid-cols-2 gap-10 py-10 md:py-12 md:grid-cols-3 lg:grid-cols-4">
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            {/* Width/height at 2× the rendered h-8, not the asset's native
                900×244 — same srcset discipline as the navbar lockup. */}
            <Image
              src="/logo-black.png"
              alt="Makro Developers"
              width={236}
              height={64}
              className="h-8 w-auto invert"
            />
          </div>

          <div>
            <p className="eyebrow text-fog">Explore</p>
            <ul className="mt-5 space-y-3">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="font-body text-sm text-mist transition-colors hover:text-rose"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow text-fog">Connect</p>
            <ul className="mt-5 space-y-3">
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    className="font-body text-sm text-mist transition-colors hover:text-rose"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow text-fog">Visit</p>
            <address className="mt-5 space-y-3 not-italic">
              <a
                href={`mailto:${SITE.email}`}
                className="block font-body text-sm text-mist transition-colors hover:text-rose"
              >
                {SITE.email}
              </a>
              <a
                href={`tel:${SITE.phone.replace(/\s/g, "")}`}
                className="block font-body text-sm text-mist transition-colors hover:text-rose"
              >
                {SITE.phone}
              </a>
              <p className="font-body text-sm text-mist">{SITE.address}</p>
            </address>
          </div>
        </Reveal>

        {/* Newsletter — its own band rather than a column, so it reads as an
            object instead of a fourth list of links (client direction, Aug
            2026: the previous inline field was going unnoticed). */}
        <Reveal className="border-t border-hair py-10 md:py-12">
          <NewsletterForm />
        </Reveal>

        {/* Legal */}
        <div className="flex flex-col items-start justify-between gap-4 border-t border-hair pt-6 font-body text-xs text-fog sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {SITE.legal}. A subsidiary of the {SITE.parent}.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {NAV_LEGAL.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-rose"
              >
                {item.label}
              </Link>
            ))}
            <p>The future built well.</p>
          </div>
        </div>

        {/* Agency credit — designed & built by ARC AI. A dofollow, referrer-
            preserving link so the agency earns the attributed backlink. */}
        <div className="mt-6 flex justify-center">
          <a
            href={CREATOR.url}
            target="_blank"
            rel="noopener"
            title={`${CREATOR.name} — ${CREATOR.tagline}`}
            className="group inline-flex items-center gap-3"
          >
            <span className="font-body text-[0.7rem] uppercase tracking-[0.22em] text-fog transition-colors group-hover:text-mist">
              Designed &amp; built by
            </span>
            <Image
              src="/arclogo.webp"
              alt={`${CREATOR.name} — ${CREATOR.tagline}`}
              width={350}
              height={180}
              className="h-6 w-auto opacity-90 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:opacity-100"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
