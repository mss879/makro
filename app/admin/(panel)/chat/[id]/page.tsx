import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Badge, Card, NotConfigured, PageHeading, formatDate } from "@/components/admin/ui";
import Conversation from "@/components/admin/chat/Conversation";
import type { ChatMessageRow, ChatSessionRow } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Conversation" };

export const dynamic = "force-dynamic";

export default async function ChatSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  if (!supabase) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeading title="Conversation" />
        <NotConfigured />
      </div>
    );
  }

  const { data: session } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!session) notFound();

  const { data: messageRows } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  const chat = session as ChatSessionRow;
  const messages = (messageRows ?? []) as ChatMessageRow[];

  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        title={chat.name ?? "Anonymous visitor"}
        subtitle={`Started ${formatDate(chat.created_at, true)}${
          chat.started_path ? ` on ${chat.started_path}` : ""
        }.`}
        action={
          <Link
            href="/admin/chat"
            className="font-body text-sm text-panel-muted transition-colors hover:text-rose"
          >
            ← All conversations
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Conversation
            sessionId={chat.id}
            aiEnabled={chat.ai_enabled}
            messages={messages}
          />
        </div>

        <aside className="flex flex-col gap-4">
          <Card>
            <p className="font-body text-[0.7rem] uppercase tracking-[0.22em] text-panel-faint">
              Contact
            </p>
            <dl className="mt-4 flex flex-col gap-3">
              {[
                ["Name", chat.name],
                ["Phone", chat.phone],
                ["Email", chat.email],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="font-body text-xs text-panel-faint">{label}</dt>
                  <dd className="mt-0.5 font-body text-sm text-panel-text">
                    {value || <span className="text-panel-faint">Not given</span>}
                  </dd>
                </div>
              ))}
            </dl>

            {/* The whole point of the agent. If a conversation produced a lead,
                this is the jump straight to it in the pipeline. */}
            <div className="mt-5 border-t border-panel-line pt-4">
              {chat.lead_id ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone="success">Lead created</Badge>
                  <Link
                    href="/admin/crm"
                    className="font-body text-sm text-rose underline underline-offset-4"
                  >
                    Open the CRM
                  </Link>
                </div>
              ) : (
                <p className="font-body text-sm text-panel-faint">
                  No lead captured from this conversation yet.
                </p>
              )}
            </div>
          </Card>

          <Card>
            <p className="font-body text-[0.7rem] uppercase tracking-[0.22em] text-panel-faint">
              Session
            </p>
            <dl className="mt-4 flex flex-col gap-3">
              {[
                ["Started on", chat.started_path ?? "—"],
                ["First message", formatDate(chat.created_at, true)],
                ["Last active", formatDate(chat.last_message_at, true)],
                ["Messages", String(messages.length)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="font-body text-xs text-panel-faint">{label}</dt>
                  <dd className="mt-0.5 font-body text-sm text-panel-text">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  );
}
