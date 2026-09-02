import { OrbitControls, Html, useGLTF, Clone, AdaptiveDpr, BakeShadows } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Maximize2, RotateCcw, Loader2, Layers } from "lucide-react";
import { Suspense, memo, useCallback, useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { Button } from "@/components/ui/button";
import towerModel from "@/assets/tower.glb.asset.json";
import { cssColorToHex } from "@/lib/twin/color";
import { CATEGORY_TOKEN } from "@/lib/twin/config";

import { getFloorSummaries, getTowers } from "@/lib/twin/data";
import { useTwin } from "@/lib/twin/store";
import type { EfficiencyCategory } from "@/lib/twin/types";

const FLOOR_H = 0.9;
const PODIUM_H = 0.95;

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

const SITE_VIEW = {
  pos: new THREE.Vector3(48, 38, 66),
  target: new THREE.Vector3(4, 5, 0),
};

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

/** Real architectural tower model (uploaded GLB), measured + normalised once. */
function useTowerModel(url: string) {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    return { scene, size, center, box };
  }, [scene]);
}

/** Footprint of one tower in scene units after normalisation. */
function useTowerDims(url: string, floors: number) {
  const { size } = useTowerModel(url);
  return useMemo(() => {
    const targetH = PODIUM_H + floors * FLOOR_H + 0.9;
    const scale = size.y > 0 ? targetH / size.y : 1;
    return {
      scale,
      height: targetH,
      width: size.x * scale,
      depth: size.z * scale,
    };
  }, [size, floors]);
}

/**
 * Smoothly flies the camera + orbit target to the focused tower (or back to the
 * whole-site view). Frame-rate independent easing, and it parks itself when the
 * move is finished so the renderer can idle.
 */
function CameraRig({
  focus,
  controls,
}: {
  focus: { pos: THREE.Vector3; target: THREE.Vector3 };
  controls: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();
  const done = useRef(false);
  const key = `${focus.pos.toArray().join()}|${focus.target.toArray().join()}`;

  useEffect(() => {
    done.current = false;
  }, [key]);

  useFrame((_, rawDelta) => {
    if (done.current) return;
    const dt = Math.min(rawDelta, 0.05);
    const k = 1 - Math.exp(-4.5 * dt);
    camera.position.lerp(focus.pos, k);
    const c = controls.current;
    if (c) {
      c.target.lerp(focus.target, k);
      c.update();
    }
    if (camera.position.distanceTo(focus.pos) < 0.05) {
      camera.position.copy(focus.pos);
      c?.target.copy(focus.target);
      c?.update();
      done.current = true;
    }
  });
  return null;
}

function GlbTower({
  url,
  index,
  floors,
  active,
  label,
  detailed,
  onSelectTower,
  onSelectFloor,
  shellColor,
}: {
  url: string;
  index: number;
  floors: number;
  active: boolean;
  label: string;
  detailed: boolean;
  onSelectTower: () => void;
  onSelectFloor: (floor: number) => void;
  shellColor: string;
  bandColor: string;
}) {
  const site = layoutFor(index);
  const { scene, size, center } = useTowerModel(url);
  const dims = useTowerDims(url, floors);

  const slabs = useMemo(() => Array.from({ length: floors }, (_, i) => i + 1), [floors]);

  return (
    <group position={[site.x, 0, site.z]} rotation={[0, site.rot, 0]}>
      {detailed ? (
        // <Clone> shares geometry + materials with the source GLB, so showing
        // every tower costs draw calls but almost no extra memory.
        <group
          scale={dims.scale}
          position={[
            -center.x * dims.scale,
            -(center.y - size.y / 2) * dims.scale,
            -center.z * dims.scale,
          ]}
        >
          <Clone object={scene} />
        </group>
      ) : (
        // Cheap but clearly readable massing block: opaque shell, podium, roof cap
        // and floor banding. ~8 draw calls per tower instead of the full GLB.
        <group>
          <mesh position={[0, PODIUM_H / 2, 0]}>
            <boxGeometry args={[dims.width * 1.08, PODIUM_H, dims.depth * 1.12]} />
            <meshStandardMaterial color={shellColor} roughness={0.9} />
          </mesh>
          <mesh position={[0, PODIUM_H + (dims.height - PODIUM_H) / 2, 0]}>
            <boxGeometry args={[dims.width, dims.height - PODIUM_H, dims.depth]} />
            <meshStandardMaterial color={shellColor} roughness={0.8} metalness={0.05} />
          </mesh>
          {Array.from({ length: Math.max(1, Math.floor(floors / 2)) }, (_, i) => (
            <mesh key={i} position={[0, PODIUM_H + (i * 2 + 1) * FLOOR_H, 0]}>
              <boxGeometry args={[dims.width * 1.015, FLOOR_H * 0.28, dims.depth * 1.015]} />
              <meshStandardMaterial
                color={bandColor}
                emissive={bandColor}
                emissiveIntensity={0.25}
                roughness={0.5}
              />
            </mesh>
          ))}
          <mesh position={[0, dims.height + 0.08, 0]}>
            <boxGeometry args={[dims.width * 1.06, 0.16, dims.depth * 1.06]} />
            <meshStandardMaterial color={bandColor} roughness={0.6} />
          </mesh>
        </group>
      )}

      {/* Invisible per-floor hit volumes keep tower / floor selection working. */}
      {slabs.map((f) => (
        <mesh
          key={f}
          position={[0, PODIUM_H + (f - 0.5) * FLOOR_H, 0]}
          onClick={(e) => {
            e.stopPropagation();
            if (!active) onSelectTower();
            else onSelectFloor(f);
          }}
        >
          <boxGeometry args={[dims.width * 1.03, FLOOR_H, dims.depth * 1.03]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}

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
  url,
  towerIndex,
  floors,
  floor,
  colorFor,
  selectedUnitId,
  onSelect,
}: {
  url: string;
  towerIndex: number;
  floors: number;
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
  const dims = useTowerDims(url, floors);
  const panelW = (dims.width / 3) * 0.9;

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
            position={[(col - 1) * (dims.width / 3), 0, row * (dims.depth / 2 + 0.12)]}
            scale={selected ? 1.08 : 1}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(s.unit.id);
            }}
          >
            <boxGeometry args={[panelW, FLOOR_H * 0.8, 0.22]} />
            <meshStandardMaterial
              color={colorFor(cat)}
              emissive={colorFor(cat)}
              emissiveIntensity={selected ? 1.2 : 0.5}
              transparent
              opacity={0.92}
              roughness={0.35}
            />
          </mesh>
        );
      })}
    </group>
  );
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
  const modelUrl = glbUrl || towerModel.url;
  const twin = useTwin();
  const towers = getTowers(twin.rusunId);
  const colors = useCategoryColors();
  const controls = useRef<OrbitControlsImpl | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  // null = whole-site view (every tower visible); otherwise isolate one tower.
  const [isolated, setIsolated] = useState<string | null>(null);

  const colorFor = useCallback(
    (c: EfficiencyCategory) => colors[CATEGORY_TOKEN[c]] || "#888888",
    [colors],
  );

  const activeIndex = Math.max(
    0,
    towers.findIndex((t) => t.id === twin.towerId),
  );

  const focus = useMemo(() => {
    if (!isolated) return SITE_VIEW;
    const i = Math.max(
      0,
      towers.findIndex((t) => t.id === isolated),
    );
    const site = layoutFor(i);
    const h = PODIUM_H + (towers[i]?.floors ?? 10) * FLOOR_H;
    return {
      target: new THREE.Vector3(site.x, h * 0.45, site.z),
      pos: new THREE.Vector3(site.x + 14, h * 0.95, site.z + 16),
    };
  }, [isolated, towers]);

  const handleSelectTower = useCallback(
    (id: string) => {
      twin.setTowerId(id);
      setIsolated(id);
    },
    [twin],
  );

  const visibleTowers = isolated ? towers.filter((t) => t.id === isolated) : towers;

  return (
    <div
      ref={wrapper}
      className="relative h-full w-full overflow-hidden rounded-xl bg-background/60"
    >
      <Canvas
        camera={{ position: SITE_VIEW.pos.toArray(), fov: 34 }}
        dpr={[0.8, 1.25]}
        shadows={false}
        gl={{ antialias: false, powerPreference: "high-performance", stencil: false, depth: true }}
      >
        <color attach="background" args={["#0f1424"]} />
        <fog attach="fog" args={["#0f1424", 70, 165]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[18, 26, 14]} intensity={0.9} />
        <gridHelper args={[90, 18, "#243049", "#1a2236"]} position={[0, -0.02, 0]} />

        <Suspense fallback={<Loading />}>
          {visibleTowers.map((t) => {
            const i = towers.findIndex((x) => x.id === t.id);
            return (
              <GlbTower
                key={t.id}
                url={modelUrl}
                index={i}
                floors={t.floors}
                label={t.name}
                active={t.id === twin.towerId}
                // Only one full-detail GLB is in the scene at a time; the rest are
                // cheap massing volumes. Keeps the site view fast on any GPU.
                detailed={isolated ? t.id === isolated : t.id === twin.towerId}
                onSelectTower={() => handleSelectTower(t.id)}
                onSelectFloor={(f) => twin.setFloor(f)}
                shellColor={colors["base"] || "#2a3450"}
              />
            );
          })}
          <UnitBlocks
            url={modelUrl}
            towerIndex={activeIndex}
            floors={towers[activeIndex]?.floors ?? 10}
            floor={twin.floor}
            colorFor={colorFor}
            selectedUnitId={twin.unitId}
            onSelect={twin.selectUnit}
          />
        </Suspense>

        {/* Local lighting only — no remote HDRI fetch (avoids CDN rate limits). */}
        <hemisphereLight args={["#8fa8d8", "#0f1424", 0.7]} />


        <OrbitControls
          ref={controls}
          enablePan
          enableZoom
          maxPolarAngle={Math.PI / 2.05}
          minDistance={6}
          maxDistance={110}
          target={SITE_VIEW.target.toArray()}
          makeDefault
        />
        <CameraRig focus={focus} controls={controls} />
        <AdaptiveDpr pixelated />
        <BakeShadows />
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <div className="pointer-events-auto rounded-lg border border-border bg-card/85 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
          {isolated
            ? "Mode tower tunggal · klik lantai untuk memilih · Show all site untuk kembali"
            : "Tata letak mengikuti koordinat site Rusun ASN 3 · klik tower untuk zoom"}
        </div>
        <div className="pointer-events-auto flex gap-1.5">
          {isolated ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 bg-card/85"
              onClick={() => setIsolated(null)}
            >
              <Layers className="size-3.5" /> Show all
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            className="h-8 bg-card/85"
            onClick={() => {
              setIsolated(null);
              controls.current?.reset();
            }}
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

useGLTF.preload(towerModel.url);

export default TwinViewer;
