"use client";

import { useEffect, useState } from "react";

/**
 * Keeps the site's floating buttons off the hero on a phone.
 *
 * Client direction, Aug 2026, for the chat launcher: "as the user enters hide
 * the chat icon so it's not messy". Every hero seats its glass plate in the
 * bottom-left corner, and on a 375px screen that plate is most of the width,
 * so anything fixed to the bottom-right lands on it. The WhatsApp button
 * (Sep 2026) shares that corner, so it shares the rule — two copies of it
 * would drift the first time one was tuned. The full reasoning sits where it
 * started, above the launcher in components/chat/ChatWidget.tsx.
 */

/**
 * True when a floating button should be out of the way: a phone-width
 * viewport, still inside the first screenful.
 *
 * 768px is Tailwind's `md`, the same breakpoint the buttons' own bottom/right
 * offsets switch at. 60% of a viewport height rather than the whole of one, so
 * the button is already arriving as the hero leaves rather than appearing from
 * nowhere once it has gone.
 */
export function isStowedOnPhone(): boolean {
  if (typeof window === "undefined") return false;
  if (!window.matchMedia("(max-width: 767px)").matches) return false;
  return window.scrollY < window.innerHeight * 0.6;
}

/**
 * `initial` is the answer before the first check runs. The chat widget is
 * client-only, so it can work out the real one up front (pass
 * isStowedOnPhone); a server-rendered button has to match its HTML on
 * hydration, so it passes true and lets the first check bring it in.
 */
export function useStowedOnPhone(initial: boolean | (() => boolean)): boolean {
  const [stowed, setStowed] = useState(initial);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    // Cheap enough to run unthrottled: scrollY does not force layout, and
    // React bails out of the re-render when the boolean has not changed, so a
    // scroll through the hero costs one render, not one per event.
    const check = () => setStowed(isStowedOnPhone());

    check();
    window.addEventListener("scroll", check, { passive: true });
    // Rotating a phone, or crossing the breakpoint on a resized desktop
    // window, changes the answer without any scrolling.
    window.addEventListener("resize", check);
    mq.addEventListener("change", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      mq.removeEventListener("change", check);
    };
  }, []);

  return stowed;
}
