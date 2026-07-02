"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { PROJECTS } from "@/lib/projects";
import { PeakMark } from "@/components/brand/PeakMark";

const INTERESTS = [
  "A residential development",
  "A commercial development",
  "Investment opportunity",
  "General enquiry",
];

export default function ContactForm() {
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const newErrors: Record<string, boolean> = {};
    ["name", "email", "message"].forEach((f) => {
      const v = String(data.get(f) ?? "").trim();
      if (!v) newErrors[f] = true;
    });
    const email = String(data.get("email") ?? "");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = true;

    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div
        ref={success}
        className="flex min-h-[30rem] flex-col items-center justify-center border border-hair bg-carbon p-10 text-center"
      >
        <PeakMark className="h-16 w-auto text-rose" strokeWidth={5} animated />
        <h3 className="mt-8 font-display text-4xl text-bone">Thank you.</h3>
        <p className="mt-4 max-w-sm font-body text-mist">
          Your enquiry has reached us. A member of the Makro Developers team will
          be in touch shortly — we look forward to speaking with you.
        </p>
        <button
          onClick={() => setSent(false)}
          className="mt-8 font-body text-sm text-rose underline-offset-4 hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  const fieldClass = (name: string) =>
    `w-full border-b bg-transparent py-4 font-body text-bone placeholder-fog outline-none transition-colors focus:border-rose ${
      errors[name] ? "border-rose-deep" : "border-hair-strong"
    }`;

  return (
    <form ref={form} onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div>
          <label className="eyebrow text-fog">Full name *</label>
          <input name="name" placeholder="Your name" className={`mt-2 ${fieldClass("name")}`} />
        </div>
        <div>
          <label className="eyebrow text-fog">Email *</label>
          <input
            name="email"
            type="email"
            placeholder="you@email.com"
            className={`mt-2 ${fieldClass("email")}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div>
          <label className="eyebrow text-fog">Phone</label>
          <input name="phone" placeholder="+94 …" className={`mt-2 ${fieldClass("phone")}`} />
        </div>
        <div>
          <label className="eyebrow text-fog">I&rsquo;m interested in</label>
          <select name="interest" className={`mt-2 ${fieldClass("interest")} cursor-pointer`}>
            {INTERESTS.map((o) => (
              <option key={o} value={o} className="bg-ink text-bone">
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="eyebrow text-fog">Project of interest</label>
        <select name="project" className={`mt-2 ${fieldClass("project")} cursor-pointer`}>
          <option value="" className="bg-ink text-bone">
            No specific project
          </option>
          {PROJECTS.map((p) => (
            <option key={p.slug} value={p.name} className="bg-ink text-bone">
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="eyebrow text-fog">Message *</label>
        <textarea
          name="message"
          rows={4}
          placeholder="Tell us how we can help…"
          className={`mt-2 resize-none ${fieldClass("message")}`}
        />
      </div>

      {Object.keys(errors).length > 0 && (
        <p className="font-body text-sm text-rose-deep">
          Please complete the required fields marked with *.
        </p>
      )}

      <button
        type="submit"
        className="group inline-flex items-center justify-center gap-3 self-start rounded-full bg-rose px-8 py-4 font-body text-ink transition-colors hover:bg-rose-soft"
      >
        Send enquiry
        <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
      </button>
    </form>
  );
}
