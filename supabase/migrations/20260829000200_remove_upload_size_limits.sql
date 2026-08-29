-- ============================================================================
-- Remove the per-bucket upload size limits
-- ============================================================================
--
-- Client direction, Aug 2026: drop the ceiling entirely — any size image can be
-- uploaded. This reverses the size half of 20260829000100_upload_size_limits.sql
-- and returns every image bucket to the state its creating migration left it in:
-- no per-bucket ceiling at all.
--
-- WHAT NULL ACTUALLY MEANS. `storage.buckets.file_size_limit` is not "unlimited"
-- when NULL — it means "fall back to the project's GLOBAL upload limit", which
-- lives in the Supabase dashboard (Storage → Settings → Upload file size limit)
-- and is not reachable from SQL. So this migration removes the limit this repo
-- controls; the global limit is still there and is now the only Storage-side
-- ceiling. Raise it in the dashboard to match whatever the client actually wants,
-- otherwise a bucket with no limit still rejects anything above the project
-- default. That dashboard value is also hard-capped by the Supabase plan.
--
-- THIS FILE IS NOT SUFFICIENT ON ITS OWN. Storage is the LAST of three gates an
-- upload passes through, and it is the one that bites last:
--
--   1. the hosting platform's request body limit — the hard ceiling, and the one
--      that cannot be configured away in this repo. The upload is a normal
--      multipart POST to /api/admin/upload, so the file has to fit in a single
--      serverless request. Anything above that limit is rejected at the edge
--      before any of our code runs, with an error we do not control.
--   2. app/api/admin/upload/route.ts — MAX_UPLOAD_BYTES, currently 50 MB, which
--      returns a clean 413 ("That file is larger than 50 MB."). Four admin
--      components repeat that number in their copy and their 413 message:
--      ImageManager, CoverPicker, selected-work/ImageField, CatalogueField.
--   3. this file — the per-bucket ceiling, plus the global limit above.
--
-- Gate 2 still rejects at 50 MB after this runs, so applying this migration
-- alone changes nothing the client can see. Both have to move together, exactly
-- as they did on the way up.
--
-- Note what the bucket ceiling is actually measuring for images: the CONVERTED
-- WebP, not the file the client picked. The route re-encodes to a 3840px WebP
-- master before anything reaches Storage, so the stored object is typically a
-- small fraction of the original. The catalogue bucket is the exception — a PDF
-- is stored byte for byte, so there the ceiling applies to the real file size.
--
-- Idempotent: plain updates guarded on the bucket existing. Safe to re-run.
-- ============================================================================

-- The four image buckets. Back to NULL, which is how
-- 20260803000500 / 20260803000700 / 20260803000900 / 20260803000600 created them.
update storage.buckets
set file_size_limit = null
where id in (
  'project-images',
  'projects-page-images',
  'selected-work-images',
  'blog-images'
);

-- The catalogue bucket. Only the size ceiling is lifted.
--
-- allowed_mime_types STAYS {application/pdf} and must not be cleared here. It is
-- the database-level half of the "catalogues are PDFs" guarantee — the other
-- half being the %PDF- magic-byte sniff in the upload route — and it is a
-- content-type restriction, not a size one. Removing it would let any file type
-- be written into a bucket the site hands to visitors behind an email gate.
update storage.buckets
set file_size_limit = null
where id = 'project-catalogues';

-- Report the resulting state, so applying this in the SQL editor shows the
-- cleared ceilings rather than a bare "Success". file_size_limit should read
-- NULL on all five rows; allowed_mime_types should still read {application/pdf}
-- on project-catalogues and NULL on the image buckets.
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
