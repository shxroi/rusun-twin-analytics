import { createFileRoute } from "@tanstack/react-router";

import { AnomalyPanel } from "@/components/twin/AnalyticsCards";
import { SyncedCharts } from "@/components/twin/ConsumptionCharts";
import { FloorPlanHeatmap } from "@/components/twin/FloorPlanHeatmap";
import { PageShell } from "@/components/twin/PageShell";
import { ScopeStatCards } from "@/components/twin/StatCards";
import { TowerSelector } from "@/components/twin/TowerSelector";
import { UnitDetailPanel } from "@/components/twin/UnitDetailPanel";
import { useCatalogUnits, useSummary } from "@/lib/twin/server";
import { useTwin } from "@/lib/twin/store";

export const Route = createFileRoute("/towers")({
  head: () => ({
    meta: [
      { title: "Tower Detail — Rusun ASN IKN" },
      {
        name: "description",
        content:
          "Per-tower consumption breakdown with efficiency heatmap, forecasting and anomaly detection.",
      },
      { property: "og:title", content: "Tower Detail — Rusun ASN IKN" },
      {
        property: "og:description",
        content: "Tower-level electricity and water analytics for Rusun ASN IKN.",
      },
    ],
  }),
  component: TowersPage,
});

function TowersPage() {
  const twin = useTwin();
  const rusun = twin.rusunId.replace(/\D/g, "") || "3";
  const { units } = useCatalogUnits(rusun);
  const { data } = useSummary(rusun, twin.monthKey, { towerId: twin.towerId });
  const towerName = data?.towers.find((t) => t.towerId === twin.towerId)?.name;
  const unitIds = units.filter((u) => u.towerId === twin.towerId).map((u) => u.code);

  return (
    <PageShell title={towerName ?? "Tower"} subtitle="Tower-level consumption & efficiency">
      <TowerSelector />
      <ScopeStatCards towerId={twin.towerId} />
      <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
        <FloorPlanHeatmap />
        <UnitDetailPanel />
      </div>
      <SyncedCharts unitIds={unitIds} />
      <AnomalyPanel />
    </PageShell>
  );
}
