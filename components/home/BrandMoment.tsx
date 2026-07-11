"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { gsap, useGSAP } from "@/lib/gsap";
import TextReveal from "@/components/anim/TextReveal";
import { PeakMark } from "@/components/brand/PeakMark";

const HeroScene = dynamic(() => import("@/components/three/HeroScene"), {
  ssr: false,
});

export default function BrandMoment() {
  const ref = useRef<HTMLDivElement>(null);
  // Three.js is the heaviest chunk on the page; keep it out of the initial
  // load and only fetch it once the section approaches the viewport.
  const [showScene, setShowScene] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Phones skip the WebGL sculpture entirely — on a short mobile canvas it
    // reads as a cropped slab, and Three.js is dead weight there. They get a
    // clean static peak mark instead (rendered below).
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShowScene(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useGSAP(
    () => {
      gsap.from(ref.current?.querySelector("[data-bm-sub]") ?? [], {
        opacity: 0,
        y: 24,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 60%" },
      });
    },
    { scope: ref }
  );

  return (
    <section
      ref={ref}
      className="relative flex min-h-[58svh] items-center justify-center overflow-hidden bg-ink py-20 md:min-h-[92vh] md:py-0"
    >
      {/* Desktop: WebGL sculpture */}
      <div className="absolute inset-0 z-0 hidden md:block">{showScene && <HeroScene />}</div>
      {/* Mobile: faint static peak mark — clean, light, on-brand */}
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center md:hidden">
        <PeakMark className="h-[38svh] w-auto text-rose/[0.13]" strokeWidth={2} />
      </div>
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(5,2,3,0.9)_100%)]" />

      <div className="container-edge relative z-20 text-center">
        <div className="flex items-center justify-center gap-4">
          <span className="line-hair w-10" />
          <span className="eyebrow text-rose">The Mark</span>
          <span className="line-hair w-10" />
        </div>
        <TextReveal
          as="h2"
          text="Two peaks. One upward trajectory."
          className="mx-auto mt-6 max-w-4xl font-display display-lg text-bone"
        />
        <p
          data-bm-sub
          className="mx-auto mt-8 max-w-xl font-body text-lg leading-relaxed text-mist"
        >
          A nod to skylines and ascent — precision, craftsmanship and ambition,
          distilled into a single mark.
        </p>
      </div>
    </section>
  );
}
