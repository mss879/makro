import "server-only";

import { createAdminSupabase } from "@/lib/supabase/server";
import { getIntakeStage, positionFor } from "@/lib/crm";
import type { ChatMessageRow, ChatRole, ChatSessionRow } from "@/lib/supabase/types";
import { HISTORY_LIMIT } from "./config";

/**
 * Every read and write of a chat conversation.
 *
 * All of it runs on the SERVICE-ROLE client, because anon has no privileges on
 * these tables at all — see the security model at the top of
 * supabase/migrations/20260828000200_chat.sql. That places the entire burden of
 * authorisation on this module, so there is exactly one rule and it is not
 * optional:
 *
 *   Every function that acts on a visitor's behalf takes BOTH the session id
 *   and the token, and scopes its query with both. The id is public — it is in
 *   the admin URL. The token is the secret. A query filtered only by id is a
 *   hole, and the service-role client will happily execute it.
 *
 * Admin-side reads are separate (`adminListSessions`, `adminGetTranscript`) and
 * take no token, because the caller has already been through requireUser().
 */

export interface ChatTurn {
  role: ChatRole;
  content: string;
  created_at: string;
}

/** Everything the widget needs to render, minus the token it already holds. */
export interface VisitorView {
  sessionId: string;
  aiEnabled: boolean;
  messages: ChatTurn[];
}

function db() {
  const supabase = createAdminSupabase();
  if (!supabase) throw new Error("Chat requires SUPABASE_SERVICE_ROLE_KEY.");
  return supabase;
}

/** Creates a conversation and returns it with its freshly minted token. */
export async function createSession(input: {
  visitor: string | null;
  startedPath: string | null;
}): Promise<ChatSessionRow> {
  const { data, error } = await db()
    .from("chat_sessions")
    .insert({ visitor: input.visitor, started_path: input.startedPath })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not start the conversation.");
  }
  return data as ChatSessionRow;
}

/**
 * Loads a session for a visitor. Returns null when the id is unknown OR the
 * token does not match — deliberately the same answer for both, so a caller
 * probing ids cannot tell a wrong token from a non-existent session.
 */
export async function getSessionForVisitor(
  sessionId: string,
  token: string
): Promise<ChatSessionRow | null> {
  if (!isUuid(sessionId) || !isUuid(token)) return null;

  const { data } = await db()
    .from("chat_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("token", token)
    .maybeSingle();

  return (data as ChatSessionRow | null) ?? null;
}

export async function appendMessage(
  sessionId: string,
  role: ChatRole,
  content: string
): Promise<ChatMessageRow> {
  const supabase = db();

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({ session_id: sessionId, role, content })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not save the message.");
  }

  // Denormalised so the admin list can sort by recency without an aggregate.
  // Not in a transaction with the insert: if this update loses the message is
  // still saved, and a stale sort key is a far smaller problem than a dropped
  // transcript line.
  await supabase
    .from("chat_sessions")
    .update({ last_message_at: data.created_at })
    .eq("id", sessionId);

  return data as ChatMessageRow;
}

/** The transcript, oldest first, capped at the model's history window. */
export async function getHistory(sessionId: string, limit = HISTORY_LIMIT): Promise<ChatTurn[]> {
  // Newest-first with a limit, then reversed: taking the LAST n rows is the
  // point, and `order(asc).limit(n)` would take the first n instead — which is
  // the opening of a long conversation rather than its current state.
  const { data } = await db()
    .from("chat_messages")
    .select("role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as ChatTurn[]).slice().reverse();
}

/** Messages strictly newer than `after` — the widget's poll for human replies. */
export async function getMessagesAfter(
  sessionId: string,
  after: string | null
): Promise<ChatTurn[]> {
  let query = db()
    .from("chat_messages")
    .select("role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(50);

  if (after) query = query.gt("created_at", after);

  const { data } = await query;
  return (data ?? []) as ChatTurn[];
}

export interface CapturedLead {
  name: string;
  phone: string;
  email?: string;
  interest?: string;
  project?: string;
  summary?: string;
}

export type CaptureResult =
  | { ok: true; leadId: string; duplicate: false }
  | { ok: true; leadId: string; duplicate: true }
  | { ok: false; reason: string };

/**
 * Turns a captured contact into a CRM lead.
 *
 * Mirrors app/admin/(panel)/inquiries/actions.ts::transferToCrm — the lead
 * lands at the TOP of the default pipeline's locked intake stage, exactly where
 * a transferred inquiry would, so chat leads and form leads arrive in the same
 * place and the client has one queue to work rather than two.
 *
 * `inquiry_id` is null: this lead came from a conversation, not a form
 * submission, and the link back to that conversation is held the other way
 * round, on chat_sessions.lead_id.
 */
export async function captureLeadForSession(
  session: ChatSessionRow,
  lead: CapturedLead
): Promise<CaptureResult> {
  const supabase = db();

  // The model is told to call the tool once, but a model is not a guarantee.
  // Re-reading the session rather than trusting the copy passed in closes the
  // window where two messages race and both see lead_id as null.
  const { data: fresh } = await supabase
    .from("chat_sessions")
    .select("lead_id")
    .eq("id", session.id)
    .maybeSingle();

  if (fresh?.lead_id) return { ok: true, leadId: fresh.lead_id, duplicate: true };

  const intake = await getIntakeStage(supabase);
  if (!intake) {
    return { ok: false, reason: "No default pipeline with an intake stage exists." };
  }

  const { data: existing } = await supabase
    .from("leads")
    .select("position")
    .eq("stage_id", intake.stage.id)
    .order("position", { ascending: true });

  const position = positionFor(existing ?? [], 0);

  const { data: created, error: insertError } = await supabase
    .from("leads")
    .insert({
      name: lead.name,
      email: lead.email ?? null,
      phone: lead.phone,
      interest: lead.interest ?? null,
      project: lead.project ?? null,
      notes: lead.summary
        ? `Captured by the website AI agent.\n\n${lead.summary}`
        : "Captured by the website AI agent.",
      pipeline_id: intake.pipeline.id,
      stage_id: intake.stage.id,
      position,
      inquiry_id: null,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    return { ok: false, reason: insertError?.message ?? "The lead could not be created." };
  }

  const { error: linkError } = await supabase
    .from("chat_sessions")
    .update({
      lead_id: created.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email ?? null,
    })
    .eq("id", session.id);

  if (linkError) {
    // The lead exists and is the thing that matters commercially, so this is
    // reported as success. The conversation just will not show its lead badge.
    console.error("[makro] Lead created but not linked to its chat session:", linkError.message);
  }

  return { ok: true, leadId: created.id, duplicate: false };
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

export { isUuid };
