import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { BAND, FOOTPRINT, PARAPET, PODIUM, type Poly } from "./towerShape";
import { TOWER_MODEL as M } from "./towerModel";

/**
 * Builds the whole tower from the traced outline — no GLB, no textures.
 * 5 meshes in total (podium, body, slab bands, parapet, windows) ≈ 5 draw calls, ~6k triangles.
 * Built once and shared by every tower instance.
 */
export interface TowerGeometry {
  /** ExtrudeGeometry: material[0] = caps (top/bottom), material[1] = sides */
  podium: THREE.BufferGeometry;
  body: THREE.BufferGeometry;
  bands: THREE.BufferGeometry;
  parapet: THREE.BufferGeometry;
  windows: THREE.BufferGeometry;
}

const ROOF_Y = M.podiumHeight + M.floors * M.floorHeight; // 46.67
const BAND_H = 0.35;

function extrude(polys: Poly[], y0: number, depth: number): THREE.BufferGeometry {
  const parts = polys.map((p) => {
    // plan (x, z) → shape (x, −z); rotateX(−90°) maps it back onto the ground plane and extrusion → +Y
    const shape = new THREE.Shape(p.outer.map(([x, z]) => new THREE.Vector2(x, -z)));
    for (const h of p.holes)
      shape.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    g.translate(0, y0, 0);
    return g;
  });
  if (parts.length === 1) return parts[0]!;
  return mergeGeometries(parts, false)!; // single-material callers only (groups would be lost)
}

/** even-odd point-in-footprint test over all rings */
function insideFootprint(x: number, z: number): boolean {
  let inside = false;
  const ring = (pts: [number, number][]) => {
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, zi] = pts[i]!;
      const [xj, zj] = pts[j]!;
      if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    }
  };
  for (const p of FOOTPRINT) {
    ring(p.outer);
    p.holes.forEach(ring);
  }
  return inside;
}

/** One pane quad per bay on every facade edge (outer outline and lightwells), for each floor. */
function buildWindows(): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const rings: [number, number][][] = FOOTPRINT.flatMap((p) => [p.outer, ...p.holes]);
  const BAY = 3.0;
  const EDGE_MARGIN = 0.8;
  const OFF = 0.04; // keep panes just proud of the wall to avoid z-fighting

  for (const pts of rings) {
    for (let i = 0; i < pts.length; i++) {
      const [x0, z0] = pts[i]!;
      const [x1, z1] = pts[(i + 1) % pts.length]!;
      const L = Math.hypot(x1 - x0, z1 - z0);
      if (L < 3) continue;
      const tx = (x1 - x0) / L;
      const tz = (z1 - z0) / L;
      let nx = tz;
      let nz = -tx;
      const mx = (x0 + x1) / 2;
      const mz = (z0 + z1) / 2;
      if (insideFootprint(mx + nx * 0.2, mz + nz * 0.2)) {
        nx = -nx;
        nz = -nz; // normal must point out of the building
      }
      const bays = Math.max(1, Math.round((L - EDGE_MARGIN) / BAY));
      const bayLen = (L - EDGE_MARGIN) / bays;
      const paneW = bayLen * 0.64;
      for (let f = 1; f <= M.floors; f++) {
        const yb = M.podiumHeight + (f - 1) * M.floorHeight + 0.95;
        const yt = yb + 1.6;
        for (let b = 0; b < bays; b++) {
          const c = EDGE_MARGIN / 2 + bayLen * (b + 0.5);
          const a = c - paneW / 2;
          const d = c + paneW / 2;
          const ax = x0 + tx * a + nx * OFF,
            az = z0 + tz * a + nz * OFF;
          const dx = x0 + tx * d + nx * OFF,
            dz = z0 + tz * d + nz * OFF;
          // two triangles, wound so the front face looks along (nx, nz)
          const quad = [
            [ax, yb, az],
            [dx, yb, dz],
            [dx, yt, dz],
            [ax, yb, az],
            [dx, yt, dz],
            [ax, yt, az],
          ];
          for (const v of quad) {
            pos.push(v[0]!, v[1]!, v[2]!);
            nor.push(nx, 0, nz);
          }
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  return g;
}

let cache: TowerGeometry | null = null;

export function getTowerGeometry(): TowerGeometry {
  if (cache) return cache;
  const bands = mergeGeometries(
    Array.from({ length: M.floors + 1 }, (_, k) =>
      extrude(BAND, M.podiumHeight + k * M.floorHeight - BAND_H, BAND_H),
    ),
    false,
  )!;
  cache = {
    podium: extrude(PODIUM, 0, M.podiumHeight),
    body: extrude(FOOTPRINT, M.podiumHeight, ROOF_Y - M.podiumHeight),
    bands,
    parapet: extrude(PARAPET, ROOF_Y, M.parapetHeight),
    windows: buildWindows(),
  };
  return cache;
}
