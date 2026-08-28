import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { clientIp, isRateLimited } from "@/lib/rate-limit";
import { createAnonSupabase, createPublicWriteSupabase } from "@/lib/supabase/server";

/**
 * The gated catalogue download.
 *
 * A visitor gives an email address, it goes on the mailing list tagged with the
 * project it came from, and the PDF's URL comes back.
 *
 * WHAT THIS IS AND IS NOT: a lead-capture step, not access control. The bucket
 * is public (see 20260828000500_project_catalogue.sql), so the URL this returns
 * is shareable. That is a deliberate trade — a brochure is marketing material,
 * and signing every download would put a server round trip in front of a file
 * the client wants read as widely as possible. Nothing behind this gate is
 * secret; the gate exists to collect the address.
 *
 * The address is stored even when the same person downloads twice — see the
 * conflict handling below, which accumulates sources rather than overwriting,
 * so "which projects is this lead interested in" stays answerable.
 */

export const dynamic = "force-dynamic";

/** Same normalisation the newsletter uses, so casing never splits a subscriber. */
const emailSchema = z.string().trim().toLowerCase().pipe(z.email());
const slugSchema = z.string().trim().min(1).max(120);

export async function POST(request: NextRequest) {
  const ip = clientIp(request.headers);
  // Answers honestly with a 429: the visitor is mid-interaction and silence
  // would read as the button being broken.
  if (isRateLimited("catalogue", ip, 10)) {
    return NextResponse.json(
      { error: "Too many requests — give it a moment and try again." },
      { status: 429 }
    );
  }

  let body: { email?: unknown; slug?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const email = emailSchema.safeParse(body.email);
  if (!email.success) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  const slug = slugSchema.safeParse(body.slug);
  if (!slug.success) {
    return NextResponse.json({ error: "Unknown project." }, { status: 400 });
  }

  // Read the project with the ANON client: it only ever returns published rows
  // (RLS), so an unpublished project's catalogue cannot be pulled by guessing
  // its slug.
  const reader = createAnonSupabase();
  if (!reader) {
    return NextResponse.json({ error: "Downloads are unavailable." }, { status: 503 });
  }

  const { data: project } = await reader
    .from("projects")
    .select("name, catalogue_url, catalogue_name")
    .eq("slug", slug.data)
    .eq("published", true)
    .maybeSingle();

  if (!project?.catalogue_url) {
    return NextResponse.json(
      { error: "There is no catalogue for this development yet." },
      { status: 404 }
    );
  }

  const source = `Catalogue — ${project.name}`;

  // Prefers the service-role client, falls back to anon — which RLS grants
  // INSERT on this table for exactly this kind of public capture.
  const writer = createPublicWriteSupabase();
  if (writer) {
    const { error } = await writer
      .from("newsletter_subscribers")
      .insert({ email: email.data, source });

    // 23505 = the address is already on the list. That is a success for the
    // visitor, so the download proceeds either way — but the source is still
    // worth updating, because a lead who has now asked for a SECOND project's
    // catalogue is a different lead from the one who signed up in the footer.
    if (error?.code === "23505") {
      await appendSource(writer, email.data, source);
    } else if (error) {
      // Logged, not surfaced. Losing the address is the client's problem to
      // notice in the logs; blocking the download the visitor was promised
      // over a database write would be the wrong trade for the visitor.
      console.error("[makro] Catalogue email capture failed:", error.message);
    }
  } else {
    console.error("[makro] Catalogue email not captured — Supabase is not configured.");
  }

  return NextResponse.json({
    url: project.catalogue_url,
    // Falls back to a readable name built from the project, so the file never
    // saves as a bare uuid.
    filename:
      project.catalogue_name ||
      `${project.name.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-Catalogue.pdf`,
  });
}

/**
 * Adds a source to an address already on the list, without losing the old one.
 *
 * Read-then-write rather than a single UPDATE because the value is a list being
 * accumulated, and Postgres cannot append-if-absent to a comma-separated text
 * column in one statement without making the column something it is not. The
 * race — two catalogues downloaded in the same second by the same address —
 * loses one tag and nothing else, which is not worth a lock over.
 */
async function appendSource(
  supabase: NonNullable<ReturnType<typeof createPublicWriteSupabase>>,
  email: string,
  source: string
) {
  const { data: existing, error } = await supabase
    .from("newsletter_subscribers")
    .select("source")
    .eq("email", email)
    .maybeSingle();

  // No SELECT grant (the anon fallback path) — nothing more to do. The address
  // is already on the list, which is the part that matters.
  if (error || !existing) return;

  const current = existing.source ?? "";
  const parts = current.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.includes(source)) return;

  const next = [...parts, source].join(", ");
  const { error: updateError } = await supabase
    .from("newsletter_subscribers")
    .update({ source: next })
    .eq("email", email);

  if (updateError) {
    console.error("[makro] Could not tag an existing subscriber:", updateError.message);
  }
}
