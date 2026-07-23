import Link from "next/link";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";

/* Bodies deliberately short — client wants max two rows per card; the
   full step descriptions live on the Approach page. */
const STEPS = [
  {
    n: "01",
    title: "Plan",
    body: "Every development begins with the site, the market and the people who will live there.",
  },
  {
    n: "02",
    title: "Design",
    body: "Layouts considered from the inside out, prioritizing natural light, ventilation and daily function.",
  },
  {
    n: "03",
    title: "Build",
    body: "Disciplined construction, skilled workmanship and strict quality assurance throughout.",
  },
  {
    n: "04",
    title: "Endure",
    body: "Responsive after-sales support and long-term building performance beyond handover.",
  },
];

export default function ApproachPreview() {
  return (
    <section className="section-light relative py-24 md:py-36">
      <div className="container-edge">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="flex items-center gap-4">
              <span className="font-body text-xs text-rose-deep">04</span>
              <span className="line-hair w-10" />
              <span className="eyebrow text-rose-deep">Our Approach</span>
            </div>
            <TextReveal
              as="h2"
              text="How lasting value gets built."
              className="mt-6 font-display display-md text-ink"
            />
          </div>
          <Reveal>
            <Link
              href="/approach"
              className="group inline-flex items-center gap-3 border-b border-hair-strong pb-2 font-body text-ink transition-colors hover:border-rose-deep hover:text-rose-deep"
            >
              Explore our approach
              <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
            </Link>
          </Reveal>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-px border border-hair bg-hair sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal
              key={s.n}
              delay={i * 0.08}
              className="group flex flex-col bg-cream p-8 transition-colors duration-500 hover:bg-shell"
            >
              {/* No justify-between / min-height: grid cells already
                  equalise height, so the content keeps a tight rhythm
                  instead of being pushed to the card's two edges. */}
              <span className="font-display text-5xl leading-none text-rose-deep/70 transition-colors group-hover:text-rose-deep">
                {s.n}
              </span>
              <h3 className="mt-7 font-display text-3xl text-ink">{s.title}</h3>
              {/* 30ch cap + balanced wrap → three even, full rows at any
                  card width, never a stranded half row */}
              <p className="mt-3 max-w-[30ch] text-balance font-body text-sm leading-relaxed text-mist">
                {s.body}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
