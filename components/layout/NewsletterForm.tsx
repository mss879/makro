"use client";

import { useActionState } from "react";
import { subscribeToNewsletter } from "@/app/actions/newsletter";

/**
 * Footer newsletter signup — rebuilt Aug 2026 (client direction: the old
 * hairline field tucked under the logo was going unnoticed). It now runs
 * as its own band across the footer: a display-scale invitation on the
 * left, a filled field and a solid rose button on the right, so it reads
 * as an object rather than another line of footer text. The reassurance
 * line doubles as the live region for the action's reply.
 */
export default function NewsletterForm() {
  const [state, formAction, pending] = useActionState(subscribeToNewsletter, {
    ok: false,
    message: "",
  });

  return (
    <form action={formAction} className="w-full max-w-sm">
      <label
        htmlFor="nl-email"
        className="block font-display text-base text-bone md:text-lg"
      >
        Join our newsletter
      </label>
      <p
        aria-live="polite"
        className={`mt-1 font-body text-xs leading-relaxed ${
          state.message ? "text-rose" : "text-mist"
        }`}
      >
        {state.message || "Project news, a few times a year."}
      </p>

      <div className="mt-3 flex w-full items-stretch gap-2">
        <input
          id="nl-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Email address"
          className="w-full border border-hair-strong bg-white/5 px-3.5 py-2.5 font-body text-sm text-bone transition-colors placeholder:text-fog focus:border-rose focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Subscribe to newsletter"
          className="group inline-flex shrink-0 items-center justify-center bg-rose px-4 py-2.5 font-body text-sm font-medium text-ink transition-colors hover:bg-rose-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "..." : "→"}
        </button>
      </div>
    </form>
  );
}
