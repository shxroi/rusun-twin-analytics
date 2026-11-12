import { createFileRoute } from "@tanstack/react-router";

import {
  AnomalyPanel,
  ForecastSummaryCards,
  TwinStatusCard,
} from "@/components/twin/AnalyticsCards";
import { SyncedCharts } from "@/components/twin/ConsumptionCharts";
import { PageShell } from "@/components/twin/PageShell";
import { TowerSelector } from "@/components/twin/TowerSelector";
import { useCatalogUnits } from "@/lib/twin/server";
import { useTwin } from "@/lib/twin/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Predictive Analytics — Rusun ASN IKN" },
      {
        name: "description",
        content:
          "Consumption forecasting, peak analysis and anomaly detection powered by the predictive model service.",
      },
      { property: "og:title", content: "Predictive Analytics — Rusun ASN IKN" },
      {
        property: "og:description",
        content: "Forecast horizon control, confidence bands and peak/anomaly analytics.",
      },
    ],
  }),
  component: AnalyticsPage,
});

const HORIZONS = [7, 14, 30];

function AnalyticsPage() {
  const twin = useTwin();
  const [scope, setScope] = [twin.granularity, twin.setGranularity];
  const rusun = twin.rusunId.replace(/\D/g, "") || "3";
  const { units } = useCatalogUnits(rusun);
  const unitIds = units
    .filter((u) => (scope === "monthly" ? true : u.towerId === twin.towerId))
    .map((u) => u.code);

  return (
    <PageShell
      title="Predictive Analytics"
      subtitle="Forecasting, peak load & anomaly detection"
      showMonthFilter={false}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <TowerSelector />
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Floor</span>
            <span className="w-10 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground">
              {twin.floor}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Horizon</span>
          {HORIZONS.map((h) => (
            <button
              key={h}
              onClick={() => twin.setForecastHorizon(h)}
              className={cn(
                "rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground",
                twin.forecastHorizon === h &&
                  "border-primary bg-primary/15 font-medium text-primary",
              )}
            >
              {h} days
            </button>
          ))}
          <button
            onClick={() => setScope(scope === "monthly" ? "daily" : "monthly")}
            className="ml-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Scope: {scope === "monthly" ? "All towers" : "Selected tower"}
          </button>
        </div>
      </div>

      <ForecastSummaryCards unitIds={unitIds} />
      <SyncedCharts unitIds={unitIds} />
      <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr]">
        <AnomalyPanel limit={10} />
        <TwinStatusCard />
      </div>
    </PageShell>
  );
}
