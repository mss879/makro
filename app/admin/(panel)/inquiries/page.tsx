import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { NotConfigured, PageHeading } from "@/components/admin/ui";
import InquiriesTable from "@/components/admin/InquiriesTable";
import type { InquiryRow } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Inquiries" };

export const dynamic = "force-dynamic";

/** How many rows the table holds. Older inquiries stay in the database. */
const LIMIT = 200;

export default async function InquiriesPage() {
  const supabase = await createServerSupabase();

  if (!supabase) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeading
          title="Inquiries"
          subtitle="Every enquiry from the contact form, newest first."
        />
        <NotConfigured />
      </div>
    );
  }

  const { data, error } = await supabase
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  if (error) {
    console.error("[makro] Failed to load inquiries:", error.message);
  }

  const inquiries: InquiryRow[] = data ?? [];

  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        title="Inquiries"
        subtitle="Every enquiry from the contact form, newest first. Select one or more and transfer them into the CRM — they land at the top of the New Leads column."
      />

      {error && (
        <p role="alert" className="border border-danger-line bg-danger-soft px-4 py-3 font-body text-sm text-danger">
          The inquiries could not be loaded: {error.message}
        </p>
      )}

      <InquiriesTable inquiries={inquiries} />
    </div>
  );
}
