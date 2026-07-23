import ParallaxImage from "@/components/ui/ParallaxImage";
import Reveal from "@/components/anim/Reveal";

/**
 * Full-bleed image interlude — a Norm-style visual pause between text
 * sections (client reference: normcph.com): one big image, a few quiet
 * words, nothing else. Imagery generated to the brand guideline's warm
 * golden-hour palette.
 */
type Props = {
  image: string;
  alt: string;
  eyebrow: string;
  line: string;
};

export default function Interlude({ image, alt, eyebrow, line }: Props) {
  return (
    <section className="relative bg-ink">
      <ParallaxImage
        id={image}
        alt={alt}
        className="h-[68svh] md:h-[86svh]"
        sizes="100vw"
        width={2048}
        parallax={9}
        zoom={1.12}
        revealInset="0% 0% 0% 0%"
      />
      {/* Quiet centered caption over the image's built-in bottom gradient */}
      <Reveal className="absolute inset-x-0 bottom-0 pb-14 text-center md:pb-20">
        <p className="eyebrow text-bone/70">{eyebrow}</p>
        <p className="mx-auto mt-4 max-w-xl px-6 font-display text-2xl text-bone md:text-3xl">
          {line}
        </p>
      </Reveal>
    </section>
  );
}
