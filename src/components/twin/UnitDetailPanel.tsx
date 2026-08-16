import { useQuery } from "@tanstack/react-query";
import { Activity, CalendarRange, Clock, Droplets, Wallet, Zap, X } from "lucide-react";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABEL, CATEGORY_TOKEN } from "@/lib/twin/config";
import {
  getTower,
  getUnitIntervalSeries,
  getUnitResidents,
  getUnitSeries,
  getUnitSummary,
} from "@/lib/twin/data";
import { forecastUnitNextDay } from "@/lib/twin/forecast";
import { dayOf, nf, rp } from "@/lib/twin/format";
import { useTwin } from "@/lib/twin/store";
import { cn } from "@/lib/utils";

type View = "5min" | "daily" | "monthly";

export function UnitDetailPanel() {
  const twin = useTwin();
  const [view, setView] = useState<View>("daily");
  const summary = twin.unitId ? getUnitSummary(twin.unitId, twin.monthKey, twin.tariff) : null;

  const forecast = useQuery({
    queryKey: ["unit-forecast", twin.unitId, twin.monthKey],
    queryFn: () => forecastUnitNextDay(twin.unitId!, twin.monthKey),
    enabled: !!twin.unitId,
  });

  if (!summary) {
    return (
      <section className="panel flex min-h-[220px] flex-col items-center justify-center gap-2 p-6 text-center">
        <Activity className="size-5 text-muted-foreground" />
        <p className="text-sm font-medium">No unit selected</p>
        <p className="max-w-[260px] text-xs text-muted-foreground">
          Pilih unit di model 3D, floor plan, atau daftar unit — semua representasi akan sinkron.
        </p>
      </section>
    );
  }

  const { unit } = summary;
  const tower = getTower(unit.towerId);
  const residents = getUnitResidents(unit.id);
  const daily = getUnitSeries(unit.id, twin.monthKey);
  const lastDate = daily[daily.length - 1]?.date ?? `${twin.monthKey}-01`;
  const interval = view === "5min" ? getUnitIntervalSeries(unit.id, lastDate) : [];

  const chartData =
    view === "5min"
      ? interval.filter((_, i) => i % 3 === 0).map((d) => ({ label: d.timestamp, electricity: d.electricity, water: d.water }))
      : view === "daily"
        ? daily.map((d) => ({ label: String(dayOf(d.date)), electricity: d.electricity, water: d.water }))
        : Array.from({ length: 4 }, (_, w) => {
            const slice = daily.slice(w * 7, w * 7 + 7);
            return {
              label: `W${w + 1}`,
              electricity: +slice.reduce((a, d) => a + d.electricity, 0).toFixed(1),
              water: +slice.reduce((a, d) => a + d.water, 0).toFixed(2),
            };
          });

  const todayElec = daily[daily.length - 1]?.electricity ?? 0;
  const prevElec = daily[daily.length - 2]?.electricity ?? todayElec;
  const todayWater = daily[daily.length - 1]?.water ?? 0;

  return (
    <section className="panel flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">Unit {unit.code}</h3>
            <Badge
              variant="outline"
              className="border-transparent text-[10px]"
              style={{
                backgroundColor: `var(--${CATEGORY_TOKEN[summary.electricityCategory]})`,
                color: "oklch(0.18 0.02 264)",
              }}
            >
              {CATEGORY_LABEL[summary.electricityCategory]}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {tower?.name} · Floor {unit.floor} · Unit {unit.slot} · {unit.type} · {unit.residents}{" "}
            residents · updated {twin.refreshedAt}
          </p>
        </div>
        <Button size="icon" variant="ghost" className="size-7" onClick={() => twin.selectUnit(null)}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Mini label="Total Electricity" value={`${nf(summary.totalElectricity)} kWh`} icon={Zap} tone="elec" />
        <Mini label="Total Water" value={`${nf(summary.totalWater, 2)} m³`} icon={Droplets} tone="water" />
        <Mini label="Electricity Cost" value={rp(summary.cost)} icon={Wallet} tone="cost" />
        <Mini
          label="Avg / Day"
          value={`${nf(summary.avgElectricity, 2)} kWh · ${nf(summary.avgWater, 2)} m³`}
          icon={Clock}
          tone="muted"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <Trend label="Electricity Today" value={`${nf(todayElec, 2)} kWh`} delta={todayElec - prevElec} />
        <Trend label="Water Today" value={`${nf(todayWater, 2)} m³`} delta={0} />
        <Trend
          label="Forecast Tomorrow"
          value={forecast.data?.electricity ? `${nf(forecast.data.electricity.value, 2)} kWh` : "—"}
          delta={
            forecast.data?.electricity ? forecast.data.electricity.value - todayElec : 0
          }
        />
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-border bg-background/40 p-1 text-xs">
        {(
          [
            ["5min", "View 5-Minute Data"],
            ["daily", "View Daily Data"],
            ["monthly", "View Monthly Data"],
          ] as [View, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={cn(
              "rounded-md px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground",
              view === id && "bg-secondary text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="h-[190px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              stroke="var(--border)"
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="electricity"
              stroke="var(--elec)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="water"
              stroke="var(--water)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
          Residents ({residents.length})
        </p>
        <div className="overflow-hidden rounded-lg border border-border/70">
          <table className="w-full text-[11px]">
            <thead className="bg-background/50 text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5 text-left font-medium">Name</th>
                <th className="px-2 py-1.5 text-left font-medium">Jabatan</th>
                <th className="px-2 py-1.5 text-left font-medium">Unit Organisasi</th>
                <th className="px-2 py-1.5 text-left font-medium">Satuan Kerja</th>
              </tr>
            </thead>
            <tbody>
              {residents.map((r, i) => (
                <tr key={i} className="border-t border-border/60">
                  <td className="px-2 py-1.5">{r.name}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{r.jabatan}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{r.unitOrganisasi}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{r.satuanKerja}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Mini({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Zap;
  tone: "elec" | "water" | "cost" | "muted";
}) {
  const toneClass = {
    elec: "text-elec",
    water: "text-water",
    cost: "text-cost",
    muted: "text-primary",
  }[tone];
  return (
    <div className="rounded-lg border border-border/70 bg-background/40 px-3 py-2">
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className={cn("size-3", toneClass)} /> {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

function Trend({ label, value, delta }: { label: string; value: string; delta: number }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold">
        {value}
        {delta !== 0 ? (
          <span className={cn("text-[10px]", delta > 0 ? "text-warn" : "text-ok")}>
            {delta > 0 ? "▲" : "▼"} {nf(Math.abs(delta), 2)}
          </span>
        ) : null}
      </p>
    </div>
  );
}

export function UnitDetailQuickInfo() {
  return (
    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <CalendarRange className="size-3.5" /> Interaksi: 3D ↔ floor plan ↔ unit list tersinkron.
    </p>
  );
}
