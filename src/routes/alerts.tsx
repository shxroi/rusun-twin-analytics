import { createFileRoute } from "@tanstack/react-router";

import { AnomalyPanel } from "@/components/twin/AnalyticsCards";
import { PageShell } from "@/components/twin/PageShell";
import { TowerSelector } from "@/components/twin/TowerSelector";
import { UnitDetailPanel } from "@/components/twin/UnitDetailPanel";
import { getRusunUnits } from "@/lib/twin/data";
import { useTwin } from "@/lib/twin/store";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts & Anomalies — Rusun ASN IKN" },
      {
        name: "description",
        content:
          "Consumption anomaly alerts across all towers with unit-level drill-down and severity ranking.",
      },
      { property: "og:title", content: "Alerts & Anomalies — Rusun ASN IKN" },
      {
        property: "og:description",
        content: "Sigma-deviation alerts for abnormal electricity and water usage.",
      },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const twin = useTwin();
  const unitIds = getRusunUnits(twin.rusunId).map((u) => u.id);

  return (
    <PageShell title="Alerts & Anomalies" subtitle="Deviation monitoring across all towers">
      <TowerSelector />
      <div className="grid gap-3 xl:grid-cols-[1.3fr_1fr]">
        <AnomalyPanel unitIds={unitIds} limit={20} />
        <UnitDetailPanel />
      </div>
    </PageShell>
  );
}
