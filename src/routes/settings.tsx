import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageShell } from "@/components/twin/PageShell";
import { TwinStatusCard } from "@/components/twin/AnalyticsCards";
import { CATEGORY_LABEL, CATEGORY_TOKEN, DEFAULT_TARIFF, ELECTRICITY_THRESHOLDS, WATER_THRESHOLDS } from "@/lib/twin/config";
import { useTwin } from "@/lib/twin/store";
import type { EfficiencyCategory } from "@/lib/twin/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Rusun ASN IKN Digital Twin" },
      {
        name: "description",
        content:
          "Configure electricity and water tariffs, efficiency thresholds and forecast model settings.",
      },
      { property: "og:title", content: "Settings — Rusun ASN IKN Digital Twin" },
      {
        property: "og:description",
        content: "Tariff and threshold configuration for consumption cost estimation.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const twin = useTwin();
  const [elec, setElec] = useState(String(twin.tariff.electricityPerKwh));
  const [water, setWater] = useState(String(twin.tariff.waterPerM3));

  const save = () => {
    twin.setTariff({
      ...twin.tariff,
      electricityPerKwh: Number(elec) || DEFAULT_TARIFF.electricityPerKwh,
      waterPerM3: Number(water) || DEFAULT_TARIFF.waterPerM3,
    });
    toast.success("Tariff configuration saved");
  };

  return (
    <PageShell title="Settings" subtitle="Tariff, thresholds & model configuration">
      <div className="grid gap-3 xl:grid-cols-[1fr_1fr]">
        <section className="panel space-y-3 p-4">
          <h3 className="text-sm font-semibold">Tariff Configuration</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Electricity (Rp / kWh)</Label>
              <Input value={elec} onChange={(e) => setElec(e.target.value)} inputMode="decimal" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Water (Rp / m³)</Label>
              <Input value={water} onChange={(e) => setWater(e.target.value)} inputMode="decimal" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save}>
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                twin.setTariff(DEFAULT_TARIFF);
                setElec(String(DEFAULT_TARIFF.electricityPerKwh));
                setWater(String(DEFAULT_TARIFF.waterPerM3));
                toast.info("Reset to default tariff");
              }}
            >
              Reset default
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Tariff tersimpan di perangkat ini dan langsung dipakai untuk semua estimasi biaya.
          </p>
        </section>

        <TwinStatusCard />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <ThresholdCard
          title="Electricity Efficiency Thresholds"
          unit="kWh / day / unit"
          rows={ELECTRICITY_THRESHOLDS}
        />
        <ThresholdCard
          title="Water Efficiency Thresholds"
          unit="m³ / day / unit"
          rows={WATER_THRESHOLDS}
        />
      </div>
    </PageShell>
  );
}

function ThresholdCard({
  title,
  unit,
  rows,
}: {
  title: string;
  unit: string;
  rows: { max: number; category: EfficiencyCategory }[];
}) {
  return (
    <section className="panel p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-[11px] text-muted-foreground">{unit}</p>
      <div className="mt-3 space-y-1.5 text-xs">
        {rows.map((r) => (
          <div key={r.category} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span
                className="size-2.5 rounded-sm"
                style={{ backgroundColor: `var(--${CATEGORY_TOKEN[r.category]})` }}
              />
              {CATEGORY_LABEL[r.category]}
            </span>
            <span className="font-medium">
              {Number.isFinite(r.max) ? `< ${r.max}` : "≥ max"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
