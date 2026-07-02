import * as React from "react";

/**
 * Makro Developers logomark — twin peaks.
 * "A visual nod to skylines, ascent and the upward trajectory the brand
 * builds toward." Rendered as clean, sharp strokes per the guideline.
 */
export function PeakMark({
  className,
  strokeWidth = 8,
  animated = false,
  ...props
}: React.SVGProps<SVGSVGElement> & { strokeWidth?: number; animated?: boolean }) {
  return (
    <svg
      viewBox="0 0 100 78"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <g
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="miter"
        strokeLinecap="butt"
        vectorEffect="non-scaling-stroke"
      >
        {/* Left peak */}
        <path
          d="M6 74 L34 10 L62 74"
          className={animated ? "peak-draw peak-1" : undefined}
        />
        {/* Right peak — overlaps to form the interlocking M */}
        <path
          d="M38 74 L66 10 L94 74"
          className={animated ? "peak-draw peak-2" : undefined}
        />
      </g>
    </svg>
  );
}

export default PeakMark;
