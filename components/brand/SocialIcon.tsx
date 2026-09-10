import * as React from "react";

/**
 * Social glyphs for the contact page's Follow row (client note, Aug 2026:
 * "include icon and make it more graphic instead of just buttons"), plus the
 * WhatsApp mark for the floating hotline button (Sep 2026).
 *
 * Drawn rather than pulled from an icon package: the site ships no icon
 * dependency, and a handful of marks at one weight is less code than adding
 * one. Every path is `currentColor` fill on a 24-unit box, so they inherit the
 * link's colour transitions exactly as the PeakMark does.
 */
export type SocialName = "instagram" | "linkedin" | "facebook" | "whatsapp";

const PATHS: Record<SocialName, React.ReactNode> = {
  instagram: (
    <>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.4 2h9.2A5.4 5.4 0 0 1 22 7.4v9.2a5.4 5.4 0 0 1-5.4 5.4H7.4A5.4 5.4 0 0 1 2 16.6V7.4A5.4 5.4 0 0 1 7.4 2Zm0 1.9A3.5 3.5 0 0 0 3.9 7.4v9.2a3.5 3.5 0 0 0 3.5 3.5h9.2a3.5 3.5 0 0 0 3.5-3.5V7.4a3.5 3.5 0 0 0-3.5-3.5H7.4Zm4.6 2.8a5.3 5.3 0 1 1 0 10.6 5.3 5.3 0 0 1 0-10.6Zm0 1.9a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Zm5.5-2.6a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Z"
      />
    </>
  ),
  linkedin: (
    <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM2.9 21.5V9.75h4.16V21.5H2.9Zm7.02 0V9.75h3.99v1.6h.06c.56-1.03 1.92-2.12 3.95-2.12 4.22 0 5 2.7 5 6.22v6.05h-4.15v-5.36c0-1.28-.02-2.93-1.83-2.93-1.83 0-2.11 1.4-2.11 2.84v5.45H9.92Z" />
  ),
  facebook: (
    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06C2 17.08 5.66 21.25 10.44 22v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.92 3.77-3.92 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.91h-2.33V22C18.34 21.25 22 17.08 22 12.06Z" />
  ),
  whatsapp: (
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
  ),
};

export function SocialIcon({
  name,
  className,
  ...props
}: React.SVGProps<SVGSVGElement> & { name: SocialName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
