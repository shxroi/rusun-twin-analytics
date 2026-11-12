import { Building2, DollarSign, Droplets, Home, TrendingUp, Users, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useTwin } from "@/lib/twin/store";
import { useSummary } from "@/lib/twin/server";
import { nf, rp } from "@/lib/twin/format";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  unit,
  icon: Icon,
  tone = "muted",
}: {
  label: string;
  value: string;
  unit?: string | undefined;
  icon: LucideIcon;
  tone?: "elec" | "water" | "cost" | "muted";
}) {
  const toneClass = {
    elec: "text-elec bg-elec/12",
    water: "text-water bg-water/12",
    cost: "text-cost bg-cost/12",
    muted: "text-primary bg-primary/12",
  }[tone];

  return (
    <div className="panel px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className={cn("flex size-6 items-center justify-center rounded-md", toneClass)}>
          <Icon className="size-3.5" />
        </span>
      </div>
      <p className="mt-1.5 text-xl font-semibold tracking-tight">
        {value}
        {unit ? (
          <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>
        ) : null}
      </p>
    </div>
  );
}

/**
 * Scope totals from the real Supabase readings via the intelligence API.
 * Residents are not in the internal database (sensitive data), so that card is
 * omitted rather than showing a synthetic number.
 */
export function ScopeStatCards({ towerId, floor }: { towerId?: string; floor?: number }) {
  const twin = useTwin();
  const rusun = twin.rusunId.replace(/\D/g, "") || "3";
  const opts: { towerId?: string; floor?: number } = {};
  if (towerId) opts.towerId = towerId;
  if (floor !== undefined) opts.floor = floor;
  const { data, isPending, isError } = useSummary(rusun, twin.monthKey, opts);

  const totals = data?.totals;
  const cost = totals ? totals.electricity * twin.tariff.electricityRpPerKwh : 0;
  const peakUnit = totals?.peakUnit;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
      <StatCard
        label="Total Electricity"
        value={totals ? nf(totals.electricity) : isError ? "Error" : "…"}
        unit="kWh"
        icon={Zap}
        tone="elec"
      />
      <StatCard
        label="Total Water"
        value={totals ? nf(totals.water, 0) : isError ? "Error" : "…"}
        unit="m³"
        icon={Droplets}
        tone="water"
      />
      <StatCard label="Total Cost" value={totals ? rp(cost) : "…"} icon={DollarSign} tone="cost" />
      <StatCard label="Peak Unit" value={peakUnit ?? (isPending ? "…" : "—")} icon={TrendingUp} />
      <StatCard
        label={floor !== undefined ? "Units on Floor" : "Units"}
        value={totals ? String(totals.units) : "…"}
        icon={Home}
      />
      {floor === undefined ? (
        <StatCard label="Towers" value={totals ? String(totals.towers) : "…"} icon={Building2} />
      ) : null}
    </div>
  );
}
