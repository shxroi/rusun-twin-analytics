import { CATEGORY_LABEL, type TariffConfig } from "./config";
import type { UnitSummary } from "./types";

function download(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Unit-level CSV export. Takes pre-joined UnitSummary rows (real Supabase data via
 * useUnitSummaries) plus the tower name, so it no longer depends on the mock layer.
 */
export function exportScopeCsv(
  monthKey: string,
  rows: UnitSummary[],
  towerName: string | undefined,
  tariff: TariffConfig,
  filename?: string,
) {
  const out: (string | number)[][] = [
    [
      "tower",
      "floor",
      "unit",
      "type",
      "electricity_kwh",
      "water_m3",
      "avg_kwh_day",
      "avg_m3_day",
      "cost_rp",
      "kategori_listrik",
      "kategori_air",
    ],
  ];
  for (const s of rows) {
    out.push([
      towerName ?? s.unit.towerId,
      s.unit.floor,
      s.unit.code,
      s.unit.type,
      s.totalElectricity.toFixed(2),
      s.totalWater.toFixed(3),
      s.avgElectricity.toFixed(2),
      s.avgWater.toFixed(3),
      Math.round(s.cost),
      CATEGORY_LABEL[s.electricityCategory],
      CATEGORY_LABEL[s.waterCategory],
    ]);
  }
  const name = filename ?? `smart-metering-${towerName ?? "rusun"}-${monthKey}.csv`;
  download(name, out);
}

export function exportRows(filename: string, rows: (string | number)[][]) {
  download(filename, rows);
}
