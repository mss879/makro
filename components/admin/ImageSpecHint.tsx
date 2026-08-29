import { IMAGE_SPECS, type ImageSpecKey } from "@/lib/image-specs";

/**
 * The "what should I upload here?" note that sits under every image field.
 *
 * One component reading one table (lib/image-specs.ts) rather than a sentence
 * written into each admin screen: the numbers are derived from what each slot
 * actually renders at, and prose scattered across five files drifts out of date
 * the first time a layout changes.
 *
 * Presentation is deliberately flat — a size, a shape, and a plain sentence
 * about cropping. The person using this is choosing a photograph, not reading
 * documentation, so the two facts they act on (how big, what shape) are the two
 * that are legible at a glance, and the reasoning sits underneath in the same
 * quiet tone as the rest of the panel's help text.
 */
export default function ImageSpecHint({
  spec,
  className = "",
}: {
  spec: ImageSpecKey;
  className?: string;
}) {
  const s = IMAGE_SPECS[spec];

  return (
    <div
      className={`border border-panel-line bg-panel px-4 py-3 ${className}`}
      // Not a <p> with the numbers inline: a screen reader should get the two
      // headline facts as their own labelled values, not as one run-on line.
    >
      <p className="font-body text-[0.7rem] uppercase tracking-[0.18em] text-panel-faint">
        Best results
      </p>

      <dl className="mt-2 flex flex-wrap gap-x-8 gap-y-2">
        <div>
          <dt className="font-body text-[0.7rem] text-panel-faint">Ideal size</dt>
          <dd className="font-body text-sm text-panel-text">{s.recommended}</dd>
        </div>
        <div>
          <dt className="font-body text-[0.7rem] text-panel-faint">Don&rsquo;t go below</dt>
          <dd className="font-body text-sm text-panel-muted">{s.minimum}</dd>
        </div>
        {/* Omitted entirely rather than shown as "any": the gallery's whole
            point is that shape is not a constraint there, and an empty-looking
            field invites the reader to go hunting for the right answer. */}
        {s.aspect && (
          <div>
            <dt className="font-body text-[0.7rem] text-panel-faint">Shape</dt>
            <dd className="font-body text-sm text-panel-text">{s.aspect}</dd>
          </div>
        )}
      </dl>

      <p className="mt-3 max-w-2xl font-body text-xs leading-relaxed text-panel-faint">
        {s.crops}
      </p>
    </div>
  );
}
