import Reveal from "@/components/anim/Reveal";
import { PeakMark } from "@/components/brand/PeakMark";

export default function ValueCard({
  index,
  title,
  body,
  delay = 0,
}: {
  index: string;
  title: string;
  body: string;
  delay?: number;
}) {
  return (
    <Reveal
      delay={delay}
      className="group flex flex-col border-l border-hair pl-6 transition-colors duration-500 hover:border-rose-deep"
    >
      <div className="flex items-center gap-3">
        <span className="font-body text-xs text-rose-deep">{index}</span>
        <PeakMark className="h-4 w-auto text-rose-deep opacity-50 transition-opacity duration-500 group-hover:opacity-100" strokeWidth={10} />
      </div>
      {/* Titles are set in caps (client copy, Aug 2026). Marcellus caps run
          wide, and at text-3xl "DISCIPLINED" is wider than a quarter column
          at lg — which would wrap one card's heading to two lines and drop
          the whole row out of alignment. */}
      <h3 className="mt-6 font-display text-xl tracking-[0.05em] text-ink md:text-2xl">
        {title}
      </h3>
      <p className="mt-3 font-body text-sm leading-relaxed text-mist">{body}</p>
    </Reveal>
  );
}
