import Link from "next/link";
import Image from "next/image";
import { BRAND } from "@/lib/images";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";
import { PeakMark } from "@/components/brand/PeakMark";

/**
 * Where each card goes (client, Oct 2026). Residential is a link as a whole —
 * click anywhere on it and it opens the projects page, because the
 * developments ARE residential. Commercial has no development to show yet, so
 * the card itself goes nowhere and only its "Learn more" is a link, to the
 * approach page. `wholeCard` is what switches between the two.
 */
type Service = {
  n: string;
  title: string;
  body: string;
  image: string;
  href: string;
  wholeCard: boolean;
};

const SERVICES: Service[] = [
  {
    n: "01",
    title: "Residential Development",
    body: "Residential developments shaped by thoughtful planning and high-utility design, where every space is constructed to complement the experience of everyday life.",
    image: BRAND.serviceResidential,
    href: "/projects",
    wholeCard: true,
  },
  {
    n: "02",
    title: "Commercial Development",
    body: "Developments grounded in commercial insight and engineering precision, balancing operational efficiency with long-term asset performance.",
    image: BRAND.serviceCommercial,
    href: "/approach",
    wholeCard: false,
  },
  // Retired per client feedback July 2026 — uncomment to restore.
  // (BRAND.serviceValue is still exported from lib/images.ts.)
  // {
  //   n: "03",
  //   title: "Investment & Value",
  //   body: "Every development is structured to protect and grow its value, delivering confident long-term returns on a Makro address.",
  //   image: BRAND.serviceValue,
  // },
];

/**
 * One card. A whole-card link answers hover everywhere — the picture eases in,
 * the title turns rose — because the whole card is the target. A card that is
 * not a link answers nothing, so it does not look clickable where it is not;
 * its "Learn more" is the one link, and only that arrow moves.
 */
function ServiceCard({ s }: { s: Service }) {
  const hover = s.wholeCard;
  const content = (
    <>
      {/* Image card frame with number overlay on top */}
      <div className="relative h-[24rem] w-full overflow-hidden bg-ink-700 p-6 md:h-[30rem]">
        <Image
          src={s.image}
          alt={s.title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className={`img-warm object-cover ${
            hover
              ? "transition-transform duration-[1.1s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
              : ""
          }`}
        />
        {/* Subtle top scrim for contrast */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ink/50 to-transparent" />

        {/* Number & PeakMark overlay on top of card */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="font-display text-4xl text-bone">{s.n}</span>
          <PeakMark className="h-5 w-auto text-bone" strokeWidth={10} />
        </div>
      </div>

      {/* Text content outside card below image */}
      <div className="mt-5 flex flex-col items-start">
        <h3
          className={`font-display text-2xl text-ink ${
            hover ? "transition-colors duration-300 group-hover:text-rose-deep" : ""
          }`}
        >
          {s.title}
        </h3>
        {/* Capped measure — at half-container width the line
            length would otherwise balloon past comfortable. */}
        <p className="mt-3 max-w-md font-body text-sm leading-relaxed text-mist">
          {s.body}
        </p>
        {s.wholeCard ? (
          <span className="mt-4 inline-flex items-center gap-2 font-body text-sm font-medium text-rose-deep">
            Learn more
            <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
          </span>
        ) : (
          <Link
            href={s.href}
            className="group mt-4 inline-flex items-center gap-2 font-body text-sm font-medium text-rose-deep"
          >
            Learn more
            <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
          </Link>
        )}
      </div>
    </>
  );

  return s.wholeCard ? (
    <Link href={s.href} className="group flex flex-col">
      {content}
    </Link>
  ) : (
    <div className="flex flex-col">{content}</div>
  );
}

export default function Services() {
  return (
    <section className="section-light relative section-y section-y-open-b md:py-32">
      <div className="container-edge">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="flex items-center gap-4">
              <span className="font-body text-xs text-rose-deep">01</span>
              <span className="line-hair w-10" />
              <span className="eyebrow text-rose-deep">What We Do</span>
            </div>
            <TextReveal
              as="h2"
              text="Focused expertise. From vision to delivery."
              className="mt-6 font-display display-md text-ink"
            />
          </div>
          <Reveal>
            <Link
              href="/approach"
              className="group inline-flex items-center gap-3 border-b border-hair-strong pb-2 font-body text-ink transition-colors hover:border-rose-deep hover:text-rose-deep"
            >
              See how we work
              <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
            </Link>
          </Reveal>
        </div>

        {/* Image cards on the paper field. The imagery stays fully visible
            (client direction — no dark hover-reveal); a bottom scrim keeps
            the text legible. Title and body live in fixed-height rows so
            both cards align horizontally regardless of text length. */}
        <div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-2 lg:gap-14">
          {SERVICES.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <ServiceCard s={s} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
