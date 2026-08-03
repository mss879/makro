"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createPublicWriteSupabase } from "@/lib/supabase/server";
import { warnUnconfigured } from "@/lib/supabase/config";
import { clientIp, isRateLimited } from "@/lib/rate-limit";

/** Shape returned to `useActionState` in components/layout/NewsletterForm. */
type NewsletterState = { ok: boolean; message: string };

const SUCCESS = "Thank you — you are on the list.";

/** Trim and lowercase before validating so casing never splits a subscriber. */
const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

/**
 * Newsletter signup. Writes through the service-role client because the
 * subscriber is anonymous — there is no session for RLS to key off.
 *
 * Stays deliberately forgiving: with no Supabase credentials the signup is a
 * logged no-op that still reports success, so client demos never hit an error
 * state before the backend is wired up (see lib/supabase/config.ts).
 */
export async function subscribeToNewsletter(
  prevState: NewsletterState,
  formData: FormData
): Promise<NewsletterState> {
  // Abuse brake — reuses the generic failure shape, so a throttled caller
  // cannot tell the limiter apart from an ordinary error.
  if (isRateLimited("newsletter", clientIp(await headers()), 5)) {
    return { ok: false, message: "Something went wrong. Please try again." };
  }

  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { ok: false, message: "Please enter a valid email address." };
  }
  const email = parsed.data;

  const supabase = createPublicWriteSupabase();
  if (!supabase) {
    warnUnconfigured("newsletter signup");
    return { ok: true, message: SUCCESS };
  }

  const { error } = await supabase.from("newsletter_subscribers").insert({ email });

  if (error) {
    // Unique violation — already subscribed, which is not a failure.
    if (error.code === "23505") {
      return { ok: true, message: "You are already on the list." };
    }
    console.error("[makro] newsletter signup failed", error);
    return { ok: false, message: "Something went wrong. Please try again." };
  }

  return { ok: true, message: SUCCESS };
}
