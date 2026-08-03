import Link from "next/link";
import { PeakMark } from "@/components/brand/PeakMark";

export default function NotFound() {
  return (
    <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden bg-ink px-6 pt-24 text-center">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.05]">
        <PeakMark className="h-[60vh] w-auto text-rose" strokeWidth={2} />
      </div>
      <div className="relative">
        <p className="eyebrow text-rose">404 — Page not found</p>
        <h1 className="mt-6 font-display display-lg text-bone">
          This address hasn&rsquo;t been built.
        </h1>
        <p className="mx-auto mt-6 max-w-md font-body text-lg text-mist">
          The page you were looking for may have moved, or perhaps it was never
          here. Let&rsquo;s get you back on solid ground.
        </p>
        <Link
          href="/"
          className="group mt-10 inline-flex items-center gap-3 bg-rose px-8 py-4 font-body text-ink transition-colors hover:bg-rose-soft"
        >
          Return home
          <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
        </Link>
      </div>
    </section>
  );
}
