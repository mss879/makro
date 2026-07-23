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
      className="group relative flex flex-col justify-between gap-10 border border-hair bg-ink p-8 transition-colors duration-500 hover:bg-carbon"
    >
      {/* Deliberately dark card — explicit inner colours so it renders
          identically inside both dark and `.section-light` sections. */}
      <div className="flex items-center justify-between">
        <span className="font-body text-xs text-white/40">{index}</span>
        <PeakMark className="h-5 w-auto text-rose opacity-60 transition-opacity duration-500 group-hover:opacity-100" strokeWidth={10} />
      </div>
      <div>
        <h3 className="font-display text-3xl text-bone">{title}</h3>
        <p className="mt-4 font-body text-sm leading-relaxed text-white/60">{body}</p>
      </div>
    </Reveal>
  );
}
