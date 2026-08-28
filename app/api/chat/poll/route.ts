import { NextResponse, type NextRequest } from "next/server";

import { clientIp, isRateLimited } from "@/lib/rate-limit";
import { isChatConfigured } from "@/lib/chat/config";
import { getMessagesAfter, getSessionForVisitor } from "@/lib/chat/store";

/**
 * How a human's reply reaches the visitor.
 *
 * Once an admin switches the AI off for a conversation, nothing the visitor
 * sends produces a reply from /api/chat — the answer is typed by a person in
 * /admin/chat, minutes later. The widget polls here for anything newer than
 * the last message it has.
 *
 * Polling rather than Supabase Realtime, deliberately: Realtime would need the
 * anon key to hold a SELECT grant on chat_messages, which is the one thing the
 * schema refuses to do (any policy wide enough for the visitor's own
 * transcript is wide enough for everyone's). A four-second poll on a single
 * indexed `(session_id, created_at)` range read is cheap, and the widget only
 * runs it while it is open.
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isChatConfigured) {
    return NextResponse.json({ error: "Unavailable." }, { status: 503 });
  }

  const ip = clientIp(request.headers);
  // Generous: an open widget polls roughly 15 times a minute by design, and a
  // visitor may legitimately have the site open in two tabs.
  if (isRateLimited("chat-poll", ip, 90)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const params = request.nextUrl.searchParams;
  const sessionId = params.get("sessionId") ?? "";
  const token = params.get("token") ?? "";
  const after = params.get("after");

  try {
    const session = await getSessionForVisitor(sessionId, token);
    if (!session) {
      return NextResponse.json({ error: "This conversation has expired." }, { status: 404 });
    }

    const messages = await getMessagesAfter(session.id, after);

    return NextResponse.json({
      aiEnabled: session.ai_enabled,
      // 'agent' turns are relabelled 'assistant' on the way out. The visitor is
      // talking to "Makro", and which side of the handover answered is an
      // internal detail — it stays in the database for the transcript, but
      // surfacing it in the widget would be an odd thing to show a customer.
      messages: messages.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
        created_at: m.created_at,
      })),
    });
  } catch (error) {
    console.error("[makro] /api/chat/poll failed:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
