import { FOOTPRINT_BOUNDS } from "./towerShape";

/**
 * Measurements of the tower, taken from the real Revit model:
 *  - floor-slab tops sit at y = 10.67 + 3.6 × (n − 1) for n = 1..10 (10 slabs, 3.6 m apart);
 *    everything below 10.67 m is the podium / ground levels
 *  - the roof slab is at 46.67 m; a 1.1 m parapet runs around it
 *  - width/depth come from the traced footprint (see towerShape.ts)
 *
 * All numbers are in metres (model units). The viewer scales the whole tower by MODEL_SCALE.
 */
export const TOWER_MODEL = {
  width: FOOTPRINT_BOUNDS.maxX - FOOTPRINT_BOUNDS.minX, // along X (long side)
  depth: FOOTPRINT_BOUNDS.maxZ - FOOTPRINT_BOUNDS.minZ, // along Z
  height: 47.77, // roof slab + parapet
  podiumHeight: 10.67, // y of the Floor 1 slab top
  floorHeight: 3.6,
  floors: 10,
  parapetHeight: 1.1,
} as const;

/** Scene units per metre. 0.15 → one tower ≈ 7.8 × 3.5 × 7.2 scene units. */
export const MODEL_SCALE = 0.15;

/** y (metres, model space) where the given floor (1-based) starts. */
export function floorBaseY(floor: number) {
  return TOWER_MODEL.podiumHeight + (Math.max(1, floor) - 1) * TOWER_MODEL.floorHeight;
}

/** Floor (1..floors) that contains model-space height y. */
export function floorFromY(y: number) {
  const f = Math.floor((y - TOWER_MODEL.podiumHeight) / TOWER_MODEL.floorHeight) + 1;
  return Math.min(TOWER_MODEL.floors, Math.max(1, f));
}
