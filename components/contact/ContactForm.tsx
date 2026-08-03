"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import type { Project } from "@/lib/projects";
import { PeakMark } from "@/components/brand/PeakMark";
import { submitInquiry } from "@/app/actions/contact";

const INTERESTS = [
  "A residential development",
  "A commercial development",
  "Investment opportunity",
  "General enquiry",
];

const SEND_FAILED =
  "We could not send your message just now. Please try again, or email us directly.";

/** Projects come from the server page so the dropdown tracks the admin panel. */
export default function ContactForm({ projects }: { projects: Project[] }) {
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const success = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (sent && success.current) {
        gsap.fromTo(
          success.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }
        );
        const paths = success.current.querySelectorAll<SVGPathElement>(".peak-draw");
        paths.forEach((p) => {
          const len = p.getTotalLength();
          gsap.fromTo(
            p,
            { strokeDasharray: len, strokeDashoffset: len },
            { strokeDashoffset: 0, duration: 1.2, ease: "power2.inOut", stagger: 0.2 }
          );
        });
      }
    },
    { dependencies: [sent] }
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;

    // Read the form before any await — `currentTarget` is null once the event
    // has been handled.
    const data = new FormData(e.currentTarget);
    const newErrors: Record<string, boolean> = {};
    ["name", "email", "message"].forEach((f) => {
      const v = String(data.get(f) ?? "").trim();
      if (!v) newErrors[f] = true;
    });
    const email = String(data.get("email") ?? "");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = true;

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setFormError(null);
    setSending(true);
    try {
      // Persists the enquiry as a row in `inquiries`, which is what the admin
      // panel reads. Only celebrate once it is actually stored.
      const result = await submitInquiry(data);
      if (result.ok) setSent(true);
      else setFormError(result.message || SEND_FAILED);
    } catch {
      setFormError(SEND_FAILED);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div
        ref={success}
        className="flex min-h-[30rem] flex-col items-center justify-center border border-hair bg-shell p-10 text-center"
      >
        <PeakMark className="h-16 w-auto text-rose-deep" strokeWidth={5} animated />
        <h3 className="mt-8 font-display text-4xl text-ink">Thank you.</h3>
        <p className="mt-4 max-w-sm font-body text-mist">
          We&rsquo;ve received your enquiry and a member of our team will be in
          touch within one business day.
        </p>
        <button
          onClick={() => {
            setSent(false);
            setFormError(null);
          }}
          className="mt-8 font-body text-sm text-rose-deep underline-offset-4 hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  const fieldClass = (name: string) =>
    `w-full border-b bg-transparent py-4 font-body text-ink placeholder-fog outline-none transition-colors focus:border-rose-deep ${
      errors[name] ? "border-rose-deep" : "border-hair-strong"
    }`;

  return (
    <form ref={form} onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div>
          <label htmlFor="cf-name" className="eyebrow text-fog">Full name*</label>
          <input
            id="cf-name"
            name="name"
            placeholder="Your name"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "cf-name-error" : undefined}
            className={`mt-2 ${fieldClass("name")}`}
          />
          {errors.name && (
            <p id="cf-name-error" role="alert" className="mt-2 font-body text-xs text-rose-deep">This field is required.</p>
          )}
        </div>
        <div>
          <label htmlFor="cf-email" className="eyebrow text-fog">Email*</label>
          <input
            id="cf-email"
            name="email"
            type="email"
            placeholder="you@email.com"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "cf-email-error" : undefined}
            className={`mt-2 ${fieldClass("email")}`}
          />
          {errors.email && (
            <p id="cf-email-error" role="alert" className="mt-2 font-body text-xs text-rose-deep">This field is required.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div>
          <label htmlFor="cf-phone" className="eyebrow text-fog">Phone (optional)</label>
          <input id="cf-phone" name="phone" placeholder="+94 …" className={`mt-2 ${fieldClass("phone")}`} />
        </div>
        <div>
          <label htmlFor="cf-interest" className="eyebrow text-fog">I&rsquo;m interested in*</label>
          <select id="cf-interest" name="interest" className={`mt-2 ${fieldClass("interest")} cursor-pointer`}>
            {INTERESTS.map((o) => (
              <option key={o} value={o} className="bg-bone text-ink">
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="cf-project" className="eyebrow text-fog">Project of interest</label>
        <select id="cf-project" name="project" className={`mt-2 ${fieldClass("project")} cursor-pointer`}>
          <option value="" className="bg-bone text-ink">
            No specific project
          </option>
          {projects.map((p) => (
            <option key={p.slug} value={p.name} className="bg-bone text-ink">
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="cf-message" className="eyebrow text-fog">Message*</label>
        <textarea
          id="cf-message"
          name="message"
          rows={4}
          placeholder="Tell us how we can help…"
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? "cf-message-error" : undefined}
          className={`mt-2 resize-none ${fieldClass("message")}`}
        />
        {errors.message && (
          <p id="cf-message-error" role="alert" className="mt-2 font-body text-xs text-rose-deep">This field is required.</p>
        )}
      </div>

      {/* Honeypot. Invisible to people, irresistible to bots — the server
          action rejects any submission that fills it in. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="pointer-events-none absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <div className="flex flex-col gap-4">
        <button
          type="submit"
          disabled={sending}
          className="group inline-flex items-center justify-center gap-3 self-start bg-ink px-8 py-4 font-body text-bone transition-colors hover:bg-rose-deep hover:text-ink disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-ink disabled:hover:text-bone"
        >
          {sending ? "Sending…" : "Send enquiry"}
          <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
        </button>

        {formError && (
          <p role="alert" className="font-body text-sm text-rose-deep">
            {formError}
          </p>
        )}
      </div>
    </form>
  );
}
