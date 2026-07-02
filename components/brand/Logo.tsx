import Link from "next/link";
import { PeakMark } from "./PeakMark";

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
      className={`group inline-flex items-center gap-3 ${className}`}
    >
      <PeakMark
        className="h-7 w-auto text-bone transition-colors duration-500 group-hover:text-rose"
        strokeWidth={9}
      />
      <span className={stacked ? "flex flex-col leading-none" : "flex items-baseline gap-2"}>
        <span className="font-body text-[0.95rem] font-semibold uppercase tracking-[0.34em] text-bone">
          Makro
        </span>
        <span className="font-body text-[0.62rem] uppercase tracking-[0.42em] text-mist">
          Developers
        </span>
      </span>
    </Link>
  );
}

export default Logo;
