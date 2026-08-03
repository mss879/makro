/**
 * Hand-authored database types, mirroring supabase/migrations/.
 *
 * If you later run `supabase gen types typescript` you can replace this file
 * wholesale — the exported `Database` name is what the clients depend on.
 */

export type InquiryStatus = "new" | "transferred" | "archived";
export type ProjectStatusRow =
  | "Completed"
  | "Now Selling"
  | "Under Construction"
  | "In Planning";
export type ProjectTypeRow = "Residential" | "Commercial" | "Mixed-Use";
/** The two panel renders in the home page rail — a real discriminator, not a flag. */
export type SelectedWorkKind = "cover" | "gallery";
export type BlogCategory = "Buying" | "Investing" | "Commercial" | "Guides";

export type SpecRow = {
  label: string;
  value: string;
}

export type InquiryRow = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  interest: string | null;
  project: string | null;
  message: string;
  source: string;
  status: InquiryStatus;
  lead_id: string | null;
}

export type PipelineRow = {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
}

export type PipelineStageRow = {
  id: string;
  pipeline_id: string;
  name: string;
  position: number;
  is_locked: boolean;
  created_at: string;
}

export type LeadRow = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  email: string | null;
  phone: string | null;
  interest: string | null;
  project: string | null;
  notes: string | null;
  value: number | null;
  pipeline_id: string;
  stage_id: string;
  position: number;
  inquiry_id: string | null;
}

export type NoteRow = {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
  updated_at: string;
}

export type PageViewRow = {
  id: number;
  path: string;
  referrer: string | null;
  visitor: string;
  created_at: string;
}

export type SubscriberRow = {
  id: string;
  email: string;
  created_at: string;
}

export type ProjectRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  location: string;
  city: string;
  type: ProjectTypeRow;
  status: ProjectStatusRow;
  year: string;
  headline: string;
  summary: string;
  description: string[];
  specs: SpecRow[];
  specs_note: string | null;
  features: string[];
  cover: string | null;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type ProjectImageRow = {
  id: string;
  project_id: string;
  path: string;
  position: number;
  created_at: string;
}

/**
 * Singleton row — a unique index on a constant expression admits exactly one,
 * so callers read it with `.maybeSingle()` and never handle a second row.
 */
export type SelectedWorkSettingsRow = {
  id: string;
  enabled: boolean;
  index_label: string;
  eyebrow: string;
  /** The heading is split in three because the highlight sits mid-sentence. */
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
  created_at: string;
  updated_at: string;
}

export type SelectedWorkCardRow = {
  id: string;
  kind: SelectedWorkKind;
  image: string;
  alt: string;
  index_label: string;
  /** Free text, not the ProjectStatusRow union — this is marketing copy. */
  status_badge: string;
  kicker: string;
  title: string;
  caption: string;
  /** Soft reference, no FK: may name a project that does not exist yet. */
  project_slug: string;
  href: string;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * One `sections[]` entry on an article.
 *
 * `points` is OPTIONAL because the stored jsonb is deliberately sparse — the
 * renderer guards on `section.points &&`, so normalising a missing key to []
 * would grow an empty bullet list on every prose-only section.
 */
export type BlogSection = {
  heading: string;
  paras: string[];
  points?: string[];
}

export type BlogPostRow = {
  id: string;
  slug: string;
  title: string;
  display_title: string;
  category: BlogCategory;
  /** `date`, not timestamptz — rendered verbatim as "15 June 2026". */
  published_on: string;
  read_time: string;
  cover: string;
  excerpt: string;
  meta_description: string;
  keywords: string[];
  intro: string;
  sections: BlogSection[];
  /** Soft slug references — `related` is blog slugs, the other project slugs. */
  related: string[];
  related_projects: string[];
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Mirrors postgrest-js's `GenericRelationship`. Declaring foreign keys here is
 * what lets embedded selects — `.select("*, project_images(path, position)")` —
 * resolve to a typed shape instead of `never`.
 */
type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<
  Row,
  Rels extends Relationship[] = [],
  Insert = Partial<Row>,
  Update = Partial<Row>,
> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Rels;
};

export interface Database {
  public: {
    Tables: {
      inquiries: Table<InquiryRow>;
      pipelines: Table<PipelineRow>;
      pipeline_stages: Table<PipelineStageRow>;
      leads: Table<LeadRow>;
      notes: Table<NoteRow>;
      page_views: Table<PageViewRow>;
      newsletter_subscribers: Table<SubscriberRow>;
      projects: Table<ProjectRow>;
      project_images: Table<
        ProjectImageRow,
        [
          {
            foreignKeyName: "project_images_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ]
      >;
      selected_work_settings: Table<SelectedWorkSettingsRow>;
      selected_work_cards: Table<SelectedWorkCardRow>;
      blog_posts: Table<BlogPostRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
