import { createFileRoute } from "@tanstack/react-router";

import { AnomalyPanel } from "@/components/twin/AnalyticsCards";
import { SyncedCharts } from "@/components/twin/ConsumptionCharts";
import { FloorPlanHeatmap } from "@/components/twin/FloorPlanHeatmap";
import { PageShell } from "@/components/twin/PageShell";
import { ScopeStatCards } from "@/components/twin/StatCards";
import { TowerSelector } from "@/components/twin/TowerSelector";
import { UnitDetailPanel } from "@/components/twin/UnitDetailPanel";
import { getScopeTotals, getTower, getUnits } from "@/lib/twin/data";
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
  const tower = getTower(twin.towerId);
  const totals = getScopeTotals(twin.rusunId, twin.monthKey, twin.towerId, twin.tariff);
  const unitIds = getUnits(twin.towerId).map((u) => u.id);

  return (
    <PageShell title={tower?.name ?? "Tower"} subtitle="Tower-level consumption & efficiency">
      <TowerSelector />
      <ScopeStatCards totals={totals} peak />
      <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
        <FloorPlanHeatmap />
        <UnitDetailPanel />
      </div>
      <SyncedCharts unitIds={unitIds} />
      <AnomalyPanel unitIds={unitIds} />
    </PageShell>
  );
}
