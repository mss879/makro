import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_KEY,
  SUPABASE_URL,
  isServiceRoleConfigured,
  isSupabaseConfigured,
} from "./config";
import type { Database } from "./types";

/**
 * Cookie-bound server client. Reads the signed-in admin's session, so RLS
 * applies as that user. Use in Server Components, Server Actions and Route
 * Handlers.
 */
export async function createServerSupabase() {
  if (!isSupabaseConfigured) return null;
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * Anonymous client with no session — for public reads (published projects).
 * Cheaper than the cookie-bound client and safe to call from cached paths.
 */
export function createAnonSupabase() {
  if (!isSupabaseConfigured) return null;
  return createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Service-role client — bypasses RLS. Only for trusted server paths that
 * cannot use a user session: anonymous inserts (page views) and storage
 * uploads. Never import this into a Client Component.
 */
export function createAdminSupabase() {
  if (!isServiceRoleConfigured) return null;
  return createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Client for anonymous public writes — inquiries, newsletter signups, page
 * views. Prefers the service-role client, but falls back to the anon client,
 * which RLS already grants INSERT on exactly those three tables.
 *
 * The fallback matters: `SUPABASE_SERVICE_ROLE_KEY` is the only non-public
 * variable, so it is the one most easily missed when setting up a deployment.
 * Without this, a half-configured environment would accept a customer's
 * enquiry, thank them, and drop it.
 */
export function createPublicWriteSupabase() {
  return createAdminSupabase() ?? createAnonSupabase();
}

/** Returns the signed-in admin user, or null. */
export async function getSessionUser() {
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Throws unless an admin is signed in. Call at the top of every admin action. */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated.");
  return user;
}
