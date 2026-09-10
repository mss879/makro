"use client";

import { SocialIcon } from "@/components/brand/SocialIcon";
import { WHATSAPP_URL } from "@/lib/site";
import { useStowedOnPhone } from "@/lib/stow-on-phone";

/**
 * The floating WhatsApp button (client, Sep 2026: "a whatsapp icon floating
 * around, when clicked it takes you to our hotline whatsapp").
 *
 * Built as the chat launcher's twin, because it shares that corner: the same
 * 56px disc, shadow and offsets, stacked directly above the launcher when
 * there is one and taking its place when there is not. Round like the
 * launcher — the one standing exception to the sharp-edges rule — so the two
 * read as a set.
 *
 * Ink with a white glyph rather than WhatsApp green. Green is not in the
 * palette, and beside the rose launcher it would be the loudest thing on
 * every page; the glyph alone is recognisable, and WhatsApp's own brand
 * guidelines allow it in monochrome. The hairline ring is what keeps a black
 * disc legible over the site's black bands.
 *
 * Out of the way in the two situations the launcher is:
 *  - over the hero on a phone (lib/stow-on-phone.ts);
 *  - while the chat panel is open, which ChatWidget flags on <html> — the
 *    panel rises out of the launcher, and this would sit on top of its input.
 */
export default function WhatsAppFloat({ stacked }: { stacked: boolean }) {
  // Stowed on the server AND on the client's first render, so hydration
  // matches; the hook's first check brings it in wherever it belongs.
  const stowed = useStowedOnPhone(true);

  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Message us on WhatsApp"
      title="WhatsApp"
      // Same treatment as the stowed launcher: out of the tab order and the
      // accessibility tree, not merely transparent.
      aria-hidden={stowed}
      tabIndex={stowed ? -1 : undefined}
      className={`fixed right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-ink text-bone shadow-[0_18px_40px_-12px_rgba(5,2,3,0.7)] ring-1 ring-white/20 transition-all duration-300 hover:text-rose hover:ring-rose/60 md:right-7 [html[data-chat-open]_&]:invisible [html[data-chat-open]_&]:translate-y-3 [html[data-chat-open]_&]:opacity-0 ${
        stacked ? "bottom-[5.5rem] md:bottom-24" : "bottom-5 md:bottom-7"
      } ${stowed ? "pointer-events-none translate-y-3 opacity-0" : "translate-y-0 opacity-100"}`}
    >
      <SocialIcon name="whatsapp" className="h-6 w-6" />
    </a>
  );
}
