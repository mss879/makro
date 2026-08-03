"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createPublicWriteSupabase } from "@/lib/supabase/server";
import { warnUnconfigured } from "@/lib/supabase/config";
import { clientIp, isRateLimited } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  // Normalise first, then validate — z.string().email() is deprecated in zod 4.
  email: z.string().trim().toLowerCase().pipe(z.email().max(200)),
  phone: z.string().trim().max(60).optional().or(z.literal("")),
  interest: z.string().trim().max(120).optional().or(z.literal("")),
  project: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().min(1).max(4000),
  // Hidden field. Humans leave it empty; bots fill everything in.
  company: z.string().max(0).optional().or(z.literal("")),
});

export type ContactResult = { ok: boolean; message: string };

export async function submitInquiry(formData: FormData): Promise<ContactResult> {
  // Abuse brake — reuses the generic failure the storage path returns, so a
  // throttled caller cannot tell the limiter apart from an ordinary error.
  if (isRateLimited("contact", clientIp(await headers()), 5)) {
    return {
      ok: false,
      message: "We could not send your message just now. Please try again, or email us directly.",
    };
  }

  const parsed = schema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    interest: formData.get("interest") ?? "",
    project: formData.get("project") ?? "",
    message: formData.get("message") ?? "",
    company: formData.get("company") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, message: "Please check the highlighted fields and try again." };
  }

  const { name, email, phone, interest, project, message } = parsed.data;

  const supabase = createPublicWriteSupabase();
  if (!supabase) {
    // Pre-launch state: the site is demoable before Supabase exists, but
    // nothing is stored. Fill in .env.local before going live.
    warnUnconfigured(`inquiry from ${email}`);
    return { ok: true, message: "" };
  }

  const { error } = await supabase.from("inquiries").insert({
    name,
    email,
    phone: phone || null,
    interest: interest || null,
    project: project || null,
    message,
    source: "contact",
  });

  if (error) {
    console.error("[makro] Failed to store inquiry:", error.message);
    return {
      ok: false,
      message: "We could not send your message just now. Please try again, or email us directly.",
    };
  }

  return { ok: true, message: "" };
}
