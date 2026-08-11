import * as React from "react";

/**
 * Makro Developers logomark — twin peaks.
 * "A visual nod to skylines, ascent and the upward trajectory the brand
 * builds toward." Rendered as clean, sharp strokes with a flat horizontal baseline at the M base.
 */
export function PeakMark({
  className,
  strokeWidth = 8,
  animated = false,
  ...props
}: React.SVGProps<SVGSVGElement> & { strokeWidth?: number; animated?: boolean }) {
  const rawId = React.useId();
  const clipId = `peak-clip-${rawId.replace(/:/g, "")}`;

  return (
    <svg
      viewBox="0 0 100 78"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <defs>
        {/* Clip the bottom of the stroke paths at y=74 so the M base legs end on a flat horizontal baseline */}
        <clipPath id={clipId}>
          <rect x="0" y="0" width="100" height="74" />
        </clipPath>
      </defs>
      <g
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="miter"
        strokeLinecap="butt"
        vectorEffect="non-scaling-stroke"
        clipPath={`url(#${clipId})`}
      >
        {/* Left peak */}
        <path
          d="M 3.8 79 L 34 10 L 64.2 79"
          className={animated ? "peak-draw peak-1" : undefined}
        />
        {/* Right peak — overlaps to form the interlocking M */}
        <path
          d="M 35.8 79 L 66 10 L 96.2 79"
          className={animated ? "peak-draw peak-2" : undefined}
        />
      </g>
    </svg>
  );
}

export default PeakMark;
