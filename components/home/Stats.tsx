import AnimatedNumber from "@/components/anim/AnimatedNumber";
import Reveal from "@/components/anim/Reveal";

const STATS = [
  { value: 6, suffix: "+", label: "Years of proven delivery" },
  { value: 6, suffix: "", label: "Signature developments" },
  { value: 200, suffix: "+", label: "Homes & spaces created" },
  { value: 100, suffix: "%", label: "Backed by an established group" },
];

export default function Stats() {
  // Deliberately a BLACK band: it breaks up the white run between the
  // brand statement and services, keeping the page black-led per the
  // brand's 70/20/10 ratio.
  return (
    <section className="relative border-y border-hair bg-ink">
      <div className="container-edge grid grid-cols-2 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <Reveal
            key={s.label}
            delay={i * 0.08}
            className={`flex flex-col justify-center gap-4 py-14 md:py-20 ${
              i !== 0 ? "lg:border-l lg:border-hair" : ""
            } ${i % 2 !== 0 ? "border-l border-hair lg:border-l" : ""} ${
              i >= 2 ? "border-t border-hair lg:border-t-0" : ""
            } px-5 md:px-10`}
          >
            <div className="flex items-baseline gap-1 font-display text-5xl text-bone md:text-7xl">
              <AnimatedNumber value={s.value} />
              <span className="text-rose">{s.suffix}</span>
            </div>
            <p className="max-w-[14rem] font-body text-sm leading-relaxed text-mist">
              {s.label}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
