import { memo } from "react";
import * as THREE from "three";

import { getTowerGeometry } from "@/lib/twin/towerGeometry";

/** Palette. Edit the hex values to restyle the building — no model file to regenerate. */
const COLORS = {
  wall: "#e6e2d8",
  roof: "#a3a094",
  podiumSide: "#7f858b",
  podiumTop: "#8a8f94",
  band: "#cdbb98",
  parapet: "#c9a07a",
  glass: "#3d6fb0",
} as const;

function build(dim: number) {
  const std = (hex: string, extra: THREE.MeshStandardMaterialParameters = {}) => {
    const m = new THREE.MeshStandardMaterial({
      color: hex,
      roughness: 0.9,
      metalness: 0,
      ...extra,
    });
    m.color.multiplyScalar(dim);
    return m;
  };
  return {
    podium: [std(COLORS.podiumTop), std(COLORS.podiumSide)],
    body: [std(COLORS.roof), std(COLORS.wall)],
    bands: std(COLORS.band),
    parapet: std(COLORS.parapet),
    windows: std(COLORS.glass, { roughness: 0.2, metalness: 0.25, side: THREE.DoubleSide }),
  };
}

// Two shared material sets (active = full colour, dim = darkened). Geometry is shared too.
let active: ReturnType<typeof build> | null = null;
let dimmed: ReturnType<typeof build> | null = null;

export const ProceduralTower = memo(function ProceduralTower({ dim }: { dim: boolean }) {
  const g = getTowerGeometry();
  const m = dim ? (dimmed ??= build(0.5)) : (active ??= build(1));
  return (
    // dispose={null}: geometry/materials are shared by every tower, so R3F must not free them on unmount
    <group dispose={null}>
      <mesh geometry={g.podium} material={m.podium} />
      <mesh geometry={g.body} material={m.body} />
      <mesh geometry={g.bands} material={m.bands} />
      <mesh geometry={g.parapet} material={m.parapet} />
      <mesh geometry={g.windows} material={m.windows} />
    </group>
  );
});
