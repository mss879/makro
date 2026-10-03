"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Keeps the site's floating buttons — the chat launcher and the WhatsApp
 * button — off the hero, at every width.
 *
 * Phones first (client, Aug 2026, for the chat launcher: "as the user enters
 * hide the chat icon so it's not messy"): every hero then seated its copy in
 * the bottom-left corner, and on a 375px screen that copy is most of the
 * width, so anything fixed to the bottom-right landed on it. Desktop joined in
 * Oct 2026 ("hide the WhatsApp button and the AI agent widget in the hero, make
 * them appear as the user scrolls past the hero section"), when the home
 * hero's copy moved into a band across the whole foot of the screen — right
 * under the buttons' corner.
 *
 * Both buttons share this one rule; two copies of it would drift the first
 * time one was tuned.
 */

/** Every hero section carries this attribute. A page without one has nothing to keep clear of. */
const HERO = "[data-hero]";

/**
 * True while the page's hero still fills most of the screen: until its bottom
 * edge rises above 40% of the viewport.
 *
 * For a full-height hero that is 60% of a screen of scrolling — the point the
 * phone-only rule always used, chosen so the buttons are already arriving as
 * the hero leaves rather than appearing from nowhere once it has gone. It is
 * measured from the hero itself rather than as a scroll distance, so a shorter
 * hero lets them in sooner, a visitor deep-linked part-way down gets them at
 * once, and a page with no hero at all (Contact) shows them from the start.
 */
export function isStowedOverHero(): boolean {
  if (typeof document === "undefined") return false;
  const hero = document.querySelector(HERO);
  if (!hero) return false;
  return hero.getBoundingClientRect().bottom > window.innerHeight * 0.4;
}

/**
 * `initial` is the answer before the first check runs. The chat widget is
 * client-only, so it can work out the real one up front (pass
 * isStowedOverHero); a server-rendered button has to match its HTML on
 * hydration, so it passes true and lets the first check bring it in.
 */
export function useStowedOverHero(initial: boolean | (() => boolean)): boolean {
  const [stowed, setStowed] = useState(initial);
  // Both buttons sit in the persistent site layout and outlive every page, so
  // the hero they watch has to be looked up afresh on each route.
  const pathname = usePathname();

  useEffect(() => {
    // The page that has just arrived, answered now rather than a frame later
    // when the observer first reports — coming from a page where the buttons
    // were showing, that frame would flash them over the new hero.
    const check = () => setStowed(isStowedOverHero());
    check();

    const hero = document.querySelector(HERO);
    if (!hero) return;

    // An observer, not a scroll listener: the browser works out the crossing
    // itself, so scrolling the page costs nothing here, and a resize or a
    // rotation is covered without a listener of its own. Pulling the root's
    // top edge down by 40% leaves the lower 60% of the screen, which the hero
    // overlaps exactly while its bottom edge is below that 40% line — the same
    // test as isStowedOverHero above.
    const io = new IntersectionObserver(([entry]) => setStowed(entry.isIntersecting), {
      rootMargin: "-40% 0px 0px 0px",
    });
    io.observe(hero);
    return () => io.disconnect();
  }, [pathname]);

  return stowed;
}
