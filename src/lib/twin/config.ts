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
  { max: 17.81, category: "hemat" },
  { max: 21.46, category: "normal" },
  { max: 25.11, category: "boros" },
  { max: Infinity, category: "sangat-boros" },
];

/** Average daily m3 per unit thresholds. */
export const WATER_THRESHOLDS: { max: number; category: EfficiencyCategory }[] = [
  { max: 0.48, category: "hemat" },
  { max: 0.73, category: "normal" },
  { max: Infinity, category: "boros" },
];

export const CATEGORY_LABEL: Record<EfficiencyCategory, string> = {
  hemat: "Hemat",
  normal: "Normal",
  boros: "Boros",
  "sangat-boros": "Sangat Boros",
  "no-data": "No Data",
};

/** Semantic token names (defined in src/styles.css) per category. */
export const CATEGORY_TOKEN: Record<EfficiencyCategory, string> = {
  hemat: "cat-1",
  normal: "cat-2",
  boros: "cat-3",
  "sangat-boros": "cat-4",
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
