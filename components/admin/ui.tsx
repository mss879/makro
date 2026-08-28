import * as React from "react";

/**
 * Admin UI primitives.
 *
 * The admin panel borrows the brand palette but not the marketing site's
 * motion or editorial scale — it is a tool, so density and legibility win.
 * Everything here is a plain server-safe component; interactivity lives in
 * the feature components that use them.
 *
 * COLOUR: use the `panel-*` role tokens (see the admin block in
 * app/globals.css) — never `ink`/`cream`/`white` or an opacity modifier on
 * them. Tailwind folds `text-ink/45` to a static hex at build time, so a
 * component written that way is nailed to one theme and cannot follow the
 * panel. Status colours have role tokens too: danger / success / warning,
 * each with a `-line` and `-soft` companion.
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
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-panel-line pb-6">
      <div>
        <h1 className="font-display text-3xl text-panel-text md:text-4xl">{title}</h1>
        {subtitle && (
          <p className="mt-2 max-w-2xl font-body text-sm text-panel-muted">{subtitle}</p>
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
    <div className={`border border-panel-line bg-panel-raised p-5 ${className}`}>{children}</div>
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
      <p className="font-body text-[0.7rem] uppercase tracking-[0.22em] text-panel-faint">
        {label}
      </p>
      <p className="mt-3 font-display text-4xl text-panel-text">{value}</p>
      {hint && <p className="mt-1 font-body text-xs text-panel-faint">{hint}</p>}
    </Card>
  );
}

const BUTTON_VARIANTS = {
  primary: "bg-rose text-ink hover:bg-rose-soft",
  secondary: "border border-panel-line-strong text-panel-text hover:border-rose hover:text-rose",
  danger: "border border-danger-line text-danger hover:bg-danger-soft",
  ghost: "text-panel-muted hover:text-panel-text",
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
      <span className="font-body text-[0.7rem] uppercase tracking-[0.22em] text-panel-faint">
        {label}
      </span>
      <div className="mt-2">{children}</div>
      {hint && <p className="mt-1.5 font-body text-xs text-panel-faint">{hint}</p>}
    </label>
  );
}

export const inputClass =
  "w-full border border-panel-line bg-panel-raised px-3 py-2 font-body text-sm text-panel-text outline-none transition-colors placeholder:text-panel-faint focus:border-rose";

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
    <div className="border border-dashed border-panel-line px-6 py-16 text-center">
      <p className="font-display text-xl text-panel-text">{title}</p>
      {body && <p className="mx-auto mt-2 max-w-md font-body text-sm text-panel-muted">{body}</p>}
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
    neutral: "border-panel-line-strong text-panel-muted",
    accent: "border-rose/50 bg-rose/15 text-rose",
    muted: "border-panel-line text-panel-faint",
    success: "border-success-line bg-success-soft text-success",
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
    <div className="border border-warning-line bg-warning-soft px-6 py-10 text-center">
      <p className="font-display text-xl text-panel-text">Supabase is not connected yet</p>
      <p className="mx-auto mt-3 max-w-lg font-body text-sm text-panel-muted">
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
