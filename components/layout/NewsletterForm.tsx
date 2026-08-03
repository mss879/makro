"use client";

import { useActionState } from "react";
import { subscribeToNewsletter } from "@/app/actions/newsletter";

/**
 * Footer newsletter signup — a single hairline-underlined field on the dark
 * carbon surface, deliberately quieter than the page's contact form. The
 * reassurance line doubles as the live region for the action's reply.
 */
export default function NewsletterForm() {
  const [state, formAction, pending] = useActionState(subscribeToNewsletter, {
    ok: false,
    message: "",
  });

  return (
    <form action={formAction} className="max-w-xs">
      <label htmlFor="nl-email" className="eyebrow text-fog">
        Join our newsletter
      </label>

      <div className="mt-3 flex items-center border-b border-hair-strong transition-colors focus-within:border-rose">
        <input
          id="nl-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Email address"
          className="w-full bg-transparent py-2.5 font-body text-sm text-bone placeholder:text-fog focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Subscribe"
          disabled={pending}
          className="group p-2 text-rose transition-colors hover:text-rose-soft disabled:opacity-40"
        >
          <span className="block transition-transform duration-500 group-hover:translate-x-0.5">
            →
          </span>
        </button>
      </div>

      <p aria-live="polite" className="mt-2 font-body text-[0.7rem] leading-relaxed text-fog">
        {state.message || "Project news, a few times a year."}
      </p>
    </form>
  );
}
