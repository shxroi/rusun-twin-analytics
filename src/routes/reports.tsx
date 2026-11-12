import { createFileRoute } from "@tanstack/react-router";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/twin/PageShell";
import { ScopeStatCards } from "@/components/twin/StatCards";
import { TowerSelector } from "@/components/twin/TowerSelector";
import { UnitList } from "@/components/twin/UnitList";
import { monthLabel } from "@/lib/twin/data";
import { exportRows, exportScopeCsv } from "@/lib/twin/export";
import { nf, rp } from "@/lib/twin/format";
import { useCatalogUnits, useSummary, useUnitSummaries } from "@/lib/twin/server";
import { useTwin } from "@/lib/twin/store";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Export — Rusun ASN IKN" },
      {
        name: "description",
        content:
          "Download monthly smart metering reports per rusun or tower as CSV, including cost and efficiency categories.",
      },
      { property: "og:title", content: "Reports & Export — Rusun ASN IKN" },
      {
        property: "og:description",
        content: "Monthly consumption and billing exports for Rusun ASN IKN.",
      },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const twin = useTwin();
  const rusun = twin.rusunId.replace(/\D/g, "") || "3";
  const { units } = useCatalogUnits(rusun);
  const { data } = useSummary(rusun, twin.monthKey);
  const { summaries } = useUnitSummaries(rusun, twin.monthKey, units);

  const comparison = (data?.towers ?? []).map((t) => ({
    towerId: t.towerId,
    name: t.name,
    electricity: t.electricity,
    water: t.water,
  }));
  const towerName = data?.towers.find((t) => t.towerId === twin.towerId)?.name;
  const totals = data?.totals;
  const cost = totals ? totals.electricity * twin.tariff.electricityRpPerKwh : 0;

  const exportTowerSummary = () => {
    exportRows(`tower-summary-${rusun}-${twin.monthKey}.csv`, [
      ["tower", "electricity_kwh", "water_m3"],
      ...comparison.map((c) => [c.name, c.electricity.toFixed(2), c.water.toFixed(3)]),
    ]);
    toast.success("Tower summary exported");
  };

  return (
    <PageShell title="Reports" subtitle={`Period ${monthLabel(twin.monthKey)}`}>
      <ScopeStatCards />
      <section className="panel flex flex-wrap items-center gap-2 p-4">
        <Button
          size="sm"
          onClick={() => {
            exportScopeCsv(twin.monthKey, summaries, towerName, twin.tariff);
            toast.success("Rusun unit report exported");
          }}
        >
          <Download className="size-4" /> All units (rusun)
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            const towerUnits = summaries.filter((s) => s.unit.towerId === twin.towerId);
            exportScopeCsv(twin.monthKey, towerUnits, towerName, twin.tariff);
            toast.success(`${towerName ?? "Tower"} report exported`);
          }}
        >
          <Download className="size-4" /> {towerName ?? "Tower"} units
        </Button>
        <Button size="sm" variant="outline" onClick={exportTowerSummary}>
          <FileSpreadsheet className="size-4" /> Tower summary
        </Button>
        <p className="ml-auto text-[11px] text-muted-foreground">
          Total {totals ? nf(totals.electricity) : "…"} kWh · {totals ? nf(totals.water, 0) : "…"}{" "}
          m³ · {totals ? rp(cost) : "…"}
        </p>
      </section>
      <TowerSelector />
      <UnitList floorOnly={false} />
    </PageShell>
  );
}
