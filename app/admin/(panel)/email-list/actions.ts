"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabase, requireUser } from "@/lib/supabase/server";

/**
 * Newsletter subscriber actions.
 *
 * The public signup lives in app/actions/newsletter.ts and writes through the
 * service-role client (an anonymous visitor has no session for RLS to key
 * off). Everything here is the opposite: admin-only, cookie-bound, and every
 * export opens with `await requireUser()` — the proxy gate at /admin is
 * optimistic, so a matcher change must never be able to unprotect a mutation.
 *
 * Module rule: a "use server" file may only export async functions, so the
 * result shape is declared as a type and the schema stays module-private.
 */

export type SubscriberActionState = {
  ok: boolean;
  count: number;
  message: string;
};

/** Trim + lowercase before validating so casing never splits a subscriber. */
const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

export async function addSubscriber(email: string): Promise<SubscriberActionState> {
  await requireUser();

  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    return { ok: false, count: 0, message: "Please enter a valid email address." };
  }

  const supabase = await createServerSupabase();
  if (!supabase) {
    return { ok: false, count: 0, message: "Supabase is not configured." };
  }

  const { error } = await supabase
    .from("newsletter_subscribers")
    .insert({ email: parsed.data });

  if (error) {
    // Unique violation — already on the list, which is not a failure.
    if (error.code === "23505") {
      return { ok: true, count: 0, message: "That address is already on the list." };
    }
    console.error("[makro] Failed to add subscriber:", error.message);
    return { ok: false, count: 0, message: error.message };
  }

  revalidatePath("/admin/email-list");
  revalidatePath("/admin");
  return { ok: true, count: 1, message: "Subscriber added." };
}

export async function deleteSubscribers(ids: string[]): Promise<SubscriberActionState> {
  await requireUser();

  if (ids.length === 0) {
    return { ok: false, count: 0, message: "Nothing selected." };
  }

  const supabase = await createServerSupabase();
  if (!supabase) {
    return { ok: false, count: 0, message: "Supabase is not configured." };
  }

  const { error } = await supabase.from("newsletter_subscribers").delete().in("id", ids);

  if (error) {
    console.error("[makro] Failed to delete subscribers:", error.message);
    return { ok: false, count: 0, message: error.message };
  }

  revalidatePath("/admin/email-list");
  revalidatePath("/admin");
  return {
    ok: true,
    count: ids.length,
    message: ids.length === 1 ? "Subscriber removed." : `${ids.length} subscribers removed.`,
  };
}
