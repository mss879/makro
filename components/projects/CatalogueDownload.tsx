"use client";

import { useState } from "react";

/**
 * "Download the catalogue" — gated on an email address.
 *
 * The button expands into a single email field in place rather than opening a
 * modal: a modal for one input is a lot of ceremony, and it would have to trap
 * focus and manage scroll on a page that is already running Lenis and pinned
 * GSAP sections.
 *
 * The PDF's URL is never in the markup. It comes back from POST /api/catalogue
 * only after the address validates, so the gate cannot be skipped by reading
 * the page source. (The URL itself is public once handed over — the gate is
 * lead capture, not access control. See the route.)
 */
export default function CatalogueDownload({
  slug,
  projectName,
}: {
  slug: string;
  projectName: string;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/catalogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, slug }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "That did not work. Please try again.");
        return;
      }

      // A real anchor click, not window.open: popup blockers treat a
      // programmatic open() after an await as unsolicited, and this one would
      // be blocked in Safari roughly every time. `download` asks the browser to
      // save it under the project's name rather than the uuid storage key.
      const link = document.createElement("a");
      link.href = data.url;
      link.download = data.filename ?? "catalogue.pdf";
      link.rel = "noopener";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      link.remove();

      setDone(true);
    } catch {
      setError("We could not reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="border border-hair bg-shell px-5 py-4">
        <p className="font-body text-sm text-ink">
          Your download has started. Thank you — we will keep you posted on{" "}
          {projectName}.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex w-full items-center justify-center gap-3 border border-hair-strong px-6 py-4 font-body text-ink transition-colors hover:border-rose-deep hover:text-rose-deep"
      >
        Download the catalogue
        <span aria-hidden="true" className="transition-transform duration-500 group-hover:translate-y-0.5">
          ↓
        </span>
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="border border-hair bg-shell px-5 py-4">
      <label className="block">
        <span className="font-body text-xs text-mist">
          Enter your email and the catalogue will download.
        </span>
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          aria-label="Your email address"
          className="mt-2 w-full border border-hair-strong bg-cream px-3 py-2.5 font-body text-sm text-ink outline-none transition-colors placeholder:text-fog focus:border-rose-deep"
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 bg-ink px-5 py-2.5 font-body text-sm text-bone transition-colors hover:bg-rose-deep hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Preparing…" : "Download"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="font-body text-sm text-mist transition-colors hover:text-rose-deep"
        >
          Cancel
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 font-body text-sm text-rose-deep">
          {error}
        </p>
      )}

      <p className="mt-3 font-body text-xs leading-relaxed text-fog">
        We will email you occasionally about {projectName}. You can unsubscribe
        at any time.
      </p>
    </form>
  );
}
