import { OrbitControls, Html, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Maximize2, RotateCcw, Loader2 } from "lucide-react";
import { Suspense, memo, useCallback, useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { Button } from "@/components/ui/button";
import { cssColorToHex } from "@/lib/twin/color";
import { CATEGORY_TOKEN } from "@/lib/twin/config";

import { getFloorSummaries, getTowers } from "@/lib/twin/data";
import { useTwin } from "@/lib/twin/store";
import type { EfficiencyCategory } from "@/lib/twin/types";

const FLOOR_H = 0.9;
const PODIUM_H = 0.95;
const WING_W = 3.6;
const WING_D = 1.35;
const WING_GAP = 0.95; // circulation strip between the two wings

/**
 * Site layout traced from the Rusun ASN 3 satellite reference: the towers sit
 * along a north-east → south-west ridge road, each block rotated to follow the
 * contour instead of standing in a straight row.
 */
const SITE_LAYOUT: { x: number; z: number; rot: number }[] = [
  { x: 11.5, z: -19.5, rot: -0.42 },
  { x: 6.2, z: -11.5, rot: -0.34 },
  { x: 9.0, z: -3.6, rot: -0.5 },
  { x: 2.4, z: 4.2, rot: -0.3 },
  { x: -6.4, z: 11.5, rot: -0.58 },
  { x: -1.6, z: 19.0, rot: -0.22 },
];

function layoutFor(i: number) {
  return SITE_LAYOUT[i % SITE_LAYOUT.length]!;
}

/**
 * Category / material colors resolved from the CSS design tokens (no hardcoded
 * hexes). Tokens are authored in oklch, which three.js cannot parse, so we let
 * the browser convert each token to an rgb() string first.
 */
function useCategoryColors() {
  const [colors, setColors] = useState<Record<string, string>>({});
  useEffect(() => {
    const probe = document.createElement("span");
    probe.style.display = "none";
    document.body.appendChild(probe);
    const resolve = (token: string) => {
      probe.style.color = "";
      probe.style.color = `var(--${token})`;
      return cssColorToHex(getComputedStyle(probe).color || "", "#888888");
    };

    const next: Record<string, string> = {};
    for (const token of Object.values(CATEGORY_TOKEN)) next[token] = resolve(token);
    next["base"] = resolve("twin-shell");
    next["accent"] = resolve("primary");
    next["facade"] = resolve("twin-facade");
    next["core"] = resolve("twin-core");
    next["trim"] = resolve("twin-trim");
    next["podium"] = resolve("twin-podium");
    next["glass"] = resolve("twin-glass");
    probe.remove();
    setColors(next);
  }, []);
  return colors;
}

type Palette = Record<string, string>;

/** One residential floor: two wood-clad wings either side of a white core strip. */
function FloorSlab({
  y,
  active,
  palette,
  accentColor,
  onClick,
}: {
  y: number;
  active: boolean;
  palette: Palette;
  accentColor: string;
  onClick: (e: { stopPropagation: () => void }) => void;
}) {
  const opacity = active ? 1 : 0.4;
  const facade = palette["facade"] || "#8b6a45";
  const trim = palette["trim"] || "#ddd8d0";
  const glass = palette["glass"] || "#46536b";

  return (
    <group position={[0, y, 0]} onClick={onClick}>
      {[-1, 1].map((side) => (
        <group key={side} position={[0, 0, side * (WING_D / 2 + WING_GAP / 2)]}>
          <mesh>
            <boxGeometry args={[WING_W, FLOOR_H * 0.84, WING_D]} />
            <meshStandardMaterial
              color={facade}
              emissive={active ? accentColor : "#000000"}
              emissiveIntensity={active ? 0.08 : 0}
              transparent
              opacity={opacity}
              roughness={0.7}
              metalness={0.05}
            />
          </mesh>
          {/* balcony glass band */}
          <mesh position={[0, -FLOOR_H * 0.16, side * (WING_D / 2 + 0.03)]}>
            <boxGeometry args={[WING_W * 0.94, FLOOR_H * 0.3, 0.07]} />
            <meshStandardMaterial
              color={glass}
              transparent
              opacity={opacity * 0.9}
              roughness={0.25}
              metalness={0.4}
            />
          </mesh>
        </group>
      ))}
      {/* white circulation spine */}
      <mesh>
        <boxGeometry args={[WING_W * 0.34, FLOOR_H * 0.9, WING_GAP + WING_D]} />
        <meshStandardMaterial color={trim} transparent opacity={opacity} roughness={0.8} />
      </mesh>
    </group>
  );
}

function TowerMesh({
  index,
  floors,
  active,
  label,
  selectedFloor,
  onSelectTower,
  onSelectFloor,
  palette,
  accentColor,
}: {
  index: number;
  floors: number;
  active: boolean;
  label: string;
  selectedFloor: number;
  onSelectTower: () => void;
  onSelectFloor: (floor: number) => void;
  palette: Palette;
  accentColor: string;
}) {
  const site = layoutFor(index);
  const slabs = useMemo(() => Array.from({ length: floors }, (_, i) => i + 1), [floors]);
  const totalD = WING_D * 2 + WING_GAP;
  const topY = PODIUM_H + floors * FLOOR_H;
  const opacity = active ? 1 : 0.4;

  return (
    <group position={[site.x, 0, site.z]} rotation={[0, site.rot, 0]}>
      {/* open ground-floor podium */}
      <mesh
        position={[0, PODIUM_H / 2, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectTower();
        }}
      >
        <boxGeometry args={[WING_W + 0.9, PODIUM_H, totalD + 0.9]} />
        <meshStandardMaterial
          color={palette["podium"] || "#3a4460"}
          transparent
          opacity={opacity}
          roughness={0.85}
        />
      </mesh>

      {slabs.map((f) => {
        const isSelected = active && f === selectedFloor;
        // The selected floor is rendered as individual coloured unit blocks.
        if (isSelected) return null;
        return (
          <FloorSlab
            key={f}
            y={PODIUM_H + (f - 0.5) * FLOOR_H}
            active={active}
            palette={palette}
            accentColor={accentColor}
            onClick={(e) => {
              e.stopPropagation();
              if (!active) onSelectTower();
              else onSelectFloor(f);
            }}
          />
        );
      })}

      {/* brown service core, taller than the slabs (lift / stair shaft) */}
      <mesh position={[WING_W / 2 + 0.42, (topY + 0.9) / 2, 0]}>
        <boxGeometry args={[1.5, topY + 0.9, totalD * 0.82]} />
        <meshStandardMaterial
          color={palette["core"] || "#4a352c"}
          transparent
          opacity={opacity}
          roughness={0.8}
        />
      </mesh>

      {/* roof slab + pergola canopy */}
      <mesh position={[0, topY + 0.12, 0]}>
        <boxGeometry args={[WING_W + 0.5, 0.22, totalD + 0.5]} />
        <meshStandardMaterial color={palette["trim"] || "#ddd8d0"} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, topY + 0.85, 0]}>
        <boxGeometry args={[WING_W + 0.2, 0.12, totalD + 0.2]} />
        <meshStandardMaterial
          color={palette["core"] || "#4a352c"}
          transparent
          opacity={opacity * 0.9}
        />
      </mesh>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            position={[sx * (WING_W / 2 - 0.1), topY + 0.5, sz * (totalD / 2 - 0.1)]}
          >
            <boxGeometry args={[0.12, 0.75, 0.12]} />
            <meshStandardMaterial color={palette["trim"] || "#ddd8d0"} transparent opacity={opacity} />
          </mesh>
        )),
      )}

      <Html position={[0, -0.7, 0]} center distanceFactor={26}>
        <span
          className={`select-none whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] ${
            active ? "bg-primary/25 text-primary" : "text-muted-foreground"
          }`}
        >
          {label}
        </span>
      </Html>
    </group>
  );
}

function UnitBlocks({
  towerIndex,
  floor,
  colorFor,
  selectedUnitId,
  onSelect,
}: {
  towerIndex: number;
  floor: number;
  colorFor: (c: EfficiencyCategory) => string;
  selectedUnitId: string | null;
  onSelect: (id: string) => void;
}) {
  const twin = useTwin();
  const summaries = useMemo(
    () => getFloorSummaries(twin.towerId, floor, twin.monthKey),
    [twin.towerId, floor, twin.monthKey],
  );
  const site = layoutFor(towerIndex);

  return (
    <group
      position={[site.x, PODIUM_H + (floor - 0.5) * FLOOR_H, site.z]}
      rotation={[0, site.rot, 0]}
    >
      {summaries.map((s, i) => {
        const col = i % 3;
        const row = i < 3 ? -1 : 1;
        const selected = selectedUnitId === s.unit.id;
        const cat = twin.heatmapDim === "water" ? s.waterCategory : s.electricityCategory;
        return (
          <mesh
            key={s.unit.id}
            position={[(col - 1) * (WING_W / 3), 0, row * (WING_D / 2 + WING_GAP / 2)]}
            scale={selected ? 1.09 : 1}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(s.unit.id);
            }}
          >
            <boxGeometry args={[WING_W / 3 - 0.05, FLOOR_H * 0.9, WING_D]} />
            <meshStandardMaterial
              color={colorFor(cat)}
              emissive={colorFor(cat)}
              emissiveIntensity={selected ? 1.1 : 0.35}
              roughness={0.4}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/** Optional web-optimized GLB layer — drop a URL in Settings to use a real model. */
function GlbModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => {
    return () => {
      cloned.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
    };
  }, [cloned]);
  return <primitive object={cloned} />;
}

function Loading() {
  return (
    <Html center>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading building model…
      </div>
    </Html>
  );
}

export const TwinViewer = memo(function TwinViewer({ glbUrl }: { glbUrl?: string }) {
  const twin = useTwin();
  const towers = getTowers(twin.rusunId);
  const colors = useCategoryColors();
  const controls = useRef<OrbitControlsImpl | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);

  const colorFor = useCallback(
    (c: EfficiencyCategory) => colors[CATEGORY_TOKEN[c]] || "#888888",
    [colors],
  );

  const activeIndex = Math.max(
    0,
    towers.findIndex((t) => t.id === twin.towerId),
  );

  return (
    <div ref={wrapper} className="relative h-full w-full overflow-hidden rounded-xl bg-background/60">
      <Canvas
        camera={{ position: [48, 38, 66], fov: 34 }}
        dpr={[1, 1.6]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#0f1424"]} />
        <fog attach="fog" args={["#0f1424", 70, 165]} />
        <ambientLight intensity={0.34} />
        <directionalLight position={[18, 26, 14]} intensity={0.8} />
        <directionalLight position={[-16, 10, -18]} intensity={0.32} />
        <gridHelper args={[90, 36, "#243049", "#1a2236"]} position={[0, -0.02, 0]} />

        <Suspense fallback={<Loading />}>
          {glbUrl ? <GlbModel url={glbUrl} /> : null}
          {towers.map((t, i) => (
            <TowerMesh
              key={t.id}
              index={i}
              floors={t.floors}
              label={t.name}
              active={t.id === twin.towerId}
              selectedFloor={twin.floor}
              onSelectTower={() => twin.setTowerId(t.id)}
              onSelectFloor={(f) => twin.setFloor(f)}
              palette={colors}
              accentColor={colors["accent"] || "#3b82f6"}
            />
          ))}
          <UnitBlocks
            towerIndex={activeIndex}
            floor={twin.floor}
            colorFor={colorFor}
            selectedUnitId={twin.unitId}
            onSelect={twin.selectUnit}
          />
        </Suspense>

        {/* Local lighting only — no remote HDRI fetch (avoids CDN rate limits). */}
        <hemisphereLight args={["#8fa8d8", "#0f1424", 0.55]} />
        <pointLight position={[0, 16, 20]} intensity={40} distance={90} decay={2} />

        <OrbitControls
          ref={controls}
          enablePan
          enableZoom
          maxPolarAngle={Math.PI / 2.05}
          minDistance={6}
          maxDistance={110}
          target={[4, 5, 0]}
          makeDefault
        />
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <div className="pointer-events-auto rounded-lg border border-border bg-card/85 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
          Tata letak mengikuti koordinat site Rusun ASN 3 · klik tower → lantai → unit
        </div>
        <div className="pointer-events-auto flex gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-8 bg-card/85"
            onClick={() => controls.current?.reset()}
          >
            <RotateCcw className="size-3.5" /> Reset
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 bg-card/85"
            onClick={() => {
              if (document.fullscreenElement) document.exitFullscreen();
              else wrapper.current?.requestFullscreen?.();
            }}
          >
            <Maximize2 className="size-3.5" /> Fullscreen
          </Button>
        </div>
      </div>
    </div>
  );
});

export default TwinViewer;
