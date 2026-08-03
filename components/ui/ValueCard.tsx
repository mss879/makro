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
      <h3 className="mt-6 font-display text-2xl text-ink md:text-3xl">{title}</h3>
      <p className="mt-4 font-body text-sm leading-relaxed text-mist">{body}</p>
    </Reveal>
  );
}
