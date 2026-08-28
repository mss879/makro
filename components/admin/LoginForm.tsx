"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buttonClass, inputClass } from "@/components/admin/ui";

/**
 * Email + password sign-in. There is deliberately no sign-up flow — admin
 * users are created by hand in the Supabase dashboard.
 */
export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setError(null);

    const { error: signInError } = await createClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? "That email and password combination was not recognised."
          : signInError.message
      );
      setPending(false);
      return;
    }

    const next = params.get("next");
    router.push(next && next.startsWith("/admin") ? next : "/admin");
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="mt-10 flex flex-col gap-4">
      <label className="block">
        <span className="font-body text-[0.7rem] uppercase tracking-[0.22em] text-panel-faint">
          Email
        </span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`mt-2 ${inputClass}`}
        />
      </label>

      <label className="block">
        <span className="font-body text-[0.7rem] uppercase tracking-[0.22em] text-panel-faint">
          Password
        </span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`mt-2 ${inputClass}`}
        />
      </label>

      {error && (
        <p role="alert" className="font-body text-sm text-danger">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className={buttonClass("primary", "mt-2 w-full py-3")}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
