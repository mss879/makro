-- ============================================================================
-- 20260828000500_project_catalogue.sql
--
-- Admin menu items 6 ("Projects") and 7 ("Email List"). The gated catalogue
-- download (client, Aug 2026): each project can carry a PDF, a visitor gives an
-- email address to download it, and that address lands on the mailing list
-- tagged with the project it came from.
--
-- Owns:
--   • public.projects.catalogue_url, .catalogue_name  — the file
--   • public.newsletter_subscribers.source            — where an address came from
--   • the 'project-catalogues' storage bucket         — where the PDFs live
--
-- Depends on:
--   20260803000700_projects.sql   (public.projects)
--   20260803000800_email_list.sql (public.newsletter_subscribers)
--
-- This one file crosses two menu items on purpose. The feature is a single
-- transaction in the user's head — download the catalogue, join the list — and
-- splitting it across two migrations would mean either half can be applied
-- without the other, which is exactly the state where the download works and
-- the address is silently dropped.
--
-- Idempotent: safe to re-run.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- A. The file, on the project
-- ---------------------------------------------------------------------------

alter table public.projects
  add column if not exists catalogue_url text,
  -- What the visitor's browser calls the file when it saves. Held separately
  -- because the storage key is a uuid — without this every catalogue on every
  -- device downloads as `a3f1…-9c2b.pdf`, which is a support ticket waiting to
  -- happen. Null falls back to a name built from the project.
  add column if not exists catalogue_name text;

comment on column public.projects.catalogue_url is
  'Public URL of the project catalogue PDF, or null when there is none. The '
  'download button only renders when this is set.';


-- ---------------------------------------------------------------------------
-- B. Where a subscriber came from
-- ---------------------------------------------------------------------------

-- Deliberately free text and NOT a foreign key to projects. The column has to
-- describe footer signups and future capture points too, and a subscriber must
-- outlive the project that introduced them — an FK with ON DELETE SET NULL
-- would erase the provenance of every address the moment a project was tidied
-- away, which is the one thing this column exists to remember.
alter table public.newsletter_subscribers
  add column if not exists source text;

comment on column public.newsletter_subscribers.source is
  'Where this address was captured, e.g. "Catalogue — Makro Heights". Null for '
  'the footer newsletter signups that predate this column. An address that '
  'arrives twice accumulates both, comma-separated — see the catalogue route.';

-- The Email List screen groups and filters by this.
create index if not exists newsletter_subscribers_source_idx
  on public.newsletter_subscribers (source);


-- ---------------------------------------------------------------------------
-- C. Storage
-- ---------------------------------------------------------------------------
-- Its own bucket rather than a folder inside 'project-images', for two reasons
-- that both bite later:
--   1. Everything entering project-images is converted to WebP by the upload
--      route. A PDF has no business in a bucket whose whole contract is
--      "images, normalised".
--   2. Catalogues are the one asset here that carries commercial detail —
--      pricing, floor plates — so being able to purge or re-permission them
--      without touching a single photograph is worth the extra bucket.
--
-- PUBLIC READ, and that is a real decision. The email gate is a lead-capture
-- step, not access control: the URL is handed to the browser after the address
-- is given, and anyone who then shares that URL has shared the file. Making the
-- bucket private and signing URLs would change that, at the cost of every
-- download becoming a server round trip. The client asked for the address, not
-- for the PDF to be a secret — a brochure is marketing material.
--
-- Key convention set by the upload route:
--   catalogues/<slug>/<uuid>.pdf
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-catalogues',
  'project-catalogues',
  true,
  26214400,                        -- 25 MB, matching the upload route's cap
  array['application/pdf']         -- refuses anything that is not a PDF, in the
                                   -- database, whatever a future caller sends
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public reads project catalogues" on storage.objects;
create policy "public reads project catalogues"
  on storage.objects for select
  using (bucket_id = 'project-catalogues');

drop policy if exists "admin writes project catalogues" on storage.objects;
create policy "admin writes project catalogues"
  on storage.objects for all to authenticated
  using (bucket_id = 'project-catalogues')
  with check (bucket_id = 'project-catalogues');


-- ---------------------------------------------------------------------------
-- D. Grants
-- ---------------------------------------------------------------------------
-- Nothing changes. Both altered tables keep the policies and revokes they were
-- created with: `projects` already allows anon to SELECT published rows (the
-- catalogue URL is public content), and `newsletter_subscribers` already allows
-- anon INSERT and nothing else — which is exactly what the download route needs
-- when the service-role key is absent, and still leaves the list unreadable.
--
-- Worth stating plainly because it is the security question this feature
-- raises: adding `source` does NOT make the subscriber list readable. anon had
-- no SELECT on that table before this migration and has none after it.
