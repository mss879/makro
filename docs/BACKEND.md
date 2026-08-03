# Makro Developers — Backend & Admin Panel

The public site is a Next.js 16 App Router project. Everything editable —
inquiries, leads, projects, articles, the home-page Selected Work rail,
newsletter signups, page views — lives in **Supabase** (Postgres + Auth +
Storage), managed through an admin panel at `/admin`.

The site is built to run **without** Supabase credentials: public pages fall
back to the bundled content and write paths become no-ops that log a warning.
That keeps local development and client demos working before the backend
exists — but nothing is persisted until the steps below are done.

---

## 1. Setup

### 1.1 Create the Supabase project
<https://supabase.com/dashboard> → New project. Note the region (pick the one
closest to Sri Lanka) and the database password.

### 1.2 Fill in `.env.local`
Copy the values from **Settings → API**:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon / public key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key — server only, never commit>
PAGEVIEW_HASH_SALT=<any long random string>
NEXT_PUBLIC_SITE_URL=https://makrodevelopers.lk
```

Generate the salt with:

```bash
openssl rand -hex 32
```

### 1.3 Apply the migrations
Every table, policy, guard trigger, storage bucket and seed row lives in
[`supabase/migrations/`](../supabase/migrations). Apply **every file, in
filename order**, from `20260803000100_foundation.sql` through to
`20260803000800_email_list.sql`.

With the Supabase CLI, against a linked project:

```bash
supabase db push
```

Without the CLI: open **SQL Editor → New query**, then paste and run each file
one at a time, working down the list in filename order. Eight files, eight runs.

**The order is mandatory, not a convention.** The files are numbered in
dependency order and each one assumes the ones before it have already run —
`20260803000300_crm.sql` ALTERs the `inquiries` table that
`20260803000200_inquiries.sql` creates, and everything after
`20260803000100_foundation.sql` calls the helper functions that file defines.
Out of order, you get "relation does not exist" or "function does not exist".

Every file is idempotent: objects are created `if not exists`, triggers and
policies are dropped before they are recreated, buckets are `on conflict do
update`, and seeds are guarded with `where not exists`. Re-running one is a
no-op, so you never have to remember which have already been applied — when in
doubt, run the whole set again from the top.

### 1.4 Create the admin user
**Authentication → Users → Add user**, with *Auto Confirm User* enabled.
There is deliberately no public sign-up route — the only way in is a user you
create here.

### 1.5 Restart
```bash
npm run dev
```
Then sign in at <http://localhost:3000/admin>.

---

## 2. How the migrations are laid out

**One file per admin menu item**, plus a foundation file. Each one owns its
tables, its indexes, its guard triggers, its RLS policies, its storage bucket
and its seeds outright — so the whole backing store for a screen can be read,
audited and reasoned about in a single file.

| File | Menu item | Owns |
|---|---|---|
| `20260803000100_foundation.sql` | — | The `pgcrypto` extension and two pure helpers: `touch_updated_at()` (the single writer of every `updated_at`) and `assert_jsonb_array()` (pins jsonb columns to array shape inside CHECK constraints). No tables, no policies, no buckets. |
| `20260803000200_inquiries.sql` | 2. Inquiries | `inquiries` — the contact form's intake table. |
| `20260803000300_crm.sql` | 3. CRM | `pipelines`, `pipeline_stages`, `leads`; adds `inquiries.lead_id` back-reference; the whole stage-locking regime. **Seeds the default "Sales Pipeline" and its locked "New Leads" intake stage**, plus Contacted / Viewing Scheduled / Negotiation / Closed. |
| `20260803000400_dashboard.sql` | 1. Dashboard | `notes` and `page_views`. The rest of the Dashboard is counts and previews over other files' tables, so it owns nothing else. |
| `20260803000500_selected_work.sql` | 4. Selected Work | `selected_work_settings` (singleton: the on/off toggle + section copy), `selected_work_cards`, the `selected-work-images` bucket, and a seeded three-card rail. |
| `20260803000600_blog.sql` | 5. Blogs | `blog_posts`, the `blog-images` bucket, and the four `/insights` articles seeded verbatim from `lib/insights.ts`. |
| `20260803000700_projects.sql` | 6. Projects | `projects`, `project_images`, the `project-images` bucket, and the Makro Heights seed with its three gallery rows. |
| `20260803000800_email_list.sql` | 7. Email List | `newsletter_subscribers`. |

The file numbers follow **dependency** order, not menu order — the Dashboard is
menu item 1 but sits at `000400` because it is mostly a window onto tables the
other files create, and it can only be applied once they exist. Each file's
header comment names the menu item it belongs to and what it depends on.

There is deliberately no shared "grant admin access" or "create public bucket"
helper: any function in schema `public` is published by PostgREST as an RPC that
the anon key can call, so a helper running DDL on a caller-supplied table would
hand unauthenticated callers privileged DDL. The RLS and bucket blocks are
repeated inline in each file instead. That repetition is the point.

---

## 3. What the panel does

| Menu item | Route | Purpose |
|---|---|---|
| **Dashboard** | `/admin` | The **Notes** panel, inquiry / lead / subscriber counts, the 30-day page-view chart, top pages, recent inquiries, and a preview card for each of the other tabs. |
| **Inquiries** | `/admin/inquiries` | Everything submitted through the contact form. Select rows and **Transfer to CRM**. |
| **CRM** | `/admin/crm` | Kanban pipelines. Drag leads between stages, create additional pipelines with their own stages, view and edit each lead. |
| **Selected Work** | `/admin/selected-work` | The black side-scrolling rail on the home page: one on/off switch for the whole section, the intro and end-cap copy, and card CRUD with drag reorder. |
| **Blogs** | `/admin/blog` | CRUD for the `/insights` articles — cover art, excerpt and SEO copy, body sections, related links, draft/publish and ordering. |
| **Projects** | `/admin/projects` | Full CRUD for developments, with up to 5 images each. |
| **Email List** | `/admin/email-list` | Newsletter signups from the footer form, with CSV export. |

### The inquiry → lead flow
1. A visitor submits the contact form → a row lands in `inquiries` with
   `status = 'new'`.
2. In **Inquiries**, tick one or more rows and press **Transfer to CRM**.
3. Each becomes a lead in the **default pipeline's "New Leads" stage**, and the
   inquiry is marked `transferred` with a link to its lead.

Both the default pipeline and that intake stage are created by
`20260803000300_crm.sql`. If the CRM screen says "No pipelines yet", the
migrations have not been applied — see §1.3.

### Why "New Leads" cannot be edited
The default pipeline's first stage is the landing zone for every transferred
inquiry, so it is protected: `pipeline_stages.is_locked = true`. Rename,
reorder and delete are disabled in the UI **and** blocked by a Postgres trigger
(`guard_locked_stage`), so it cannot be removed by accident from either side.
The default pipeline itself is likewise undeletable (`guard_default_pipeline`),
and deleting a pipeline that still holds leads is refused rather than silently
cascading them away.

Every other pipeline and stage is fully editable, and you can create as many
pipelines as you like, each with its own stages.

### The Selected Work on/off switch
`selected_work_settings.enabled` is a **client-facing feature**, not a
maintenance flag: it turns the entire Selected Work band off on the live home
page — no section, no heading, no empty black strip — and back on again, with no
redeploy and without unpublishing a single card. Turning it off leaves every
card, image and line of copy exactly as it was, so switching it back on restores
the rail intact.

The row is readable by anonymous visitors *whatever the toggle says*. That is
deliberate and load-bearing: the home page is rendered with the anon key, and it
has to be able to read `enabled = false` in order to know to hide the section. A
policy that hid the row when the toggle was off would look identical to "never
configured", and the page would fall back to rendering the section it was just
told to take down. The row holds nothing but marketing copy.

The cards themselves are separate from `/projects` on purpose — they share no
rows, so the rail can be re-cut without touching a published project, and
deleting a project cannot empty the home page. A card links via an explicit
`href`, or failing that via `project_slug` (`/projects/<slug>`); with both
empty it renders as an unlinked panel.

### Blog sections
An article's body is a list of sections, each a heading plus paragraphs and an
optional bullet list. Two rules the form enforces and the database cannot:
headings are React keys within an article, so they must be unique per post, and
bullets are React keys within a section. A section with no bullets stores **no**
`points` key at all — an empty list is not the same thing, and would render an
empty `<ul>`.

### Images and uploads
All three content areas upload through `POST /api/admin/upload`, which:
- accepts any common image format (up to 25 MB in),
- honours EXIF rotation, resizes the long edge to max 2000 px,
- **converts to WebP** at quality 82 and strips metadata,
- stores it in the bucket for the requested target.

The request carries a `bucket` form field naming a **target**, not a bucket id —
caller input is never interpolated into a bucket name, it only ever selects one
of three fixed rows:

| `bucket` field | Storage bucket | Key convention |
|---|---|---|
| `project` (the default when the field is absent) | `project-images` | `projects/<project-slug>/<uuid>.webp` |
| `selected-work` | `selected-work-images` | `selected-work/<card-id>/<uuid>.webp` |
| `blog` | `blog-images` | `blog/<post-slug>/<uuid>.webp` |

Each bucket is created by the migration that owns the screen writing to it, and
all three are **public-read, authenticated-write**. The folder segment is
slugified, so a caller cannot climb out of the prefix with `../`; an empty or
unusable slug becomes `unsorted`.

The database stores the **full public URL**, never the bare storage key —
delete-on-replace recovers the key by splitting the stored URL on
`/storage/v1/object/public/<bucket>/`, so bucket ids are a contract with the
app, not a free choice. Image columns also accept a bare Unsplash photo id or a
local `/brand/*` path, which is how the seeded rows work with no upload at all.

### Project images specifically
The 5-image cap is enforced in three places — the UI, the upload route, and a
database trigger — so it cannot drift. The image at position 0 is the cover; it
feeds the project card, the detail hero, and the Open Graph image.

`project_images` carries a **deferrable** unique constraint on
`(project_id, position)`, checked at COMMIT rather than per statement, because
any reorder is a permutation and necessarily collides part-way through. Since
PostgREST wraps every request in its own transaction, the admin reorder writes
the whole gallery in a **single** upsert — one request per image would commit an
intermediate state on its own and be rejected there.

---

## 4. How the public site reads its content

Three `server-only` modules, one per content area, each with a bundled fallback:

| Module | Reads | Falls back to |
|---|---|---|
| `lib/projects-data.ts` | published `projects` + their images | the `PROJECTS` array in `lib/projects.ts` |
| `lib/blog-data.ts` | published `blog_posts` | the `INSIGHTS` array in `lib/insights.ts` |
| `lib/selected-work-data.ts` | `selected_work_settings` + published `selected_work_cards` | the bundled defaults in that same file |

The fallback fires when Supabase is **unconfigured or erroring** — not when it
answers with zero rows. Once the database is answering it is the source of
truth: unpublishing every project has to actually empty `/projects`, or the
admin panel would report "0 published" while the live site kept serving the
seeded flagship with no way to take it down. The one exception is the Selected
Work toggle, which is checked *before* the error branch: if the cards query
fails while the section is switched off, falling back would put straight back
onto the home page exactly what the client just took down.

The bundled fallbacks are the same literals the migrations seed, so a configured
project and an unconfigured one render the same pages.

Server Components call these modules and pass the result down to client
components as props. Publishing or editing anything revalidates the routes it
appears on — a project revalidates `/`, `/projects` and `/projects/[slug]`; an
article revalidates `/`, `/insights` and `/insights/[slug]`; a Selected Work
change revalidates `/` — so changes appear without a redeploy.

---

## 5. Security notes

- **Row Level Security is on for every table.** With the anon key, an
  anonymous visitor may do exactly this and nothing else:

  | | Tables |
  |---|---|
  | **INSERT** | `inquiries`, `page_views`, `newsletter_subscribers` |
  | **SELECT** | `projects` and `project_images` where the project is `published`; `blog_posts` where `published`; `selected_work_cards` where `published`; the `selected_work_settings` row unconditionally (see §3) |

  Everything else — `notes`, `leads`, `pipelines`, `pipeline_stages`, the
  subscriber list, and every unpublished draft — requires an authenticated
  admin session. The three public write paths are write-only: nobody can read
  other people's inquiries, the page-view table, or the mailing list back out.

- **The migrations revoke rather than rely on RLS alone.** Supabase's base image
  ships `alter default privileges … grant all on tables to anon`, so `anon`
  holds INSERT/SELECT/UPDATE/DELETE on every new table in `public` the moment it
  is created and RLS is the *only* gate. Each migration explicitly revokes the
  privileges anon does not need, so a future `alter table … disable row level
  security`, or a policy written `for all using (true)` without a
  `to authenticated` restriction, degrades to "permission denied" instead of
  full public read/write. The grant is the floor, RLS is the gate. Nothing is
  ever revoked from `authenticated`.

- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. It is used only in server-side
  paths (`lib/supabase/server.ts` → `createAdminSupabase()`, the upload route,
  the tracking route) and must never reach the browser or a git commit.

- Any signed-in Supabase user is a full admin. There is no role table and no
  public sign-up — admin users are created by hand in the dashboard, so
  "authenticated" and "admin" are the same set of people by construction.

- `proxy.ts` (Next 16's renamed middleware) redirects anonymous visitors away
  from `/admin`, but that is an *optimistic* gate. Every Server Action
  independently calls `requireUser()` — per Next.js guidance, a matcher change
  must never be able to silently unprotect a mutation.

- `/admin` and `/api` are disallowed in `robots.ts` and absent from the sitemap.

---

## 6. Analytics

Page views are **cookieless**. `components/analytics/TrackPageview.tsx` beacons
the pathname to `/api/track`, which stores a salted SHA-256 of
`IP + user-agent + salt + date`. That groups views into rough daily uniques
without storing anything identifying, and yesterday's hash cannot be linked to
today's. Admin routes and known bot user-agents are skipped.

This is intentionally minimal — enough for "how many people saw the site this
month", not a replacement for a full analytics product.

---

## 7. Before launch

- [ ] Fill in `.env.local` on the production host (Vercel → Project → Settings
      → Environment Variables) — the site silently drops inquiries until then.
- [ ] Apply **every file** in `supabase/migrations/`, in filename order, against
      the production project (`supabase db push`, or paste them one at a time).
- [ ] Confirm the production database has all twelve tables and that
      **Storage** lists `project-images`, `selected-work-images` and
      `blog-images`, all marked public.
- [ ] Create the production admin user.
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the real domain.
- [ ] Replace the placeholder `SOCIALS` links, phone and email in `lib/site.ts`.
- [ ] Confirm a test inquiry arrives in `/admin/inquiries` on production, and
      that **Transfer to CRM** lands it in the "New Leads" stage.
- [ ] Check the home page rail and `/insights` against the seeded content, and
      agree with the client whether the Selected Work section ships switched on.
