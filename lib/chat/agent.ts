import "server-only";

import { generateText, tool, stepCountIs } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

import { buildSystemPrompt } from "./knowledge";
import { captureLeadForSession, type ChatTurn } from "./store";
import { CHAT_MODEL, CHAT_PROVIDER, OPENAI_API_KEY } from "./config";
import type { ChatSessionRow } from "@/lib/supabase/types";

/**
 * The model call, and the one tool it can reach.
 *
 * On the AI SDK version: this is v7. The upgrade notes the team wrote for the
 * Sponge build describe v6, and the two things that broke there are unchanged
 * here — a tool declares `inputSchema` (not `parameters`), and `generateText`
 * runs exactly ONE step unless `stopWhen` says otherwise. Three steps is the
 * minimum that works: the model's decision to call the tool, the tool
 * execution, and the reply that follows it. Drop `stopWhen` and the tool fires
 * but `result.text` comes back empty, which reads as the agent going silent at
 * the exact moment it captures a lead.
 */

const CAPTURE_TOOL_DESCRIPTION = `Record a prospective buyer or investor in the CRM so the Makro team can call them back.

Call this ONLY when you have BOTH their full name AND their phone number, and only once per conversation. Do not call it with a placeholder, a guessed name, or a partial number — ask the visitor instead.`;

/** What the route needs back from a turn. */
export interface AgentReply {
  text: string;
  /** Set when the tool ran on this turn, for the route to log and report. */
  captured: { leadId: string; duplicate: boolean } | null;
  captureError: string | null;
}

/**
 * The model sees a human agent's turns as assistant turns.
 *
 * If the client answers by hand and then switches the AI back on, the agent
 * has to be able to read what was already promised — otherwise it contradicts
 * its own colleague. Mapping 'agent' to 'assistant' is what makes the handover
 * reversible; the distinction is still kept in the database for the transcript.
 */
function toModelMessages(history: ChatTurn[]) {
  return history.map((turn) => ({
    role: turn.role === "user" ? ("user" as const) : ("assistant" as const),
    content: turn.content,
  }));
}

export async function runAgent(
  session: ChatSessionRow,
  history: ChatTurn[]
): Promise<AgentReply> {
  if (CHAT_PROVIDER === "stub") return runStub(session, history);

  let captured: AgentReply["captured"] = null;
  let captureError: string | null = null;

  const openai = createOpenAI({ apiKey: OPENAI_API_KEY });

  const result = await generateText({
    model: openai(CHAT_MODEL),
    system: buildSystemPrompt(),
    messages: toModelMessages(history),
    stopWhen: stepCountIs(3),
    tools: {
      captureLead: tool({
        description: CAPTURE_TOOL_DESCRIPTION,
        inputSchema: z.object({
          name: z.string().min(2).describe("The visitor's full name, as they gave it."),
          phone: z
            .string()
            .min(6)
            .describe("Their phone number, exactly as they typed it, including any country code."),
          email: z.string().optional().describe("Their email, only if they volunteered one."),
          interest: z
            .string()
            .optional()
            .describe(
              "What they are interested in, in a few words — e.g. 'A residential development', 'Investment opportunity'."
            ),
          project: z
            .string()
            .optional()
            .describe("The development they asked about, if any. Only ever 'Makro Heights'."),
          summary: z
            .string()
            .optional()
            .describe(
              "One or two sentences on what they asked for, so the team can pick the call up with context."
            ),
        }),
        execute: async (input) => {
          const outcome = await captureLeadForSession(session, input);

          if (!outcome.ok) {
            captureError = outcome.reason;
            // The model is told the save failed but NOT why. A database error
            // string is not something to relay into a customer conversation.
            return {
              success: false,
              message:
                "The details could not be recorded. Apologise briefly and give them the phone number and email address instead.",
            };
          }

          captured = { leadId: outcome.leadId, duplicate: outcome.duplicate };
          return {
            success: true,
            message: outcome.duplicate
              ? "NOT recorded — this conversation has already produced a lead and it captures one contact only. Do NOT say these details have been passed on, and do NOT say anyone will be contacted about them. Say instead that you have their own details and that anything else mentioned here is visible to the team in this conversation."
              : "Recorded. Confirm warmly in one sentence that the team will be in touch.",
          };
        },
      }),
    },
  });

  return { text: result.text.trim(), captured, captureError };
}

/**
 * Deterministic stand-in for the model, enabled with CHAT_PROVIDER=stub.
 *
 * It exists so the parts that are ours — session handling, persistence, the
 * tool's CRM write, the takeover switch — can be tested end to end on every
 * run, without a key and without paying for tokens to assert that a lead row
 * appeared. It recognises a name-and-phone message and calls exactly the same
 * captureLeadForSession path the real tool does, so what is under test is the
 * real code, not a mock of it.
 */
async function runStub(session: ChatSessionRow, history: ChatTurn[]): Promise<AgentReply> {
  const last = [...history].reverse().find((t) => t.role === "user")?.content ?? "";

  const phone = last.match(/\+?[\d][\d\s().-]{6,}\d/)?.[0]?.trim();
  const name = last.match(/(?:i(?:'|’)?m|i am|name(?:'|’)?s|this is|name:)\s+([a-z][a-z' -]{1,40})/i)?.[1]?.trim();

  if (phone && name) {
    const outcome = await captureLeadForSession(session, {
      name,
      phone,
      interest: "Chat enquiry",
      summary: `[stub provider] ${last}`.slice(0, 500),
    });

    if (!outcome.ok) {
      return {
        text: "Sorry — I could not record those details just now. Please call +94 707 21 21 21.",
        captured: null,
        captureError: outcome.reason,
      };
    }
    return {
      text: outcome.duplicate
        ? "I already have your details — the team will be in touch shortly."
        : `Thank you, ${name}. I have passed your details to the team and they will call you shortly.`,
      captured: { leadId: outcome.leadId, duplicate: outcome.duplicate },
      captureError: null,
    };
  }

  if (/price|cost|how much/i.test(last)) {
    return {
      text: "Pricing for Makro Heights is not published — the team shares it directly. May I take your name and phone number so they can call you?",
      captured: null,
      captureError: null,
    };
  }

  return {
    text: "[stub] Makro Heights is our flagship residential development in Dehiwala — approximately 120 two- and three-bedroom residences, planned as G+15. What would you like to know?",
    captured: null,
    captureError: null,
  };
}
