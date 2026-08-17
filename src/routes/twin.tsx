import { createFileRoute } from "@tanstack/react-router";

import { ForecastSummaryCards } from "@/components/twin/AnalyticsCards";
import { PageShell } from "@/components/twin/PageShell";
import { TowerSelector } from "@/components/twin/TowerSelector";
import { TwinCanvasPanel } from "@/components/twin/TwinCanvasPanel";
import { UnitDetailPanel } from "@/components/twin/UnitDetailPanel";
import { getUnits } from "@/lib/twin/data";
import { useTwin } from "@/lib/twin/store";

export const Route = createFileRoute("/twin")({
  head: () => ({
    meta: [
      { title: "3D Digital Twin — Rusun ASN IKN" },
      {
        name: "description",
        content:
          "Interactive 3D building twin: orbit, select floors and units, and read live smart-meter telemetry.",
      },
      { property: "og:title", content: "3D Digital Twin — Rusun ASN IKN" },
      {
        property: "og:description",
        content: "Spatial building model synchronised with electricity and water metering data.",
      },
    ],
  }),
  component: TwinPage,
});

function TwinPage() {
  const twin = useTwin();
  const unitIds = getUnits(twin.towerId).map((u) => u.id);

  return (
    <PageShell title="3D Digital Twin" subtitle="Spatial view synchronised with metering data">
      <TowerSelector />
      <ForecastSummaryCards unitIds={unitIds} />
      <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr]">
        <TwinCanvasPanel height={560} />
        <UnitDetailPanel />
      </div>
    </PageShell>
  );
}
