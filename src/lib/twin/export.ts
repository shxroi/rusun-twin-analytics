import { DEFAULT_TARIFF, CATEGORY_LABEL, type TariffConfig } from "./config";
import {
  getRusun,
  getRusunUnits,
  getTower,
  getUnitSummary,
  getUnits,
} from "./data";

function download(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Unit-level CSV export for a rusun or a single tower. */
export function exportScopeCsv(
  rusunId: string,
  monthKey: string,
  towerId?: string,
  tariff: TariffConfig = DEFAULT_TARIFF,
) {
  const units = towerId ? getUnits(towerId) : getRusunUnits(rusunId);
  const rows: (string | number)[][] = [
    [
      "rusun",
      "tower",
      "floor",
      "unit",
      "type",
      "residents",
      "electricity_kwh",
      "water_m3",
      "avg_kwh_day",
      "avg_m3_day",
      "cost_rp",
      "kategori_listrik",
      "kategori_air",
    ],
  ];
  for (const u of units) {
    const s = getUnitSummary(u.id, monthKey, tariff);
    if (!s) continue;
    rows.push([
      getRusun(rusunId).name,
      getTower(u.towerId)?.name ?? u.towerId,
      u.floor,
      u.code,
      u.type,
      u.residents,
      s.totalElectricity.toFixed(2),
      s.totalWater.toFixed(3),
      s.avgElectricity.toFixed(2),
      s.avgWater.toFixed(3),
      Math.round(s.cost),
      CATEGORY_LABEL[s.electricityCategory],
      CATEGORY_LABEL[s.waterCategory],
    ]);
  }
  download(`smart-metering-${towerId ?? rusunId}-${monthKey}.csv`, rows);
}

export function exportRows(filename: string, rows: (string | number)[][]) {
  download(filename, rows);
}
