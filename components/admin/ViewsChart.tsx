import { Card } from "@/components/admin/ui";

/**
 * Page-view bar chart + top-paths list, both for the last 30 days.
 *
 * Deliberately dependency-free: the bars are plain divs with percentage
 * heights, so there is no chart library in the bundle and nothing to hydrate —
 * this renders on the server as static markup. Bucketing happens in the page
 * that loads the rows; this component only draws what it is handed.
 */

export interface ViewDay {
  /** Local YYYY-MM-DD, used as the React key. */
  key: string;
  /** Short human label, e.g. "29 Jul". */
  label: string;
  count: number;
}

export interface TopPage {
  path: string;
  count: number;
}

export default function ViewsChart({
  days,
  topPages,
}: {
  days: ViewDay[];
  topPages: TopPage[];
}) {
  const peak = days.reduce((max, day) => Math.max(max, day.count), 0);
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const first = days[0];
  const last = days[days.length - 1];
  const busiest = topPages[0]?.count ?? 0;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="font-body text-[0.7rem] uppercase tracking-[0.22em] text-ink/45">
            Page views · last 30 days
          </p>
          <p className="font-body text-xs text-ink/45">
            {total.toLocaleString("en-GB")} total · peak{" "}
            <span className="text-ink/70">{peak.toLocaleString("en-GB")}</span> in a day
          </p>
        </div>

        <div className="mt-6 flex h-40 items-end gap-[2px]" aria-hidden="true">
          {days.map((day) => {
            const pct = peak > 0 ? (day.count / peak) * 100 : 0;
            return (
              <div
                key={day.key}
                title={`${day.label} · ${day.count} view${day.count === 1 ? "" : "s"}`}
                className="flex h-full flex-1 items-end"
              >
                <div
                  className={`w-full transition-colors ${
                    day.count > 0 ? "bg-ink/70 hover:bg-rose-deep" : "bg-ink/10"
                  }`}
                  style={{ height: day.count > 0 ? `max(2px, ${pct}%)` : "2px" }}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-baseline justify-between border-t border-ink/10 pt-3">
          <span className="font-body text-xs text-ink/45">{first?.label}</span>
          <span className="font-body text-xs text-ink/45">{last?.label}</span>
        </div>

        {/* The bars are decorative; this keeps the numbers available to
            screen readers and to anyone without hover. */}
        <p className="sr-only">
          {days.map((day) => `${day.label}: ${day.count} views.`).join(" ")}
        </p>
      </Card>

      <Card>
        <p className="font-body text-[0.7rem] uppercase tracking-[0.22em] text-ink/45">
          Top pages
        </p>

        {topPages.length === 0 ? (
          <p className="mt-4 font-body text-sm text-ink/45">
            No page views recorded in the last 30 days.
          </p>
        ) : (
          <ol className="mt-4 flex flex-col gap-1">
            {topPages.map((page) => (
              <li key={page.path} className="relative overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-rose-deep/15"
                  style={{ width: `${busiest > 0 ? (page.count / busiest) * 100 : 0}%` }}
                  aria-hidden="true"
                />
                <div className="relative flex items-baseline justify-between gap-3 px-2 py-1.5">
                  <span className="truncate font-body text-sm text-ink/80" title={page.path}>
                    {page.path}
                  </span>
                  <span className="font-body text-xs tabular-nums text-ink/50">
                    {page.count.toLocaleString("en-GB")}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
