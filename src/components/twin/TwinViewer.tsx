import { AdaptiveDpr, Edges, Html, OrbitControls } from "@react-three/drei";
import { Canvas, invalidate, useFrame, useThree } from "@react-three/fiber";
import { Layers, Loader2, Maximize2, RotateCcw } from "lucide-react";
import {
  Component,
  Suspense,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import "@/lib/twin/r3f-devtools-shim";

import { ProceduralTower } from "@/components/twin/ProceduralTower";
import { Button } from "@/components/ui/button";
import { cssColorToHex } from "@/lib/twin/color";
import { CATEGORY_TOKEN } from "@/lib/twin/config";
import { getFloorSummaries, getTowers } from "@/lib/twin/data";
import { useCatalogUnits, useUnitSummaries } from "@/lib/twin/server";
import { useTwin } from "@/lib/twin/store";
import { MODEL_SCALE as S, TOWER_MODEL as M, floorBaseY, floorFromY } from "@/lib/twin/towerModel";
import type { EfficiencyCategory } from "@/lib/twin/types";

/**
 * Site layout (scene units). Same ridge-road arrangement as before, spread out a little because the
 * towers are now their real 54 × 27 m bar shape instead of 11 × 11 boxes.
 * NOTE: positions/rotations are still approximate — re-trace them against the satellite reference
 * if you need them exact.
 */
const SPREAD = 1.25;
const SITE_LAYOUT: { x: number; z: number; rot: number }[] = [
  { x: 11.5, z: -19.5, rot: -0.42 },
  { x: 6.2, z: -11.5, rot: -0.34 },
  { x: 9.0, z: -3.6, rot: -0.5 },
  { x: 2.4, z: 4.2, rot: -0.3 },
  { x: -6.4, z: 11.5, rot: -0.58 },
  { x: -1.6, z: 19.0, rot: -0.22 },
].map((p) => ({ ...p, x: p.x * SPREAD, z: p.z * SPREAD }));

const layoutFor = (i: number) => SITE_LAYOUT[i % SITE_LAYOUT.length]!;

const TOWER_H = M.height * S; // scene-unit height of one tower

const SITE_VIEW = {
  pos: new THREE.Vector3(46, 34, 60),
  target: new THREE.Vector3(3, 3, 0),
};

/** Category / accent colours resolved from the CSS design tokens (oklch → hex for three.js). */
function useThemeColors() {
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
    next["accent"] = resolve("primary");
    probe.remove();
    setColors(next);
  }, []);
  return colors;
}

/**
 * Smoothly flies the camera + orbit target to the focus pose. Frame-rate independent, parks itself
 * when finished (the canvas renders on demand, so the GPU idles), and yields to the user the moment
 * they grab the controls.
 */
function CameraRig({
  focus,
  nonce,
  controls,
}: {
  focus: { pos: THREE.Vector3; target: THREE.Vector3 };
  nonce: number;
  controls: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();
  const done = useRef(false);
  const key = `${focus.pos.toArray().join()}|${focus.target.toArray().join()}|${nonce}`;

  useEffect(() => {
    done.current = false;
    invalidate();
  }, [key]);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const stop = () => {
      done.current = true;
    };
    c.addEventListener("start", stop);
    return () => c.removeEventListener("start", stop);
  }, [controls]);

  useFrame((_, rawDelta) => {
    if (done.current) return;
    const k = 1 - Math.exp(-4.5 * Math.min(rawDelta, 0.05));
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
    } else {
      invalidate(); // keep animating until we arrive
    }
  });
  return null;
}

interface TowerProps {
  index: number;
  label: string;
  active: boolean;
  accent: string;
  onPick: (floor: number) => void;
}

const Tower = memo(function Tower({ index, label, active, accent, onPick }: TowerProps) {
  const site = layoutFor(index);
  return (
    <group position={[site.x, 0, site.z]} rotation={[0, site.rot, 0]}>
      <group scale={S}>
        {/* Built from the traced outline; geometry + materials are shared by all towers. */}
        <ProceduralTower dim={!active} />

        {/* ONE invisible hit volume per tower (was one per floor). Floor comes from the click height,
            so we never raycast against the model's own triangles. */}
        <mesh
          position={[0, M.height / 2, 0]}
          onClick={(e) => {
            e.stopPropagation();
            const local = e.object.worldToLocal(e.point.clone());
            onPick(floorFromY(local.y + M.height / 2));
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "auto";
          }}
        >
          <boxGeometry args={[M.width, M.height, M.depth]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          <Edges visible={active} color={accent} threshold={15} />
        </mesh>
      </group>

      <Html position={[0, -0.3, (M.depth * S) / 2 + 0.8]} center distanceFactor={40}>
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
});

/** Translucent slab on the selected floor, aligned to the model's real slab elevations. */
function FloorHighlight({
  towerIndex,
  floor,
  accent,
}: {
  towerIndex: number;
  floor: number;
  accent: string;
}) {
  const site = layoutFor(towerIndex);
  return (
    <group position={[site.x, 0, site.z]} rotation={[0, site.rot, 0]} scale={S}>
      <mesh position={[0, floorBaseY(floor) + M.floorHeight / 2, 0]} renderOrder={2}>
        <boxGeometry args={[M.width * 1.02, M.floorHeight, M.depth * 1.02]} />
        <meshBasicMaterial color={accent} transparent opacity={0.2} depthWrite={false} />
        <Edges color={accent} threshold={15} />
      </mesh>
    </group>
  );
}

/** Per-unit heat tiles on the selected floor (up to 6: 3 per long facade). */
function UnitTiles({
  towerIndex,
  floor,
  colorFor,
}: {
  towerIndex: number;
  floor: number;
  colorFor: (c: EfficiencyCategory) => string;
}) {
  const twin = useTwin();
  const rusun = twin.rusunId.replace(/\D/g, "") || "3";
  const { units } = useCatalogUnits(rusun);
  const towerUnits = useMemo(
    () => units.filter((u) => u.towerId === twin.towerId),
    [units, twin.towerId],
  );
  const { summaries } = useUnitSummaries(rusun, twin.monthKey, towerUnits, {
    towerId: twin.towerId,
  });
  const floorSummaries = summaries.filter((s) => s.unit.floor === floor);
  const site = layoutFor(towerIndex);
  const colW = M.width / 3;

  return (
    <group position={[site.x, 0, site.z]} rotation={[0, site.rot, 0]} scale={S}>
      <group position={[0, floorBaseY(floor) + M.floorHeight / 2, 0]}>
        {floorSummaries.map((s, i) => {
          const col = i % 3;
          const row = i < 3 ? -1 : 1;
          const selected = twin.unitId === s.unit.id;
          const cat = twin.heatmapDim === "water" ? s.waterCategory : s.electricityCategory;
          const color = colorFor(cat);
          return (
            <mesh
              key={s.unit.id}
              position={[(col - 1) * colW, 0, row * (M.depth / 2 + 0.9)]}
              scale={selected ? 1.08 : 1}
              onClick={(e) => {
                e.stopPropagation();
                twin.selectUnit(s.unit.id);
              }}
            >
              <boxGeometry args={[colW * 0.82, M.floorHeight * 0.72, 1.4]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={selected ? 1.2 : 0.5}
                roughness={0.35}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

function Loading() {
  return (
    <Html center>
      <div className="flex items-center gap-2 whitespace-nowrap text-xs text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading building model…
      </div>
    </Html>
  );
}

class ViewerErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl bg-background/60 p-4 text-center text-xs text-muted-foreground">
        <p>3D view could not be drawn.</p>
        <Button size="sm" variant="outline" onClick={() => this.setState({ error: null })}>
          Retry
        </Button>
      </div>
    );
  }
}

function Scene({
  focusedId,
  onFocusTower,
  nonce,
  controls,
  colors,
}: {
  focusedId: string | null;
  onFocusTower: (id: string) => void;
  nonce: number;
  controls: React.RefObject<OrbitControlsImpl | null>;
  colors: Record<string, string>;
}) {
  const twin = useTwin();
  const rusun = twin.rusunId.replace(/\D/g, "") || "3";
  const { units } = useCatalogUnits(rusun);
  // Derive the tower list from the catalog (unique tower ids in stable order).
  const towers = useMemo(() => {
    const seen: { id: string; name: string }[] = [];
    for (const u of units) {
      if (!seen.some((t) => t.id === u.towerId)) {
        seen.push({ id: u.towerId, name: u.towerId });
      }
    }
    return seen;
  }, [units]);
  const accent = colors["accent"] || "#4f8cff";

  const colorFor = useCallback(
    (c: EfficiencyCategory) => colors[CATEGORY_TOKEN[c]] || "#888888",
    [colors],
  );

  const activeIndex = Math.max(
    0,
    towers.findIndex((t) => t.id === twin.towerId),
  );

  const focus = useMemo(() => {
    if (!focusedId) return SITE_VIEW;
    const i = Math.max(
      0,
      towers.findIndex((t) => t.id === focusedId),
    );
    const site = layoutFor(i);
    return {
      target: new THREE.Vector3(site.x, TOWER_H * 0.45, site.z),
      pos: new THREE.Vector3(site.x + 13, TOWER_H + 3, site.z + 17),
    };
  }, [focusedId, towers]);

  const { setTowerId, setFloor } = twin;

  return (
    <>
      {towers.map((t, i) => (
        <Tower
          key={t.id}
          index={i}
          label={t.name}
          active={t.id === twin.towerId}
          accent={accent}
          onPick={(floor) => {
            if (t.id !== twin.towerId) setTowerId(t.id);
            else setFloor(floor);
            // first click on a tower = select + fly to it (same behaviour as before)
            if (t.id !== focusedId) onFocusTower(t.id);
          }}
        />
      ))}
      <FloorHighlight towerIndex={activeIndex} floor={twin.floor} accent={accent} />
      <UnitTiles towerIndex={activeIndex} floor={twin.floor} colorFor={colorFor} />
      <CameraRig focus={focus} nonce={nonce} controls={controls} />
    </>
  );
}

export const TwinViewer = memo(function TwinViewer() {
  const colors = useThemeColors();
  const controls = useRef<OrbitControlsImpl | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  // null = whole-site view; otherwise the camera is parked on one tower (others stay visible, dimmed).
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(
    () => () => {
      document.body.style.cursor = "auto";
    },
    [],
  );

  const showAll = useCallback(() => {
    setFocusedId(null);
    setNonce((n) => n + 1); // re-run the fly-back even if already at the site pose
  }, []);

  return (
    <div
      ref={wrapper}
      className="relative h-full w-full overflow-hidden rounded-xl bg-background/60"
    >
      <ViewerErrorBoundary>
        <Canvas
          // Render only when something changes (orbit, selection, data) → idle GPU when nothing moves.
          frameloop="demand"
          camera={{ position: SITE_VIEW.pos.toArray(), fov: 34, near: 0.5, far: 400 }}
          dpr={[1, 1.5]}
          shadows={false}
          gl={{ antialias: true, powerPreference: "high-performance", stencil: false }}
        >
          <color attach="background" args={["#0f1424"]} />
          <fog attach="fog" args={["#0f1424", 90, 220]} />
          <ambientLight intensity={0.6} />
          <hemisphereLight args={["#8fa8d8", "#0f1424", 0.8]} />
          <directionalLight position={[30, 50, 20]} intensity={1.1} />
          <gridHelper args={[140, 28, "#243049", "#1a2236"]} position={[0, -0.02, 0]} />

          <Suspense fallback={<Loading />}>
            <Scene
              focusedId={focusedId}
              onFocusTower={setFocusedId}
              nonce={nonce}
              controls={controls}
              colors={colors}
            />
          </Suspense>

          <OrbitControls
            ref={controls}
            makeDefault
            enablePan
            enableZoom
            enableDamping={false} // damping needs a continuous loop; we render on demand
            regress // drop resolution while orbiting (pairs with AdaptiveDpr)
            maxPolarAngle={Math.PI / 2.05}
            minDistance={5}
            maxDistance={160}
            target={SITE_VIEW.target.toArray()}
          />
          <AdaptiveDpr pixelated />
        </Canvas>
      </ViewerErrorBoundary>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <div className="pointer-events-auto rounded-lg border border-border bg-card/85 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
          {focusedId
            ? "Mode fokus tower · klik lantai untuk memilih · Show all untuk kembali"
            : "Tata letak mengikuti koordinat site Rusun ASN 3 · klik tower untuk zoom"}
        </div>
        <div className="pointer-events-auto flex gap-1.5">
          {focusedId ? (
            <Button size="sm" variant="outline" className="h-8 bg-card/85" onClick={showAll}>
              <Layers className="size-3.5" /> Show all
            </Button>
          ) : null}
          <Button size="sm" variant="outline" className="h-8 bg-card/85" onClick={showAll}>
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
