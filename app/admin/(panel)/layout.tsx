import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { ADMIN_THEME_SCRIPT } from "@/components/admin/ThemeToggle";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// The panel reads live data on every request — never prerender or cache it.
export const dynamic = "force-dynamic";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The proxy already redirects anonymous visitors; this is the belt to its
  // braces, and it is what makes the layout safe if the matcher ever changes.
  if (isSupabaseConfigured) {
    const user = await getSessionUser();
    if (!user) redirect("/admin/login");
  } else if (process.env.NODE_ENV === "production") {
    // Fail closed: without Supabase there is no auth to check, and a
    // production deployment must never serve the panel unauthenticated.
    // Development keeps the credential-less local demo working.
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen bg-panel text-panel-text">
      {/* Applies the saved light/dark choice BEFORE first paint. An effect
          would run after the dark default had already painted, flashing the
          whole panel on every navigation. */}
      <script dangerouslySetInnerHTML={{ __html: ADMIN_THEME_SCRIPT }} />
      <AdminSidebar />
      {/* pt clears the fixed mobile top bar rendered by AdminSidebar */}
      <main className="min-w-0 flex-1 px-6 pb-12 pt-20 md:px-10 md:py-10">{children}</main>
    </div>
  );
}
