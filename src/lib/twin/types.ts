// Domain model mirrors the existing smart-metering hierarchy:
// Rusun -> Tower -> Floor -> Unit -> Meter -> Timestamp -> Electricity / Water

export type MetricMode = "electricity" | "water" | "both";
export type HeatmapDimension = "electricity" | "water" | "cost" | "anomaly";
export type Granularity = "daily" | "weekly" | "monthly";

export type EfficiencyCategory =
  | "sangat-hemat"
  | "hemat"
  | "wajar"
  | "cukup-boros"
  | "sangat-boros"
  | "no-data";

export interface Rusun {
  id: string;
  name: string;
  code: string;
  towerIds: string[];
}

export interface Tower {
  id: string;
  rusunId: string;
  name: string;
  code: string;
  floors: number;
  unitsPerFloor: number;
}

export interface Unit {
  id: string;
  towerId: string;
  floor: number;
  slot: number; // 1..6 position on the floor plan
  code: string; // e.g. A-1003
  type: string; // 36 m2 / 45 m2
  area: number;
  residents: number;
}

export interface Resident {
  name: string;
  jabatan: string;
  unitOrganisasi: string;
  satuanKerja: string;
}

export interface DailyReading {
  date: string; // yyyy-MM-dd
  electricity: number; // kWh
  water: number; // m3
}

export interface IntervalReading {
  timestamp: string; // HH:mm
  electricity: number; // kWh per 5 minutes
  water: number; // m3 per 5 minutes
}

export interface ForecastPoint {
  date: string;
  value: number;
  lower: number;
  upper: number;
}

export interface ForecastResult {
  history: { date: string; value: number }[];
  forecast: ForecastPoint[];
  horizonDays: number;
  confidence: number; // 0..1
  model: string;
}

export interface AnomalyRecord {
  id: string;
  unitId: string;
  unitCode: string;
  towerId: string;
  floor: number;
  timestamp: string;
  metric: "electricity" | "water";
  actual: number;
  expected: number;
  sigma: number;
  severity: "normal" | "warning" | "anomaly";
}

export interface UnitSummary {
  unit: Unit;
  totalElectricity: number;
  totalWater: number;
  avgElectricity: number;
  avgWater: number;
  cost: number;
  electricityCategory: EfficiencyCategory;
  waterCategory: EfficiencyCategory;
  maxSigma: number;
}
