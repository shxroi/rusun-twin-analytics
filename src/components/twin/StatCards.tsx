import { Building2, DollarSign, Droplets, Home, TrendingUp, Users, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { nf, rp } from "@/lib/twin/format";
import type { ScopeTotals } from "@/lib/twin/data";
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
  unit?: string;
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
        {unit ? <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span> : null}
      </p>
    </div>
  );
}

export function ScopeStatCards({ totals, peak }: { totals: ScopeTotals; peak?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard label="Total Electricity" value={nf(totals.electricity)} unit="kWh" icon={Zap} tone="elec" />
      <StatCard label="Total Water" value={nf(totals.water, 0)} unit="m³" icon={Droplets} tone="water" />
      <StatCard label="Total Cost" value={rp(totals.cost)} icon={DollarSign} tone="cost" />
      {peak ? (
        <StatCard
          label="Peak Day"
          value={totals.peakDay ? String(Number(totals.peakDay.date.slice(-2))) : "—"}
          unit={totals.peakDay ? new Date(`${totals.peakDay.date}T00:00:00`).toLocaleDateString("en-GB", { month: "short" }) : undefined}
          icon={TrendingUp}
        />
      ) : (
        <StatCard label="Towers" value={String(totals.towers)} icon={Building2} />
      )}
      <StatCard label="Units" value={String(totals.units)} icon={Home} />
      <StatCard label="Residents" value={String(totals.residents)} icon={Users} />
    </div>
  );
}
