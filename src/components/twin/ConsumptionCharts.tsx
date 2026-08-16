import { useQuery } from "@tanstack/react-query";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useTwin } from "@/lib/twin/store";
import { forecastCost, forecastElectricity, forecastWater } from "@/lib/twin/forecast";
import { dayOf, nf, rp, shortDate } from "@/lib/twin/format";
import type { ForecastResult } from "@/lib/twin/types";
import { cn } from "@/lib/utils";

export type ChartKind = "electricity" | "water" | "cost";

const META: Record<ChartKind, { title: string; color: string; unit: string }> = {
  electricity: { title: "Daily Electricity", color: "var(--elec)", unit: "kWh" },
  water: { title: "Daily Water", color: "var(--water)", unit: "m³" },
  cost: { title: "Electricity Cost", color: "var(--cost)", unit: "Rp" },
};

export function useForecast(kind: ChartKind, unitIds: string[]) {
  const twin = useTwin();
  return useQuery<ForecastResult>({
    queryKey: [
      "forecast",
      kind,
      twin.monthKey,
      twin.forecastHorizon,
      unitIds.length,
      unitIds[0] ?? "none",
    ],
    queryFn: () => {
      const req = { unitIds, monthKey: twin.monthKey, horizonDays: twin.forecastHorizon };
      if (kind === "water") return forecastWater(req);
      if (kind === "cost") return forecastCost(req, twin.tariff);
      return forecastElectricity(req);
    },
  });
}

function buildRows(result: ForecastResult) {
  const rows = result.history.map((h) => ({
    date: h.date,
    label: String(dayOf(h.date)),
    actual: h.value,
    forecast: null as number | null,
    band: null as [number, number] | null,
  }));
  const last = result.history[result.history.length - 1];
  if (last && rows.length) {
    rows[rows.length - 1]!.forecast = last.value;
    rows[rows.length - 1]!.band = [last.value, last.value];
  }
  for (const f of result.forecast) {
    rows.push({
      date: f.date,
      label: shortDate(f.date),
      actual: null as unknown as number,
      forecast: f.value,
      band: [f.lower, f.upper],
    });
  }
  return rows;
}

export function ForecastChart({
  kind,
  unitIds,
  height = 220,
  className,
}: {
  kind: ChartKind;
  unitIds: string[];
  height?: number;
  className?: string;
}) {
  const twin = useTwin();
  const meta = META[kind];
  const { data, isPending } = useForecast(kind, unitIds);
  const rows = data ? buildRows(data) : [];

  const fmt = (v: number) => (kind === "cost" ? rp(v) : `${nf(v, kind === "water" ? 2 : 1)} ${meta.unit}`);

  return (
    <section className={cn("panel p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{meta.title}</h3>
          <p className="text-[11px] text-muted-foreground">
            Historical actual + {twin.forecastHorizon}-day forecast
            {data ? ` · ${data.model} · ${Math.round(data.confidence * 100)}% confidence` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-4" style={{ backgroundColor: meta.color }} /> Actual
          </span>
          <span className="flex items-center gap-1">
            <span
              className="h-0.5 w-4 border-t-2 border-dashed"
              style={{ borderColor: meta.color }}
            />{" "}
            Forecast
          </span>
        </div>
      </div>

      <div style={{ height }} className="mt-3">
        {isPending ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Running forecast…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 6, right: 8, left: -6, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                interval="preserveStartEnd"
                stroke="var(--border)"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                stroke="var(--border)"
                width={62}
                tickFormatter={(v: number) => (kind === "cost" ? `${Math.round(v / 1000)}k` : nf(v, 0))}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--muted-foreground)" }}
                formatter={(value: unknown, name: string) =>
                  value == null ? ["—", name] : [fmt(Number(value)), name === "actual" ? "Actual" : "Forecast"]
                }
              />
              <Area
                dataKey="band"
                stroke="none"
                fill={meta.color}
                fillOpacity={0.14}
                isAnimationActive={false}
                name="Confidence"
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke={meta.color}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke={meta.color}
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={{ r: 2 }}
                connectNulls
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

export function SyncedCharts({ unitIds }: { unitIds: string[] }) {
  const twin = useTwin();
  const show = (k: ChartKind) =>
    twin.metricMode === "both" ||
    k === "cost" ||
    (twin.metricMode === "electricity" && k === "electricity") ||
    (twin.metricMode === "water" && k === "water");

  return (
    <div className="grid gap-3 xl:grid-cols-3">
      {show("electricity") ? <ForecastChart kind="electricity" unitIds={unitIds} /> : null}
      {show("water") ? <ForecastChart kind="water" unitIds={unitIds} /> : null}
      {show("cost") ? <ForecastChart kind="cost" unitIds={unitIds} /> : null}
    </div>
  );
}
