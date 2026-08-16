import { ClientOnly } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Suspense, lazy } from "react";

import { getRusun, getTower } from "@/lib/twin/data";
import { useTwin } from "@/lib/twin/store";
import { FloorSelector } from "./FloorSelector";

// Three.js only loads in the browser, after hydration, and is code-split so the
// dashboard shell renders instantly even with a heavy model.
const TwinViewer = lazy(() => import("./TwinViewer"));

function ViewerFallback() {
  return (
    <div className="flex h-full items-center justify-center gap-2 rounded-xl bg-background/50 text-xs text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> Initialising digital twin…
    </div>
  );
}

export function TwinCanvasPanel({ height = 520 }: { height?: number }) {
  const twin = useTwin();
  const rusun = getRusun(twin.rusunId);
  const tower = getTower(twin.towerId);

  return (
    <section className="panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">3D Digital Twin — {rusun.name}</h2>
          <p className="text-xs text-muted-foreground">
            {tower?.name} · Floor {twin.floor}
            {twin.unitId ? " · unit selected" : ""} · spatial representation of the smart-metering
            data
          </p>
        </div>
        <span className="rounded-md bg-secondary px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          Orbit · Zoom · Pan · Select
        </span>
      </div>

      <div className="mt-3 flex gap-3" style={{ height }}>
        <div className="min-w-0 flex-1">
          <ClientOnly fallback={<ViewerFallback />}>
            <Suspense fallback={<ViewerFallback />}>
              <TwinViewer />
            </Suspense>
          </ClientOnly>
        </div>
        <div className="overflow-auto">
          <FloorSelector />
        </div>
      </div>
    </section>
  );
}
