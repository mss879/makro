/**
 * Hand-authored database types, mirroring supabase/migrations/.
 *
 * If you later run `supabase gen types typescript` you can replace this file
 * wholesale — the exported `Database` name is what the clients depend on.
 */

export type InquiryStatus = "new" | "transferred" | "archived";
export type ProjectStatusRow = "Upcoming" | "On-going" | "Delivered";
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
  /** Where the address came from, e.g. "Catalogue — Makro Heights". Comma-separated when more than one. */
  source: string | null;
}

/** One conversation with the site's AI agent. */
export type ChatSessionRow = {
  id: string;
  /** Bearer secret held only by the visitor's browser — never sent to the admin UI. */
  token: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  /** False once an admin takes the conversation over by hand. */
  ai_enabled: boolean;
  visitor: string | null;
  started_path: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  lead_id: string | null;
}

/** `agent` is a human admin replying in place of the AI. */
export type ChatRole = "user" | "assistant" | "agent";

export type ChatMessageRow = {
  id: string;
  session_id: string;
  role: ChatRole;
  content: string;
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
  /** Full-bleed hero art, independent of the gallery. Null falls back to cover. */
  hero_image: string | null;
  /**
   * Portrait hero art for phones (below 768px). Null falls back to hero_image
   * — see 20260901000100_hero_mobile_images.sql for why a second file rather
   * than a focal point.
   */
  hero_image_mobile: string | null;
  /** Public URL of the catalogue PDF, or null. Gates on an email — see /api/catalogue. */
  catalogue_url: string | null;
  /** The name the visitor's browser saves it as; the storage key is a uuid. */
  catalogue_name: string | null;
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
 * Singleton row — switches and copy for the three sections that sit above the
 * portfolio index on /projects. One row rather than three tables because the
 * admin edits them as three tabs of one screen.
 */
export type ProjectsPageSettingsRow = {
  id: string;
  hero_enabled: boolean;
  hero_autoplay: boolean;
  /** Milliseconds, passed straight to the slideshow timer. 2000–30000. */
  hero_interval_ms: number;
  hero_show_dots: boolean;
  intro_enabled: boolean;
  intro_eyebrow: string;
  /** string[] — one paragraph per entry, revealed in order. */
  intro_body: string[];
  carousel_enabled: boolean;
  carousel_eyebrow: string;
  carousel_heading: string;
  /* FAQ — added in 20260830000100. The two links are label + href pairs, not
     booleans over hard-coded routes: the client asked for the whole section to
     be editable, and a label they can change pointing at a destination they
     cannot is a half measure. */
  faq_enabled: boolean;
  faq_eyebrow: string;
  faq_heading: string;
  faq_body: string;
  faq_primary_label: string;
  faq_primary_href: string;
  faq_secondary_label: string;
  faq_secondary_href: string;
  created_at: string;
  updated_at: string;
}

/**
 * A hero panel. `image`, `heading` and `body` are independently optional: the
 * client asked for image-only, image-with-text and text-only slides, so the
 * shape is inferred at render time rather than stored as a discriminator that
 * could disagree with the fields. The database rejects only the all-empty case.
 */
export type ProjectsPageHeroSlideRow = {
  id: string;
  /** Full public URL, never a bare storage key — same contract as project_images.path. */
  image: string | null;
  /** Portrait variant for phones. Null falls back to `image`. */
  image_mobile: string | null;
  alt: string;
  heading: string;
  body: string;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Curation only. Every visible field on the carousel card is read from the
 * joined project, so there is nothing here to drift out of date.
 */
export type ProjectsPageCarouselItemRow = {
  id: string;
  project_id: string;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * One question in the /projects FAQ accordion.
 *
 * `answer` may be empty while `question` may not: writing the question first
 * and the answer later is a normal way to work, and a row with nothing under it
 * is visibly unfinished — whereas an entry with no question renders as an empty
 * accordion trigger the admin cannot see in order to delete it. That asymmetry
 * is the CHECK in 20260830000100.
 */
export type ProjectsPageFaqItemRow = {
  id: string;
  question: string;
  answer: string;
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

/**
 * Singleton row — the public site's on/off switch and the "Coming soon" gate
 * it is replaced by.
 *
 * TWO OF THESE COLUMNS ARE SECRETS. `access_code` and `token_salt` are readable
 * by `authenticated` (the admin screen edits them) and by service_role (the
 * proxy checks the unlock cookie against them) — and by nobody else. The anon
 * role holds a COLUMN-LEVEL grant covering the copy columns only, so an anon
 * `select("*")` on this table is a permission error rather than a leak. Keep it
 * that way: see the security note at the top of
 * supabase/migrations/20260831000100_site_lock.sql before adding a column here.
 */
export type SiteLockSettingsRow = {
  id: string;
  /** True replaces every public page with the gate. /admin is never gated. */
  enabled: boolean;
  /** Secret. Empty means no code exists, so nothing gets past the gate. */
  access_code: string;
  /** Secret. Mixed into the unlock cookie's hash; rotating it revokes every cookie. */
  token_salt: string;
  eyebrow: string;
  heading: string;
  body: string;
  /** Empty hides the access-code field on the gate entirely. */
  note: string;
  /** Whether the gate prints the contact details from lib/site.ts. */
  show_contact: boolean;
  created_at: string;
  updated_at: string;
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
      chat_sessions: Table<ChatSessionRow>;
      chat_messages: Table<
        ChatMessageRow,
        [
          {
            foreignKeyName: "chat_messages_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "chat_sessions";
            referencedColumns: ["id"];
          },
        ]
      >;
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
      projects_page_settings: Table<ProjectsPageSettingsRow>;
      projects_page_hero_slides: Table<ProjectsPageHeroSlideRow>;
      // The FK name is load-bearing in the same way project_images' is: it is
      // what makes the embedded select in lib/projects-page-data.ts
      //   .select("*, projects(...)")
      // resolve to a typed shape instead of `never`.
      projects_page_carousel_items: Table<
        ProjectsPageCarouselItemRow,
        [
          {
            foreignKeyName: "projects_page_carousel_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ]
      >;
      projects_page_faq_items: Table<ProjectsPageFaqItemRow>;
      selected_work_settings: Table<SelectedWorkSettingsRow>;
      selected_work_cards: Table<SelectedWorkCardRow>;
      site_lock_settings: Table<SiteLockSettingsRow>;
      blog_posts: Table<BlogPostRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
