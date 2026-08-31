import Link from "next/link";

import { createServerSupabase } from "@/lib/supabase/server";
import { isServiceRoleConfigured } from "@/lib/supabase/config";
import { canonicalCode } from "@/lib/site-lock/token";
import { Card, NotConfigured, PageHeading, buttonClass } from "@/components/admin/ui";
import LockToggle from "@/components/admin/settings/LockToggle";
import AccessCodeForm from "@/components/admin/settings/AccessCodeForm";
import GateCopyForm from "@/components/admin/settings/GateCopyForm";

/**
 * Settings — currently one setting, and a consequential one: whether the public
 * website is switched off and replaced by a "Coming soon" page.
 *
 * This screen reads the access code in the clear. It can, because the cookie-
 * bound client runs as `authenticated`, which is the only role besides
 * service_role holding any privilege on that column — the anon key the public
 * site uses cannot read it at all (see 20260831000100_site_lock.sql). Anything
 * added to this screen later must keep that true: never pass the code, or the
 * salt, to a component that the marketing site also renders.
 */

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createServerSupabase();

  const heading = (
    <PageHeading
      title="Settings"
      subtitle="Switch the public website off behind a Coming soon page, and choose who can still get through."
      action={
        <Link
          href="/coming-soon"
          target="_blank"
          rel="noreferrer"
          className={buttonClass("secondary")}
        >
          Preview the gate ↗
        </Link>
      }
    />
  );

  if (!supabase) {
    return (
      <div className="space-y-8">
        {heading}
        <NotConfigured />
      </div>
    );
  }

  // Singleton — a unique index on a constant expression admits exactly one row,
  // so `.maybeSingle()` is safe and a missing row simply means the lock has
  // never been configured, which is an unlocked site.
  const { data, error } = await supabase.from("site_lock_settings").select("*").maybeSingle();

  if (error) {
    console.error("[makro] Failed to load site lock settings:", error.message);
    return (
      <div className="space-y-8">
        {heading}
        <Card>
          <p className="font-body text-sm text-danger">
            These settings could not be loaded: {error.message}
          </p>
          <p className="mt-2 font-body text-xs text-panel-faint">
            If this mentions a missing relation, the{" "}
            <code className="font-mono">20260831000100_site_lock.sql</code> migration has
            not been applied yet.
          </p>
        </Card>
      </div>
    );
  }

  const enabled = data?.enabled ?? false;
  const code = data?.access_code ?? "";

  return (
    <div className="space-y-8">
      {heading}

      <LockToggle
        enabled={enabled}
        hasCode={Boolean(canonicalCode(code))}
        serviceRoleReady={isServiceRoleConfigured}
      />

      <AccessCodeForm code={code} />

      <GateCopyForm
        copy={{
          eyebrow: data?.eyebrow ?? "",
          heading: data?.heading ?? "",
          body: data?.body ?? "",
          note: data?.note ?? "",
          show_contact: data?.show_contact ?? true,
        }}
      />
    </div>
  );
}
