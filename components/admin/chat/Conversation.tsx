"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, inputClass, formatDate } from "@/components/admin/ui";
import { sendAgentReply, setAiEnabled } from "@/app/admin/(panel)/chat/actions";
import type { ChatMessageRow } from "@/lib/supabase/types";

/**
 * Transcript, the AI on/off switch, and the box the client types into.
 *
 * Refreshes itself on a timer while open: the visitor is on the other side of
 * this conversation typing in real time, and a transcript that only updates on
 * a manual reload is useless the moment you actually take one over. It calls
 * router.refresh(), so the server component re-queries and React reconciles —
 * no second fetch endpoint, and no client-side copy of the transcript to keep
 * in sync.
 */

const REFRESH_MS = 5000;

export default function Conversation({
  sessionId,
  aiEnabled: initialAiEnabled,
  messages,
}: {
  sessionId: string;
  aiEnabled: boolean;
  messages: ChatMessageRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // useOptimistic rather than mirrored state: the switch has to move the
  // instant it is clicked, but the server prop stays the source of truth.
  // React discards the optimistic value when the transition settles — so a
  // successful toggle lands on the revalidated prop, and a failed one snaps
  // back on its own. Nothing to synchronise, and nothing to revert by hand.
  const [aiEnabled, setOptimisticAi] = useOptimistic(initialAiEnabled);

  useEffect(() => {
    const id = window.setInterval(() => router.refresh(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [router]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const toggleAi = () => {
    const next = !aiEnabled;
    setError(null);
    startTransition(async () => {
      // Must be set INSIDE the transition — an optimistic update outside one
      // has no transition to be discarded with, and React warns.
      setOptimisticAi(next);
      const result = await setAiEnabled(sessionId, next);
      if (!result.ok) setError(result.message);
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = reply.trim();
    if (!text || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await sendAgentReply(sessionId, text);
      if (result.ok) {
        setReply("");
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Takeover control */}
      <div className="flex flex-wrap items-center justify-between gap-4 border border-panel-line bg-panel-raised px-5 py-4">
        <div className="min-w-0">
          <p className="font-body text-sm text-panel-text">
            {aiEnabled ? "The assistant is answering" : "You are answering"}
          </p>
          <p className="mt-1 max-w-xl font-body text-xs leading-relaxed text-panel-muted">
            {aiEnabled
              ? "Switch it off to take this conversation over yourself. The visitor keeps chatting in the same window — their messages will wait here for you."
              : "The assistant will not reply to this visitor. Anything you send below appears in their chat window within a few seconds."}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={aiEnabled}
          aria-label="Assistant replies to this conversation"
          onClick={toggleAi}
          disabled={pending}
          className={`relative inline-flex h-9 w-[4.5rem] shrink-0 items-center border transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            aiEnabled ? "border-rose bg-rose" : "border-panel-line-strong bg-panel-high"
          }`}
        >
          <span
            aria-hidden="true"
            className={`absolute top-1 h-7 w-8 transition-all ${
              aiEnabled ? "left-[2.125rem] bg-ink" : "left-1 bg-panel-faint"
            }`}
          />
        </button>
      </div>

      {/* Transcript */}
      <div
        ref={scroller}
        className="flex max-h-[32rem] flex-col gap-3 overflow-y-auto border border-panel-line bg-panel-raised p-5"
      >
        {messages.length === 0 ? (
          <p className="py-8 text-center font-body text-sm text-panel-faint">
            Nothing has been said yet.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.role !== "user";
            return (
              <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                <div className="max-w-[80%]">
                  <p
                    className={`px-3.5 py-2.5 font-body text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-panel-high text-panel-text"
                        : m.role === "agent"
                          ? "bg-rose text-ink"
                          : "border border-panel-line bg-panel text-panel-text"
                    }`}
                  >
                    {m.content}
                  </p>
                  <p
                    className={`mt-1 font-body text-[0.65rem] text-panel-faint ${
                      mine ? "text-right" : ""
                    }`}
                  >
                    {m.role === "user"
                      ? "Visitor"
                      : m.role === "agent"
                        ? "You"
                        : "Assistant"}{" "}
                    · {formatDate(m.created_at, true)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reply */}
      <form onSubmit={submit} className="flex flex-col gap-3">
        {aiEnabled && (
          <p className="font-body text-xs text-panel-faint">
            The assistant is still on. Your reply will be sent, but it will keep answering
            too — switch it off above if you want the conversation to yourself.
          </p>
        )}
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={3}
          maxLength={8000}
          placeholder="Reply to this visitor…"
          aria-label="Your reply"
          className={`${inputClass} resize-y`}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending || !reply.trim()} className={buttonClass("primary")}>
            {pending ? "Sending…" : "Send reply"}
          </button>
          {error && (
            <span role="alert" className="font-body text-sm text-danger">
              {error}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
