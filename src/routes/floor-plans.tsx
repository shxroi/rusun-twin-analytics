import { createFileRoute } from "@tanstack/react-router";

import { FloorPlanHeatmap } from "@/components/twin/FloorPlanHeatmap";
import { FloorSelector } from "@/components/twin/FloorSelector";
import { PageShell } from "@/components/twin/PageShell";
import { TowerSelector } from "@/components/twin/TowerSelector";
import { UnitDetailPanel } from "@/components/twin/UnitDetailPanel";
import { UnitList } from "@/components/twin/UnitList";

export const Route = createFileRoute("/floor-plans")({
  head: () => ({
    meta: [
      { title: "Floor Plan Heatmap — Rusun ASN IKN" },
      {
        name: "description",
        content:
          "Architectural floor plans overlaid with per-unit electricity and water efficiency heatmaps.",
      },
      { property: "og:title", content: "Floor Plan Heatmap — Rusun ASN IKN" },
      {
        property: "og:description",
        content: "Click any unit on the plan to inspect its metering history and forecast.",
      },
    ],
  }),
  component: FloorPlansPage,
});

function FloorPlansPage() {
  return (
    <PageShell title="Floor Plans" subtitle="Interactive per-unit efficiency heatmap">
      <TowerSelector />
      <div className="grid gap-3 xl:grid-cols-[auto_1.4fr_1fr]">
        <div className="max-h-[560px] overflow-auto">
          <FloorSelector />
        </div>
        <FloorPlanHeatmap />
        <UnitDetailPanel />
      </div>
      <UnitList />
    </PageShell>
  );
}
