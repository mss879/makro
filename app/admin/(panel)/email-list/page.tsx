import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { NotConfigured, PageHeading } from "@/components/admin/ui";
import SubscribersTable from "@/components/admin/SubscribersTable";
import type { SubscriberRow } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Email List" };

export const dynamic = "force-dynamic";

/** How many rows the table holds. Older signups stay in the database. */
const LIMIT = 1000;

export default async function EmailListPage() {
  const supabase = await createServerSupabase();

  if (!supabase) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeading
          title="Email List"
          subtitle="Everyone who signed up through the footer newsletter form."
        />
        <NotConfigured />
      </div>
    );
  }

  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  if (error) {
    console.error("[makro] Failed to load subscribers:", error.message);
  }

  const subscribers: SubscriberRow[] = data ?? [];

  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        title="Email List"
        subtitle="Everyone who signed up through the footer newsletter form, newest first. Copy or export the addresses to send a campaign from your mail provider."
      />

      {error && (
        <p
          role="alert"
          className="border border-danger-line bg-danger-soft px-4 py-3 font-body text-sm text-danger"
        >
          The email list could not be loaded: {error.message}
        </p>
      )}

      <SubscribersTable subscribers={subscribers} />
    </div>
  );
}
