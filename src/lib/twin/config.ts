import type { EfficiencyCategory } from "./types";

/**
 * Tariff + threshold configuration. Kept out of UI components so it can be
 * replaced by values coming from the backend / settings table later on.
 */
export interface TariffConfig {
  electricityRpPerKwh: number;
  waterRpPerM3: number;
  currency: string;
}

export const DEFAULT_TARIFF: TariffConfig = {
  electricityRpPerKwh: 1605,
  waterRpPerM3: 3500,
  currency: "Rp",
};

export const TARIFF_STORAGE_KEY = "rusun-twin-tariff";

/** Average daily kWh per unit thresholds (upper bound of each category). */
export const ELECTRICITY_THRESHOLDS: { max: number; category: EfficiencyCategory }[] = [
  { max: 10, category: "sangat-hemat" },
  { max: 15, category: "hemat" },
  { max: 19, category: "wajar" },
  { max: 23, category: "cukup-boros" },
  { max: Infinity, category: "sangat-boros" },
];

/** Average daily m3 per unit thresholds. */
export const WATER_THRESHOLDS: { max: number; category: EfficiencyCategory }[] = [
  { max: 0.22, category: "sangat-hemat" },
  { max: 0.32, category: "hemat" },
  { max: 0.45, category: "wajar" },
  { max: 0.7, category: "cukup-boros" },
  { max: Infinity, category: "sangat-boros" },
];

export const CATEGORY_LABEL: Record<EfficiencyCategory, string> = {
  "sangat-hemat": "Sangat Hemat",
  hemat: "Hemat",
  wajar: "Wajar",
  "cukup-boros": "Cukup Boros",
  "sangat-boros": "Sangat Boros",
  "no-data": "No Data",
};

/** Semantic token names (defined in src/styles.css) per category. */
export const CATEGORY_TOKEN: Record<EfficiencyCategory, string> = {
  "sangat-hemat": "cat-1",
  hemat: "cat-2",
  wajar: "cat-3",
  "cukup-boros": "cat-4",
  "sangat-boros": "cat-5",
  "no-data": "cat-none",
};

export function categoryFor(
  value: number | null | undefined,
  metric: "electricity" | "water",
): EfficiencyCategory {
  if (value === null || value === undefined || Number.isNaN(value)) return "no-data";
  const table = metric === "electricity" ? ELECTRICITY_THRESHOLDS : WATER_THRESHOLDS;
  return table.find((t) => value <= t.max)!.category;
}

export function electricityCost(kwh: number, tariff: TariffConfig = DEFAULT_TARIFF) {
  return kwh * tariff.electricityRpPerKwh;
}

export function waterCost(m3: number, tariff: TariffConfig = DEFAULT_TARIFF) {
  return m3 * tariff.waterRpPerM3;
}
