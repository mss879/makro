import type { ReactNode } from "react";
import Link from "next/link";
import NotesPanel from "@/components/admin/NotesPanel";
import ViewsChart, { type TopPage, type ViewDay } from "@/components/admin/ViewsChart";
import {
  Badge,
  Card,
  NotConfigured,
  PageHeading,
  StatCard,
  formatDate,
} from "@/components/admin/ui";
import { createServerSupabase } from "@/lib/supabase/server";
import type {
  BlogPostRow,
  InquiryRow,
  InquiryStatus,
  NoteRow,
  PageViewRow,
  PipelineRow,
  PipelineStageRow,
  SelectedWorkSettingsRow,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

/** Days shown in the chart, and the window the "last 30 days" figures cover. */
const WINDOW_DAYS = 30;
const TOP_PAGE_COUNT = 8;
/** Safety valve: bucketing happens in JS, so cap how much we ever pull back. */
const MAX_VIEW_ROWS = 20_000;
const RECENT_INQUIRY_COUNT = 5;
/** Same idea for the CRM breakdown — one column of stage_ids, never whole leads. */
const MAX_STAGE_LEAD_ROWS = 10_000;

/** Shown wherever a figure could not be read. Never a zero — see `num()`. */
const DASH = "—";

const STATUS_TONE: Record<InquiryStatus, "accent" | "success" | "muted"> = {
  new: "accent",
  transferred: "success",
  archived: "muted",
};

/** Midnight local time, `back` days ago. */
function startOfDay(back = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - back);
  return d;
}

/** Local calendar key — deliberately not toISOString(), which shifts to UTC. */
function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/**
 * A figure that could not be read renders as an em dash rather than "0" — the
 * client reads these tiles as fact, and "0 published articles" is a very
 * different claim from "this tile is broken".
 */
function num(value: number | null) {
  return value === null ? DASH : value.toLocaleString("en-GB");
}

/**
 * PostgREST reports a missing table or a refused policy inside the payload, but
 * a transport failure still rejects. These three wrappers collapse both cases
 * to a safe empty value so a single unreadable card degrades to a dash instead
 * of taking the whole dashboard down with it.
 */
async function tally(query: PromiseLike<{ count: number | null; error: unknown }>) {
  try {
    const { count, error } = await query;
    return error ? null : count;
  } catch {
    return null;
  }
}

async function rows<T>(query: PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  try {
    return (await query).data ?? [];
  } catch {
    return [];
  }
}

async function one<T>(query: PromiseLike<{ data: T | null }>): Promise<T | null> {
  try {
    return (await query).data;
  } catch {
    return null;
  }
}

type ViewSlice = Pick<PageViewRow, "path" | "created_at">;

/** Every day in the window, zeros included, oldest first. */
function bucketByDay(viewRows: ViewSlice[], from: Date): ViewDay[] {
  const counts = new Map<string, number>();
  const days: ViewDay[] = [];

  for (let i = 0; i < WINDOW_DAYS; i += 1) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    const key = dayKey(d);
    counts.set(key, 0);
    days.push({
      key,
      label: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      count: 0,
    });
  }

  for (const row of viewRows) {
    const key = dayKey(new Date(row.created_at));
    const current = counts.get(key);
    // Rows outside the range (clock skew, timezone edges) are simply ignored.
    if (current !== undefined) counts.set(key, current + 1);
  }

  return days.map((day) => ({ ...day, count: counts.get(day.key) ?? 0 }));
}

function topPaths(viewRows: ViewSlice[]): TopPage[] {
  const counts = new Map<string, number>();
  for (const row of viewRows) {
    counts.set(row.path, (counts.get(row.path) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count || a.path.localeCompare(b.path))
    .slice(0, TOP_PAGE_COUNT);
}

/** The label every section on this page is introduced by. */
function SectionHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <h2 className="font-body text-[0.7rem] uppercase tracking-[0.22em] text-panel-faint">{title}</h2>
      {action}
    </div>
  );
}

/**
 * Preview card for one menu item. Deliberately shaped like StatCard — same
 * label, same display figure — so the grid reads as one row of numbers even
 * though several tiles carry a breakdown underneath.
 */
function Tile({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <Link href={href} className="group block">
      <Card className="h-full transition-colors group-hover:border-panel-line-strong">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-body text-[0.7rem] uppercase tracking-[0.22em] text-panel-faint">{label}</p>
          <span className="font-body text-xs text-panel-faint transition-colors group-hover:text-rose">
            →
          </span>
        </div>
        {children}
      </Card>
    </Link>
  );
}

function Figure({ children }: { children: ReactNode }) {
  return <p className="mt-3 font-display text-4xl text-panel-text">{children}</p>;
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="mt-1 font-body text-xs text-panel-faint">{children}</p>;
}

/** Secondary detail, ruled off from the headline figure above it. */
function Detail({ children }: { children: ReactNode }) {
  return <div className="mt-4 border-t border-panel-line pt-3">{children}</div>;
}

export default async function AdminDashboardPage() {
  const supabase = await createServerSupabase();
  if (!supabase) return <NotConfigured />;

  const since1 = startOfDay().toISOString();
  const since7 = startOfDay(6).toISOString();
  const from30 = startOfDay(WINDOW_DAYS - 1);
  const since30 = from30.toISOString();

  const [
    inquiriesNew,
    inquiriesTotal,
    leadsTotal,
    selectedWorkCards,
    blogPublished,
    blogDrafts,
    projectsPublished,
    projectsDrafts,
    subscribers,
    viewsToday,
    views7,
    views30,
    selectedWork,
    latestPost,
    defaultPipeline,
    recentInquiries,
    notes,
    viewRows,
  ] = await Promise.all([
    // head + exact count: the server returns a Content-Range, never any rows.
    tally(supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new")),
    tally(supabase.from("inquiries").select("id", { count: "exact", head: true })),
    tally(supabase.from("leads").select("id", { count: "exact", head: true })),
    tally(
      supabase
        .from("selected_work_cards")
        .select("id", { count: "exact", head: true })
        .eq("published", true)
    ),
    tally(
      supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("published", true)
    ),
    tally(
      supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("published", false)
    ),
    tally(
      supabase.from("projects").select("id", { count: "exact", head: true }).eq("published", true)
    ),
    tally(
      supabase.from("projects").select("id", { count: "exact", head: true }).eq("published", false)
    ),
    tally(supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true })),
    tally(
      supabase.from("page_views").select("id", { count: "exact", head: true }).gte("created_at", since1)
    ),
    tally(
      supabase.from("page_views").select("id", { count: "exact", head: true }).gte("created_at", since7)
    ),
    tally(
      supabase
        .from("page_views")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since30)
    ),
    // Singleton row: a unique index on a constant expression admits exactly one.
    one<Pick<SelectedWorkSettingsRow, "enabled">>(
      supabase.from("selected_work_settings").select("enabled").maybeSingle()
    ),
    one<Pick<BlogPostRow, "title" | "display_title" | "published_on">>(
      supabase
        .from("blog_posts")
        .select("title, display_title, published_on")
        .eq("published", true)
        .order("published_on", { ascending: false })
        .limit(1)
        .maybeSingle()
    ),
    one<Pick<PipelineRow, "id" | "name">>(
      supabase.from("pipelines").select("id, name").eq("is_default", true).maybeSingle()
    ),
    rows<InquiryRow>(
      supabase
        .from("inquiries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(RECENT_INQUIRY_COUNT)
    ),
    rows<NoteRow>(supabase.from("notes").select("*").order("updated_at", { ascending: false })),
    // The only place view rows are actually fetched — the chart and the
    // top-pages list both need them, so one query feeds both.
    rows<ViewSlice>(
      supabase
        .from("page_views")
        .select("path, created_at")
        .gte("created_at", since30)
        .order("created_at", { ascending: false })
        .limit(MAX_VIEW_ROWS)
    ),
  ]);

  // Second wave: the stage breakdown can only be asked for once we know which
  // pipeline is the default one.
  const [stages, stageLeads] = defaultPipeline
    ? await Promise.all([
        rows<Pick<PipelineStageRow, "id" | "name">>(
          supabase
            .from("pipeline_stages")
            .select("id, name")
            .eq("pipeline_id", defaultPipeline.id)
            .order("position", { ascending: true })
            .order("created_at", { ascending: true })
        ),
        // A per-stage head count would be one round trip per stage; one column
        // of uuids for a single pipeline is cheaper than five COUNT queries.
        rows<{ stage_id: string }>(
          supabase
            .from("leads")
            .select("stage_id")
            .eq("pipeline_id", defaultPipeline.id)
            .limit(MAX_STAGE_LEAD_ROWS)
        ),
      ])
    : [[], []];

  const perStage = new Map<string, number>();
  for (const lead of stageLeads) {
    perStage.set(lead.stage_id, (perStage.get(lead.stage_id) ?? 0) + 1);
  }

  const days = bucketByDay(viewRows, from30);
  const topPages = topPaths(viewRows);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12">
      <PageHeading
        title="Dashboard"
        subtitle="Where everything stands right now — enquiry flow, pipeline volume, what is live on the site, and the team's shared scratchpad."
      />

      <section className="flex flex-col gap-4">
        <SectionHead title="Across the panel" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Tile href="/admin/inquiries" label="Inquiries">
            <Figure>{num(inquiriesNew)}</Figure>
            <Hint>New — not yet transferred or archived</Hint>
            <Detail>
              <p className="font-body text-xs text-panel-muted">{num(inquiriesTotal)} received in total</p>
            </Detail>
          </Tile>

          <Tile href="/admin/crm" label="CRM">
            <Figure>{num(leadsTotal)}</Figure>
            <Hint>Leads across every pipeline</Hint>
            {defaultPipeline && stages.length > 0 && (
              <Detail>
                <p className="font-body text-[0.6rem] uppercase tracking-[0.18em] text-panel-faint">
                  {defaultPipeline.name}
                </p>
                <dl className="mt-2 flex flex-col gap-1">
                  {stages.map((stage) => (
                    <div key={stage.id} className="flex items-baseline justify-between gap-3">
                      <dt className="min-w-0 truncate font-body text-xs text-panel-muted">
                        {stage.name}
                      </dt>
                      <dd className="font-body text-xs tabular-nums text-panel-text">
                        {perStage.get(stage.id) ?? 0}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Detail>
            )}
          </Tile>

          <Tile href="/admin/selected-work" label="Selected Work">
            {selectedWork === null ? (
              <>
                <Figure>{DASH}</Figure>
                <Hint>Section state could not be read</Hint>
              </>
            ) : (
              <>
                {/* The on/off state is the whole point of this tile, so it is the
                    display figure — a badge alone is too easy to skim past. */}
                <div className="mt-3 flex items-center gap-3">
                  <span
                    className={`h-3 w-3 shrink-0 ${
                      selectedWork.enabled ? "bg-success" : "bg-danger"
                    }`}
                  />
                  <span className="font-display text-4xl text-panel-text">
                    {selectedWork.enabled ? "On" : "Off"}
                  </span>
                </div>
                <Hint>
                  {selectedWork.enabled
                    ? "Showing on the home page"
                    : "Hidden from the home page"}
                </Hint>
                <Detail>
                  <p className="font-body text-xs text-panel-muted">
                    {num(selectedWorkCards)} published{" "}
                    {selectedWorkCards === 1 ? "card" : "cards"}
                  </p>
                </Detail>
              </>
            )}
          </Tile>

          <Tile href="/admin/blog" label="Blogs">
            <Figure>{num(blogPublished)}</Figure>
            <Hint>
              Published · {num(blogDrafts)} in draft
            </Hint>
            <Detail>
              {latestPost ? (
                <>
                  <p className="truncate font-body text-xs text-panel-muted">
                    {latestPost.display_title || latestPost.title || "Untitled article"}
                  </p>
                  <p className="mt-0.5 font-body text-[0.7rem] text-panel-faint">
                    Latest · {formatDate(latestPost.published_on)}
                  </p>
                </>
              ) : (
                <p className="font-body text-xs text-panel-faint">No published articles yet</p>
              )}
            </Detail>
          </Tile>

          <Tile href="/admin/projects" label="Projects">
            <Figure>{num(projectsPublished)}</Figure>
            <Hint>Published on the public site</Hint>
            <Detail>
              <p className="font-body text-xs text-panel-muted">{num(projectsDrafts)} in draft</p>
            </Detail>
          </Tile>

          <Tile href="/admin/email-list" label="Email List">
            <Figure>{num(subscribers)}</Figure>
            <Hint>Newsletter subscribers</Hint>
          </Tile>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <SectionHead title="Notes" />
        <NotesPanel notes={notes} />
      </section>

      <section className="flex flex-col gap-4">
        <SectionHead
          title="Recent inquiries"
          action={
            <Link
              href="/admin/inquiries"
              className="font-body text-xs text-panel-faint transition-colors hover:text-rose"
            >
              View all →
            </Link>
          }
        />

        <Card>
          {recentInquiries.length === 0 ? (
            <p className="font-body text-sm text-panel-faint">
              Nothing has come through the contact form yet.
            </p>
          ) : (
            <ul className="-my-1 divide-y divide-panel-line">
              {recentInquiries.map((inquiry) => (
                <li key={inquiry.id}>
                  <Link
                    href="/admin/inquiries"
                    className="-mx-2 flex flex-wrap items-center justify-between gap-3 px-2 py-3 transition-colors hover:bg-panel-high"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-body text-sm text-panel-text">
                        {inquiry.name}
                      </span>
                      <span className="block truncate font-body text-xs text-panel-muted">
                        {inquiry.email}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="font-body text-xs text-panel-faint">
                        {formatDate(inquiry.created_at)}
                      </span>
                      <Badge tone={STATUS_TONE[inquiry.status] ?? "neutral"}>
                        {inquiry.status}
                      </Badge>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <SectionHead title="Traffic" />

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Views today" value={num(viewsToday)} hint="Since midnight" />
          <StatCard label="Views · 7 days" value={num(views7)} hint="Rolling week" />
          <StatCard label="Views · 30 days" value={num(views30)} hint="Rolling month" />
        </div>

        <ViewsChart days={days} topPages={topPages} />
      </section>
    </div>
  );
}
