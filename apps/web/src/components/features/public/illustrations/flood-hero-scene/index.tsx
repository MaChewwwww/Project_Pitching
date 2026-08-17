"use client";

/* eslint-disable react-hooks/immutability -- React Three Fiber updates scene refs on its frame clock. */

import * as React from "react";
import { ContactShadows } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import type { DirectionalLight, Group } from "three";

import {
  BarangayPatrolVehicle,
  Bridge,
  CommercialBuilding,
  Ground,
  HouseBungalow,
  HouseModern,
  HouseTerracotta,
  MarketStall,
  PalmTree,
  Rain,
  RiverRocks,
  SCENE,
  Shrub,
  SkyClouds,
  StreetLamp,
  Tree,
  Tricycle,
  Water,
  WarningSiren,
} from "./scene-parts";
import type { SceneQuality } from "./scene-parts";

type DragState = {
  dragging: boolean;
  offset: number;
  velocity: number;
  lastX: number;
  lastTime: number;
};

// Start one rotation step left of the original framing so the raised homes sit
// at the rear-left and the river, market, and full bridge span read together.
const BASE_ROTATION_Y = -0.18;

function easeOutBack(x: number): number {
  const c1 = 1.6;
  const c3 = c1 + 1;
  const t = x - 1;
  return 1 + c3 * Math.pow(t, 3) + c1 * Math.pow(t, 2);
}

function Turntable({
  active,
  reducedMotion,
  floodLevel,
  rotationOffset,
  drag,
  quality,
}: {
  active: boolean;
  reducedMotion: boolean;
  floodLevel: number;
  rotationOffset: number;
  drag: React.MutableRefObject<DragState>;
  quality: SceneQuality;
}) {
  const rig = React.useRef<Group>(null);
  const lightningLight = React.useRef<DirectionalLight>(null);
  const nextFlashTime = React.useRef(4.5);
  const flashActive = React.useRef(0);
  const enterStartTimeRef = React.useRef<number | null>(null);
  const enterCompleteRef = React.useRef(false);
  const lean = quality === "lean";

  useFrame(({ pointer, clock }, delta) => {
    if (!rig.current) return;
    const state = drag.current;

    // Atmospheric Thunderstorm FX & Lightning Pulse
    if (floodLevel > 0.8 && active && !reducedMotion) {
      const now = clock.getElapsedTime();
      if (now > nextFlashTime.current) {
        flashActive.current = 0.22;
        nextFlashTime.current = now + 4.5 + Math.random() * 4.5;
      }
      if (flashActive.current > 0) {
        flashActive.current -= delta;
        const progress = flashActive.current / 0.22;
        const flashIntensity =
          progress > 0.65 ? 2.5 : progress > 0.35 ? 0.3 : progress > 0 ? 1.8 : 0;
        if (lightningLight.current) {
          lightningLight.current.intensity = flashIntensity * 3.2;
        }
      } else if (lightningLight.current) {
        lightningLight.current.intensity = 0;
      }
    } else if (lightningLight.current) {
      lightningLight.current.intensity = 0;
    }

    // Consecutive 3D pop-up animation: runs exactly once on page entrance
    let enterScale = 1;
    let enterYOffset = 0;
    if (!enterCompleteRef.current) {
      if (enterStartTimeRef.current === null) {
        enterStartTimeRef.current = clock.getElapsedTime();
      }

      if (!reducedMotion) {
        const elapsed = clock.getElapsedTime() - enterStartTimeRef.current;
        const delay = 1.15;
        const duration = 0.75;
        if (elapsed < delay) {
          enterScale = 0.001;
          enterYOffset = -1.2;
        } else if (elapsed < delay + duration) {
          const p = (elapsed - delay) / duration;
          const eased = easeOutBack(p);
          enterScale = Math.max(0.001, eased);
          enterYOffset = (1 - Math.min(1, p * 1.15)) * -1.2;
        } else {
          enterCompleteRef.current = true;
          enterScale = 1;
          enterYOffset = 0;
        }
      } else {
        enterCompleteRef.current = true;
        enterScale = 1;
        enterYOffset = 0;
      }
    }
    rig.current.scale.set(enterScale, enterScale, enterScale);

    if (!state.dragging && active && Math.abs(state.velocity) > 0.0005) {
      state.offset += state.velocity * Math.min(delta, 0.05);
      state.velocity *= Math.exp(-4.6 * Math.min(delta, 0.05));
    }

    const pointerSway = active && !state.dragging ? pointer.x * 0.035 : 0;
    const idleSway = active ? Math.sin(clock.elapsedTime * 0.22) * 0.012 : 0;
    const targetY =
      BASE_ROTATION_Y + rotationOffset + state.offset + pointerSway + idleSway;
    const targetX = -0.035 + (active ? pointer.y * -0.012 : 0);
    const smoothing = reducedMotion ? 1 : state.dragging ? 0.28 : 0.075;

    rig.current.rotation.y += (targetY - rig.current.rotation.y) * smoothing;
    rig.current.rotation.x += (targetX - rig.current.rotation.x) * smoothing;
    rig.current.position.y = -0.25 + enterYOffset;
  });

  return (
    <group
      ref={rig}
      rotation={[-0.035, BASE_ROTATION_Y, 0]}
      position={[0, -0.25, 0]}
    >
      <directionalLight
        ref={lightningLight}
        position={[2, 16, 5]}
        intensity={0}
        color="#e3f2fd"
      />
      <Ground quality={quality} />
      <Water floodLevel={floodLevel} active={active} />
      <RiverRocks quality={quality} />

      {/* 5 Distinct Talipapa Market Stalls */}
      <MarketStall
        position={[1.35, -0.08, -2.85]}
        type="fruit"
        roof="#2f80c9"
      />
      <MarketStall
        position={[1.35, -0.08, -1.12]}
        type="fish"
        roof="#d25555"
      />
      <MarketStall
        position={[1.35, -0.08, 0.61]}
        type="rice"
        roof="#39a46e"
      />
      <MarketStall
        position={[1.35, -0.08, 2.34]}
        type="bakery"
        roof="#f57c00"
        striped
      />
      <MarketStall
        position={[1.35, -0.08, 4.07]}
        type="beverage"
        roof="#2f80c9"
      />

      {/* 3 Distinct Commercial Buildings along Market Road */}
      <CommercialBuilding
        position={[-2.9, -0.34, -2.05]}
        type="clinic"
        scale={0.92}
      />
      <CommercialBuilding
        position={[-2.84, -0.34, 0.75]}
        type="bakery"
        scale={0.95}
      />
      <CommercialBuilding
        position={[-2.92, -0.34, 3.62]}
        type="civic"
        scale={0.9}
      />

      {/* Barangay Tanod & DRRM Emergency Patrol Multicab */}
      <BarangayPatrolVehicle
        position={[-2.92, -0.34, 5.25]}
        rotation={[0, 0, 0]}
        scale={0.86}
        floodLevel={floodLevel}
        active={active}
        reducedMotion={reducedMotion}
      />

      {/* 3 Distinct Elevated Homes on High West Terrace */}
      <HouseModern
        position={[-7.52, 1.04, -2.1]}
        rotation={[0, Math.PI / 2, 0]}
        scale={1.02}
      />
      <HouseTerracotta
        position={[-7.58, 1.04, 0.65]}
        rotation={[0, Math.PI / 2, 0]}
        scale={1.04}
      />
      <HouseBungalow
        position={[-7.48, 1.04, 3.25]}
        rotation={[0, Math.PI / 2, 0]}
        scale={0.96}
      />

      <Bridge floodLevel={floodLevel} quality={quality} />
      <Tricycle />
      <WarningSiren
        position={[-8.85, 1.03, 1.95]}
        floodLevel={floodLevel}
        active={active}
        reducedMotion={reducedMotion}
        quality={quality}
      />

      {/* Municipal Roadside Lamp Posts (Always On & Storm Electrical Flicker) */}
      {/* High Terrace Outer Roadway Lamps (At the back of the houses) */}
      <StreetLamp
        position={[-9.75, 1.04, -3.2]}
        rotation={[0, -Math.PI / 2, 0]}
        floodLevel={floodLevel}
        active={active}
        reducedMotion={reducedMotion}
        scale={0.84}
        quality={quality}
      />
      <StreetLamp
        position={[-9.75, 1.04, -0.6]}
        rotation={[0, -Math.PI / 2, 0]}
        floodLevel={floodLevel}
        active={active}
        reducedMotion={reducedMotion}
        scale={0.84}
        quality={quality}
      />
      <StreetLamp
        position={[-9.75, 1.04, 2.1]}
        rotation={[0, -Math.PI / 2, 0]}
        floodLevel={floodLevel}
        active={active}
        reducedMotion={reducedMotion}
        scale={0.84}
        quality={quality}
      />
      <StreetLamp
        position={[-9.75, 1.04, 4.6]}
        rotation={[0, -Math.PI / 2, 0]}
        floodLevel={floodLevel}
        active={active}
        reducedMotion={reducedMotion}
        scale={0.84}
        quality={quality}
      />

      {/* Market Alley Storefront Sidewalk Lamps (Tucked against building curb) */}
      <StreetLamp
        position={[-2.18, -0.34, -2.5]}
        rotation={[0, Math.PI / 2, 0]}
        floodLevel={floodLevel}
        active={active}
        reducedMotion={reducedMotion}
        scale={0.86}
        quality={quality}
      />
      <StreetLamp
        position={[-2.18, -0.34, 0.4]}
        rotation={[0, Math.PI / 2, 0]}
        floodLevel={floodLevel}
        active={active}
        reducedMotion={reducedMotion}
        scale={0.86}
        quality={quality}
      />
      <StreetLamp
        position={[-2.15, -0.34, 7.0]}
        rotation={[0, Math.PI / 2, 0]}
        floodLevel={floodLevel}
        active={active}
        reducedMotion={reducedMotion}
        scale={0.86}
        quality={quality}
      />

      {/* East Far Bank Roadside Lamps (Along outer shoulder) */}
      <StreetLamp
        position={[10.2, -0.35, 0.2]}
        rotation={[0, -Math.PI / 2, 0]}
        floodLevel={floodLevel}
        active={active}
        reducedMotion={reducedMotion}
        scale={0.86}
        quality={quality}
      />
      <StreetLamp
        position={[10.2, -0.35, 4.2]}
        rotation={[0, -Math.PI / 2, 0]}
        floodLevel={floodLevel}
        active={active}
        reducedMotion={reducedMotion}
        scale={0.86}
        quality={quality}
      />

      {/* Rich Vegetation: Tropical Palms, Trees, and Shrubs */}
      {/* North-West Lower Shelf Bridge Landmark Tree */}
      <Tree position={[-9.2, -0.34, -6.3]} scale={1.35} />

      {/* Core Hero Greenery (Rendered on all devices) */}
      <PalmTree position={[-10.9, -0.34, -4.2]} scale={0.78} />
      <Tree position={[-10.9, -0.34, 3.8]} scale={0.68} />
      <PalmTree position={[-5.2, -0.34, -3.8]} scale={0.75} />
      <Tree position={[-5.2, -0.34, 1.8]} scale={0.68} />
      <PalmTree position={[1.35, -0.08, 5.3]} scale={0.65} />
      <Tree position={[-2.1, -0.35, 6.4]} scale={0.62} />
      <PalmTree position={[10.2, -0.35, 1.6]} scale={0.78} />
      <Tree position={[10.16, -0.35, 5.2]} scale={0.65} />

      {/* Supplementary Foliage & Micro-Shrubs (Desktop/Tablet) */}
      {!lean && (
        <>
          <Tree position={[-10.9, -0.34, -1.2]} scale={0.70} />
          <Shrub position={[-10.9, -0.34, 1.4]} scale={0.75} />
          <PalmTree position={[-10.6, -0.34, 6.2]} scale={0.75} />
          <Tree position={[-6.2, -0.34, 7.1]} scale={0.68} />
          <Shrub position={[-3.6, -0.34, 6.8]} scale={0.75} />
          <Shrub position={[-6.2, 1.04, 4.6]} scale={0.68} />
          <Shrub position={[-6.2, 1.04, -3.9]} scale={0.65} />
          <Shrub position={[-2.9, -0.34, -0.68]} scale={0.55} />
          <Shrub position={[-2.9, -0.34, 2.18]} scale={0.55} />
          <Tree position={[10.16, -0.35, -1.75]} scale={0.68} />
          <PalmTree position={[9.8, 0.8, -3.8]} scale={0.72} />
          <Shrub position={[-5.6, 0.05, 6.2]} scale={0.58} />
        </>
      )}

      {/* 3D Animated Clouds in Background with Storm Darkening */}
      <SkyClouds
        floodLevel={floodLevel}
        active={active}
        reducedMotion={reducedMotion}
        quality={quality}
      />

      {!reducedMotion && (
        <Rain floodLevel={floodLevel} active={active} quality={quality} />
      )}
    </group>
  );
}

export default function FloodHeroScene({
  active,
  reducedMotion,
  floodLevel,
  rotationOffset,
  quality,
  onReady,
  onContextLost,
}: {
  active: boolean;
  reducedMotion: boolean;
  floodLevel: number;
  rotationOffset: number;
  quality: SceneQuality;
  onReady: () => void;
  onContextLost: () => void;
}) {
  const drag = React.useRef<DragState>({
    dragging: false,
    offset: 0,
    velocity: 0,
    lastX: 0,
    lastTime: 0,
  });
  const invalidateRef = React.useRef<() => void>(() => undefined);
  const [grabbing, setGrabbing] = React.useState(false);
  const lean = quality === "lean";
  const full = quality === "full";

  // Dynamic storm lighting adjustments
  const stormEase = floodLevel * floodLevel * (3 - 2 * floodLevel);
  const dirIntensity = 2.7 - stormEase * 0.65;
  const ambientIntensity = 1.35 - stormEase * 0.2;
  const skyLightColor = stormEase > 0.4 ? "#9db5ad" : "#d8eff8";
  const groundLightColor = stormEase > 0.4 ? "#506259" : "#68736f";

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const state = drag.current;
    state.dragging = true;
    state.velocity = 0;
    state.lastX = event.clientX;
    state.lastTime = performance.now();
    setGrabbing(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state.dragging || !event.isPrimary) return;
    const now = performance.now();
    const deltaX = event.clientX - state.lastX;
    const elapsed = Math.max((now - state.lastTime) / 1000, 0.001);
    const deltaAngle = deltaX * 0.0068;
    state.offset += deltaAngle;
    state.velocity = state.velocity * 0.76 + (deltaAngle / elapsed) * 0.24;
    state.lastX = event.clientX;
    state.lastTime = now;
    invalidateRef.current();
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state.dragging) return;
    state.dragging = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setGrabbing(false);
    invalidateRef.current();
  };

  return (
    <div
      className="absolute inset-0"
      style={{ touchAction: "pan-y", cursor: grabbing ? "grabbing" : "grab" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      aria-hidden
    >
      <Canvas
        orthographic
        shadows={lean ? false : "basic"}
        dpr={full ? [1, 1.5] : 1}
        frameloop="always"
        camera={{
          position: [19, 14, 24],
          zoom: lean ? 21.2 : full ? 26.4 : 24.6,
          near: 0.1,
          far: 96,
        }}
        gl={{
          antialias: !lean,
          alpha: true,
          powerPreference: "high-performance",
          precision: lean ? "mediump" : "highp",
        }}
        onCreated={({ camera, gl, invalidate }) => {
          camera.lookAt(0, 0.25, 0);
          invalidateRef.current = invalidate;
          gl.domElement.addEventListener(
            "webglcontextlost",
            (event) => {
              event.preventDefault();
              onContextLost();
            },
            { once: true },
          );
          onReady();
        }}
      >
        <color attach="background" args={[SCENE.background]} />
        <fog attach="fog" args={[SCENE.background, 31, 56]} />
        <ambientLight intensity={ambientIntensity} />
        <hemisphereLight args={[skyLightColor, groundLightColor, 1.55 - stormEase * 0.45]} />
        <directionalLight
          position={[7, 13, 9]}
          intensity={dirIntensity}
          castShadow={!lean}
          shadow-mapSize={full ? [1536, 1536] : [768, 768]}
          shadow-camera-left={-14}
          shadow-camera-right={14}
          shadow-camera-top={12}
          shadow-camera-bottom={-12}
        />
        <directionalLight
          position={[-9, 8, -5]}
          intensity={0.72 - stormEase * 0.3}
          color={stormEase > 0.5 ? "#5b7d8d" : "#9bcadd"}
        />
        <Turntable
          active={active}
          reducedMotion={reducedMotion}
          floodLevel={floodLevel}
          rotationOffset={rotationOffset}
          drag={drag}
          quality={quality}
        />
        {full && (
          <ContactShadows
            position={[0, -1.94, 0]}
            opacity={0.22}
            scale={25}
            blur={2.5}
            far={6}
          />
        )}
      </Canvas>
    </div>
  );
}
