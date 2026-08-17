import { createFileRoute } from "@tanstack/react-router";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/twin/PageShell";
import { ScopeStatCards } from "@/components/twin/StatCards";
import { TowerSelector } from "@/components/twin/TowerSelector";
import { UnitList } from "@/components/twin/UnitList";
import { getScopeTotals, getTower, getTowerComparison, monthLabel } from "@/lib/twin/data";
import { exportRows, exportScopeCsv } from "@/lib/twin/export";
import { nf, rp } from "@/lib/twin/format";
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
  const totals = getScopeTotals(twin.rusunId, twin.monthKey, undefined, twin.tariff);
  const comparison = getTowerComparison(twin.rusunId, twin.monthKey);
  const tower = getTower(twin.towerId);

  const exportTowerSummary = () => {
    exportRows(`tower-summary-${twin.rusunId}-${twin.monthKey}.csv`, [
      ["tower", "electricity_kwh", "water_m3"],
      ...comparison.map((c) => [c.name, c.electricity.toFixed(2), c.water.toFixed(3)]),
    ]);
    toast.success("Tower summary exported");
  };

  return (
    <PageShell title="Reports" subtitle={`Period ${monthLabel(twin.monthKey)}`}>
      <ScopeStatCards totals={totals} />
      <section className="panel flex flex-wrap items-center gap-2 p-4">
        <Button
          size="sm"
          onClick={() => {
            exportScopeCsv(twin.rusunId, twin.monthKey, undefined, twin.tariff);
            toast.success("Rusun unit report exported");
          }}
        >
          <Download className="size-4" /> All units (rusun)
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            exportScopeCsv(twin.rusunId, twin.monthKey, twin.towerId, twin.tariff);
            toast.success(`${tower?.name} report exported`);
          }}
        >
          <Download className="size-4" /> {tower?.name} units
        </Button>
        <Button size="sm" variant="outline" onClick={exportTowerSummary}>
          <FileSpreadsheet className="size-4" /> Tower summary
        </Button>
        <p className="ml-auto text-[11px] text-muted-foreground">
          Total {nf(totals.electricity)} kWh · {nf(totals.water, 0)} m³ · {rp(totals.cost)}
        </p>
      </section>
      <TowerSelector />
      <UnitList floorOnly={false} />
    </PageShell>
  );
}
