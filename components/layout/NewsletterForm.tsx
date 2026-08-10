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
    <form
      action={formAction}
      className="grid gap-7 lg:grid-cols-12 lg:items-center lg:gap-x-8"
    >
      <div className="lg:col-span-5">
        <label
          htmlFor="nl-email"
          className="block font-display text-xl leading-tight text-bone md:text-2xl"
        >
          Join our newsletter
        </label>
        <p
          aria-live="polite"
          className={`mt-2 font-body text-sm leading-relaxed ${
            state.message ? "text-rose" : "text-mist"
          }`}
        >
          {state.message || "Project news, a few times a year."}
        </p>
      </div>

      {/* Ends flush at column 12 so the field lines up with the legal bar
          and the CTA link above it. Sized by the grid rather than by
          justify-between, which let the label shrink-wrap and opened a
          dead gap across the middle on wide screens. */}
      <div className="flex w-full items-stretch gap-3 sm:gap-4 lg:col-span-5 lg:col-start-8">
        <input
          id="nl-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Email address"
          className="w-full border border-hair-strong bg-white/5 px-4 py-3.5 font-body text-sm text-bone transition-colors placeholder:text-fog focus:border-rose focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="group inline-flex shrink-0 items-center gap-2.5 bg-rose px-6 py-3.5 font-body text-sm text-ink transition-colors hover:bg-rose-soft disabled:cursor-not-allowed disabled:opacity-50 sm:px-7"
        >
          {pending ? "Joining" : "Subscribe"}
          <span className="transition-transform duration-500 group-hover:translate-x-0.5">
            →
          </span>
        </button>
      </div>
    </form>
  );
}
