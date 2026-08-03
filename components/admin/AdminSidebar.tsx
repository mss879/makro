"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PeakMark } from "@/components/brand/PeakMark";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Menu order mirrors the workflow, not the schema: an inquiry arrives, gets
 * transferred into the CRM, and the content sections follow.
 */
const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/inquiries", label: "Inquiries" },
  { href: "/admin/crm", label: "CRM" },
  { href: "/admin/selected-work", label: "Selected Work" },
  { href: "/admin/blog", label: "Blogs" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/email-list", label: "Email List" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    if (!isSupabaseConfigured) return;
    setSigningOut(true);
    try {
      await createClient().auth.signOut();
      router.push("/admin/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  // Matches the item itself or anything nested under it, but never a sibling
  // that merely shares a prefix — a bare startsWith would light up "Blogs" on
  // a hypothetical /admin/blog-drafts, and every item is one segment deep.
  const isActive = (href: string) =>
    href === "/admin"
      ? pathname === "/admin"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Mobile bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-ink/10 bg-cream px-5 py-3 md:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <PeakMark className="h-4 w-auto text-ink" strokeWidth={10} />
          <span className="font-body text-xs uppercase tracking-[0.2em] text-ink">Makro Admin</span>
        </Link>
        <button
          onClick={() => setOpen((v) => !v)}
          className="font-body text-xs uppercase tracking-[0.18em] text-ink/60"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      <aside
        className={`${
          open ? "block" : "hidden"
        } fixed inset-x-0 top-[3.25rem] z-30 border-b border-ink/10 bg-cream px-5 py-4 md:sticky md:top-0 md:block md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r md:px-6 md:py-8`}
      >
        <Link href="/admin" className="hidden items-center gap-2.5 md:flex">
          <PeakMark className="h-5 w-auto text-ink" strokeWidth={9} />
          <span className="font-body text-xs uppercase tracking-[0.2em] text-ink">
            Makro Admin
          </span>
        </Link>

        <nav className="flex flex-col gap-1 md:mt-10">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`px-3 py-2 font-body text-sm transition-colors ${
                isActive(item.href)
                  ? "bg-ink text-cream"
                  : "text-ink/60 hover:bg-ink/5 hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-6 border-t border-ink/10 pt-4 md:absolute md:bottom-8 md:left-6 md:right-6 md:mt-0">
          <Link
            href="/"
            className="block px-3 py-2 font-body text-xs text-ink/50 transition-colors hover:text-ink"
          >
            View site →
          </Link>
          <button
            onClick={signOut}
            disabled={signingOut}
            className="block w-full px-3 py-2 text-left font-body text-xs text-ink/50 transition-colors hover:text-rose-deep disabled:opacity-50"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>
    </>
  );
}
