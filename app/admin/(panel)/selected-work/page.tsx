import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { DEFAULT_SELECTED_WORK_SETTINGS } from "@/lib/selected-work-data";
import { Card, NotConfigured, PageHeading, buttonClass } from "@/components/admin/ui";
import { copyFromRow, toCopyColumns } from "@/components/admin/selected-work/copy";
import SectionToggle from "@/components/admin/selected-work/SectionToggle";
import SettingsForm from "@/components/admin/selected-work/SettingsForm";
import CardsManager from "@/components/admin/selected-work/CardsManager";
import type { SelectedWorkCardRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function SelectedWorkPage() {
  const supabase = await createServerSupabase();

  const heading = (
    <PageHeading
      title="Selected Work"
      subtitle="The black, side-scrolling section on the home page — whether it appears at all, the copy it opens and closes with, and the panels in between."
      action={
        <Link
          href="/"
          target="_blank"
          rel="noreferrer"
          className={buttonClass("secondary")}
        >
          View home page ↗
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

  // The settings row is a singleton — a unique index on a constant expression
  // admits exactly one — so `.maybeSingle()` is safe, and a missing row means
  // the section has simply never been edited.
  const [settingsRes, cardsRes] = await Promise.all([
    supabase.from("selected_work_settings").select("*").maybeSingle(),
    supabase
      .from("selected_work_cards")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  const failure = settingsRes.error ?? cardsRes.error;
  if (failure) {
    console.error("[makro] Failed to load selected work:", failure.message);
    return (
      <div className="space-y-8">
        {heading}
        <Card>
          <p className="font-body text-sm text-red-700">
            The Selected Work section could not be loaded: {failure.message}
          </p>
        </Card>
      </div>
    );
  }

  // No row yet means the seeded copy is what the home page is rendering, so
  // that is what the form has to open on — otherwise the first save would blank
  // a section that currently reads fine.
  const copy = settingsRes.data
    ? copyFromRow(settingsRes.data)
    : toCopyColumns(DEFAULT_SELECTED_WORK_SETTINGS);
  const enabled = settingsRes.data?.enabled ?? true;

  // Drafts included: this screen is where they are staged, so it shows the
  // whole table, unlike the home page, which reads published rows only.
  const cards: SelectedWorkCardRow[] = cardsRes.data ?? [];

  return (
    <div className="space-y-8">
      {heading}

      <SectionToggle enabled={enabled} />

      {/*
        Dimmed while the section is off — still fully editable, because staging
        the copy before switching it back on is the point.
      */}
      <div className={`space-y-8 ${enabled ? "" : "opacity-60"}`}>
        <SettingsForm copy={copy} />
        <CardsManager cards={cards} />
      </div>
    </div>
  );
}
