import { Suspense } from "react";
import type { Metadata } from "next";
import { PeakMark } from "@/components/brand/PeakMark";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import LoginForm from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <div className="section-light flex min-h-screen items-center justify-center bg-cream px-6 text-ink">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <PeakMark className="h-10 w-auto text-ink" strokeWidth={7} />
          <h1 className="mt-6 font-display text-3xl text-ink">Makro Admin</h1>
          <p className="mt-2 font-body text-sm text-ink/50">
            Sign in to manage inquiries, leads and projects.
          </p>
        </div>

        {isSupabaseConfigured ? (
          // LoginForm reads ?next= via useSearchParams, which needs a boundary.
          <Suspense fallback={<div className="mt-10 h-64" />}>
            <LoginForm />
          </Suspense>
        ) : (
          <div className="mt-10 border border-amber-300 bg-amber-50 p-5 font-body text-sm text-ink/70">
            <p className="font-medium text-ink">Supabase is not connected yet.</p>
            <p className="mt-2 leading-relaxed">
              Add your project URL and keys to{" "}
              <code className="font-mono text-xs">.env.local</code>, apply every file in{" "}
              <code className="font-mono text-xs">supabase/migrations/</code> in filename
              order in the Supabase SQL editor, create an admin user under Authentication →
              Users, then restart the dev server.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
