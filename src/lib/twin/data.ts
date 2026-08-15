import {
  DEFAULT_TARIFF,
  categoryFor,
  electricityCost,
  type TariffConfig,
} from "./config";
import type {
  AnomalyRecord,
  DailyReading,
  IntervalReading,
  Resident,
  Rusun,
  Tower,
  Unit,
  UnitSummary,
} from "./types";

/**
 * MOCK DATA ACCESS LAYER.
 * Every function here is synchronous-but-pure and shaped like the future API
 * response, so swapping this module for Supabase/PostgreSQL queries or a REST
 * client only requires making the callers async.
 */

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: string) {
  let a = hash(seed);
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^(t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TOWER_LETTERS = ["A", "B", "C", "D", "E", "F"];
export const FLOORS_PER_TOWER = 10;
export const UNITS_PER_FLOOR = 6;

export const RUSUN_LIST: Rusun[] = [
  {
    id: "asn3",
    name: "Rusun ASN 3",
    code: "ASN3",
    towerIds: TOWER_LETTERS.map((l) => `asn3-t${l.toLowerCase()}`),
  },
  {
    id: "asn1",
    name: "Rusun ASN 1",
    code: "ASN1",
    towerIds: TOWER_LETTERS.slice(0, 4).map((l) => `asn1-t${l.toLowerCase()}`),
  },
];

export const TOWERS: Tower[] = RUSUN_LIST.flatMap((r) =>
  r.towerIds.map((id, i) => ({
    id,
    rusunId: r.id,
    name: `Tower ${TOWER_LETTERS[i]!}`,
    code: `${r.code}-T${TOWER_LETTERS[i]!}`,
    floors: FLOORS_PER_TOWER,
    unitsPerFloor: UNITS_PER_FLOOR,
  })),
);

const UNIT_TYPES = ["36 m²", "36 m²", "45 m²", "36 m²", "45 m²", "36 m²"];

export const UNITS: Unit[] = TOWERS.flatMap((t) => {
  const letter = t.code.slice(-1);
  const out: Unit[] = [];
  for (let floor = 1; floor <= t.floors; floor++) {
    for (let slot = 1; slot <= t.unitsPerFloor; slot++) {
      const r = rng(`${t.id}-${floor}-${slot}`);
      out.push({
        id: `${t.id}-${floor}-${slot}`,
        towerId: t.id,
        floor,
        slot,
        code: `${letter}-${floor * 100 + slot}`,
        type: UNIT_TYPES[slot - 1]!,
        area: UNIT_TYPES[slot - 1]! === "45 m²" ? 45 : 36,
        residents: 1 + Math.floor(r() * 4),
      });
    }
  }
  return out;
});

export function getRusun(id: string) {
  return RUSUN_LIST.find((r) => r.id === id) ?? RUSUN_LIST[0];
}
export function getTowers(rusunId: string) {
  return TOWERS.filter((t) => t.rusunId === rusunId);
}
export function getTower(towerId: string) {
  return TOWERS.find((t) => t.id === towerId);
}
export function getUnits(towerId: string, floor?: number) {
  return UNITS.filter((u) => u.towerId === towerId && (floor ? u.floor === floor : true));
}
export function getUnit(unitId: string) {
  return UNITS.find((u) => u.id === unitId);
}
export function getRusunUnits(rusunId: string) {
  const ids = new Set(getTowers(rusunId).map((t) => t.id));
  return UNITS.filter((u) => ids.has(u.towerId));
}

/* ------------------------------------------------------------------ readings */

export function daysInMonth(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number) as [number, number];
  return new Date(y, m, 0).getDate();
}

export function monthLabel(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number) as [number, number];
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

const seriesCache = new Map<string, DailyReading[]>();

/** Daily electricity/water readings for a single unit within a month. */
export function getUnitSeries(unitId: string, monthKey: string): DailyReading[] {
  const key = `${unitId}|${monthKey}`;
  const cached = seriesCache.get(key);
  if (cached) return cached;

  const unit = getUnit(unitId);
  if (!unit) return [];
  const r = rng(key);
  const base = 8 + r() * 14 + unit.residents * 1.6;
  const waterBase = 0.12 + r() * 0.28 + unit.residents * 0.045;
  const n = daysInMonth(monthKey);
  const out: DailyReading[] = [];
  for (let d = 1; d <= n; d++) {
    const date = `${monthKey}-${String(d).padStart(2, "0")}`;
    const weekday = new Date(date).getDay();
    const weekend = weekday === 0 || weekday === 6 ? 1.12 : 1;
    const wave = 1 + 0.09 * Math.sin((d / n) * Math.PI * 2.4);
    const spike = r() > 0.96 ? 1.9 : 1;
    out.push({
      date,
      electricity: +(base * weekend * wave * spike * (0.86 + r() * 0.28)).toFixed(2),
      water: +(waterBase * weekend * (0.7 + r() * 0.7) * (r() > 0.97 ? 3 : 1)).toFixed(3),
    });
  }
  seriesCache.set(key, out);
  return out;
}

/** 5-minute interval readings for a unit on a given date. */
export function getUnitIntervalSeries(unitId: string, date: string): IntervalReading[] {
  const r = rng(`${unitId}|${date}|5m`);
  const daily = getUnitSeries(unitId, date.slice(0, 7)).find((d) => d.date === date);
  const dayKwh = daily?.electricity ?? 12;
  const dayM3 = daily?.water ?? 0.2;
  const out: IntervalReading[] = [];
  const shapes: number[] = [];
  for (let i = 0; i < 288; i++) {
    const hour = i / 12;
    const profile =
      0.35 +
      0.65 * Math.exp(-Math.pow(hour - 7, 2) / 6) +
      0.9 * Math.exp(-Math.pow(hour - 19.5, 2) / 9) +
      0.25 * Math.exp(-Math.pow(hour - 13, 2) / 12);
    shapes.push(profile * (0.75 + r() * 0.5));
  }
  const sum = shapes.reduce((a, b) => a + b, 0);
  const waterBurstIdx = new Set([Math.floor(r() * 288), Math.floor(r() * 288)]);
  for (let i = 0; i < 288; i++) {
    const h = String(Math.floor(i / 12)).padStart(2, "0");
    const m = String((i % 12) * 5).padStart(2, "0");
    out.push({
      timestamp: `${h}:${m}`,
      electricity: +((shapes[i]! / sum) * dayKwh).toFixed(4),
      water: +(waterBurstIdx.has(i) ? dayM3 * 0.5 : (dayM3 * 0.5) / 286).toFixed(4),
    });
  }
  return out;
}

/* --------------------------------------------------------------- aggregation */

export function sumSeries(series: DailyReading[]) {
  return series.reduce(
    (acc, d) => ({
      electricity: acc.electricity + d.electricity,
      water: acc.water + d.water,
    }),
    { electricity: 0, water: 0 },
  );
}

export function aggregateSeries(unitIds: string[], monthKey: string): DailyReading[] {
  const map = new Map<string, DailyReading>();
  for (const id of unitIds) {
    for (const d of getUnitSeries(id, monthKey)) {
      const cur = map.get(d.date) ?? { date: d.date, electricity: 0, water: 0 };
      cur.electricity += d.electricity;
      cur.water += d.water;
      map.set(d.date, cur);
    }
  }
  return [...map.values()]
    .map((d) => ({ ...d, electricity: +d.electricity.toFixed(2), water: +d.water.toFixed(3) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getUnitSummary(
  unitId: string,
  monthKey: string,
  tariff: TariffConfig = DEFAULT_TARIFF,
): UnitSummary | null {
  const unit = getUnit(unitId);
  if (!unit) return null;
  const series = getUnitSeries(unitId, monthKey);
  const total = sumSeries(series);
  const n = series.length || 1;
  const avgElectricity = total.electricity / n;
  const avgWater = total.water / n;
  const mean = avgElectricity;
  const sd =
    Math.sqrt(series.reduce((a, d) => a + Math.pow(d.electricity - mean, 2), 0) / n) || 1;
  const maxSigma = Math.max(...series.map((d) => (d.electricity - mean) / sd), 0);
  return {
    unit,
    totalElectricity: total.electricity,
    totalWater: total.water,
    avgElectricity,
    avgWater,
    cost: electricityCost(total.electricity, tariff),
    electricityCategory: categoryFor(avgElectricity, "electricity"),
    waterCategory: categoryFor(avgWater, "water"),
    maxSigma,
  };
}

export function getFloorSummaries(towerId: string, floor: number, monthKey: string) {
  return getUnits(towerId, floor)
    .map((u) => getUnitSummary(u.id, monthKey)!)
    .filter(Boolean);
}

export interface ScopeTotals {
  electricity: number;
  water: number;
  cost: number;
  towers: number;
  units: number;
  residents: number;
  peakDay: { date: string; electricity: number } | null;
}

export function getScopeTotals(
  rusunId: string,
  monthKey: string,
  towerId?: string,
  tariff: TariffConfig = DEFAULT_TARIFF,
): ScopeTotals {
  const towers = towerId ? [getTower(towerId)!] : getTowers(rusunId);
  const units = towerId ? getUnits(towerId) : getRusunUnits(rusunId);
  const series = aggregateSeries(
    units.map((u) => u.id),
    monthKey,
  );
  const total = sumSeries(series);
  const peakDay = series.reduce<{ date: string; electricity: number } | null>(
    (best, d) => (!best || d.electricity > best.electricity ? { date: d.date, electricity: d.electricity } : best),
    null,
  );
  return {
    electricity: total.electricity,
    water: total.water,
    cost: electricityCost(total.electricity, tariff),
    towers: towers.length,
    units: units.length,
    residents: units.reduce((a, u) => a + u.residents, 0),
    peakDay,
  };
}

export function getTowerComparison(rusunId: string, monthKey: string) {
  return getTowers(rusunId).map((t) => {
    const series = aggregateSeries(
      getUnits(t.id).map((u) => u.id),
      monthKey,
    );
    const total = sumSeries(series);
    return {
      towerId: t.id,
      name: t.name,
      electricity: +total.electricity.toFixed(1),
      water: +total.water.toFixed(1),
    };
  });
}

/* ----------------------------------------------------------------- residents */

const FIRST = ["Andi", "Budi", "Citra", "Dewi", "Eko", "Fajar", "Gita", "Hendra", "Indah", "Joko"];
const LAST = ["Saputra", "Wijaya", "Pratama", "Nugroho", "Halim", "Kurniawan", "Maulana", "Siregar"];
const JABATAN = ["Analis Kebijakan", "Pranata Komputer", "Auditor Ahli Muda", "Perencana Ahli", "Arsiparis"];
const ORG = ["Direktorat Jenderal Anggaran", "Sekretariat Jenderal", "Badan Otorita IKN", "Inspektorat Jenderal"];
const SATKER = ["Biro Perencanaan", "Pusat Data dan Informasi", "Biro SDM", "Direktorat Pengendalian"];

export function getUnitResidents(unitId: string): Resident[] {
  const unit = getUnit(unitId);
  if (!unit) return [];
  const r = rng(`${unitId}|residents`);
  return Array.from({ length: unit.residents }, () => ({
    name: `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`,
    jabatan: JABATAN[Math.floor(r() * JABATAN.length)]!,
    unitOrganisasi: ORG[Math.floor(r() * ORG.length)]!,
    satuanKerja: SATKER[Math.floor(r() * SATKER.length)]!,
  }));
}

/* ----------------------------------------------------------------- anomalies */

export function detectAnomalies(
  unitIds: string[],
  monthKey: string,
  threshold = 2,
): AnomalyRecord[] {
  const out: AnomalyRecord[] = [];
  for (const id of unitIds) {
    const unit = getUnit(id);
    if (!unit) continue;
    const series = getUnitSeries(id, monthKey);
    if (!series.length) continue;
    const mean = series.reduce((a, d) => a + d.electricity, 0) / series.length;
    const sd =
      Math.sqrt(series.reduce((a, d) => a + Math.pow(d.electricity - mean, 2), 0) / series.length) ||
      1;
    for (const d of series) {
      const sigma = (d.electricity - mean) / sd;
      if (sigma >= threshold) {
        out.push({
          id: `${id}-${d.date}`,
          unitId: id,
          unitCode: unit.code,
          towerId: unit.towerId,
          floor: unit.floor,
          timestamp: `${d.date} 19:35`,
          metric: "electricity",
          actual: +d.electricity.toFixed(2),
          expected: +mean.toFixed(2),
          sigma: +sigma.toFixed(2),
          severity: sigma >= 2.6 ? "anomaly" : "warning",
        });
      }
    }
  }
  return out.sort((a, b) => b.sigma - a.sigma);
}
