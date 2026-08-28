import { isServiceRoleConfigured } from "@/lib/supabase/config";

/**
 * Chat agent configuration and the single source of truth for whether the
 * widget runs at all.
 */

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";

/**
 * `stub` swaps the language model for a deterministic scripted one, so the
 * whole pipeline — session creation, persistence, the captureLead tool, the
 * CRM insert, human takeover — can be exercised end to end without an API key
 * and without spending tokens on every test run. See lib/chat/provider.ts.
 *
 * Never set this in production; `isChatConfigured` below is what gates the
 * widget, and the stub deliberately does not satisfy it on its own.
 */
export const CHAT_PROVIDER = process.env.CHAT_PROVIDER === "stub" ? "stub" : "openai";

export const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

/**
 * The chat needs BOTH the model key and the service-role key.
 *
 * The service-role requirement is not incidental. anon has no privileges on
 * chat_sessions or chat_messages at all (see 20260828000200_chat.sql), because
 * any anon SELECT wide enough to let the widget read its own transcript would
 * also expose every visitor's conversation to anyone holding the publishable
 * key. So the chat has no anon fallback the way inquiries and newsletter
 * signups do: without the service-role key it does not quietly degrade to a
 * less private mode, it switches off.
 */
export const isChatConfigured =
  isServiceRoleConfigured && (CHAT_PROVIDER === "stub" || Boolean(OPENAI_API_KEY));

/** How many past messages are replayed to the model. Keeps prompts bounded. */
export const HISTORY_LIMIT = 24;

/** Hard ceiling on a single visitor message, mirrored by the DB CHECK. */
export const MAX_MESSAGE_LENGTH = 2000;

/** Widget poll interval while a human has taken the conversation over. */
export const POLL_INTERVAL_MS = 4000;
