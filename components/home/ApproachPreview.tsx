import Link from "next/link";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";

const STEPS = [
  {
    n: "01",
    title: "Plan",
    body: "We begin with the market and the land — not the marketing. Rigorous feasibility, honest numbers and a clear brief set the foundation.",
  },
  {
    n: "02",
    title: "Design",
    body: "Architecture and engineering that serve how people actually live and work: climate-aware, efficient and quietly timeless.",
  },
  {
    n: "03",
    title: "Build",
    body: "Disciplined execution and rigorous quality control — delivered on schedule and to specification, every time.",
  },
  {
    n: "04",
    title: "Endure",
    body: "We stand behind what we deliver and design it to hold its value, generating returns and pride long after handover.",
  },
];

export default function ApproachPreview() {
  return (
    <section className="relative bg-ink py-24 md:py-36">
      <div className="container-edge">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="flex items-center gap-4">
              <span className="font-body text-xs text-rose">04</span>
              <span className="line-hair w-10" />
              <span className="eyebrow text-rose">Our Approach</span>
            </div>
            <TextReveal
              as="h2"
              text="How lasting value gets built."
              className="mt-6 font-display display-md text-bone"
            />
          </div>
          <Reveal>
            <Link
              href="/approach"
              className="group inline-flex items-center gap-3 border-b border-hair-strong pb-2 font-body text-bone transition-colors hover:border-rose hover:text-rose"
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
              className="group flex min-h-[18rem] flex-col justify-between bg-ink p-8 transition-colors duration-500 hover:bg-carbon"
            >
              <span className="font-display text-5xl text-rose/80 transition-colors group-hover:text-rose">
                {s.n}
              </span>
              <div>
                <h3 className="font-display text-3xl text-bone">{s.title}</h3>
                <p className="mt-4 font-body text-sm leading-relaxed text-mist">
                  {s.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
