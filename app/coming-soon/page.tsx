import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PeakMark } from "@/components/brand/PeakMark";
import UnlockForm from "@/components/site-lock/UnlockForm";
import { readSiteLockCopy } from "@/lib/site-lock/settings";
import { getSessionUser } from "@/lib/supabase/server";
import { SITE } from "@/lib/site";
import type { UnlockErrorCode } from "@/app/api/site-lock/unlock/route";

/**
 * The gate the whole public site is replaced by while the lock is on.
 *
 * It lives OUTSIDE the (site) route group on purpose, and that is the whole
 * design: no navbar, no footer, no preloader, no smooth scroll, no chat widget.
 * A holding page that carries the site's navigation is a holding page you can
 * click straight past — and every one of those links would only bounce off the
 * proxy and land back here anyway.
 *
 * Reached by REWRITE from proxy.ts, so the visitor's URL is whatever they asked
 * for. Which means this page must not assume it is at /coming-soon, must not
 * link anywhere inside the site, and must recover by reloading rather than by
 * routing once the code is accepted.
 */

export const metadata: Metadata = {
  title: "Coming soon",
  // Belt to the X-Robots-Tag header the proxy sets on the rewrite. Every URL on
  // the site is serving this page right now; without both of these, a launch
  // starts with the whole sitemap indexed as "Coming soon".
  robots: { index: false, follow: false },
};

// The lock is a live switch. Prerendering this would let a build-time snapshot
// of the copy — or of the enabled flag — outlive the client turning it off.
export const dynamic = "force-dynamic";

/**
 * The gate's own copy for each failure, keyed by the code the unlock endpoint
 * puts in the query string. The endpoint deliberately does not send prose (see
 * the note on UnlockErrorCode): a message that travels through a URL is a
 * message anyone can rewrite before handing the link to someone else.
 */
const ERRORS: Record<UnlockErrorCode, string> = {
  empty: "Enter the access code to continue.",
  rate: "Too many attempts — wait a minute and try again.",
  unavailable: "Access codes are unavailable right now. Please try again later.",
  closed: "This site is not accepting access codes at the moment.",
  invalid: "That code is not recognised.",
};

function errorFor(value: string | string[] | undefined): string | undefined {
  const key = Array.isArray(value) ? value[0] : value;
  return key && key in ERRORS ? ERRORS[key as UnlockErrorCode] : undefined;
}

export default async function ComingSoonPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [copy, params] = await Promise.all([readSiteLockCopy(), searchParams]);

  // The site is open, so nobody arrived here by rewrite — they typed the URL.
  // Two different people do that, and they want opposite things.
  //
  // A visitor gets sent home: the gate is not a page of the website, it is what
  // stands in for the website, and there is nothing here for them.
  //
  // A signed-in admin gets the page. Writing the holding copy is something you
  // do BEFORE locking the site, and a preview you can only see by taking the
  // site down first is not a preview. The auth check is paid for only on this
  // branch — a genuinely gated request never reaches it, because those arrive
  // while `enabled` is true.
  //
  // `enabled` false here is always a real read: a failed read defaults to
  // enabled (see DEFAULT_SITE_LOCK_COPY) precisely so a database blip cannot
  // redirect a gated visitor into the site the client asked to hide.
  const previewing = !copy.enabled;
  if (previewing && !(await getSessionUser())) redirect("/");

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-20 text-center">
      {/* A single rose wash off the top edge — the same restraint the site's
          dark bands use. Nothing animates: this page may be someone's only
          impression of the brand, and a holding page that performs reads as
          less finished than one that simply sits there. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[45vh] bg-[radial-gradient(ellipse_at_top,rgba(226,163,136,0.12),transparent_70%)]"
      />

      {previewing && (
        <p className="absolute inset-x-0 top-0 bg-rose px-4 py-2 text-center font-body text-[0.7rem] uppercase tracking-[0.2em] text-ink">
          Preview — the site is not locked. Visitors see the real website.
        </p>
      )}

      <div className="relative flex w-full max-w-2xl flex-col items-center">
        <div className="flex flex-col items-center gap-4">
          <PeakMark className="h-10 w-auto text-rose md:h-12" strokeWidth={8} />
          <span className="font-body text-[0.7rem] uppercase tracking-[0.34em] text-bone md:text-[0.8rem]">
            Makro <span className="opacity-60">Developers</span>
          </span>
        </div>

        <div className="mt-14 h-px w-16 bg-hair-strong" />

        {copy.eyebrow && (
          <p className="mt-14 font-body text-[0.65rem] uppercase tracking-[0.32em] text-rose">
            {copy.eyebrow}
          </p>
        )}

        <h1 className="mt-6 text-balance font-display text-4xl leading-[1.1] text-bone md:text-6xl">
          {copy.heading}
        </h1>

        {copy.body && (
          <p className="mt-7 max-w-xl text-pretty font-body text-sm leading-relaxed text-mist md:text-base">
            {copy.body}
          </p>
        )}

        {/*
          An empty `note` hides the field entirely — the client's way of showing
          a gate that nobody is invited to try to open. The endpoint still
          refuses on its own; this is the invitation, not the lock.
        */}
        {copy.note && (
          <UnlockForm note={copy.note} initialError={errorFor(params.error)} />
        )}

        {copy.showContact && (
          <div className="mt-16 flex flex-col items-center gap-2 border-t border-hair pt-10">
            <p className="font-body text-[0.6rem] uppercase tracking-[0.3em] text-fog">
              In the meantime
            </p>
            {/* mailto:/tel: only — every in-site link from here is a link back
                to here. These are the two ways to reach a locked company. */}
            <a
              href={`mailto:${SITE.email}`}
              className="font-body text-sm text-bone transition-colors hover:text-rose"
            >
              {SITE.email}
            </a>
            <a
              href={`tel:${SITE.phone.replace(/\s+/g, "")}`}
              className="font-body text-sm text-mist transition-colors hover:text-rose"
            >
              {SITE.phone}
            </a>
          </div>
        )}

        <p className="mt-14 font-body text-[0.6rem] uppercase tracking-[0.24em] text-fog">
          © {new Date().getFullYear()} {SITE.legal}
        </p>
      </div>
    </main>
  );
}
