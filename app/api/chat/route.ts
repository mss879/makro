import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { clientIp, isRateLimited } from "@/lib/rate-limit";
import { isChatConfigured, MAX_MESSAGE_LENGTH } from "@/lib/chat/config";
import {
  appendMessage,
  createSession,
  getHistory,
  getSessionForVisitor,
  type ChatTurn,
} from "@/lib/chat/store";
import { runAgent } from "@/lib/chat/agent";

/**
 * The widget's one write endpoint: send a message, get the reply.
 *
 * Auth is the (sessionId, token) pair — see lib/chat/store.ts. A request with
 * no session starts one; a request with a session that does not match its
 * token is treated as if the session did not exist.
 *
 * When the conversation has been taken over by a human (`ai_enabled = false`)
 * this still accepts and stores the visitor's message — it simply does not
 * call the model. The visitor's reply then arrives through the poll route.
 */

export const dynamic = "force-dynamic";

/** Same cookieless daily hash the page-view collector uses. */
function visitorHash(request: NextRequest): string {
  const ip = clientIp(request.headers);
  const ua = request.headers.get("user-agent") ?? "";
  const salt = process.env.PAGEVIEW_HASH_SALT ?? "makro-dev-salt";
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${ip}${ua}${salt}${day}`).digest("hex").slice(0, 32);
}

export async function POST(request: NextRequest) {
  if (!isChatConfigured) {
    return NextResponse.json(
      { error: "The assistant is not available right now." },
      { status: 503 }
    );
  }

  const ip = clientIp(request.headers);
  // 20 messages a minute is far above a human typing pace and far below what
  // it takes to run up a bill. Unlike the page-view limiter this answers
  // honestly with a 429: the visitor is in a conversation and silence would
  // read as the widget being broken.
  if (isRateLimited("chat", ip, 20)) {
    return NextResponse.json(
      { error: "You are sending messages very quickly — give it a moment." },
      { status: 429 }
    );
  }

  let body: { sessionId?: unknown; token?: unknown; message?: unknown; path?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "Say something first." }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Please keep it under ${MAX_MESSAGE_LENGTH} characters.` },
      { status: 400 }
    );
  }

  try {
    const hasSession = typeof body.sessionId === "string" && typeof body.token === "string";

    const session = hasSession
      ? await getSessionForVisitor(body.sessionId as string, body.token as string)
      : await createSession({
          visitor: visitorHash(request),
          startedPath: typeof body.path === "string" ? body.path.slice(0, 512) : null,
        });

    // Unknown id, or a token that does not match it. Answering 404 for both
    // means probing session ids tells an attacker nothing.
    if (!session) {
      return NextResponse.json({ error: "This conversation has expired." }, { status: 404 });
    }

    await appendMessage(session.id, "user", message);

    // Taken over by a human: store and stop. The client is now the one
    // replying, from /admin/chat.
    if (!session.ai_enabled) {
      return NextResponse.json({
        sessionId: session.id,
        token: session.token,
        aiEnabled: false,
        messages: [] as ChatTurn[],
      });
    }

    const history = await getHistory(session.id);
    const reply = await runAgent(session, history);

    if (reply.captureError) {
      // Worth a server log even though the visitor is answered gracefully —
      // a lead that failed to save is a lost sale, not a cosmetic problem.
      console.error("[makro] Chat lead capture failed:", reply.captureError);
    }

    // A model that returns nothing but a tool call would otherwise leave the
    // visitor staring at their own message.
    const text =
      reply.text ||
      "Thank you — one of the team will follow up. In the meantime, is there anything else I can help with?";

    const stored = await appendMessage(session.id, "assistant", text);

    return NextResponse.json({
      sessionId: session.id,
      token: session.token,
      aiEnabled: true,
      messages: [
        { role: stored.role, content: stored.content, created_at: stored.created_at },
      ] satisfies ChatTurn[],
    });
  } catch (error) {
    console.error("[makro] /api/chat failed:", error);
    return NextResponse.json(
      { error: "Something went wrong on our side. Please try again." },
      { status: 500 }
    );
  }
}
