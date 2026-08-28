"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabase, requireUser } from "@/lib/supabase/server";

/**
 * Admin actions for the Chat screen.
 *
 * Every export opens with `await requireUser()` — the proxy gate at /admin is
 * optimistic, so a matcher change must never be able to unprotect a mutation.
 * These run on the COOKIE-BOUND client, unlike the visitor-facing chat API
 * which needs the service role; here there is a real session and RLS's
 * "admin full access" policy is the gate.
 *
 * Module rule: a "use server" file may only export async functions, so the
 * result shape is a type and the schemas stay module-private.
 */

export type ChatActionState = {
  ok: boolean;
  message: string;
};

const idSchema = z.uuid();
const replySchema = z.string().trim().min(1).max(8000);

function refresh(sessionId?: string) {
  revalidatePath("/admin/chat");
  if (sessionId) revalidatePath(`/admin/chat/${sessionId}`);
}

/**
 * The AI on/off switch.
 *
 * Per conversation, never global — the client wants to step into one chat
 * while the agent keeps handling every other visitor on the site. Turning it
 * off does not end the conversation: /api/chat keeps accepting and storing the
 * visitor's messages, it just stops calling the model, and whatever is typed
 * below appears in the visitor's widget on its next poll.
 *
 * Turning it back ON is safe at any point. The agent replays the transcript
 * with the human's turns mapped onto assistant turns, so it picks up knowing
 * what was already said rather than contradicting it.
 */
export async function setAiEnabled(
  sessionId: string,
  enabled: boolean
): Promise<ChatActionState> {
  await requireUser();

  const parsed = idSchema.safeParse(sessionId);
  if (!parsed.success) return { ok: false, message: "Unknown conversation." };

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: "Supabase is not configured." };

  const { error } = await supabase
    .from("chat_sessions")
    .update({ ai_enabled: enabled })
    .eq("id", parsed.data);

  if (error) return { ok: false, message: error.message };

  refresh(parsed.data);
  return {
    ok: true,
    message: enabled ? "The assistant is answering again." : "You are answering this conversation.",
  };
}

/**
 * Sends a human reply into a visitor's chat.
 *
 * Stored as role 'agent' so the transcript records who actually answered. The
 * visitor's widget relabels it 'assistant' on the way out — from their side
 * they are talking to Makro, and which of us typed it is our business.
 *
 * Deliberately allowed while the AI is still on. Blocking it would make the
 * common case — jump in with one clarification, leave the agent running —
 * a two-step dance for no safety benefit; the UI warns instead.
 */
export async function sendAgentReply(
  sessionId: string,
  content: string
): Promise<ChatActionState> {
  await requireUser();

  const id = idSchema.safeParse(sessionId);
  if (!id.success) return { ok: false, message: "Unknown conversation." };

  const body = replySchema.safeParse(content);
  if (!body.success) return { ok: false, message: "Write a reply first." };

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: "Supabase is not configured." };

  const { data: message, error } = await supabase
    .from("chat_messages")
    .insert({ session_id: id.data, role: "agent", content: body.data })
    .select("created_at")
    .single();

  if (error || !message) {
    return { ok: false, message: error?.message ?? "The reply could not be sent." };
  }

  // Keeps the conversation at the top of the list, same as a visitor message.
  await supabase
    .from("chat_sessions")
    .update({ last_message_at: message.created_at })
    .eq("id", id.data);

  refresh(id.data);
  return { ok: true, message: "Sent." };
}

/**
 * Deletes a conversation and its transcript.
 *
 * chat_messages CASCADEs. Any CRM lead the conversation produced is NOT
 * deleted — chat_sessions.lead_id is ON DELETE SET NULL in the other
 * direction, and a lead outlives the chat that found it.
 */
export async function deleteChatSession(sessionId: string): Promise<ChatActionState> {
  await requireUser();

  const parsed = idSchema.safeParse(sessionId);
  if (!parsed.success) return { ok: false, message: "Unknown conversation." };

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: "Supabase is not configured." };

  const { error } = await supabase.from("chat_sessions").delete().eq("id", parsed.data);
  if (error) return { ok: false, message: error.message };

  refresh(parsed.data);
  return { ok: true, message: "Conversation deleted." };
}
