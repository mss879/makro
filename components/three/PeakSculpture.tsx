"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function chevronShape(w: number, h: number, tw: number, th: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(0, h);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2 - tw, 0);
  s.lineTo(0, h - th);
  s.lineTo(-w / 2 + tw, 0);
  s.closePath();
  return s;
}

/** Extruded, metallic twin-peak logomark that rotates and follows the pointer. */
export default function PeakSculpture() {
  const group = useRef<THREE.Group>(null);

  const geometry = useMemo(() => {
    const shape = chevronShape(2.15, 2.7, 0.52, 0.66);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.6,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.05,
      bevelSegments: 4,
      steps: 1,
    });
    geo.center();
    return geo;
  }, []);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    g.rotation.y += delta * 0.18;
    const { x, y } = state.pointer;
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, y * 0.25, 0.05);
    g.position.x = THREE.MathUtils.lerp(g.position.x, x * 0.35, 0.05);
  });

  return (
    <group ref={group}>
      {/* Left peak */}
      <mesh geometry={geometry} position={[-0.62, 0, 0.02]}>
        <meshStandardMaterial
          color="#e2a388"
          metalness={1}
          roughness={0.22}
          envMapIntensity={1.6}
        />
      </mesh>
      {/* Right peak — interlocks to form the M */}
      <mesh geometry={geometry} position={[0.62, 0, -0.02]}>
        <meshStandardMaterial
          color="#f0c8b4"
          metalness={1}
          roughness={0.28}
          envMapIntensity={1.5}
        />
      </mesh>
    </group>
  );
}
