import { CalendarDays, Building2, Download, Droplets, RefreshCw, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RUSUN_LIST, monthLabel } from "@/lib/twin/data";
import { MONTH_OPTIONS, useTwin } from "@/lib/twin/store";
import { exportScopeCsv } from "@/lib/twin/export";
import { cn } from "@/lib/utils";

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const twin = useTwin();

  const modes = [
    { id: "electricity", label: "Electricity", icon: Zap },
    { id: "water", label: "Water", icon: Droplets },
    { id: "both", label: "Both", icon: null },
  ] as const;

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/80 px-6 py-3 backdrop-blur">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={twin.rusunId} onValueChange={twin.setRusunId}>
          <SelectTrigger className="h-9 w-[168px] bg-card">
            <Building2 className="size-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RUSUN_LIST.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={twin.monthKey} onValueChange={twin.setMonthKey}>
          <SelectTrigger className="h-9 w-[168px] bg-card">
            <CalendarDays className="size-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_OPTIONS.map((m) => (
              <SelectItem key={m} value={m}>
                {monthLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => twin.setMetricMode(m.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground",
                twin.metricMode === m.id && "bg-secondary text-foreground",
              )}
            >
              {m.icon ? (
                <m.icon className={cn("size-3.5", m.id === "water" ? "text-water" : "text-elec")} />
              ) : null}
              {m.label}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-9 bg-card"
          onClick={() => {
            exportScopeCsv(twin.rusunId, twin.monthKey, twin.towerId);
            toast.success("Laporan CSV diunduh");
          }}
        >
          <Download className="size-4" /> Export Laporan
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 bg-card"
          onClick={() => {
            twin.refresh();
            toast.success("Data refreshed");
          }}
        >
          <RefreshCw className="size-4" /> Refresh Data
        </Button>
      </div>
    </header>
  );
}
