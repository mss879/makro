"use client";

import { useSyncExternalStore } from "react";

/**
 * Light/dark switch for the admin panel.
 *
 * The panel defaults to DARK (client, Aug 2026) and this is the opt-out. It
 * writes `data-admin-theme` on <html>, which is the hook the light palette in
 * app/globals.css is scoped to — so flipping it re-points the `--color-panel-*`
 * tokens and the entire panel follows without a single component re-rendering.
 *
 * The choice is per browser, not per account: it is a comfort setting about the
 * screen in front of you, not something to sync across devices.
 */

export const ADMIN_THEME_KEY = "makro-admin-theme";

/**
 * Runs before first paint, inlined by the panel layout.
 *
 * Without it a light-mode admin loads the dark palette (the default in @theme),
 * then gets repainted light the moment React hydrates — a full-page flash on
 * every single navigation. Reading localStorage in an effect is too late by
 * definition; this has to be a blocking script in <head>.
 *
 * Kept as a string beside the component that owns the key, so the two cannot
 * drift apart. Wrapped in try/catch because localStorage throws outright in
 * some privacy modes, and a thrown error here would block the page.
 */
export const ADMIN_THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${ADMIN_THEME_KEY}');if(t==='light')document.documentElement.setAttribute('data-admin-theme','light');}catch(e){}})();`;

type Theme = "dark" | "light";

/**
 * The theme is external state — it lives on the <html> element, is written by
 * a script that runs before React exists, and can change in another tab. That
 * is precisely what useSyncExternalStore is for, and it is why this is not
 * useState + useEffect: reading localStorage into state inside an effect
 * renders one frame with the wrong answer, every time.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // `storage` fires in OTHER tabs, so two open admin tabs stay in step.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Reads the DOM, not localStorage — the attribute is what is actually painted. */
function getSnapshot(): Theme {
  return document.documentElement.getAttribute("data-admin-theme") === "light"
    ? "light"
    : "dark";
}

/**
 * Used for SSR and for the hydration render, so the markup React builds on the
 * client matches what the server sent. React then immediately re-renders with
 * the real snapshot, which is why the label can settle a frame later without a
 * hydration mismatch. The painted theme never flickers — the inline script
 * above set that before first paint.
 */
function getServerSnapshot(): Theme {
  return "dark";
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    if (next === "light") {
      document.documentElement.setAttribute("data-admin-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-admin-theme");
    }
    try {
      localStorage.setItem(ADMIN_THEME_KEY, next);
    } catch {
      /* private mode — the switch still works for this page load */
    }
    // Same-tab subscribers; `storage` only fires in other tabs.
    listeners.forEach((l) => l());
  };

  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={isLight}
      aria-label="Light mode"
      title={isLight ? "Switch to dark mode" : "Switch to light mode"}
      className="flex w-full items-center justify-between gap-3 border border-panel-line px-3 py-2 font-body text-xs text-panel-muted transition-colors hover:border-panel-line-strong hover:text-panel-text"
    >
      <span className="flex items-center gap-2">
        {/* aria-hidden: the button's own label already says what this is. */}
        <span aria-hidden="true">{isLight ? "☀" : "☾"}</span>
        {isLight ? "Light mode" : "Dark mode"}
      </span>

      <span
        aria-hidden="true"
        className={`relative inline-flex h-4 w-8 shrink-0 items-center border transition-colors ${
          isLight ? "border-rose bg-rose" : "border-panel-line-strong bg-panel-high"
        }`}
      >
        <span
          className={`absolute top-[2px] h-3 w-3.5 transition-all ${
            isLight ? "left-[1.0625rem] bg-ink" : "left-[2px] bg-panel-faint"
          }`}
        />
      </span>
    </button>
  );
}
