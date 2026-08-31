"use client";

import { useState } from "react";

/**
 * The access-code field on the "Coming soon" gate.
 *
 * Two submission paths, and both are real:
 *
 *   * With JavaScript, the submit handler posts JSON and reports the answer
 *     inline. On success it RELOADS rather than routing — the gate is being
 *     served by a rewrite of whatever URL the visitor asked for, so reloading
 *     that same URL is what re-runs the proxy, now with the cookie, and lands
 *     them on the page they originally wanted.
 *
 *   * Without it, the <form> posts natively to the same endpoint, which
 *     answers with a redirect. That is why `action` and `method` are set on the
 *     element rather than left to the handler: the gate is the entire site
 *     while the lock is on, and it should not be the one page that needs a
 *     working bundle to get past.
 */
export default function UnlockForm({
  note,
  initialError,
}: {
  note: string;
  /** Rendered on first paint for the no-JavaScript path, which arrives via ?error=. */
  initialError?: string;
}) {
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const code = String(new FormData(form).get("code") ?? "");

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/site-lock/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        // Not router.refresh(): the cookie has to be re-presented to the proxy,
        // and only a fresh document request does that.
        window.location.reload();
        return;
      }

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "That code could not be checked. Try again.");
    } catch {
      setError("That code could not be checked — check your connection and try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      method="post"
      action="/api/site-lock/unlock"
      onSubmit={submit}
      className="mt-10 w-full max-w-sm"
    >
      <label
        htmlFor="site-access-code"
        className="font-body text-[0.65rem] uppercase tracking-[0.28em] text-mist"
      >
        {note}
      </label>

      <div className="mt-3 flex items-stretch border border-hair-strong transition-colors focus-within:border-rose">
        <input
          id="site-access-code"
          name="code"
          type="password"
          autoComplete="off"
          // The code is handed out verbally and on paper — an autocapitalising
          // phone keyboard turning it into a different string is the single
          // most likely way a correct code gets typed wrong. Matching is
          // case-insensitive anyway (lib/site-lock/token.ts), so this only
          // saves the visitor the confusion of seeing it change as they type.
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          aria-describedby={error ? "site-access-error" : undefined}
          placeholder="Access code"
          className="min-w-0 flex-1 bg-transparent px-4 py-3 font-body text-sm text-bone outline-none placeholder:text-fog"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 border-l border-hair-strong px-5 font-body text-[0.7rem] uppercase tracking-[0.2em] text-rose transition-colors hover:bg-rose hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Checking…" : "Enter"}
        </button>
      </div>

      {error && (
        <p
          id="site-access-error"
          role="alert"
          className="mt-3 font-body text-xs text-rose-soft"
        >
          {error}
        </p>
      )}
    </form>
  );
}
