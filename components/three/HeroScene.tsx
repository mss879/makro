"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Float, Lightformer, Sparkles } from "@react-three/drei";
import PeakSculpture from "./PeakSculpture";

/**
 * WebGL hero — a metallic twin-peak sculpture lit by a self-contained
 * (no-download) studio environment, tinted to the brand rose gold.
 */
export default function HeroScene() {
  const portrait =
    typeof window !== "undefined" && window.innerHeight > window.innerWidth;

  return (
    <Canvas
      dpr={[1, 1.8]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, portrait ? 13 : 7], fov: portrait ? 38 : 34 }}
      className="!absolute inset-0"
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.25} />
        <spotLight position={[6, 8, 6]} angle={0.4} intensity={2.4} color="#f4d4c2" />
        <spotLight position={[-8, -4, 4]} angle={0.5} intensity={1.2} color="#c98567" />

        <Float speed={1.4} rotationIntensity={0.35} floatIntensity={0.7}>
          <PeakSculpture />
        </Float>

        <Sparkles
          count={60}
          scale={[9, 6, 4]}
          size={2}
          speed={0.25}
          opacity={0.5}
          color="#e2a388"
        />

        {/* Studio reflections built from lightformers — no HDR download */}
        <Environment resolution={256}>
          <Lightformer intensity={2.4} position={[0, 3, 4]} scale={[8, 3, 1]} color="#ffffff" />
          <Lightformer intensity={1.6} position={[-4, 1, 2]} scale={[3, 4, 1]} color="#e2a388" />
          <Lightformer intensity={1.2} position={[4, -2, 2]} scale={[3, 4, 1]} color="#f0c8b4" />
          <Lightformer intensity={0.8} position={[0, -3, -3]} scale={[10, 3, 1]} color="#c98567" />
        </Environment>
      </Suspense>
    </Canvas>
  );
}
