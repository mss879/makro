import * as React from "react";

/**
 * Admin UI primitives.
 *
 * The admin panel borrows the brand palette but not the marketing site's
 * motion or editorial scale — it is a tool, so density and legibility win.
 * Everything here is a plain server-safe component; interactivity lives in
 * the feature components that use them.
 */

export function PageHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/10 pb-6">
      <div>
        <h1 className="font-display text-3xl text-ink md:text-4xl">{title}</h1>
        {subtitle && (
          <p className="mt-2 max-w-2xl font-body text-sm text-ink/55">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`border border-ink/10 bg-white/70 p-5 ${className}`}>{children}</div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card>
      <p className="font-body text-[0.7rem] uppercase tracking-[0.22em] text-ink/45">
        {label}
      </p>
      <p className="mt-3 font-display text-4xl text-ink">{value}</p>
      {hint && <p className="mt-1 font-body text-xs text-ink/45">{hint}</p>}
    </Card>
  );
}

const BUTTON_VARIANTS = {
  primary: "bg-ink text-cream hover:bg-rose-deep hover:text-ink",
  secondary: "border border-ink/20 text-ink hover:border-rose-deep hover:text-rose-deep",
  danger: "border border-red-300 text-red-700 hover:bg-red-50",
  ghost: "text-ink/60 hover:text-ink",
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;

export function buttonClass(variant: ButtonVariant = "primary", extra = "") {
  return `inline-flex items-center justify-center gap-2 px-4 py-2 font-body text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_VARIANTS[variant]} ${extra}`;
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-body text-[0.7rem] uppercase tracking-[0.22em] text-ink/45">
        {label}
      </span>
      <div className="mt-2">{children}</div>
      {hint && <p className="mt-1.5 font-body text-xs text-ink/45">{hint}</p>}
    </label>
  );
}

export const inputClass =
  "w-full border border-ink/15 bg-white px-3 py-2 font-body text-sm text-ink outline-none transition-colors placeholder:text-ink/30 focus:border-rose-deep";

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border border-dashed border-ink/15 px-6 py-16 text-center">
      <p className="font-display text-xl text-ink">{title}</p>
      {body && <p className="mx-auto mt-2 max-w-md font-body text-sm text-ink/50">{body}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "muted" | "success";
}) {
  const tones = {
    neutral: "border-ink/20 text-ink/70",
    accent: "border-rose-deep/50 bg-rose-deep/10 text-rose-deep",
    muted: "border-ink/10 text-ink/40",
    success: "border-emerald-300 bg-emerald-50 text-emerald-700",
  } as const;
  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 font-body text-[0.65rem] uppercase tracking-[0.14em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Shown wherever the panel needs credentials that are not in .env.local yet. */
export function NotConfigured() {
  return (
    <div className="border border-amber-300 bg-amber-50 px-6 py-10 text-center">
      <p className="font-display text-xl text-ink">Supabase is not connected yet</p>
      <p className="mx-auto mt-3 max-w-lg font-body text-sm text-ink/60">
        Add <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and{" "}
        <code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code> to{" "}
        <code className="font-mono text-xs">.env.local</code>, apply every file in{" "}
        <code className="font-mono text-xs">supabase/migrations/</code> in filename order in
        the Supabase SQL editor, then restart the dev server.
      </p>
    </div>
  );
}

/** Formats a timestamp the way the panel shows dates everywhere. */
export function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}
