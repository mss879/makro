import type { Metadata } from "next";
import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { Badge, EmptyState, NotConfigured, PageHeading, formatDate } from "@/components/admin/ui";
import type { ChatSessionRow } from "@/lib/supabase/types";
import { isChatConfigured } from "@/lib/chat/config";

export const metadata: Metadata = { title: "Chat" };

export const dynamic = "force-dynamic";

/** How many conversations the list holds. Older ones stay in the database. */
const LIMIT = 200;

type SessionWithCount = ChatSessionRow & {
  chat_messages: { count: number }[];
};

export default async function ChatPage() {
  const supabase = await createServerSupabase();

  if (!supabase) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeading
          title="Chat"
          subtitle="Every conversation visitors have had with the assistant on the website."
        />
        <NotConfigured />
      </div>
    );
  }

  // The message count comes back as an aggregate on the embedded relation
  // rather than a second query per row — 200 conversations would otherwise be
  // 201 round trips.
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*, chat_messages(count)")
    .order("last_message_at", { ascending: false })
    .limit(LIMIT);

  if (error) {
    console.error("[makro] Failed to load chat sessions:", error.message);
  }

  const sessions = (data ?? []) as unknown as SessionWithCount[];

  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        title="Chat"
        subtitle="Every conversation visitors have had with the assistant, newest first. Open one to read it, reply yourself, or switch the assistant off for that visitor."
      />

      {error && (
        <p
          role="alert"
          className="border border-danger-line bg-danger-soft px-4 py-3 font-body text-sm text-danger"
        >
          The conversations could not be loaded: {error.message}
        </p>
      )}

      {/* Without this the screen just sits empty and the client is left
          guessing whether nobody has chatted or the assistant is switched off
          at the source. */}
      {!isChatConfigured && (
        <div className="border border-warning-line bg-warning-soft px-5 py-4">
          <p className="font-body text-sm text-panel-text">
            The assistant is not running, so the widget is hidden on the website.
          </p>
          <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-panel-muted">
            It needs <code className="font-mono text-xs">OPENAI_API_KEY</code> and{" "}
            <code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code> in the
            deployment environment. Conversations already recorded are still listed below.
          </p>
        </div>
      )}

      {sessions.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          body="As soon as someone chats with the assistant on the website, the whole conversation will appear here."
        />
      ) : (
        <div className="overflow-x-auto border border-panel-line">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-panel-line bg-panel-raised">
                {["Last active", "Visitor", "Started on", "Messages", "Status"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 font-body text-[0.65rem] uppercase tracking-[0.18em] text-panel-faint"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const count = s.chat_messages?.[0]?.count ?? 0;
                return (
                  <tr
                    key={s.id}
                    className="border-b border-panel-line transition-colors last:border-b-0 hover:bg-panel-high"
                  >
                    <td className="px-4 py-3 align-middle">
                      <Link
                        href={`/admin/chat/${s.id}`}
                        className="font-body text-sm text-panel-text transition-colors hover:text-rose"
                      >
                        {formatDate(s.last_message_at, true)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-middle font-body text-sm text-panel-text">
                      {s.name ? (
                        <>
                          {s.name}
                          {s.phone && (
                            <span className="ml-2 text-panel-faint">{s.phone}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-panel-faint">Anonymous</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle font-body text-sm text-panel-muted">
                      {s.started_path ?? "—"}
                    </td>
                    <td className="px-4 py-3 align-middle font-body text-sm tabular-nums text-panel-muted">
                      {count}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex flex-wrap items-center gap-2">
                        {s.lead_id && <Badge tone="success">Lead</Badge>}
                        {s.ai_enabled ? (
                          <Badge tone="muted">AI on</Badge>
                        ) : (
                          <Badge tone="accent">You</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
