"use client";

import * as React from "react";
import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  PointLight,
  Quaternion,
  Vector3,
} from "three";

export type SceneQuality = "full" | "balanced" | "lean";

function sceneColor(variable: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  return (
    getComputedStyle(document.documentElement).getPropertyValue(variable).trim() ||
    fallback
  );
}

export const SCENE = {
  background: sceneColor("--hero-scene-background", "#17532f"),
  land: sceneColor("--hero-scene-land", "#196a3d"),
  landDark: sceneColor("--hero-scene-land-dark", "#196a3d"),
  landHigh: sceneColor("--hero-scene-land-high", "#196a3d"),
  river: sceneColor("--hero-scene-river", "#3a8dca"),
  flood: sceneColor("--hero-scene-flood", "#9a8b75"),
  bridge: sceneColor("--hero-scene-bridge", "#315f7d"),
  concrete: sceneColor("--hero-scene-concrete", "#6b7772"),
  concreteLight: sceneColor("--hero-scene-concrete-light", "#cbd3d0"),
  roof: sceneColor("--hero-scene-roof", "#c46d4f"),
  plinth: sceneColor("--hero-scene-plinth", "#246b4a"),
  plinthEdge: sceneColor("--hero-scene-plinth-edge", "#1b5b3d"),
} as const;

type Position = [number, number, number];

const RIVER_ROCKS: Array<{ position: Position; scale: Position; rotation: Position }> = [
  { position: [3.65, -0.04, 1.7], scale: [0.86, 0.64, 0.72], rotation: [0.1, 0.35, 0] },
  {
    position: [5.05, 0.06, -0.7],
    scale: [1.08, 0.82, 0.94],
    rotation: [0.18, -0.2, 0.08],
  },
  {
    position: [6.22, -0.08, 3.65],
    scale: [0.72, 0.55, 0.82],
    rotation: [-0.08, 0.5, 0.04],
  },
];

function smoothPhase(value: number, start: number, end: number) {
  const progress = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return progress * progress * (3 - 2 * progress);
}

function Block({
  position,
  size,
  color,
  radius = 0.08,
  castShadow = true,
  receiveShadow = true,
  rotation,
}: {
  position: Position;
  size: Position;
  color: string;
  radius?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  rotation?: Position;
}) {
  return (
    <RoundedBox
      args={size}
      radius={radius}
      smoothness={2}
      position={position}
      rotation={rotation}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      <meshStandardMaterial color={color} roughness={0.84} />
    </RoundedBox>
  );
}

function WaterVolume({
  position,
  size,
  color,
  opacity = 0.96,
  radius = 0.2,
}: {
  position: Position;
  size: Position;
  color: string;
  opacity?: number;
  radius?: number;
}) {
  const isTransparent = opacity < 0.999;

  return (
    <RoundedBox
      args={size}
      radius={radius}
      smoothness={3}
      position={position}
      receiveShadow
      renderOrder={isTransparent ? 3 : 1}
    >
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.08}
        roughness={0.18}
        metalness={0.12}
        transparent={isTransparent}
        opacity={opacity}
        depthWrite={!isTransparent}
      />
    </RoundedBox>
  );
}

function RoadDash({ position, rotation }: { position: Position; rotation?: Position }) {
  return (
    <Block
      position={position}
      size={[0.1, 0.025, 0.86]}
      color="#f8fafa"
      radius={0.01}
      castShadow={false}
      receiveShadow={false}
      rotation={rotation}
    />
  );
}

function Reeds({ position, scale = 1 }: { position: Position; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {[-0.22, -0.08, 0.08, 0.22].map((x, index) => (
        <mesh
          key={x}
          position={[x, 0.28 + (index % 2) * 0.08, (index - 1.5) * 0.08]}
          rotation={[0, 0, index % 2 ? -0.12 : 0.14]}
        >
          <cylinderGeometry args={[0.018, 0.028, 0.64 + (index % 2) * 0.14, 5]} />
          <meshStandardMaterial
            color={index % 2 ? "#6f9b43" : "#83ad4e"}
            roughness={0.9}
          />
        </mesh>
      ))}
    </group>
  );
}

export function Ground({ quality }: { quality: SceneQuality }) {
  const riprapCount = quality === "full" ? 18 : quality === "balanced" ? 12 : 8;

  return (
    <group>
      {/* A muted model-green plinth remains distinct from the darker scene container. */}
      <Block
        position={[0, -1.31, 0]}
        size={[24.35, 0.72, 16.7]}
        color={SCENE.plinthEdge}
        radius={0.5}
      />
      <Block
        position={[0, -0.84, 0]}
        size={[23.92, 0.3, 16.28]}
        color={SCENE.plinth}
        radius={0.36}
      />
      <Block
        position={[-4.03, -0.54, 0]}
        size={[12.95, 0.38, 14.35]}
        color={SCENE.landDark}
        radius={0.28}
      />
      <Block
        position={[8.82, -0.54, 0]}
        size={[3.45, 0.38, 14.35]}
        color={SCENE.landDark}
        radius={0.26}
      />

      {/* High west terrace and stepped retaining edge. */}
      <Block
        position={[-7.55, 0.08, 0]}
        size={[4.45, 1.62, 13.65]}
        color={SCENE.landDark}
        radius={0.22}
      />
      <Block
        position={[-7.55, 0.95, 0]}
        size={[4.45, 0.18, 13.5]}
        color={SCENE.landDark}
        radius={0.16}
      />
      <Block
        position={[-5.25, 0.08, 0]}
        size={[0.22, 1.66, 13.55]}
        color={SCENE.concreteLight}
        radius={0.04}
      />

      {/* Three overlapping slabs form the marked U: rear bridge-side road,
          outer side road, and front road into the riverside connector. */}
      <Block
        position={[-9, 1.04, 0.425]}
        size={[1.18, 0.1, 10.75]}
        color="#4e5a55"
        radius={0.14}
      />
      <Block
        position={[-7.45, 1.04, 5.5]}
        size={[4.55, 0.1, 1.18]}
        color="#4e5a55"
        radius={0.14}
      />
      <Block
        position={[-7.45, 1.04, -4.65]}
        size={[4.55, 0.1, 1.18]}
        color="#4e5a55"
        radius={0.14}
      />
      {[-4.35, -1.75, 0.85, 3.35].map((z) => (
        <RoadDash key={`high-west-${z}`} position={[-9, 1.103, z]} />
      ))}
      {[-7.1, -5.65].map((x) => (
        <RoadDash
          key={`high-front-${x}`}
          position={[x, 1.103, 5.5]}
          rotation={[0, Math.PI / 2, 0]}
        />
      ))}
      {[-8.35, -6.35].map((x) => (
        <RoadDash
          key={`high-rear-${x}`}
          position={[x, 1.103, -4.65]}
          rotation={[0, Math.PI / 2, 0]}
        />
      ))}

      <Block
        position={[-3.4, 0.402, 5.5]}
        size={[3.88, 0.2, 1.44]}
        color="#4e5a55"
        radius={0.06}
        rotation={[0, 0, -0.305]}
      />
      {[4.77, 6.23].map((z) => (
        <Beam
          key={`access-curb-${z}`}
          from={[-5.28, 1.15, z]}
          to={[-1.53, -0.01, z]}
          color={SCENE.concreteLight}
          radius={0.045}
        />
      ))}
      {[-5.49, -4.1].map((x) => (
        <Block
          key={`canal-wall-${x}`}
          position={[x, -0.23, 0]}
          size={[0.16, 0.54, 13.96]}
          color={SCENE.concreteLight}
          radius={0.035}
        />
      ))}
      <Block
        position={[-4.03, -0.31, 5.46]}
        size={[0.18, 0.5, 0.95]}
        color={SCENE.concrete}
        radius={0.035}
      />
      <mesh position={[-4.13, -0.28, 5.46]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.18, 18]} />
        <meshStandardMaterial color="#35423d" roughness={0.86} />
      </mesh>
      <Block
        position={[-4.8, -0.03, 4.08]}
        size={[1.7, 0.13, 0.68]}
        color={SCENE.concreteLight}
        radius={0.035}
      />
      {[3.77, 4.39].map((z) => (
        <React.Fragment key={`service-rail-${z}`}>
          <Block
            position={[-4.8, 0.2, z]}
            size={[1.72, 0.045, 0.05]}
            color={SCENE.bridge}
            radius={0.01}
          />
          {[-5.5, -4.1].map((x) => (
            <Block
              key={`${z}-${x}`}
              position={[x, 0.08, z]}
              size={[0.045, 0.28, 0.045]}
              color={SCENE.bridge}
              radius={0.01}
            />
          ))}
        </React.Fragment>
      ))}

      {/* Market-side road and retaining wall. */}
      <Block
        position={[0.12, -0.19, 0]}
        size={[4.02, 0.22, 13.95]}
        color={SCENE.concrete}
        radius={0.13}
      />
      <Block
        position={[2.25, -0.02, 0]}
        size={[0.28, 0.7, 14.05]}
        color={SCENE.concreteLight}
        radius={0.045}
      />
      {[-5.25, -3.15, -1.05, 1.05, 3.15, 5.25].map((z) => (
        <RoadDash key={`west-${z}`} position={[0.02, -0.052, z]} />
      ))}

      {/* This lower far-bank road is the first paved surface reached by rising water. */}
      <Block
        position={[8.58, -0.23, 0]}
        size={[2.35, 0.18, 14.05]}
        color="#59645f"
        radius={0.12}
      />
      <Block
        position={[7.28, -0.08, 0]}
        size={[0.25, 0.52, 14.08]}
        color={SCENE.concreteLight}
        radius={0.04}
      />
      {[-5.25, -3.15, -1.05, 1.05, 3.15, 5.25].map((z) => (
        <RoadDash key={`east-${z}`} position={[8.55, -0.126, z]} />
      ))}

      {/* Flood-depth staff and curb bollards reinforce the civic monitoring setting. */}
      <Block
        position={[6.9, 0.4, 5.5]}
        size={[0.09, 1.55, 0.09]}
        color="#eef3f1"
        radius={0.015}
      />
      {[-0.15, 0.12, 0.39, 0.66, 0.93].map((y, index) => (
        <Block
          key={`gauge-${y}`}
          position={[6.855, y, 5.505]}
          size={[0.025, 0.075, 0.14]}
          color={index > 2 ? "#c46d4f" : SCENE.bridge}
          radius={0.008}
          castShadow={false}
          receiveShadow={false}
        />
      ))}
      {[-4.7, -2.1, 0.5, 3.1, 5.7].map((z) => (
        <mesh key={`market-bollard-${z}`} position={[2.08, 0.08, z]} castShadow>
          <cylinderGeometry args={[0.055, 0.075, 0.7, 8]} />
          <meshStandardMaterial color="#42514b" roughness={0.78} />
        </mesh>
      ))}

      {Array.from({ length: riprapCount }, (_, index) => {
        const east = index % 2 === 1;
        const row = Math.floor(index / 2);
        const rows = Math.max(1, Math.ceil(riprapCount / 2) - 1);
        const z = -6.15 + row * (12.3 / rows);
        const x = east ? 7.07 + (row % 2) * 0.11 : 2.45 - (row % 2) * 0.1;
        return (
          <mesh
            key={`riprap-${index}`}
            position={[x, -0.15 + (row % 3) * 0.025, z]}
            rotation={[0.12 * (row % 2), row * 0.61, 0.08]}
            scale={[0.28 + (row % 3) * 0.05, 0.2 + (row % 2) * 0.04, 0.3]}
            castShadow
          >
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color={row % 2 ? "#87928e" : "#6b7772"}
              roughness={0.96}
            />
          </mesh>
        );
      })}

      <Reeds position={[2.56, -0.18, 5.45]} scale={0.9} />
      <Reeds position={[7.03, -0.18, 2.75]} />
      <Reeds position={[7.08, -0.18, -2.15]} scale={0.82} />
    </group>
  );
}

const RIVER_CLEAN_COLOR = new Color("#3a8dca");
const RIVER_MID_COLOR = new Color("#528c83");
const RIVER_FLOOD_COLOR = new Color("#9a8b75");

export function Water({ floodLevel, active }: { floodLevel: number; active: boolean }) {
  const glints = React.useRef<Group>(null);
  const wakeGroup = React.useRef<Group>(null);
  const calmWaterTop = -0.12;
  const eased = floodLevel * floodLevel * (3 - 2 * floodLevel);
  const geometryLevel = Math.round(floodLevel * 72) / 72;
  const farProgress = smoothPhase(geometryLevel, 0.2, 0.45);
  const marketProgress = smoothPhase(geometryLevel, 0.45, 1);
  const farExtent = farProgress * 3.35;
  const marketExtent = marketProgress * 8;
  const waterLeft = 2.45 - marketExtent;
  const waterRight = 7.2 + farExtent;
  const waterWidth = waterRight - waterLeft;
  const waterCenterX = (waterLeft + waterRight) / 2;
  const waterY = -0.2 + eased * 0.71;
  const waterDepth = 1.1 + eased * 0.45;
  const canalSpillProgress = smoothPhase(floodLevel, 0.86, 0.96);
  const canalBankY = -0.02;
  const canalWaterY =
    Math.min(waterY, canalBankY) + Math.max(0, waterY - canalBankY) * canalSpillProgress;
  const visibleSurfaceY = Math.max(calmWaterTop, waterY);
  const color = React.useMemo(() => {
    const t = Math.min(1, Math.max(0, eased * 1.05));
    if (t < 0.5) {
      return RIVER_CLEAN_COLOR.clone().lerp(RIVER_MID_COLOR, t * 2).getStyle();
    } else {
      return RIVER_MID_COLOR.clone().lerp(RIVER_FLOOD_COLOR, (t - 0.5) * 2).getStyle();
    }
  }, [eased]);
  const glintColor = React.useMemo(
    () => new Color("#bce8f8").lerp(new Color("#e8e0d5"), eased * 0.75).getStyle(),
    [eased],
  );

  useFrame(({ clock }) => {
    if (!active) return;
    if (glints.current) {
      // Downstream procedural river flow
      const flowSpeed = 0.55 + eased * 1.2;
      glints.current.position.z = (clock.elapsedTime * flowSpeed) % 3.6 - 1.8;
    }
    if (wakeGroup.current) {
      const pulseSpeed = 2.4 + eased * 3.2;
      wakeGroup.current.children.forEach((child, i) => {
        const wave = Math.sin(clock.elapsedTime * pulseSpeed + i * 1.4);
        child.scale.setScalar(1 + wave * (0.08 + eased * 0.12));
      });
    }
  });

  return (
    <group>
      {/* These opaque channel volumes are permanent, but share the scenario colour.
          Calm visibility never depends on the overflow mesh or depth sorting. */}
      <WaterVolume
        position={[4.78, calmWaterTop - 0.18, 0]}
        size={[4.62, 0.36, 14.02]}
        color={color}
        radius={0.18}
      />
      <WaterVolume
        position={[-4.8, calmWaterTop - 0.18, 0]}
        size={[1.12, 0.36, 13.82]}
        color={color}
        radius={0.12}
      />

      {/* The flood volume starts below the permanent calm surface, overtakes it as
          the level rises, then widens continuously across both banks. */}
      <WaterVolume
        position={[waterCenterX, waterY - waterDepth / 2, 0]}
        size={[waterWidth, waterDepth, 14.36]}
        color={color}
        radius={0.26}
      />

      {/* The drainage canal remains visibly connected to the river and is overlapped by the
          single expanding flood surface at high water, avoiding dry seams. */}
      {canalSpillProgress < 0.99 && (
        <WaterVolume
          position={[-4.8, canalWaterY - 0.45, 0]}
          size={[1.2, 0.9, 14.04]}
          color={color}
          opacity={0.97 * (1 - canalSpillProgress)}
          radius={0.16}
        />
      )}

      {/* Flowing downstream current streaks */}
      <group ref={glints} position={[0, visibleSurfaceY + 0.018, 0]}>
        {[-5.5, -3.15, -0.9, 1.2, 3.4, 5.6].map((z, index) => (
          <mesh
            key={z}
            position={[4.2 + (index % 3) * 0.85, 0, z]}
            rotation={[-Math.PI / 2, 0, index % 2 ? -0.06 : 0.05]}
          >
            <planeGeometry args={[1.45, 0.04]} />
            <meshBasicMaterial
              color={glintColor}
              transparent
              opacity={0.55 - eased * 0.25}
              side={DoubleSide}
            />
          </mesh>
        ))}
      </group>

      {/* Dynamic Silt Wake Rings around River Boulders & Bridge Pier Footings */}
      <group ref={wakeGroup} position={[0, visibleSurfaceY + 0.019, 0]}>
        {RIVER_ROCKS.map((rock, index) => (
          <mesh
            key={`wake-boulder-${index}`}
            position={[rock.position[0], 0, rock.position[2] + 0.05]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[rock.scale[0] * 1.35, rock.scale[2] * 0.92, 1]}
          >
            <ringGeometry args={[0.7, 0.92, 28]} />
            <meshBasicMaterial
              color={eased > 0.4 ? "#e8e0d5" : "#d7f0f8"}
              transparent
              opacity={Math.max(0.2, 0.65 - eased * 0.2)}
              side={DoubleSide}
            />
          </mesh>
        ))}
        {/* Wake around bridge pier foundations */}
        {[2.42, 7.14].map((x) => (
          <mesh
            key={`wake-pier-${x}`}
            position={[x, 0, -4.65]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[0.45, 0.65, 20]} />
            <meshBasicMaterial
              color={eased > 0.4 ? "#e8e0d5" : "#d7f0f8"}
              transparent
              opacity={0.4}
              side={DoubleSide}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function RiverRocks({ quality }: { quality: SceneQuality }) {
  const smallCount = quality === "full" ? 4 : quality === "balanced" ? 3 : 2;
  return (
    <group>
      {RIVER_ROCKS.map((rock, index) => (
        <mesh
          key={`boulder-${index}`}
          position={rock.position}
          rotation={rock.rotation}
          scale={rock.scale}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={index === 1 ? "#68716d" : "#7b8580"}
            roughness={0.94}
          />
        </mesh>
      ))}
      {Array.from({ length: smallCount }, (_, index) => (
        <mesh
          key={`river-stone-${index}`}
          position={[3.15 + index * 0.9, -0.19, -3.2 + (index % 2) * 1.1]}
          rotation={[0.12, index * 0.7, 0.08]}
          scale={[0.27, 0.18, 0.32]}
          castShadow
        >
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#87928e" roughness={0.96} />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// MARKET STALLS (TALIPAPA)
// ---------------------------------------------------------------------------

export function MarketStall({
  position,
  type = "fruit",
  roof = "#2f80c9",
  striped = false,
}: {
  position: Position;
  type?: "fruit" | "fish" | "rice" | "bakery" | "beverage";
  roof?: string;
  striped?: boolean;
}) {
  return (
    <group position={position}>
      {/* 4 Corner wooden support posts */}
      {[
        [-0.6, -0.52],
        [0.6, -0.52],
        [-0.6, 0.52],
        [0.6, 0.52],
      ].map(([x, z]) => (
        <Block
          key={`${x}-${z}`}
          position={[x, 0.5, z]}
          size={[0.07, 1.25, 0.07]}
          color="#5c4033"
          radius={0.015}
        />
      ))}

      {/* Main wooden counter / display base */}
      <Block
        position={[0, 0.3, 0.04]}
        size={[1.22, 0.34, 0.76]}
        color="#8b5a2b"
        radius={0.04}
      />

      {/* Sloped canvas canopy */}
      <RoundedBox
        args={[1.55, 0.12, 1.32]}
        radius={0.06}
        smoothness={2}
        position={[0, 1.18, 0]}
        rotation={[0, 0, -0.045]}
        castShadow
      >
        <meshStandardMaterial color={roof} roughness={0.72} />
      </RoundedBox>

      {/* Decorative awning stripes */}
      {striped &&
        [-0.48, 0, 0.48].map((x) => (
          <Block
            key={x}
            position={[x, 1.247, 0]}
            size={[0.18, 0.018, 1.22]}
            color="#ffffff"
            radius={0.01}
            receiveShadow={false}
          />
        ))}

      {/* Vendor Type Specific Displays */}
      {type === "fruit" && (
        <>
          {/* Fruit crates: green mangoes/melons, orange papayas, red tomatoes */}
          <Block position={[0.42, 0.53, 0.04]} size={[0.34, 0.14, 0.3]} color="#5c3d2e" radius={0.02} />
          <Block position={[0.42, 0.62, 0.04]} size={[0.3, 0.08, 0.26]} color="#2e7d32" radius={0.03} />

          <Block position={[0, 0.53, 0.04]} size={[0.34, 0.14, 0.3]} color="#5c3d2e" radius={0.02} />
          <Block position={[0, 0.62, 0.04]} size={[0.3, 0.08, 0.26]} color="#f57c00" radius={0.03} />

          <Block position={[-0.42, 0.53, 0.04]} size={[0.34, 0.14, 0.3]} color="#5c3d2e" radius={0.02} />
          <Block position={[-0.42, 0.62, 0.04]} size={[0.3, 0.08, 0.26]} color="#d32f2f" radius={0.03} />

          {/* Hanging bananas under canopy */}
          <Block position={[0.35, 1.05, 0.42]} size={[0.12, 0.2, 0.12]} color="#fbc02d" radius={0.04} />
          {/* Ground baskets */}
          <Block position={[0.56, 0.08, 0.34]} size={[0.26, 0.2, 0.26]} color="#a1887f" radius={0.03} />
        </>
      )}

      {type === "fish" && (
        <>
          {/* Sloped metallic seafood display tray with ice */}
          <Block position={[0, 0.52, 0.04]} size={[1.15, 0.08, 0.65]} color="#cfd8dc" radius={0.02} rotation={[0.08, 0, 0]} />
          {/* Fresh fish rows */}
          {[-0.35, 0, 0.35].map((x) => (
            <Block key={x} position={[x, 0.58, 0.04]} size={[0.22, 0.05, 0.42]} color="#78909c" radius={0.02} rotation={[0.08, 0, 0]} />
          ))}
          {/* Blue ice storage cooler tubs */}
          <Block position={[0.55, 0.12, 0.36]} size={[0.32, 0.26, 0.28]} color="#1976d2" radius={0.04} />
          <Block position={[-0.52, 0.1, 0.34]} size={[0.28, 0.22, 0.26]} color="#0288d1" radius={0.04} />
        </>
      )}

      {type === "rice" && (
        <>
          {/* 3 Burlap sacks of grains standing on the counter */}
          {[-0.36, 0, 0.36].map((x, idx) => (
            <group key={x} position={[x, 0.54, 0.04]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.15, 0.17, 0.32, 10]} />
                <meshStandardMaterial color="#d7b382" roughness={0.92} />
              </mesh>
              {/* Grain surface inside sack */}
              <mesh position={[0, 0.14, 0]}>
                <cylinderGeometry args={[0.13, 0.13, 0.05, 10]} />
                <meshStandardMaterial color={idx === 0 ? "#f5f5f5" : idx === 1 ? "#d7ccc8" : "#8d6e63"} roughness={0.9} />
              </mesh>
            </group>
          ))}
          {/* Wooden price markers */}
          <Block position={[-0.36, 0.74, 0.2]} size={[0.12, 0.1, 0.02]} color="#4e342e" radius={0.005} />
          <Block position={[0.36, 0.74, 0.2]} size={[0.12, 0.1, 0.02]} color="#4e342e" radius={0.005} />
        </>
      )}

      {type === "bakery" && (
        <>
          {/* Enclosed glass pastry showcase */}
          <Block position={[0, 0.58, 0.04]} size={[1.08, 0.34, 0.58]} color="#b2ebf2" radius={0.03} />
          {/* Bread and delicacy trays */}
          {[-0.32, 0.32].map((x) => (
            <Block key={x} position={[x, 0.52, 0.04]} size={[0.36, 0.06, 0.44]} color="#d79a48" radius={0.02} />
          ))}
          {/* Ground flour sack */}
          <Block position={[-0.52, 0.1, 0.34]} size={[0.3, 0.22, 0.26]} color="#efebe9" radius={0.04} />
        </>
      )}

      {type === "beverage" && (
        <>
          {/* Juice dispenser coolers (Orange, Green melon, Red sago) */}
          <mesh position={[-0.32, 0.62, 0.04]} castShadow>
            <cylinderGeometry args={[0.14, 0.14, 0.36, 12]} />
            <meshStandardMaterial color="#f57c00" roughness={0.3} transparent opacity={0.88} />
          </mesh>
          <mesh position={[0, 0.62, 0.04]} castShadow>
            <cylinderGeometry args={[0.14, 0.14, 0.36, 12]} />
            <meshStandardMaterial color="#388e3c" roughness={0.3} transparent opacity={0.88} />
          </mesh>
          <mesh position={[0.32, 0.62, 0.04]} castShadow>
            <cylinderGeometry args={[0.14, 0.14, 0.36, 12]} />
            <meshStandardMaterial color="#d32f2f" roughness={0.3} transparent opacity={0.88} />
          </mesh>
          {/* Market stool */}
          <mesh position={[0.54, 0.18, 0.42]} castShadow>
            <cylinderGeometry args={[0.15, 0.15, 0.36, 8]} />
            <meshStandardMaterial color="#e53935" roughness={0.7} />
          </mesh>
        </>
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// DISTINCT HOUSES (ELEVATED WEST TERRACE)
// ---------------------------------------------------------------------------

/** House 1 (West Corner): Modern Two-Storey Home with Balcony & Solar Panel */
export function HouseModern({
  position,
  rotation,
  scale = 1,
}: {
  position: Position;
  rotation?: Position;
  scale?: number;
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Ground floor: Warm off-white stucco */}
      <Block position={[0, 0.54, 0]} size={[1.85, 1.08, 1.65]} color="#f0f4f2" radius={0.06} />
      {/* Dark timber front entrance door */}
      <Block position={[0.35, 0.44, 0.84]} size={[0.42, 0.76, 0.05]} color="#3e2723" radius={0.02} />
      <Block position={[-0.42, 0.54, 0.84]} size={[0.52, 0.42, 0.04]} color="#64b5f6" radius={0.02} />

      {/* Second floor: Modern timber-slat accent cladding */}
      <Block position={[0, 1.52, -0.06]} size={[1.82, 0.94, 1.48]} color="#6d4c41" radius={0.05} />
      {/* Second floor glass sliding door */}
      <Block position={[-0.2, 1.46, 0.69]} size={[0.72, 0.72, 0.04]} color="#80deea" radius={0.02} />

      {/* Modern Balcony with dark safety rail */}
      <Block position={[-0.2, 1.04, 0.94]} size={[0.96, 0.08, 0.48]} color="#37474f" radius={0.02} />
      {[-0.64, 0.24].map((x) => (
        <Block key={x} position={[x, 1.25, 0.94]} size={[0.04, 0.38, 0.46]} color="#263238" radius={0.01} />
      ))}
      <Block position={[-0.2, 1.38, 1.16]} size={[0.96, 0.04, 0.04]} color="#263238" radius={0.01} />

      {/* Mono-pitch / Shed roof with dark profile */}
      <RoundedBox
        args={[2.08, 0.14, 1.82]}
        radius={0.05}
        smoothness={2}
        position={[0, 2.08, -0.08]}
        rotation={[0.12, 0, 0]}
        castShadow
      >
        <meshStandardMaterial color="#315f7d" roughness={0.68} />
      </RoundedBox>

      {/* Rooftop Solar Panels */}
      <Block
        position={[0.15, 2.19, -0.08]}
        size={[1.35, 0.04, 0.95]}
        color="#102030"
        radius={0.01}
        rotation={[0.12, 0, 0]}
      />
      <Block
        position={[0.15, 2.21, -0.08]}
        size={[1.3, 0.01, 0.9]}
        color="#2b4c7e"
        radius={0.01}
        rotation={[0.12, 0, 0]}
      />

      {/* Side outdoor AC condenser & flower pot */}
      <Block position={[0.96, 0.35, 0.2]} size={[0.16, 0.34, 0.44]} color="#cfd8dc" radius={0.03} />
      <Block position={[-0.94, 0.15, 0.5]} size={[0.22, 0.26, 0.22]} color="#795548" radius={0.03} />
      <mesh position={[-0.94, 0.35, 0.5]} castShadow>
        <sphereGeometry args={[0.16, 8, 8]} />
        <meshStandardMaterial color="#2e7d32" roughness={0.8} />
      </mesh>
    </group>
  );
}

/** House 2 (Middle): Philippine Family Home with Terracotta Hip Roof & Porch */
export function HouseTerracotta({
  position,
  rotation,
  scale = 1,
}: {
  position: Position;
  rotation?: Position;
  scale?: number;
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Ground Body: Warm almond/cream walls */}
      <Block position={[0, 0.58, 0]} size={[1.82, 1.15, 1.62]} color="#fdfbf7" radius={0.07} />

      {/* Traditional Terracotta 4-sided Hip Roof */}
      <mesh position={[0, 1.55, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.42, 0.88, 4]} />
        <meshStandardMaterial color="#c46d4f" roughness={0.78} />
      </mesh>
      {/* Hip Ridge Cap */}
      <mesh position={[0, 1.95, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.3, 0.2, 4]} />
        <meshStandardMaterial color="#a64b32" roughness={0.82} />
      </mesh>

      {/* Front Entrance Porch / Deck */}
      <Block position={[-0.05, 0.12, 0.95]} size={[1.15, 0.16, 0.48]} color="#795548" radius={0.03} />
      {/* Front Steps */}
      <Block position={[-0.05, 0.05, 1.22]} size={[0.75, 0.09, 0.2]} color="#8d6e63" radius={0.02} />
      {/* Slender porch timber pillars */}
      {[-0.52, 0.42].map((x) => (
        <Block key={x} position={[x, 0.65, 1.12]} size={[0.06, 0.92, 0.06]} color="#5d4037" radius={0.015} />
      ))}
      {/* Porch roof overhang */}
      <Block position={[-0.05, 1.12, 1.08]} size={[1.22, 0.08, 0.48]} color="#c46d4f" radius={0.02} />

      {/* Front Door */}
      <Block position={[-0.05, 0.56, 0.82]} size={[0.42, 0.74, 0.05]} color="#4e342e" radius={0.02} />

      {/* Windows with colorful flower planter boxes */}
      <Block position={[-0.6, 0.68, 0.82]} size={[0.38, 0.38, 0.05]} color="#64b5f6" radius={0.02} />
      <Block position={[-0.6, 0.46, 0.87]} size={[0.42, 0.12, 0.1]} color="#4e342e" radius={0.02} />
      <Block position={[-0.6, 0.54, 0.88]} size={[0.38, 0.08, 0.08]} color="#e91e63" radius={0.03} />

      <Block position={[0.6, 0.68, 0.82]} size={[0.38, 0.38, 0.05]} color="#64b5f6" radius={0.02} />
      <Block position={[0.6, 0.46, 0.87]} size={[0.42, 0.12, 0.1]} color="#4e342e" radius={0.02} />
      <Block position={[0.6, 0.54, 0.88]} size={[0.38, 0.08, 0.08]} color="#f06292" radius={0.03} />

      {/* Rooftop Stainless Steel Elevated Water Reservoir Tank */}
      <group position={[0.55, 1.62, -0.45]}>
        <mesh position={[0, 0.32, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.42, 14]} />
          <meshStandardMaterial color="#cbd3d0" metalness={0.72} roughness={0.35} />
        </mesh>
        {/* Support legs */}
        {[-0.14, 0.14].map((x) =>
          [-0.14, 0.14].map((z) => (
            <Block key={`${x}-${z}`} position={[x, 0.08, z]} size={[0.03, 0.24, 0.03]} color="#455a64" radius={0.005} />
          )),
        )}
      </group>
    </group>
  );
}

/** House 3 (Front Corner): Bungalow with Shaded Veranda & Patio */
export function HouseBungalow({
  position,
  rotation,
  scale = 1,
}: {
  position: Position;
  rotation?: Position;
  scale?: number;
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Ground Body: Clean sage-tinted stucco */}
      <Block position={[0, 0.54, 0]} size={[1.78, 1.08, 1.58]} color="#edf3f0" radius={0.06} />

      {/* Extended Gable Roof with Veranda Canopy */}
      <mesh position={[0, 1.38, 0.1]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.36, 0.72, 4]} />
        <meshStandardMaterial color="#2b5368" roughness={0.74} />
      </mesh>

      {/* Shaded Veranda Patio */}
      <Block position={[-0.1, 0.1, 0.94]} size={[1.45, 0.14, 0.52]} color="#cfd8dc" radius={0.03} />
      {/* Corner wooden veranda support post */}
      <Block position={[-0.68, 0.62, 1.12]} size={[0.07, 0.96, 0.07]} color="#5d4037" radius={0.015} />

      {/* Wooden front door */}
      <Block position={[-0.25, 0.46, 0.81]} size={[0.42, 0.74, 0.05]} color="#4e342e" radius={0.02} />

      {/* Veranda patio outdoor bench */}
      <Block position={[0.38, 0.28, 1.04]} size={[0.45, 0.06, 0.2]} color="#6d4c41" radius={0.015} />
      <Block position={[0.38, 0.42, 1.12]} size={[0.45, 0.22, 0.04]} color="#5d4037" radius={0.015} />

      {/* Windows with teal sun-awnings */}
      <Block position={[0.48, 0.68, 0.81]} size={[0.36, 0.36, 0.05]} color="#80deea" radius={0.02} />
      <Block position={[0.48, 0.9, 0.88]} size={[0.42, 0.06, 0.16]} color="#00897b" radius={0.015} rotation={[-0.18, 0, 0]} />

      {/* Miniature potted palm beside veranda */}
      <group position={[-0.92, 0.12, 0.8]}>
        <Block position={[0, 0.14, 0]} size={[0.24, 0.28, 0.24]} color="#8d6e63" radius={0.03} />
        <mesh position={[0, 0.42, 0]} castShadow>
          <sphereGeometry args={[0.22, 8, 8]} />
          <meshStandardMaterial color="#2e7d32" roughness={0.78} />
        </mesh>
      </group>
    </group>
  );
}

/** Default backwards-compatible House wrapper */
export function House({
  position,
  scale = 1,
}: {
  position: Position;
  roof?: string;
  body?: string;
  scale?: number;
}) {
  return <HouseTerracotta position={position} scale={scale} />;
}

// ---------------------------------------------------------------------------
// COMMERCIAL & CIVIC BUILDINGS (MARKET ROAD)
// ---------------------------------------------------------------------------

export function CommercialBuilding({
  position,
  type = "bakery",
  scale = 1,
}: {
  position: Position;
  type?: "clinic" | "bakery" | "civic";
  accent?: string;
  roof?: string;
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      {type === "clinic" && (
        <>
          {/* Health Clinic: Modern medical building */}
          <Block position={[0, 1.05, 0]} size={[1.65, 2.1, 2.25]} color="#f7f2fa" radius={0.07} />
          {/* Pastel Purple / Lavender roof trim */}
          <Block position={[0, 2.14, 0]} size={[1.8, 0.15, 2.38]} color="#9575cd" radius={0.05} />

          {/* Entrance facade with automatic glass sliding doors */}
          <Block position={[0.84, 0.58, 0]} size={[0.06, 0.98, 1.95]} color="#cfd8dc" radius={0.02} />
          <Block position={[0.88, 0.52, -0.1]} size={[0.07, 0.88, 0.85]} color="#80deea" radius={0.02} />
          {/* Silver door frame divider */}
          <Block position={[0.92, 0.52, -0.1]} size={[0.02, 0.88, 0.03]} color="#37474f" radius={0.005} />

          {/* Pastel Purple Medical Sign Canopy */}
          <Block position={[0.98, 1.25, 0]} size={[0.35, 0.09, 1.98]} color="#b39ddb" radius={0.025} />
          <Block position={[1.12, 1.48, 0]} size={[0.05, 0.38, 0.72]} color="#ffffff" radius={0.03} />
          {/* Medical Cross */}
          <Block position={[1.15, 1.48, 0]} size={[0.02, 0.28, 0.1]} color="#e53935" radius={0.01} />
          <Block position={[1.15, 1.48, 0]} size={[0.02, 0.1, 0.28]} color="#e53935" radius={0.01} />

          {/* Second floor consultation windows with horizontal sun-louvers */}
          {[-0.6, 0.2, 0.7].map((z) => (
            <group key={`clinic-window-${z}`}>
              <Block position={[0.85, 1.72, z]} size={[0.06, 0.46, 0.44]} color="#b2ebf2" radius={0.02} />
              {/* Sun-shading louver slats */}
              {[1.6, 1.72, 1.84].map((y) => (
                <Block key={y} position={[0.9, y, z]} size={[0.06, 0.02, 0.48]} color="#7e57c2" radius={0.005} />
              ))}
            </group>
          ))}

          {/* Rooftop Communications Mast / Radio Antenna */}
          <mesh position={[0.2, 2.65, -0.55]} castShadow>
            <cylinderGeometry args={[0.02, 0.04, 0.95, 8]} />
            <meshStandardMaterial color="#455a64" metalness={0.65} roughness={0.4} />
          </mesh>
          <mesh position={[0.2, 3.12, -0.55]} castShadow>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color="#e53935" emissive="#d32f2f" emissiveIntensity={0.5} />
          </mesh>
        </>
      )}

      {type === "bakery" && (
        <>
          {/* Bakery / Sari-Sari Store: Neighborhood corner establishment */}
          <Block position={[0, 1.05, 0]} size={[1.65, 2.1, 2.25]} color="#fffaf0" radius={0.07} />
          <Block position={[0, 2.14, 0]} size={[1.8, 0.16, 2.38]} color="#6d4c41" radius={0.05} />

          {/* Red and white striped fabric awning extending over sidewalk */}
          <Block position={[1.05, 1.28, 0]} size={[0.48, 0.08, 2.1]} color="#d32f2f" radius={0.02} rotation={[0, 0, -0.15]} />
          {[-0.7, -0.35, 0, 0.35, 0.7].map((z) => (
            <Block key={z} position={[1.05, 1.31, z]} size={[0.46, 0.03, 0.16]} color="#ffffff" radius={0.01} rotation={[0, 0, -0.15]} />
          ))}

          {/* Streetfront service counter & soda crate stack */}
          <Block position={[0.86, 0.52, -0.2]} size={[0.08, 0.75, 1.4]} color="#a1887f" radius={0.02} />
          {/* Glass display window for breads & baked goods */}
          <Block position={[0.88, 0.65, -0.2]} size={[0.06, 0.38, 1.15]} color="#ffe082" radius={0.02} />
          {/* Stacked red soda crates beside entrance */}
          <Block position={[0.92, 0.15, 0.72]} size={[0.3, 0.28, 0.32]} color="#d32f2f" radius={0.03} />
          <Block position={[0.92, 0.38, 0.72]} size={[0.26, 0.22, 0.28]} color="#d32f2f" radius={0.03} />

          {/* Second floor residence with wooden balcony */}
          <Block position={[0.88, 1.5, 0.5]} size={[0.24, 0.06, 0.85]} color="#5d4037" radius={0.02} />
          <Block position={[0.98, 1.68, 0.5]} size={[0.04, 0.32, 0.85]} color="#4e342e" radius={0.01} />
          <Block position={[0.85, 1.74, 0.5]} size={[0.06, 0.48, 0.65]} color="#80deea" radius={0.02} />
          <Block position={[0.85, 1.74, -0.55]} size={[0.06, 0.48, 0.55]} color="#80deea" radius={0.02} />

          {/* Rooftop kitchen exhaust chimney */}
          <mesh position={[-0.45, 2.42, 0.55]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.48, 8]} />
            <meshStandardMaterial color="#78909c" metalness={0.5} roughness={0.5} />
          </mesh>
        </>
      )}

      {type === "civic" && (
        <>
          {/* Barangay Multi-Purpose Outpost & Public Hall */}
          <Block position={[0, 1.05, 0]} size={[1.65, 2.1, 2.25]} color="#fffde7" radius={0.07} />
          {/* Civic dark mustard yellow / ochre roof parapet */}
          <Block position={[0, 2.14, 0]} size={[1.8, 0.18, 2.38]} color="#c67d0a" radius={0.05} />

          {/* First floor wide civic glass curtain entryway */}
          <Block position={[0.85, 0.56, 0]} size={[0.07, 0.96, 1.95]} color="#37474f" radius={0.02} />
          <Block position={[0.89, 0.54, 0]} size={[0.06, 0.86, 1.8]} color="#4fc3f7" radius={0.02} />
          {/* Darker yellow canopy over entryway */}
          <Block position={[0.98, 1.18, 0]} size={[0.36, 0.08, 2.05]} color="#d97706" radius={0.02} />

          {/* Second floor briefing windows with civic emblem badge */}
          {[-0.55, 0.55].map((z) => (
            <Block key={z} position={[0.86, 1.72, z]} size={[0.06, 0.48, 0.65]} color="#81d4fa" radius={0.02} />
          ))}
          {/* Barangay Shield Emblem Badge in center */}
          <mesh position={[0.9, 1.72, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.18, 0.18, 0.04, 16]} />
            <meshStandardMaterial color="#e65100" metalness={0.65} roughness={0.35} />
          </mesh>

          {/* Rooftop Solar Array & Flagpole Mast */}
          <Block position={[-0.15, 2.26, -0.45]} size={[1.15, 0.04, 0.85]} color="#0d1b2a" radius={0.01} rotation={[0.08, 0, 0]} />
          {/* Flagpole */}
          <mesh position={[0.65, 2.62, 0.85]} castShadow>
            <cylinderGeometry args={[0.018, 0.028, 0.88, 8]} />
            <meshStandardMaterial color="#cfd8dc" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Mini banner */}
          <Block position={[0.65, 2.92, 0.98]} size={[0.01, 0.16, 0.24]} color="#c67d0a" radius={0.005} />
        </>
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// TREES & VEGETATION (LUSH ISOMETRIC DETAILS)
// ---------------------------------------------------------------------------

/** Broadleaf Layered Canopy Tree */
export function Tree({ position, scale = 1 }: { position: Position; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {/* Tapered Trunk */}
      <mesh position={[0, 0.65, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.17, 1.3, 8]} />
        <meshStandardMaterial color="#5d4037" roughness={0.92} />
      </mesh>
      {/* Lower Main Foliage Cluster */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <icosahedronGeometry args={[0.78, 1]} />
        <meshStandardMaterial color="#1b5e20" roughness={0.82} />
      </mesh>
      {/* Upper Highlight Foliage Cluster */}
      <mesh position={[-0.22, 1.88, 0.12]} castShadow>
        <icosahedronGeometry args={[0.54, 1]} />
        <meshStandardMaterial color="#2e7d32" roughness={0.78} />
      </mesh>
      <mesh position={[0.22, 1.78, -0.15]} castShadow>
        <icosahedronGeometry args={[0.48, 1]} />
        <meshStandardMaterial color="#388e3c" roughness={0.78} />
      </mesh>
    </group>
  );
}

/** Tropical Coconut Palm Tree */
export function PalmTree({ position, scale = 1 }: { position: Position; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {/* Curved Segmented Trunk */}
      <mesh position={[0.08, 0.72, 0]} rotation={[0, 0, -0.09]} castShadow>
        <cylinderGeometry args={[0.08, 0.14, 1.45, 8]} />
        <meshStandardMaterial color="#6d4c41" roughness={0.88} />
      </mesh>
      <mesh position={[0.22, 1.72, 0]} rotation={[0, 0, -0.18]} castShadow>
        <cylinderGeometry args={[0.065, 0.08, 0.65, 8]} />
        <meshStandardMaterial color="#5d4037" roughness={0.88} />
      </mesh>

      {/* Coconut cluster under crown */}
      {[-0.06, 0.06].map((x) =>
        [-0.06, 0.06].map((z) => (
          <mesh key={`${x}-${z}`} position={[0.28 + x, 1.95, z]} castShadow>
            <sphereGeometry args={[0.07, 6, 6]} />
            <meshStandardMaterial color="#4e342e" roughness={0.85} />
          </mesh>
        )),
      )}

      {/* 6 Radiating Tropical Palm Fronds */}
      {[0, 60, 120, 180, 240, 300].map((angle, idx) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <group
            key={angle}
            position={[0.28, 2.05, 0]}
            rotation={[0, rad, 0.45 + (idx % 2) * 0.15]}
          >
            <mesh position={[0.55, -0.08, 0]} rotation={[0, 0, -0.25]} castShadow>
              <boxGeometry args={[1.05, 0.03, 0.32]} />
              <meshStandardMaterial
                color={idx % 2 === 0 ? "#1b5e20" : "#2e7d32"}
                roughness={0.76}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Low-poly Shrub / Bush */
export function Shrub({ position, scale = 1 }: { position: Position; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <dodecahedronGeometry args={[0.38, 0]} />
        <meshStandardMaterial color="#2e7d32" roughness={0.84} />
      </mesh>
      <mesh position={[0.18, 0.18, 0.1]} castShadow>
        <dodecahedronGeometry args={[0.26, 0]} />
        <meshStandardMaterial color="#388e3c" roughness={0.84} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// 3D SKY CLOUDS (WITH DYNAMIC STORM DARKENING)
// ---------------------------------------------------------------------------

function CloudPuff({
  position,
  scale = 1,
  color,
}: {
  position: Position;
  scale?: number;
  color: string;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.15, 12, 10]} />
        <meshStandardMaterial color={color} roughness={0.92} />
      </mesh>
      <mesh position={[-0.85, -0.2, 0.1]}>
        <sphereGeometry args={[0.85, 12, 10]} />
        <meshStandardMaterial color={color} roughness={0.92} />
      </mesh>
      <mesh position={[0.9, -0.15, -0.1]}>
        <sphereGeometry args={[0.9, 12, 10]} />
        <meshStandardMaterial color={color} roughness={0.92} />
      </mesh>
      <mesh position={[0.2, 0.45, 0.15]}>
        <sphereGeometry args={[0.82, 12, 10]} />
        <meshStandardMaterial color={color} roughness={0.92} />
      </mesh>
      <mesh position={[-0.4, 0.35, -0.2]}>
        <sphereGeometry args={[0.78, 12, 10]} />
        <meshStandardMaterial color={color} roughness={0.92} />
      </mesh>
    </group>
  );
}

const CLOUD_WHITE_COLOR = new Color("#ffffff");
const CLOUD_MID_COLOR = new Color("#cfd8dc");
const CLOUD_STORM_COLOR = new Color("#78909c");

export function SkyClouds({
  floodLevel,
  active,
  reducedMotion,
  quality = "balanced",
}: {
  floodLevel: number;
  active: boolean;
  reducedMotion: boolean;
  quality?: SceneQuality;
}) {
  const groupRef = React.useRef<Group>(null);
  const eased = floodLevel * floodLevel * (3 - 2 * floodLevel);
  const lean = quality === "lean";

  // Cloud color smoothly shifts from sunny white #ffffff to a soft stylish overcast slate #78909c (never pitch-black!)
  const cloudColor = React.useMemo(() => {
    if (eased < 0.5) {
      return CLOUD_WHITE_COLOR.clone().lerp(CLOUD_MID_COLOR, eased * 2).getStyle();
    } else {
      return CLOUD_MID_COLOR.clone().lerp(CLOUD_STORM_COLOR, (eased - 0.5) * 2).getStyle();
    }
  }, [eased]);

  useFrame(({ clock }) => {
    if (!groupRef.current || lean) return;
    if (active && !reducedMotion) {
      // Gentle atmospheric floating drift
      groupRef.current.position.x = Math.sin(clock.elapsedTime * 0.15) * 0.6;
      groupRef.current.position.z = Math.cos(clock.elapsedTime * 0.1) * 0.35;
    }
  });

  return (
    <group ref={groupRef} position={[0, 8.6, -7.5]}>
      {/* Cloud Cluster 1 (Rear Left, over high terrace) */}
      <CloudPuff position={[-6.8, 0, 1.2]} scale={1.25} color={cloudColor} />
      {/* Cloud Cluster 2 (Rear Center, behind bridge) */}
      <CloudPuff position={[0.5, 0.8, -1.8]} scale={1.45} color={cloudColor} />
      {/* Cloud Cluster 3 (Rear Right, over river/far bank) */}
      <CloudPuff position={[7.5, 0.2, 0.8]} scale={1.2} color={cloudColor} />
      {!lean && (
        <>
          {/* Accent floating cloud puffs */}
          <CloudPuff position={[-3.2, 1.4, 2.5]} scale={0.75} color={cloudColor} />
          <CloudPuff position={[4.2, 1.2, -2.5]} scale={0.85} color={cloudColor} />
        </>
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// BRIDGE & LIGHTING
// ---------------------------------------------------------------------------

function Beam({
  from,
  to,
  color = SCENE.bridge,
  radius = 0.07,
}: {
  from: Position;
  to: Position;
  color?: string;
  radius?: number;
}) {
  const start = React.useMemo(() => new Vector3(...from), [from]);
  const end = React.useMemo(() => new Vector3(...to), [to]);
  const midpoint = React.useMemo(
    () => start.clone().add(end).multiplyScalar(0.5),
    [start, end],
  );
  const length = React.useMemo(() => start.distanceTo(end), [start, end]);
  const quaternion = React.useMemo(
    () =>
      new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        end.clone().sub(start).normalize(),
      ),
    [start, end],
  );
  return (
    <mesh position={midpoint} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[radius, radius, length, 7]} />
      <meshStandardMaterial color={color} roughness={0.58} metalness={0.28} />
    </mesh>
  );
}

export function BridgeLamp({
  position,
  floodLevel = 0,
  quality = "balanced",
}: {
  position: Position;
  floodLevel?: number;
  quality?: SceneQuality;
}) {
  const isStorm = floodLevel > 0.35;
  const lean = quality === "lean";
  return (
    <group position={position}>
      <mesh position={[0, 0.58, 0]} castShadow={!lean}>
        <cylinderGeometry args={[0.035, 0.055, 1.16, 7]} />
        <meshStandardMaterial color="#243d34" roughness={0.72} />
      </mesh>
      {/* Radiant Clean Warm Bulb Core */}
      <mesh position={[0.08, 1.15, 0]}>
        <boxGeometry args={[0.24, 0.14, 0.16]} />
        <meshBasicMaterial color="#ffe082" />
      </mesh>
      {/* Soft Warm Amber Flare */}
      <mesh position={[0.08, 1.15, 0]}>
        <sphereGeometry args={[0.48, 14, 14]} />
        <meshBasicMaterial
          color="#ff9800"
          transparent
          opacity={0.32}
          depthWrite={false}
        />
      </mesh>
      {!lean && (
        <pointLight
          position={[0.08, 1.1, 0]}
          color="#ff9100"
          intensity={isStorm ? 2.2 : 1.6}
          distance={4.2}
          decay={2}
        />
      )}
    </group>
  );
}

export function StreetLamp({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  floodLevel = 0,
  active = true,
  reducedMotion = false,
  quality = "balanced",
}: {
  position: Position;
  rotation?: Position;
  scale?: number;
  floodLevel?: number;
  active?: boolean;
  reducedMotion?: boolean;
  quality?: SceneQuality;
}) {
  const bulbRef = React.useRef<MeshBasicMaterial>(null);
  const haloRef = React.useRef<MeshBasicMaterial>(null);
  const pointLightRef = React.useRef<PointLight>(null);
  const lean = quality === "lean";

  // Position-based unique seed for staggered asynchronous flickering
  const seed = React.useMemo(
    () => Math.abs(Math.sin(position[0] * 12.3 + position[2] * 34.5)) * 100,
    [position],
  );
  const isHighTerrace = position[1] >= 0.5;

  useFrame(({ clock }) => {
    if (!active || reducedMotion || lean) return;
    const t = clock.elapsedTime;

    let flicker = 1;
    if (isHighTerrace) {
      // High terrace power is safe and steady, with minor grid voltage dips during severe storms
      if (floodLevel > 0.8) {
        flicker = Math.sin(t * 15 + seed) > 0.92 ? 0.65 : 1;
      }
    } else {
      // Lowland & market street lamps suffer severe waterlogging & short circuits as flood rises
      if (floodLevel > 0.4) {
        const severity = (floodLevel - 0.4) / 0.6; // 0 to 1
        const noise =
          Math.sin(t * (18 + (seed % 7) * 4) + seed) *
          Math.cos(t * (27 + (seed % 5) * 3));

        if (floodLevel > 0.85) {
          // Severely submerged / shorted: mostly dead embers with sporadic violent electric spark flashes
          const sparkTrigger = Math.sin(t * 32 + seed) > 0.88;
          flicker = sparkTrigger ? 2.5 : 0.05 + Math.abs(noise) * 0.12;
        } else {
          // Active brownouts, sputtering, and electrical flickering
          const cutoff = noise > 0.28 - severity * 0.45;
          flicker = cutoff ? (severity > 0.6 ? 0.1 : 0.3) : 1 + Math.abs(noise) * 0.45;
        }
      }
    }

    if (bulbRef.current) {
      bulbRef.current.opacity = Math.min(1, Math.max(0.08, 0.98 * flicker));
    }
    if (haloRef.current) {
      haloRef.current.opacity = Math.min(0.5, Math.max(0.02, 0.32 * flicker));
    }
    if (pointLightRef.current) {
      pointLightRef.current.intensity = 2.2 * flicker;
    }
  });

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Fluted Dark Bronze Post Base */}
      <mesh position={[0, 0.16, 0]} castShadow={!lean}>
        <cylinderGeometry args={[0.07, 0.11, 0.32, 8]} />
        <meshStandardMaterial color="#1a261f" roughness={0.75} />
      </mesh>
      {/* Slender Vertical Pole */}
      <mesh position={[0, 0.85, 0]} castShadow={!lean}>
        <cylinderGeometry args={[0.038, 0.05, 1.38, 8]} />
        <meshStandardMaterial color="#1f3027" roughness={0.7} />
      </mesh>
      {/* Decorative Collar */}
      <mesh position={[0, 1.48, 0]} castShadow={!lean}>
        <cylinderGeometry args={[0.065, 0.05, 0.08, 8]} />
        <meshStandardMaterial color="#1a261f" roughness={0.75} />
      </mesh>
      {/* Curved Arm Extension */}
      <Block position={[0.16, 1.62, 0]} size={[0.34, 0.045, 0.045]} color="#1f3027" radius={0.015} />
      <Block position={[0.32, 1.54, 0]} size={[0.045, 0.18, 0.045]} color="#1f3027" radius={0.015} />
      {/* Classic Municipal Lantern Cap */}
      <mesh position={[0.32, 1.52, 0]} castShadow={!lean}>
        <coneGeometry args={[0.18, 0.1, 4]} />
        <meshStandardMaterial color="#141f19" roughness={0.68} />
      </mesh>

      {/* Radiant Glowing Core Bulb (Warm Incandescent Gold) */}
      <mesh position={[0.32, 1.41, 0]}>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshBasicMaterial
          ref={bulbRef}
          color="#ffe082"
          transparent
          opacity={0.98}
        />
      </mesh>

      {/* Soft Warm Amber Flare (Rich warm orange, expanded radius) */}
      <mesh position={[0.32, 1.41, 0]}>
        <sphereGeometry args={[0.48, 14, 14]} />
        <meshBasicMaterial
          ref={haloRef}
          color="#ff9800"
          transparent
          opacity={0.32}
          depthWrite={false}
        />
      </mesh>

      {/* Warm Road Pool Point Light (Desktop/Tablet) */}
      {!lean && (
        <pointLight
          ref={pointLightRef}
          position={[0.32, 1.35, 0]}
          color="#ff9100"
          intensity={2.2}
          distance={4.8}
          decay={2}
        />
      )}
    </group>
  );
}

function SlopedDeck() {
  const start = new Vector3(7.22, 1.39, 0);
  const end = new Vector3(9.45, 1.22, 0);
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const length = start.distanceTo(end);
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  return (
    <group>
      <Block
        position={[midpoint.x, midpoint.y, 0]}
        size={[length, 0.34, 1.7]}
        rotation={[0, 0, angle]}
        color="#4e5a55"
        radius={0.05}
      />
      <Block
        position={[midpoint.x, midpoint.y + 0.19, 0]}
        size={[length, 0.055, 1.35]}
        rotation={[0, 0, angle]}
        color="#87928e"
        radius={0.02}
      />
    </group>
  );
}

export function Bridge({
  floodLevel = 0,
  quality = "balanced",
}: {
  floodLevel?: number;
  quality?: SceneQuality;
}) {
  const trussNodes = [2.5, 3.68, 4.86, 6.04, 7.22];
  const riversideTrussNodes = [-5.2, -3.66, -2.12, -0.58, 0.96, 2.5];
  return (
    <group position={[0, -0.55, -4.65]}>
      <Block
        position={[-1.98, 1.39, 0]}
        size={[9.02, 0.34, 1.7]}
        color="#4e5a55"
        radius={0.055}
      />
      <Block
        position={[-1.98, 1.6, 0]}
        size={[9.02, 0.07, 1.36]}
        color="#87928e"
        radius={0.02}
      />
      {/* Tall steel continues above the riverside/commercial district before
          joining the river truss. */}
      {[-0.76, 0.76].map((z) => (
        <group key={`riverside-truss-${z}`}>
          <Beam from={[-5.2, 1.72, z]} to={[2.5, 1.72, z]} radius={0.075} />
          <Beam from={[-5.2, 3.3, z]} to={[2.5, 3.3, z]} radius={0.065} />
          {riversideTrussNodes.map((x, index) => (
            <React.Fragment key={x}>
              <Beam from={[x, 1.72, z]} to={[x, 3.3, z]} radius={0.058} />
              {index < riversideTrussNodes.length - 1 && (
                <Beam
                  from={[x, index % 2 ? 3.3 : 1.72, z]}
                  to={[riversideTrussNodes[index + 1], index % 2 ? 1.72 : 3.3, z]}
                  radius={0.052}
                />
              )}
            </React.Fragment>
          ))}
        </group>
      ))}

      <Block
        position={[4.86, 1.39, 0]}
        size={[4.74, 0.34, 1.7]}
        color="#4e5a55"
        radius={0.05}
      />
      <Block
        position={[4.86, 1.6, 0]}
        size={[4.74, 0.07, 1.36]}
        color="#87928e"
        radius={0.02}
      />
      {[-0.76, 0.76].map((z) => (
        <group key={`truss-${z}`}>
          <Beam from={[2.5, 1.72, z]} to={[7.22, 1.72, z]} radius={0.08} />
          <Beam from={[2.5, 3.3, z]} to={[7.22, 3.3, z]} radius={0.07} />
          {trussNodes.map((x, index) => (
            <React.Fragment key={x}>
              <Beam from={[x, 1.72, z]} to={[x, 3.3, z]} radius={0.06} />
              {index < trussNodes.length - 1 && (
                <Beam
                  from={[x, index % 2 ? 3.3 : 1.72, z]}
                  to={[trussNodes[index + 1], index % 2 ? 1.72 : 3.3, z]}
                  radius={0.055}
                />
              )}
            </React.Fragment>
          ))}
        </group>
      ))}

      <SlopedDeck />
      <Block
        position={[9.25, 0.79, 0]}
        size={[1.85, 1.06, 2.25]}
        color={SCENE.concreteLight}
        radius={0.08}
      />
      <Block
        position={[9.25, 1.36, 0]}
        size={[1.72, 0.08, 2.08]}
        color="#4e5a55"
        radius={0.045}
      />
      {[-1, 1].map((direction) => (
        <Block
          key={`far-road-ramp-${direction}`}
          position={[9.12, 0.815, direction * 1.94]}
          size={[1.58, 0.2, 1.9]}
          color="#4e5a55"
          radius={0.045}
          rotation={[direction * 0.55, 0, 0]}
        />
      ))}
      {[-4.45, 2.42, 7.14].map((x) => (
        <group key={x}>
          <Block
            position={[x, 0.35, -0.52]}
            size={[0.5, 2.15, 0.48]}
            color={SCENE.concreteLight}
            radius={0.05}
          />
          <Block
            position={[x, 0.35, 0.52]}
            size={[0.5, 2.15, 0.48]}
            color={SCENE.concreteLight}
            radius={0.05}
          />
        </group>
      ))}
      <BridgeLamp position={[-6.08, 1.68, -0.86]} floodLevel={floodLevel} quality={quality} />
      <BridgeLamp position={[-1.6, 1.68, -0.86]} floodLevel={floodLevel} quality={quality} />
      <BridgeLamp position={[8.42, 1.69, -0.86]} floodLevel={floodLevel} quality={quality} />
    </group>
  );
}

export function Tricycle() {
  return (
    <group position={[8.62, -0.19, 2.25]} rotation={[0, 0.08, 0]} scale={0.85}>
      {/* Passenger Sidecar Cabin */}
      <Block position={[0, 0.43, 0]} size={[1.05, 0.58, 1.32]} color="#e9efe9" radius={0.12} />
      {/* Sidecar Roof */}
      <Block position={[0, 0.78, -0.08]} size={[0.98, 0.16, 1.02]} color="#2f7650" radius={0.08} />
      {/* Front Windshield */}
      <Block position={[0, 0.54, -0.69]} size={[0.52, 0.42, 0.22]} color="#80deea" radius={0.06} />
      {/* Motorcycle Frame */}
      <Block position={[0, 0.55, 0.69]} size={[0.48, 0.3, 0.18]} color="#d8b656" radius={0.05} />
      {/* Headlight */}
      <Block position={[0, 0.48, 0.82]} size={[0.14, 0.14, 0.06]} color="#fff9c4" radius={0.02} />
      {/* Wheels */}
      {[
        [-0.5, 0.25, -0.36],
        [0.5, 0.25, -0.36],
        [0, 0.25, 0.56],
      ].map((pos, index) => (
        <mesh key={index} position={pos as Position} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.12, 10]} />
          <meshStandardMaterial color="#26302c" roughness={0.88} />
        </mesh>
      ))}
    </group>
  );
}

export function BarangayPatrolVehicle({
  position,
  rotation = [0, 0, 0],
  scale = 0.85,
  floodLevel = 0,
  active = true,
  reducedMotion = false,
}: {
  position: Position;
  rotation?: Position;
  scale?: number;
  floodLevel?: number;
  active?: boolean;
  reducedMotion?: boolean;
}) {
  const beaconRef = React.useRef<Group>(null);
  const isEmergency = floodLevel > 0.35;

  useFrame(({ clock }) => {
    if (!beaconRef.current || !active || reducedMotion) return;
    if (isEmergency) {
      beaconRef.current.rotation.y = clock.elapsedTime * 9;
    }
  });

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Main Cab Body */}
      <Block position={[0, 0.48, -0.22]} size={[1.18, 0.72, 1.25]} color="#fdfdfd" radius={0.08} />
      {/* Front Windshield */}
      <Block position={[0, 0.58, -0.84]} size={[1.04, 0.42, 0.12]} color="#80deea" radius={0.04} rotation={[0.18, 0, 0]} />
      {/* Side Windows */}
      {[-0.6, 0.6].map((x) => (
        <Block key={x} position={[x, 0.58, -0.22]} size={[0.04, 0.36, 0.65]} color="#455a64" radius={0.02} />
      ))}
      {/* Barangay Green/Gold Reflective Stripe */}
      {[-0.605, 0.605].map((x) => (
        <React.Fragment key={`stripe-${x}`}>
          <Block position={[x, 0.35, -0.22]} size={[0.02, 0.08, 1.15]} color="#1b5e20" radius={0.01} />
          <Block position={[x, 0.35, -0.22]} size={[0.025, 0.06, 0.22]} color="#ffb300" radius={0.01} />
        </React.Fragment>
      ))}

      {/* Front Grille & Headlights */}
      <Block position={[0, 0.28, -0.86]} size={[0.85, 0.22, 0.06]} color="#263238" radius={0.03} />
      {[-0.42, 0.42].map((x) => (
        <Block key={x} position={[x, 0.32, -0.87]} size={[0.18, 0.12, 0.04]} color="#fff9c4" radius={0.02} />
      ))}
      {/* Front Bumper */}
      <Block position={[0, 0.16, -0.9]} size={[1.24, 0.12, 0.14]} color="#37474f" radius={0.03} />

      {/* Rear Cargo Bed (Open dropside pickup bed) */}
      <Block position={[0, 0.38, 0.85]} size={[1.18, 0.52, 1.15]} color="#e0e0e0" radius={0.04} />
      <Block position={[0, 0.54, 1.4]} size={[1.18, 0.24, 0.06]} color="#f5f5f5" radius={0.02} />
      {[-0.58, 0.58].map((x) => (
        <Block key={x} position={[x, 0.54, 0.85]} size={[0.06, 0.24, 1.1]} color="#f5f5f5" radius={0.02} />
      ))}

      {/* Rescue Equipment inside cargo bed */}
      {/* Orange Lifebuoy Ring */}
      <mesh position={[0.25, 0.45, 0.8]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.22, 0.07, 8, 18]} />
        <meshStandardMaterial color="#ff5722" roughness={0.6} />
      </mesh>
      {/* Emergency First-Aid / DRRM Toolbox */}
      <Block position={[-0.26, 0.36, 0.75]} size={[0.34, 0.24, 0.46]} color="#c62828" radius={0.03} />

      {/* Rooftop Emergency Lightbar */}
      <group position={[0, 0.9, -0.22]}>
        <Block position={[0, 0, 0]} size={[0.72, 0.06, 0.16]} color="#263238" radius={0.02} />
        <group ref={beaconRef}>
          {/* Amber & Blue Strobe Pods */}
          <Block position={[-0.22, 0.06, 0]} size={[0.18, 0.09, 0.14]} color="#ff9100" radius={0.02} />
          <Block position={[0.22, 0.06, 0]} size={[0.18, 0.09, 0.14]} color="#00b0ff" radius={0.02} />
        </group>
      </group>

      {/* 4 Rubber Wheels */}
      {[
        [-0.56, 0.22, -0.55],
        [0.56, 0.22, -0.55],
        [-0.56, 0.22, 0.95],
        [0.56, 0.22, 0.95],
      ].map((pos, index) => (
        <mesh key={index} position={pos as Position} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.16, 12]} />
          <meshStandardMaterial color="#212121" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

export function WarningSiren({
  position,
  floodLevel,
  active,
  reducedMotion,
  quality = "balanced",
}: {
  position: Position;
  floodLevel: number;
  active: boolean;
  reducedMotion: boolean;
  quality?: SceneQuality;
}) {
  const beacon = React.useRef<Group>(null);
  const pulse = React.useRef<Group>(null);
  const highWater = floodLevel >= 0.7;
  const lean = quality === "lean";

  useFrame(({ clock }, delta) => {
    if (!highWater || !active || reducedMotion) return;
    if (beacon.current) beacon.current.rotation.y += Math.min(delta, 0.05) * 5.4;
    if (pulse.current) {
      const cycle = (clock.elapsedTime * 0.95) % 1;
      pulse.current.scale.setScalar(0.8 + cycle * 2.8);
      pulse.current.rotation.y = cycle * 0.5;
    }
  });

  return (
    <group position={position}>
      <Block
        position={[0, 0.38, 0]}
        size={[0.54, 0.76, 0.46]}
        color="#d94343"
        radius={0.08}
      />
      <Block
        position={[0.01, 0.44, 0.235]}
        size={[0.26, 0.34, 0.035]}
        color="#fff3ee"
        radius={0.018}
      />
      <mesh position={[0, 1.38, 0]} castShadow={!lean}>
        <cylinderGeometry args={[0.065, 0.09, 2.02, 8]} />
        <meshStandardMaterial color="#202622" roughness={0.82} />
      </mesh>
      <group position={[0, 2.32, 0]}>
        {[-1, 1].map((direction) => (
          <group
            key={direction}
            position={[direction * 0.22, 0, 0]}
            rotation={[0, 0, direction * -Math.PI * 0.5]}
          >
            <mesh castShadow={!lean}>
              <coneGeometry args={[0.25, 0.56, 12, 1, true]} />
              <meshStandardMaterial
                color="#ef4444"
                emissive={highWater ? "#b91c1c" : "#000000"}
                emissiveIntensity={highWater ? 0.72 : 0}
                roughness={0.58}
                side={DoubleSide}
              />
            </mesh>
          </group>
        ))}
        <Block
          position={[0, 0, 0]}
          size={[0.24, 0.36, 0.28]}
          color="#991f2b"
          radius={0.05}
        />
      </group>
      <group ref={beacon} position={[0, 2.73, 0]}>
        <mesh castShadow={!lean}>
          <cylinderGeometry args={[0.17, 0.2, 0.3, 12]} />
          <meshStandardMaterial
            color="#ef4444"
            emissive={highWater ? "#ef4444" : "#000000"}
            emissiveIntensity={highWater ? 2.6 : 0}
            transparent
            opacity={highWater ? 1 : 0.84}
          />
        </mesh>
        <Block
          position={[0.09, 0, 0]}
          size={[0.08, 0.22, 0.26]}
          color="#fff3ee"
          radius={0.015}
          castShadow={false}
          receiveShadow={false}
        />
      </group>
      <group ref={pulse} position={[0, 2.34, 0]} visible={highWater}>
        {[
          { radius: 0.9, width: 0.055, opacity: 0.88 },
          { radius: 1.85, width: 0.048, opacity: 0.65 },
          { radius: 2.9, width: 0.04, opacity: 0.42 },
          { radius: 4.1, width: 0.032, opacity: 0.22 },
        ].map((wave) => (
          <mesh key={wave.radius} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[wave.radius, wave.width, 8, 48]} />
            <meshBasicMaterial
              color="#ff4d40"
              transparent
              opacity={wave.opacity}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
      {!lean && (
        <pointLight
          position={[0, 2.74, 0]}
          color="#ef4444"
          intensity={highWater ? 2.2 : 0}
          distance={7.5}
        />
      )}
    </group>
  );
}

type RainDrop = { x: number; y: number; z: number; speed: number };

function seededRandom(seedStart: number) {
  let seed = seedStart;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function createRainDrops(count: number): RainDrop[] {
  const random = seededRandom(1847);
  return Array.from({ length: count }, () => ({
    x: random() * 22 - 11,
    y: random() * 11 + 1.4,
    z: random() * 16 - 8,
    speed: random() * 3.4 + 5.6,
  }));
}

function SplashRings({ floodLevel, active }: { floodLevel: number; active: boolean }) {
  const mesh = React.useRef<InstancedMesh>(null);
  const dummy = React.useMemo(() => new Object3D(), []);
  const splashes = React.useMemo(() => {
    const random = seededRandom(2401);
    return Array.from({ length: 18 }, () => ({
      x: random() * 4.2 + 2.65,
      z: random() * 13 - 6.5,
      phase: random(),
    }));
  }, []);
  const waterY = -0.285 + floodLevel * floodLevel * (3 - 2 * floodLevel) * 0.79;

  useFrame(({ clock }) => {
    if (!mesh.current || !active) return;
    splashes.forEach((splash, index) => {
      const cycle = (clock.elapsedTime * 0.92 + splash.phase) % 1;
      dummy.position.set(splash.x, waterY + 0.025, splash.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.setScalar(0.16 + cycle * 0.48);
      dummy.updateMatrix();
      mesh.current?.setMatrixAt(index, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, splashes.length]}
      frustumCulled={false}
      visible={floodLevel > 0.42}
    >
      <ringGeometry args={[0.72, 0.9, 18]} />
      <meshBasicMaterial
        color="#d7edf5"
        transparent
        opacity={Math.min(0.48, (floodLevel - 0.38) * 0.7)}
        side={DoubleSide}
      />
    </instancedMesh>
  );
}

export function Rain({
  floodLevel,
  active,
  quality,
}: {
  floodLevel: number;
  active: boolean;
  quality: SceneQuality;
}) {
  const maximum = quality === "full" ? 200 : quality === "balanced" ? 132 : 45;
  const mesh = React.useRef<InstancedMesh>(null);
  const dummy = React.useMemo(() => new Object3D(), []);
  const drops = React.useMemo(() => createRainDrops(maximum), [maximum]);
  const rainProgress = smoothPhase(floodLevel, 0.02, 1);
  const activeCount = Math.round(maximum * Math.pow(rainProgress, 1.35));
  const speedMultiplier = 1 + rainProgress * 1.05;
  const lengthMultiplier = 0.72 + rainProgress * 1.12;

  useFrame((_, delta) => {
    if (!mesh.current) return;
    drops.forEach((drop, index) => {
      if (active) {
        drop.y -= drop.speed * speedMultiplier * Math.min(delta, 0.05);
        if (drop.y < -0.55) drop.y = 11.25;
      }
      dummy.position.set(drop.x, drop.y, drop.z);
      dummy.rotation.set(0, 0, 0.12 + rainProgress * 0.08);
      dummy.scale.set(
        index < activeCount ? 1 : 0,
        index < activeCount ? lengthMultiplier : 0,
        1,
      );
      dummy.updateMatrix();
      mesh.current?.setMatrixAt(index, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh
        ref={mesh}
        args={[undefined, undefined, maximum]}
        frustumCulled={false}
      >
        <boxGeometry args={[0.025, 0.54, 0.025]} />
        <meshBasicMaterial
          color="#c8e9f8"
          transparent
          opacity={rainProgress === 0 ? 0 : 0.16 + rainProgress * 0.59}
        />
      </instancedMesh>
      {quality === "full" && <SplashRings floodLevel={floodLevel} active={active} />}
    </>
  );
}
