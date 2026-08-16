import { AlertTriangle, Brain, Cpu, Database, Gauge, TrendingUp, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CATEGORY_TOKEN } from "@/lib/twin/config";
import { detectAnomalies } from "@/lib/twin/data";
import { analysePeak } from "@/lib/twin/forecast";
import { nf, rp, shortDate } from "@/lib/twin/format";
import { useTwin } from "@/lib/twin/store";
import { useForecast } from "./ConsumptionCharts";
import { cn } from "@/lib/utils";

export function ForecastSummaryCards({ unitIds }: { unitIds: string[] }) {
  const twin = useTwin();
  const elec = useForecast("electricity", unitIds);
  const water = useForecast("water", unitIds);
  const cost = useForecast("cost", unitIds);

  const nextElec = elec.data?.forecast[0];
  const nextWater = water.data?.forecast[0];
  const totalCostForecast = cost.data?.forecast.reduce((a, f) => a + f.value, 0) ?? 0;
  const histCost = cost.data?.history.reduce((a, h) => a + h.value, 0) ?? 0;
  const dailyAvgCost = histCost / (cost.data?.history.length || 1);
  const trend = dailyAvgCost
    ? ((totalCostForecast / (twin.forecastHorizon || 1) - dailyAvgCost) / dailyAvgCost) * 100
    : 0;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <div className="panel p-4">
        <Header icon={Brain} label="Electricity Forecast" tone="elec" />
        <p className="mt-2 text-2xl font-semibold text-elec">
          {nextElec ? nf(nextElec.value) : "—"}
          <span className="ml-1 text-xs font-normal text-muted-foreground">kWh tomorrow</span>
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Range {nextElec ? `${nf(nextElec.lower)} – ${nf(nextElec.upper)}` : "—"} kWh · horizon{" "}
          {twin.forecastHorizon}d · confidence{" "}
          {elec.data ? `${Math.round(elec.data.confidence * 100)}%` : "—"}
        </p>
      </div>

      <div className="panel p-4">
        <Header icon={Gauge} label="Water Forecast" tone="water" />
        <p className="mt-2 text-2xl font-semibold text-water">
          {nextWater ? nf(nextWater.value, 2) : "—"}
          <span className="ml-1 text-xs font-normal text-muted-foreground">m³ tomorrow</span>
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Range {nextWater ? `${nf(nextWater.lower, 2)} – ${nf(nextWater.upper, 2)}` : "—"} m³ ·
          model {water.data?.model ?? "—"}
        </p>
      </div>

      <div className="panel p-4">
        <Header icon={Wallet} label="Estimated Future Cost" tone="cost" />
        <p className="mt-2 text-2xl font-semibold text-cost">{rp(totalCostForecast)}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Next {twin.forecastHorizon} days · historical {rp(histCost)} · trend{" "}
          <span className={trend >= 0 ? "text-warn" : "text-ok"}>
            {trend >= 0 ? "+" : ""}
            {nf(trend)}%
          </span>
        </p>
      </div>

      <PeakCard unitIds={unitIds} />
    </div>
  );
}

function Header({
  icon: Icon,
  label,
  tone,
}: {
  icon: typeof Brain;
  label: string;
  tone: "elec" | "water" | "cost" | "muted";
}) {
  const toneClass = {
    elec: "text-elec bg-elec/12",
    water: "text-water bg-water/12",
    cost: "text-cost bg-cost/12",
    muted: "text-primary bg-primary/12",
  }[tone];
  return (
    <div className="flex items-center justify-between">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <span className={cn("flex size-6 items-center justify-center rounded-md", toneClass)}>
        <Icon className="size-3.5" />
      </span>
    </div>
  );
}

export function PeakCard({ unitIds }: { unitIds: string[] }) {
  const { data } = useForecast("electricity", unitIds);
  const peak = data ? analysePeak(data) : null;

  return (
    <div className="panel p-4">
      <Header icon={TrendingUp} label="Peak Analysis" tone="muted" />
      <div className="mt-2 space-y-1.5 text-xs">
        <Row
          label="Historical peak"
          value={
            peak?.historicalPeak
              ? `${nf(peak.historicalPeak.value)} kWh · ${shortDate(peak.historicalPeak.date)}`
              : "—"
          }
        />
        <Row
          label="Predicted peak"
          value={
            peak?.predictedPeak
              ? `${nf(peak.predictedPeak.value)} kWh · ${shortDate(peak.predictedPeak.date)}`
              : "—"
          }
        />
        <Row label="Average daily" value={peak ? `${nf(peak.averageDaily)} kWh` : "—"} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function AnomalyPanel({ unitIds, limit = 6 }: { unitIds: string[]; limit?: number }) {
  const twin = useTwin();
  const anomalies = detectAnomalies(unitIds, twin.monthKey).slice(0, limit);

  return (
    <section className="panel p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Anomaly Detection</h3>
          <p className="text-[11px] text-muted-foreground">
            σ-deviation vs expected consumption pattern
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "border-transparent",
            anomalies.length === 0
              ? "bg-ok/15 text-ok"
              : anomalies[0]!.severity === "anomaly"
                ? "bg-danger/15 text-danger"
                : "bg-warn/15 text-warn",
          )}
        >
          {anomalies.length === 0 ? "Normal" : anomalies[0]!.severity === "anomaly" ? "Anomaly" : "Warning"}
        </Badge>
      </div>

      <div className="mt-3 space-y-2">
        {anomalies.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No deviation above 2σ detected in this scope.
          </p>
        ) : (
          anomalies.map((a) => (
            <button
              key={a.id}
              onClick={() => twin.selectUnit(a.unitId)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-left text-xs transition-colors hover:border-primary/50"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle
                  className={cn(
                    "size-3.5",
                    a.severity === "anomaly" ? "text-danger" : "text-warn",
                  )}
                />
                <span className="font-medium">Unit {a.unitCode}</span>
                <span className="text-muted-foreground">{a.timestamp}</span>
              </span>
              <span className="text-right text-[11px] text-muted-foreground">
                actual {nf(a.actual)} kWh · expected {nf(a.expected)} kWh ·{" "}
                <span className="text-foreground">{nf(a.sigma, 1)}σ</span>
              </span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

export function TwinStatusCard() {
  const twin = useTwin();
  const rows = [
    { label: "Data Connection", value: "Connected", icon: Database, tone: "ok" as const },
    { label: "Last Data Update", value: twin.refreshedAt, icon: Database, tone: "muted" as const },
    { label: "3D Model Status", value: "Loaded", icon: Cpu, tone: "ok" as const },
    { label: "Forecast Model", value: "Ready (LSTM interface)", icon: Brain, tone: "ok" as const },
    { label: "Anomaly Engine", value: "Active", icon: AlertTriangle, tone: "ok" as const },
  ];

  return (
    <section className="panel p-4">
      <h3 className="text-sm font-semibold">Digital Twin Status</h3>
      <div className="mt-3 space-y-2 text-xs">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-muted-foreground">
              <r.icon className="size-3.5" />
              {r.label}
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              {r.tone === "ok" ? (
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: `var(--${CATEGORY_TOKEN.hemat})` }}
                />
              ) : null}
              {r.value}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 rounded-lg bg-background/50 p-2 text-[10px] leading-relaxed text-muted-foreground">
        Smart metering data → analytical twin. Forecast dan anomaly service memakai baseline mock,
        siap diarahkan ke endpoint LSTM melalui <code>forecastElectricity()</code> /{" "}
        <code>forecastWater()</code>.
      </p>
    </section>
  );
}
