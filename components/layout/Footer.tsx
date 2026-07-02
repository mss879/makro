import Image from "next/image";
import Link from "next/link";
import { NAV, SITE, SOCIALS } from "@/lib/site";
import { PeakMark } from "@/components/brand/PeakMark";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";
import Magnetic from "@/components/anim/Magnetic";
import Drift from "@/components/anim/Drift";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-hair bg-carbon">
      {/* Peak watermark */}
      <Drift className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 opacity-[0.05]">
        <PeakMark className="h-[42rem] w-auto text-rose" strokeWidth={1.5} />
      </Drift>

      <div className="container-edge relative py-20 md:py-28">
        {/* CTA */}
        <div className="flex flex-col items-start justify-between gap-10 border-b border-hair pb-16 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow text-rose">Let&rsquo;s build something lasting</p>
            <TextReveal
              as="h2"
              text="Have a site, a vision or a question?"
              className="mt-5 font-display display-lg text-bone"
            />
          </div>
          <Magnetic strength={0.4}>
            <Link
              href="/contact"
              className="group inline-flex items-center gap-4 rounded-full bg-rose px-8 py-4 font-body text-ink transition-colors hover:bg-rose-soft"
            >
              <span className="text-lg">Start a conversation</span>
              <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
            </Link>
          </Magnetic>
        </div>

        {/* Columns */}
        <Reveal className="grid grid-cols-2 gap-10 py-16 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Image
              src="/logo-black.png"
              alt="Makro Developers"
              width={900}
              height={244}
              className="h-8 w-auto invert"
            />
            <p className="mt-5 max-w-xs font-body text-sm leading-relaxed text-mist">
              {SITE.description}
            </p>
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

        {/* Legal */}
        <div className="flex flex-col items-start justify-between gap-4 border-t border-hair pt-8 font-body text-xs text-fog sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {SITE.legal}. A subsidiary of the {SITE.parent}.
          </p>
          <p className="flex items-center gap-2">
            The future built well.
          </p>
        </div>
      </div>
    </footer>
  );
}
