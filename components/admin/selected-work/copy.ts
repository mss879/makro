import type { SelectedWorkSettings } from "@/lib/selected-work-data";
import type { SelectedWorkSettingsRow } from "@/lib/supabase/types";

/**
 * The settings singleton's twelve copy columns, in database spelling.
 *
 * The admin form posts and reads these names verbatim, so the shape is worth a
 * type of its own: it is the contract between the Server Action's payload, the
 * page's fallback for a settings row that does not exist yet, and the form's
 * `defaultValue`s.
 *
 * `enabled` is deliberately NOT here. It is the headline control, it is written
 * by its own action, and folding it into the copy payload would let a copy save
 * silently re-publish a section the client had just switched off.
 *
 * The `SelectedWorkSettings` import is type-only, so this module stays safe for
 * a "use client" file to import even though lib/selected-work-data is
 * server-only.
 */
export interface SelectedWorkCopy {
  index_label: string;
  eyebrow: string;
  heading_before: string;
  heading_highlight: string;
  heading_after: string;
  body: string;
  cta_label: string;
  cta_href: string;
  scroll_hint: string;
  endcap_heading: string;
  endcap_link_label: string;
  endcap_href: string;
}

/**
 * The bundled defaults, in column spelling.
 *
 * Taken as an argument rather than imported so this module never pulls the
 * server-only data layer into a client bundle; the only caller passes
 * DEFAULT_SELECTED_WORK_SETTINGS, which is itself a literal copy of the
 * migration's seed. That keeps one source of truth for "what the section says
 * before anyone edits it" — the column defaults alone would not do, because
 * `body` defaults to '' in the table and to the full paragraph in the seed.
 */
export function toCopyColumns(settings: SelectedWorkSettings): SelectedWorkCopy {
  return {
    index_label: settings.indexLabel,
    eyebrow: settings.eyebrow,
    heading_before: settings.headingBefore,
    heading_highlight: settings.headingHighlight,
    heading_after: settings.headingAfter,
    body: settings.body,
    cta_label: settings.ctaLabel,
    cta_href: settings.ctaHref,
    scroll_hint: settings.scrollHint,
    endcap_heading: settings.endcapHeading,
    endcap_link_label: settings.endcapLinkLabel,
    endcap_href: settings.endcapHref,
  };
}

/** Narrows a settings row to just the copy the form owns. */
export function copyFromRow(row: SelectedWorkSettingsRow): SelectedWorkCopy {
  return {
    index_label: row.index_label,
    eyebrow: row.eyebrow,
    heading_before: row.heading_before,
    heading_highlight: row.heading_highlight,
    heading_after: row.heading_after,
    body: row.body,
    cta_label: row.cta_label,
    cta_href: row.cta_href,
    scroll_hint: row.scroll_hint,
    endcap_heading: row.endcap_heading,
    endcap_link_label: row.endcap_link_label,
    endcap_href: row.endcap_href,
  };
}
