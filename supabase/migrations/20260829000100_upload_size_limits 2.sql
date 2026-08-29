-- ============================================================================
-- Upload size limits — 50 MB across every bucket
-- ============================================================================
--
-- Client direction, Aug 2026: uploaded photography was arriving over-compressed
-- and the 25 MB ceiling was forcing the client to export down before they even
-- reached the admin. Two things had to move together for that to be fixable:
--
--   1. the app side — app/api/admin/upload/route.ts now accepts 50 MB, stores a
--      3840px WebP master at quality 92, and next.config.ts serves every image
--      at quality 92 instead of next/image's default 75;
--   2. this file — Storage enforces its own per-bucket ceiling, and a bucket
--      whose limit is lower than the route's simply rejects the PUT with
--      "maximum allowed size", no matter what the route was willing to accept.
--
-- The four image buckets were created with NO file_size_limit at all, which
-- means they inherit the project's global limit — a value that lives in the
-- Supabase dashboard, is invisible from this repo, and differs between the
-- projects this schema gets applied to. Setting it explicitly per bucket makes
-- the ceiling a property of the migration rather than of whichever dashboard
-- someone last touched.
--
-- 52428800 = 50 * 1024 * 1024, matching MAX_UPLOAD_BYTES in the upload route.
-- Note this bounds the bytes that reach Storage. For images that is the
-- CONVERTED WebP, which is far smaller than the 50 MB original the client
-- picked; for catalogues it is the PDF itself, byte for byte.
--
-- Idempotent: every statement is an update guarded on the bucket existing, so
-- this is safe to re-run and safe to apply out of order with respect to the
-- migrations that create the buckets.
-- ============================================================================

-- Image buckets. allowed_mime_types stays NULL (unrestricted) exactly as the
-- creating migrations left it — the upload route is what guarantees the object
-- is a WebP, because it is the thing that encodes it. Narrowing the MIME list
-- here would also lock out the existing objects' content types on re-upload.
update storage.buckets
set file_size_limit = 52428800
where id in (
  'project-images',
  'projects-page-images',
  'selected-work-images',
  'blog-images'
);

-- The catalogue bucket was created WITH an explicit 25 MB limit and an
-- allowed_mime_types of {application/pdf}. Only the ceiling moves; the MIME
-- restriction is load-bearing (it is the database-level half of the "PDF only"
-- guarantee, the other half being the %PDF- magic-byte sniff in the route) and
-- must stay.
update storage.buckets
set file_size_limit = 52428800
where id = 'project-catalogues';

-- Report what actually changed, so applying this in the SQL editor shows the
-- new ceilings rather than a bare "Success".
select id, file_size_limit, allowed_mime_types
from storage.buckets
where id in (
  'project-images',
  'projects-page-images',
  'selected-work-images',
  'blog-images',
  'project-catalogues'
)
order by id;
