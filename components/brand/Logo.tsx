import Link from "next/link";
import { PeakMark } from "./PeakMark";

/**
 * Drawn brand lockup — twin-peak mark beside the letterspaced wordmark.
 * Tone-agnostic: every part inherits `currentColor`, so the caller sets the
 * colour (`text-ink` on paper, `text-bone` on dark) and the secondary word
 * steps back on opacity rather than a hardcoded grey.
 */
export function Logo({
  className = "",
  onClick,
  stacked = false,
}: {
  className?: string;
  onClick?: () => void;
  stacked?: boolean;
}) {
  return (
    <Link
      href="/"
      onClick={onClick}
      aria-label="Makro Developers — home"
      className={`inline-flex items-center gap-2.5 transition-opacity duration-500 hover:opacity-70 md:gap-3 ${className}`}
    >
      <PeakMark
        className="h-[19px] w-auto text-current md:h-[22px]"
        strokeWidth={9}
      />
      <span className={stacked ? "flex flex-col gap-1 leading-none" : "flex items-baseline gap-2"}>
        <span className="font-body text-[0.8rem] font-semibold uppercase leading-none tracking-[0.3em] text-current md:text-[0.95rem] md:tracking-[0.34em]">
          Makro
        </span>
        <span className="font-body text-[0.55rem] uppercase leading-none tracking-[0.28em] text-current opacity-60 md:text-[0.62rem] md:tracking-[0.36em]">
          Developers
        </span>
      </span>
    </Link>
  );
}

export default Logo;
