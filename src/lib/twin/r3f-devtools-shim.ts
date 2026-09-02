import * as THREE from "three";

/**
 * The TanStack devtools source-injection transform adds a `data-tsd-source`
 * attribute to every JSX element — including three.js elements inside <Canvas>.
 * R3F's applyProps treats the dashes as a nested property path and throws
 * `Cannot set "data-tsd-source". Ensure it is an object...` because three
 * objects have no `data` container, which blanks the whole page.
 *
 * Giving every relevant three prototype a lazy, per-instance `data` object makes
 * that write a harmless no-op while keeping the devtools mapping intact.
 */
function addDataBag(proto: object | undefined) {
  if (!proto || Object.getOwnPropertyDescriptor(proto, "data")) return;
  const store = new WeakMap<object, Record<string, unknown>>();
  Object.defineProperty(proto, "data", {
    configurable: true,
    get() {
      let bag = store.get(this);
      if (!bag) {
        bag = {};
        store.set(this, bag);
      }
      return bag;
    },
    set(value: Record<string, unknown>) {
      store.set(this, value ?? {});
    },
  });
}

for (const ctor of [
  THREE.Object3D,
  THREE.Material,
  THREE.BufferGeometry,
  THREE.Color,
  THREE.Fog,
  THREE.FogExp2,
  THREE.Texture,
]) {
  addDataBag(ctor?.prototype);
}
