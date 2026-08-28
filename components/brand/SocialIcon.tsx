import * as React from "react";

/**
 * Social glyphs for the contact page's Follow row (client note, Aug 2026:
 * "include icon and make it more graphic instead of just buttons").
 *
 * Drawn rather than pulled from an icon package: the site ships no icon
 * dependency, and three marks at one weight is less code than adding one.
 * Every path is `currentColor` fill on a 24-unit box, so they inherit the
 * link's colour transitions exactly as the PeakMark does.
 */
export type SocialName = "instagram" | "linkedin" | "facebook";

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
