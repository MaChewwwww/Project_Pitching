"use client";

import * as React from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import type { Group, Mesh } from "three";

import { AREAS, type FixtureArea } from "@/lib/fixtures/areas";

/**
 * The 3D barangay scene in the hero (FR-MAP-011, design.md D-OI-5).
 *
 * design.md Section 1 sets the licence for this: "restrained, institutional,
 * competent — **the 3D map is the one place to be showy.**" D-OI-5 left open
 * whether it belongs on the landing page or the admin console; it is here.
 *
 * **It shows something true.** Each block is one barangay area: height from the
 * number of registered households, top face from its flood exposure using the
 * official Philippine hazard ramp (design.md Section 3.4 — the same yellow,
 * orange and red on every government hazard map, never blue). The scene is a
 * legend for the map further down the page, not decoration with a river in it.
 *
 * **This module is never in the landing bundle.** It is reached only through
 * `dynamic(..., { ssr: false })` behind a capability gate, so `three` — the
 * single heaviest dependency in the project — is downloaded by devices that
 * asked for it and by nobody else (NFR-PERF-007).
 *
 * Colours are read from the CSS custom properties at runtime rather than written
 * as hex here. WebGL materials cannot take a Tailwind class, and hardcoding the
 * ramp would put a second copy of the palette outside `globals.css` — the exact
 * drift `apps/web/docs/components.md` warns about.
 */

const HAZARD_VAR = {
  low: "--color-hazard-low",
  medium: "--color-hazard-medium",
  high: "--color-hazard-high",
} as const;

function readCssColor(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

interface Palette {
  low: string;
  medium: string;
  high: string;
  side: string;
  sideDeep: string;
  river: string;
  ground: string;
  marker: string;
}

function usePalette(): Palette {
  return React.useMemo(
    () => ({
      low: readCssColor(HAZARD_VAR.low, "#ffed4a"),
      medium: readCssColor(HAZARD_VAR.medium, "#f59e0b"),
      high: readCssColor(HAZARD_VAR.high, "#ef4444"),
      side: readCssColor("--color-primary-600", "#1f8049"),
      sideDeep: readCssColor("--color-primary-800", "#17532f"),
      river: readCssColor("--color-primary-400", "#5bb983"),
      ground: readCssColor("--color-primary-900", "#123f25"),
      marker: readCssColor("--color-primary-200", "#bfe7ce"),
    }),
    [],
  );
}

/** Grid positions, laid out so the high-exposure areas sit nearest the river. */
const LAYOUT: [number, number][] = [
  [-1.15, 1.15],
  [0.15, 1.15],
  [-1.15, -0.1],
  [0.15, -0.1],
  [-1.15, -1.35],
  [0.15, -1.35],
];

function heightFor(area: FixtureArea): number {
  // Households mapped onto a narrow band — the tallest block is roughly twice the
  // shortest, which reads as a difference without one block dwarfing the scene.
  return 0.28 + (area.households / 412) * 0.5;
}

interface ZoneProps {
  area: FixtureArea;
  position: [number, number];
  palette: Palette;
  selected: boolean;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
}

function Zone({ area, position, palette, selected, reducedMotion, onSelect }: ZoneProps) {
  const mesh = React.useRef<Mesh>(null);
  const [hovered, setHovered] = React.useState(false);
  const height = heightFor(area);
  const raised = hovered || selected;

  useFrame((_state, delta) => {
    if (!mesh.current) return;
    const target = raised ? height / 2 + 0.12 : height / 2;
    if (reducedMotion) {
      mesh.current.position.y = target;
      return;
    }
    // Frame-rate independent easing, so the motion is identical at 30fps and 144.
    mesh.current.position.y +=
      (target - mesh.current.position.y) * (1 - Math.pow(0.001, delta));
  });

  const handleOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer";
  };

  const handleOut = () => {
    setHovered(false);
    document.body.style.cursor = "";
  };

  return (
    <group position={[position[0], 0, position[1]]}>
      <mesh
        ref={mesh}
        position={[0, height / 2, 0]}
        castShadow
        receiveShadow
        onPointerOver={handleOver}
        onPointerOut={handleOut}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(area.id);
        }}
      >
        <boxGeometry args={[1.1, height, 1.1]} />
        {/* Six materials: the top face carries the hazard colour, the sides stay
            green so the ramp reads as data rather than as the building's paint. */}
        <meshStandardMaterial attach="material-0" color={palette.side} roughness={0.8} />
        <meshStandardMaterial
          attach="material-1"
          color={palette.sideDeep}
          roughness={0.8}
        />
        <meshStandardMaterial
          attach="material-2"
          color={palette[area.flood_exposure]}
          roughness={0.55}
          emissive={palette[area.flood_exposure]}
          emissiveIntensity={raised ? 0.35 : 0.12}
        />
        <meshStandardMaterial
          attach="material-3"
          color={palette.ground}
          roughness={0.9}
        />
        <meshStandardMaterial attach="material-4" color={palette.side} roughness={0.8} />
        <meshStandardMaterial
          attach="material-5"
          color={palette.sideDeep}
          roughness={0.8}
        />
      </mesh>

      {raised ? (
        <Html
          position={[0, height + 0.45, 0]}
          center
          distanceFactor={7}
          zIndexRange={[20, 0]}
        >
          <div className="shadow-lg-card pointer-events-none rounded-md bg-neutral-900/90 px-2.5 py-1.5 text-center whitespace-nowrap text-white">
            <p className="text-label">{area.name}</p>
            <p className="text-caption text-white/70 capitalize">
              {area.flood_exposure} flood exposure
            </p>
          </div>
        </Html>
      ) : null}
    </group>
  );
}

/** A facility marker — a pin that bobs gently above the zone it belongs to. */
function Marker({
  position,
  palette,
  offset,
  reducedMotion,
}: {
  position: [number, number, number];
  palette: Palette;
  offset: number;
  reducedMotion: boolean;
}) {
  const group = React.useRef<Group>(null);

  useFrame((state) => {
    if (!group.current || reducedMotion) return;
    group.current.position.y =
      position[1] + Math.sin(state.clock.elapsedTime * 1.4 + offset) * 0.05;
  });

  return (
    <group ref={group} position={position}>
      <mesh castShadow>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial
          color={palette.marker}
          emissive={palette.marker}
          emissiveIntensity={0.4}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[0, -0.13, 0]}>
        <coneGeometry args={[0.05, 0.16, 12]} />
        <meshStandardMaterial color={palette.marker} roughness={0.5} />
      </mesh>
    </group>
  );
}

function Scene({ reducedMotion }: { reducedMotion: boolean }) {
  const palette = usePalette();
  const [selected, setSelected] = React.useState<string | null>(null);

  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight
        position={[4, 6, 3]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-4, 3, -3]} intensity={0.4} />

      {/* Ground plate */}
      <mesh position={[-0.5, -0.02, -0.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5.4, 5]} />
        <meshStandardMaterial color={palette.ground} roughness={1} />
      </mesh>

      {/* The river, along the high-exposure edge */}
      <mesh position={[1.75, 0.01, -0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.1, 5]} />
        <meshStandardMaterial
          color={palette.river}
          roughness={0.15}
          metalness={0.35}
          transparent
          opacity={0.9}
        />
      </mesh>

      {AREAS.map((area, i) => (
        <Zone
          key={area.id}
          area={area}
          position={LAYOUT[i]}
          palette={palette}
          selected={selected === area.id}
          reducedMotion={reducedMotion}
          onSelect={(id) => setSelected((prev) => (prev === id ? null : id))}
        />
      ))}

      {/* Facility markers over three of the zones */}
      <Marker
        position={[-1.15, 1.1, 1.15]}
        palette={palette}
        offset={0}
        reducedMotion={reducedMotion}
      />
      <Marker
        position={[0.15, 0.95, -0.1]}
        palette={palette}
        offset={1.6}
        reducedMotion={reducedMotion}
      />
      <Marker
        position={[-1.15, 0.85, -1.35]}
        palette={palette}
        offset={3.2}
        reducedMotion={reducedMotion}
      />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={false}
        // A slow drift, and stopped entirely under reduced motion — a scene that
        // never settles is exactly what that preference exists to prevent.
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.45}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={Math.PI / 2.45}
      />
    </>
  );
}

export default function BarangayScene3D() {
  // Read once at mount rather than subscribing: the preference does not change
  // mid-visit in practice, and a listener would re-render the whole scene.
  const reducedMotion = React.useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  return (
    <Canvas
      shadows
      camera={{ position: [3.6, 3.1, 4.2], fov: 42 }}
      // `alpha` lets the gradient panel behind show through instead of painting
      // an opaque backdrop over it.
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.75]}
      aria-hidden
      // No positioning class. R3F's wrapper already carries
      // `position: relative; width: 100%; height: 100%`, so it fills the
      // `relative h-full w-full` box `HeroVisual` gives it. The overlaying
      // elements — the river-level card, the anchor buttons — are positioned
      // against the gradient panel above this, not against the canvas, so
      // nothing here needs to be taken out of flow.
      //
      // R3F sizes the drawing buffer from a ResizeObserver on that wrapper. If
      // the canvas ever appears stuck at its intrinsic 300x150, check whether
      // ResizeObserver is firing at all before changing anything here — in a
      // non-compositing headless viewport it does not fire, and the canvas stays
      // at the default while every container around it measures correctly.
    >
      <Scene reducedMotion={reducedMotion} />
    </Canvas>
  );
}
