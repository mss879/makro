"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PeakMark } from "@/components/brand/PeakMark";

/**
 * The Makro Assistant — a floating chat panel on every public page.
 *
 * State lives in three places and each has a reason:
 *  - `sessionId` + `token` in localStorage, so a visitor who navigates or comes
 *    back later continues the same conversation (and so a human's reply is
 *    still reachable). The token is the credential; see lib/chat/store.ts.
 *  - `messages` in React, hydrated from the server on open.
 *  - Nothing in a cookie, so the widget adds no request weight to page loads.
 *
 * POLLING: only runs while the panel is OPEN and the conversation has been
 * taken over by a human. While the AI is answering, replies come back on the
 * POST itself and a poll would be pure waste.
 */

const STORAGE_KEY = "makro-chat";
const POLL_MS = 4000;

interface Turn {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

const OPENER: Turn = {
  role: "assistant",
  content:
    "Hello — I'm the Makro Assistant. Ask me anything about our developments, how we build, or the buying process.",
};

type Stored = { sessionId: string; token: string };

function readStored(): Stored | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Stored>;
    return parsed.sessionId && parsed.token
      ? { sessionId: parsed.sessionId, token: parsed.token }
      : null;
  } catch {
    // Private mode, disabled storage, or a corrupted value. The conversation
    // just starts fresh — never let this throw and take the widget with it.
    return null;
  }
}

function writeStored(value: Stored) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* see readStored */
  }
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Turn[]>([OPENER]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiEnabled, setAiEnabled] = useState(true);

  const session = useRef<Stored | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // The high-water mark for polling. A ref, not state: it is written from
  // inside the poll and must not re-trigger the effect that owns the poll.
  const lastAt = useRef<string | null>(null);
  // Transcript is fetched once per mount, on first open.
  const hydrated = useRef(false);

  useEffect(() => {
    session.current = readStored();
  }, []);

  const scrollToEnd = useCallback(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    if (open) scrollToEnd();
  }, [messages, open, scrollToEnd]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Close on Escape, the way every other dismissible surface on the site does.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /**
   * Advances the poll high-water mark past EVERY message the server returned,
   * then renders only the ones the visitor has not already seen.
   *
   * The two halves have to be separate. The visitor's own messages are echoed
   * optimistically the moment they are sent, so re-rendering them from a poll
   * would double them up — but if the mark only advanced over the messages we
   * chose to render, every subsequent poll would keep re-fetching the
   * visitor's turns forever.
   */
  const absorb = useCallback((incoming: Turn[], render: Turn[]) => {
    const newest = incoming[incoming.length - 1]?.created_at;
    if (newest) lastAt.current = newest;
    if (render.length > 0) setMessages((prev) => [...prev, ...render]);
  }, []);

  /**
   * Loads the existing transcript when the panel is opened.
   *
   * Two jobs, and the second is not obvious. The visible one: someone who
   * reloads the page mid-conversation should see it, not a blank panel with
   * their history stranded in the database. The load-bearing one: this is what
   * seeds `lastAt`. Without it the first human-takeover poll runs with no
   * `after` bound, fetches the whole conversation, and appends a second copy
   * of every reply underneath the first.
   */
  useEffect(() => {
    if (!open || hydrated.current || !session.current) return;
    hydrated.current = true;

    const s = session.current;
    void (async () => {
      try {
        const params = new URLSearchParams({ sessionId: s.sessionId, token: s.token });
        const res = await fetch(`/api/chat/poll?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        const history: Turn[] = data.messages ?? [];
        if (history.length === 0) return;
        lastAt.current = history[history.length - 1]?.created_at ?? null;
        setAiEnabled(Boolean(data.aiEnabled));
        setMessages([OPENER, ...history]);
      } catch {
        /* a failed hydrate just leaves the opener — the chat still works */
      }
    })();
  }, [open]);

  // Human-takeover poll. Deliberately narrow: open panel + AI off + a session.
  useEffect(() => {
    if (!open || aiEnabled || !session.current) return;

    let cancelled = false;
    const tick = async () => {
      const s = session.current;
      if (!s) return;
      try {
        const params = new URLSearchParams({ sessionId: s.sessionId, token: s.token });
        if (lastAt.current) params.set("after", lastAt.current);
        const res = await fetch(`/api/chat/poll?${params}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setAiEnabled(Boolean(data.aiEnabled));
        const incoming: Turn[] = data.messages ?? [];
        absorb(incoming, incoming.filter((m) => m.role === "assistant"));
      } catch {
        /* a dropped poll is not worth surfacing — the next tick retries */
      }
    };

    const id = window.setInterval(tick, POLL_MS);
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [open, aiEnabled, absorb]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setError(null);
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId: session.current?.sessionId,
          token: session.current?.token,
          path: window.location.pathname,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 404) {
        // The stored session is gone (deleted from the admin panel, or the
        // database was reset). Drop it and let the next message start a new
        // one rather than failing forever on a dead id.
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
        session.current = null;
        setError("That conversation expired. Send your message again to start a new one.");
        return;
      }

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      if (data.sessionId && data.token) {
        session.current = { sessionId: data.sessionId, token: data.token };
        writeStored(session.current);
        // This conversation is now live in this tab; there is nothing on the
        // server we have not already rendered, so never re-fetch it as history.
        hydrated.current = true;
      }

      setAiEnabled(Boolean(data.aiEnabled));
      const replies: Turn[] = data.messages ?? [];
      absorb(replies, replies);

      // Nothing came back because a human owns this conversation now.
      if (data.aiEnabled === false) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Thanks — one of our team is picking this up and will reply here shortly.",
          },
        ]);
      }
    } catch {
      setError("We could not reach the assistant. Please check your connection.");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sending, absorb]);

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="makro-chat-panel"
        aria-label={open ? "Close the Makro Assistant" : "Chat with the Makro Assistant"}
        className={`fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full shadow-[0_18px_40px_-12px_rgba(5,2,3,0.7)] transition-all duration-300 md:bottom-7 md:right-7 ${
          open
            ? "bg-bone text-ink hover:bg-rose-soft"
            : "bg-rose text-ink hover:bg-rose-soft"
        }`}
      >
        {open ? (
          <span aria-hidden="true" className="text-xl leading-none">
            ×
          </span>
        ) : (
          <PeakMark className="h-5 w-auto" strokeWidth={9} />
        )}
      </button>

      {/* Panel */}
      <div
        id="makro-chat-panel"
        role="dialog"
        aria-label="Makro Assistant"
        aria-modal="false"
        hidden={!open}
        className="fixed bottom-24 right-5 z-[59] flex h-[min(32rem,calc(100svh-8rem))] w-[min(24rem,calc(100vw-2.5rem))] flex-col border border-hair bg-ink shadow-[0_30px_70px_-20px_rgba(5,2,3,0.85)] md:bottom-28 md:right-7"
      >
        <header className="flex items-center gap-3 border-b border-hair px-5 py-4">
          <PeakMark className="h-4 w-auto text-rose" strokeWidth={10} />
          <div className="min-w-0">
            <p className="font-body text-sm text-bone">Makro Assistant</p>
            <p className="font-body text-[0.7rem] text-mist">
              {aiEnabled ? "Usually replies instantly" : "A team member is replying"}
            </p>
          </div>
        </header>

        <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.map((m, i) => (
            <div
              key={`${i}-${m.created_at ?? ""}`}
              className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={`max-w-[85%] px-3.5 py-2.5 font-body text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-rose text-ink"
                    : "border border-hair bg-ink-700 text-bone/90"
                }`}
              >
                {m.role === "user" ? (
                  m.content
                ) : (
                  // Replies are short and conversational, but the model does
                  // reach for the occasional bold phrase or two-item list and
                  // raw asterisks in a chat bubble look broken.
                  <div className="chat-prose">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start" aria-live="polite">
              <div className="flex gap-1.5 border border-hair bg-ink-700 px-3.5 py-3">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose"
                    style={{ animationDelay: `${i * 160}ms` }}
                  />
                ))}
                <span className="sr-only">The assistant is typing.</span>
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="font-body text-xs text-rose-soft">
              {error}
            </p>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="border-t border-hair p-3"
        >
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends, Shift+Enter breaks the line — what people expect
                // of a chat box, and the reason this is a textarea not an input.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder="Ask about our developments…"
              aria-label="Your message"
              className="max-h-28 min-h-[2.5rem] flex-1 resize-none border border-hair bg-ink-700 px-3 py-2 font-body text-sm text-bone outline-none transition-colors placeholder:text-mist focus:border-rose"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center bg-rose text-ink transition-colors hover:bg-rose-soft disabled:cursor-not-allowed disabled:opacity-40"
            >
              →
            </button>
          </div>
          <p className="mt-2 px-0.5 font-body text-[0.65rem] leading-snug text-mist">
            An AI assistant. It can make mistakes — confirm anything important with the team.
          </p>
        </form>
      </div>
    </>
  );
}
