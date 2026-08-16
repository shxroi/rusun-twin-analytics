import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AnomalyPanel, ForecastSummaryCards, TwinStatusCard } from "@/components/twin/AnalyticsCards";
import { SyncedCharts } from "@/components/twin/ConsumptionCharts";
import { PageShell } from "@/components/twin/PageShell";
import { ScopeStatCards } from "@/components/twin/StatCards";
import { TwinCanvasPanel } from "@/components/twin/TwinCanvasPanel";
import { getRusunUnits, getScopeTotals, getTowerComparison } from "@/lib/twin/data";
import { nf } from "@/lib/twin/format";
import { useTwin } from "@/lib/twin/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — Rusun ASN IKN Smart Metering Twin" },
      {
        name: "description",
        content:
          "Rusun-wide electricity, water and cost overview with predictive forecasting and anomaly alerts.",
      },
      { property: "og:title", content: "Overview — Rusun ASN IKN Smart Metering Twin" },
      {
        property: "og:description",
        content: "Total consumption, tower comparison and 7-day forecast for Rusun ASN IKN.",
      },
    ],
  }),
  component: Overview,
});

function Overview() {
  const twin = useTwin();
  const totals = getScopeTotals(twin.rusunId, twin.monthKey, undefined, twin.tariff);
  const unitIds = getRusunUnits(twin.rusunId).map((u) => u.id);

  return (
    <PageShell title="Overview" subtitle="Rusun-wide smart metering & predictive analytics">
      <ScopeStatCards totals={totals} peak />
      <ForecastSummaryCards unitIds={unitIds} />
      <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
        <TwinCanvasPanel height={420} />
        <div className="space-y-3">
          <TowerComparison />
          <TwinStatusCard />
        </div>
      </div>
      <SyncedCharts unitIds={unitIds} />
      <AnomalyPanel unitIds={unitIds} />
    </PageShell>
  );
}

function TowerComparison() {
  const twin = useTwin();
  const data = getTowerComparison(twin.rusunId, twin.monthKey);

  return (
    <section className="panel p-4">
      <h3 className="text-sm font-semibold">Usage by Tower</h3>
      <p className="text-[11px] text-muted-foreground">Click a bar to focus the tower</p>
      <div className="mt-3 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              stroke="var(--border)"
            />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
            <Tooltip
              formatter={(v: number) => `${nf(v)} kWh`}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                fontSize: 12,
              }}
            />
            <Bar
              dataKey="electricity"
              radius={[4, 4, 0, 0]}
              onClick={(d: { payload?: { towerId: string } }) =>
                d.payload && twin.setTowerId(d.payload.towerId)
              }
            >
              {data.map((d) => (
                <Cell
                  key={d.towerId}
                  fill={twin.towerId === d.towerId ? "var(--primary)" : "var(--elec)"}
                  cursor="pointer"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
