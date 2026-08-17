import { OrbitControls, Environment, Html, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Maximize2, RotateCcw, Loader2 } from "lucide-react";
import {
  Suspense,
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { Button } from "@/components/ui/button";
import { CATEGORY_TOKEN } from "@/lib/twin/config";
import { getFloorSummaries, getTowers } from "@/lib/twin/data";
import { useTwin } from "@/lib/twin/store";
import type { EfficiencyCategory } from "@/lib/twin/types";

const FLOOR_H = 0.62;
const TOWER_W = 5.2;
const TOWER_D = 4.2;
const GAP = 7.4;

/**
 * Category colors resolved from the CSS design tokens (no hardcoded hexes).
 * Tokens are authored in oklch, which three.js cannot parse, so we let the
 * browser convert each token to an rgb() string first.
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
      return getComputedStyle(probe).color || "#888888";
    };
    const next: Record<string, string> = {};
    for (const token of Object.values(CATEGORY_TOKEN)) next[token] = resolve(token);
    next["base"] = resolve("twin-shell");
    next["accent"] = resolve("primary");
    probe.remove();
    setColors(next);
  }, []);
  return colors;
}


function TowerMesh({
  index,
  floors,
  active,
  label,
  selectedFloor,
  onSelectTower,
  onSelectFloor,
  baseColor,
  accentColor,
}: {
  index: number;
  floors: number;
  active: boolean;
  label: string;
  selectedFloor: number;
  onSelectTower: () => void;
  onSelectFloor: (floor: number) => void;
  baseColor: string;
  accentColor: string;
}) {
  const x = (index - 2.5) * GAP;
  const slabs = useMemo(() => Array.from({ length: floors }, (_, i) => i + 1), [floors]);

  return (
    <group position={[x, 0, 0]}>
      {slabs.map((f) => {
        const isFloor = active && f === selectedFloor;
        return (
          <mesh
            key={f}
            position={[0, (f - 0.5) * FLOOR_H, 0]}
            onClick={(e) => {
              e.stopPropagation();
              if (!active) onSelectTower();
              else onSelectFloor(f);
            }}
          >
            <boxGeometry args={[TOWER_W, FLOOR_H * 0.86, TOWER_D]} />
            <meshStandardMaterial
              color={isFloor ? accentColor : baseColor}
              emissive={isFloor ? accentColor : active ? accentColor : "#000000"}
              emissiveIntensity={isFloor ? 0.9 : active ? 0.12 : 0}
              transparent
              opacity={active ? 1 : 0.42}
              roughness={0.55}
              metalness={0.15}
            />
          </mesh>
        );
      })}

      {/* roof */}
      <mesh position={[0, floors * FLOOR_H + 0.12, 0]}>
        <boxGeometry args={[TOWER_W + 0.4, 0.24, TOWER_D + 0.4]} />
        <meshStandardMaterial color={baseColor} opacity={active ? 1 : 0.4} transparent />
      </mesh>

      <Html position={[0, -0.9, 0]} center distanceFactor={22}>
        <span
          className={`select-none rounded px-1.5 py-0.5 text-[11px] ${
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
  const x0 = (towerIndex - 2.5) * GAP;

  return (
    <group position={[x0, (floor - 0.5) * FLOOR_H, 0]}>
      {summaries.map((s, i) => {
        const col = i % 3;
        const row = i < 3 ? 0 : 1;
        const selected = selectedUnitId === s.unit.id;
        const cat =
          twin.heatmapDim === "water" ? s.waterCategory : s.electricityCategory;
        return (
          <mesh
            key={s.unit.id}
            position={[(col - 1) * 1.65, 0, row === 0 ? -1.05 : 1.05]}
            scale={selected ? 1.08 : 1}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(s.unit.id);
            }}
          >
            <boxGeometry args={[1.5, FLOOR_H * 1.02, 1.85]} />
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
        camera={{ position: [16, 12, 22], fov: 42 }}
        dpr={[1, 1.6]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        frameloop="demand"
      >
        <color attach="background" args={[colors["base"] ? "#0f1424" : "#0f1424"]} />
        <fog attach="fog" args={["#0f1424", 40, 90]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[14, 20, 10]} intensity={1.1} />
        <directionalLight position={[-12, 8, -14]} intensity={0.4} />
        <gridHelper args={[90, 30, "#243049", "#1a2236"]} position={[0, -0.02, 0]} />

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
              baseColor={colors["base"] || "#2a3450"}
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
          <Environment preset="city" />
        </Suspense>

        <OrbitControls
          ref={controls}
          enablePan
          enableZoom
          maxPolarAngle={Math.PI / 2.05}
          minDistance={6}
          maxDistance={70}
          target={[0, 3.5, 0]}
          makeDefault
        />
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <div className="pointer-events-auto rounded-lg border border-border bg-card/85 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
          Klik tower → pilih tower · klik lantai/unit → sinkron ke floor plan
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
