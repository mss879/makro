-- ============================================================================
-- 20260910000100_projects_page_faq_single_link.sql
--
-- Admin menu item 6 — "Projects", FAQ tab: the second link goes.
--
-- The FAQ that closes /projects carried two links: "Ask us directly" (/contact)
-- and "View all questions" (/faq). Client direction, 2026-09-10: remove the
-- second, and keep the FAQ on /projects only. /faq was a hard-coded page the
-- admin could not edit; it is retired in the same change and now redirects to
-- /projects#faq (next.config.ts), so the second link had nowhere left to point.
--
-- Three changes to public.projects_page_settings:
--   1. faq_body — the shipped standfirst ended "…or browse the full FAQ", a page
--      that no longer exists. Rewritten ONLY where it is still that default, so
--      copy already edited in the admin is left exactly as it is. The
--      replacement is the client's own wording, taken from the live admin.
--   2. faq_body's column default follows, so a fresh database agrees.
--   3. faq_secondary_label / faq_secondary_href are dropped.
--
-- ORDER: DEPLOY THE CODE FIRST, THEN APPLY THIS. The new build neither reads nor
-- writes the two columns, so it does not care whether they exist. The previous
-- build's "Save FAQ settings" still writes them, and would fail against a table
-- that no longer has them.
--
-- Depends on: 20260830000100_projects_page_faq.sql — the faq_* columns
--
-- Idempotent: safe to re-apply.
-- ============================================================================

-- Both apostrophe styles: the migration wrote straight quotes, the bundled
-- fallback in lib/projects-page-data.ts used typographic ones, and an admin
-- save of an untouched form stores whichever the form was showing.
update public.projects_page_settings
set faq_body = 'Can''t find what you''re looking for? Reach out to our team directly.'
where faq_body in (
  'Can''t find what you''re looking for? Ask us directly, or browse the full FAQ.',
  'Can’t find what you’re looking for? Ask us directly, or browse the full FAQ.'
);

alter table public.projects_page_settings
  alter column faq_body set default 'Can''t find what you''re looking for? Reach out to our team directly.';

alter table public.projects_page_settings
  drop column if exists faq_secondary_label;

alter table public.projects_page_settings
  drop column if exists faq_secondary_href;
