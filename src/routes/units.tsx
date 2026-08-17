import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/twin/PageShell";
import { TowerSelector } from "@/components/twin/TowerSelector";
import { UnitDetailPanel } from "@/components/twin/UnitDetailPanel";
import { UnitList } from "@/components/twin/UnitList";

export const Route = createFileRoute("/units")({
  head: () => ({
    meta: [
      { title: "Unit Detail — Rusun ASN IKN" },
      {
        name: "description",
        content:
          "Unit-level smart meter detail: 5-minute interval readings, daily history, residents and forecast.",
      },
      { property: "og:title", content: "Unit Detail — Rusun ASN IKN" },
      {
        property: "og:description",
        content: "High-resolution smart metering telemetry per apartment unit.",
      },
    ],
  }),
  component: UnitsPage,
});

function UnitsPage() {
  return (
    <PageShell title="Units" subtitle="High-resolution smart meter telemetry per unit">
      <TowerSelector />
      <div className="grid gap-3 xl:grid-cols-[1fr_1.2fr]">
        <UnitList floorOnly={false} />
        <UnitDetailPanel />
      </div>
    </PageShell>
  );
}
