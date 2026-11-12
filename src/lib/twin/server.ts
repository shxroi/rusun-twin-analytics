import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useTwinCatalog } from "./api";
import { categoryFor, DEFAULT_TARIFF, type TariffConfig } from "./config";
import type {
  AnomalyRecord,
  DailyReading,
  EfficiencyCategory,
  IntervalReading,
  UnitSummary,
} from "./types";

/**
 * SERVER DATA ACCESS LAYER.
 *
 * Async counterparts of the old mock functions in data.ts. Each function maps 1:1
 * to a read-only endpoint in the intelligence API (app/forecast_api.py), which reads
 * the real Supabase meter_readings table.
 *
 * Residents and 5-minute intervals are NOT real: the internal database stores daily
 * usage only, and resident data is sensitive (not in this database). Those stay in
 * data.ts and are labelled as illustrative.
 */

const API_URL =
  import.meta.env["VITE_INTELLIGENCE_API_URL"] ?? "http://127.0.0.1:8080/api/forecast";
const API_ROOT = API_URL.replace(/\/api\/forecast\/?$/, "");

async function get<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  const url = `${API_ROOT}${path}${qs.size ? `?${qs.toString()}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`API ${path} returned ${res.status}: ${detail || res.statusText}`);
  }
  return (await res.json()) as T;
}

// --------------------------------------------------------------------------- types

export interface UnitSummaryRow {
  unitId: string;
  code: string;
  towerId: string;
  towerCode: string;
  floor: number;
  totalElectricity: number;
  totalWater: number;
  avgElectricity: number;
  avgWater: number;
  maxSigma: number;
}

export interface ScopeTotals {
  electricity: number;
  water: number;
  units: number;
  towers: number;
  peakUnit: string | null;
}

export interface SummaryResponse {
  scope: string;
  monthKey: string;
  totals: ScopeTotals | null;
  towers: { towerId: string; name: string; units: number; electricity: number; water: number }[];
  units: UnitSummaryRow[];
  note?: string;
}

export interface SeriesResponse {
  monthKey: string;
  units: Record<string, { date: string; electricity: number | null; water: number | null }[]>;
  total: { date: string; electricity: number; water: number }[];
}

export interface AnomaliesResponse {
  monthKey: string;
  threshold: number;
  anomalies: AnomalyRecord[];
}

export interface IntervalsResponse {
  unitId: string;
  date: string;
  intervals: IntervalReading[];
  note?: string;
}

// --------------------------------------------------------------------------- API calls

export function fetchSummary(
  rusun: string,
  monthKey: string,
  opts: { towerId?: string; floor?: number } = {},
): Promise<SummaryResponse> {
  return get<SummaryResponse>("/api/summary", {
    rusun,
    monthKey,
    towerId: opts.towerId,
    floor: opts.floor,
  });
}

export function fetchSeries(
  rusun: string,
  monthKey: string,
  opts: { unitIds?: string[]; towerId?: string } = {},
): Promise<SeriesResponse> {
  return get<SeriesResponse>("/api/series", {
    rusun,
    monthKey,
    unitIds: opts.unitIds?.join(","),
    towerId: opts.towerId,
  });
}

export function fetchAnomalies(
  rusun: string,
  monthKey: string,
  threshold = 2,
): Promise<AnomaliesResponse> {
  return get<AnomaliesResponse>("/api/anomalies", { rusun, monthKey, threshold });
}

export function fetchIntervals(unitId: string, date: string): Promise<IntervalsResponse> {
  return get<IntervalsResponse>("/api/series/intervals", { unitId, date });
}

// --------------------------------------------------------------------------- mappers
// The API returns rows keyed by unit code; the dashboard's UnitSummary needs the
// Unit object from the catalog. These helpers join the two.

export interface UnitLike {
  id: string;
  towerId: string;
  floor: number;
  slot: number;
  code: string;
  name?: string;
  type: string;
  area: number;
  residents: number;
}

function toUnitSummary(
  row: UnitSummaryRow,
  unit: UnitLike | undefined,
  tariff: TariffConfig = DEFAULT_TARIFF,
): UnitSummary {
  const base = unit ?? {
    id: row.unitId,
    towerId: row.towerId,
    floor: row.floor,
    slot: 0,
    code: row.code,
    type: "36 m²",
    area: 36,
    residents: 0,
  };
  return {
    unit: { ...base, floor: row.floor || base.floor },
    totalElectricity: row.totalElectricity,
    totalWater: row.totalWater,
    avgElectricity: row.avgElectricity,
    avgWater: row.avgWater,
    cost: row.totalElectricity * tariff.electricityRpPerKwh,
    electricityCategory: categoryFor(row.avgElectricity, "electricity"),
    waterCategory: categoryFor(row.avgWater, "water"),
    maxSigma: row.maxSigma,
  };
}

// --------------------------------------------------------------------------- hooks

const STALE = 60 * 1000;

/** Monthly totals + per-unit summaries (stat cards, heatmaps, unit lists). */
export function useSummary(
  rusun: string,
  monthKey: string,
  opts: { towerId?: string; floor?: number } = {},
) {
  return useQuery({
    queryKey: ["summary", rusun, monthKey, opts.towerId, opts.floor],
    queryFn: () => fetchSummary(rusun, monthKey, opts),
    staleTime: STALE,
    enabled: Boolean(monthKey),
  });
}

/** Per-unit summaries joined with the catalog Unit objects. */
export function useUnitSummaries(
  rusun: string,
  monthKey: string,
  units: UnitLike[] | undefined,
  opts: { towerId?: string; floor?: number } = {},
) {
  const summary = useSummary(rusun, monthKey, opts);
  const rows = summary.data?.units ?? [];
  const byId = new Map(rows.map((r) => [r.unitId, r]));
  const byCode = new Map(rows.map((r) => [r.code, r]));
  const joined = (units ?? [])
    .map((u) => {
      const row = byId.get(u.id) ?? byCode.get(u.code);
      return row ? toUnitSummary(row, u) : null;
    })
    .filter((s): s is UnitSummary => s !== null);
  return { ...summary, summaries: joined };
}

/** Catalog of units for a rusun, keyed for lookups. */
export function useCatalogUnits(rusun: string) {
  const catalog = useTwinCatalog(rusun);
  const units = useMemo(() => {
    const list = catalog.data?.units ?? [];
    const byId = new Map<string, UnitLike>();
    const byCode = new Map<string, UnitLike>();
    for (const u of list) {
      // Real unit codes are inconsistent (e.g. "3A1001" and "3A101" both mean
      // floor 1, slot 1), so floor/slot are NOT derived here. The summary API
      // returns the authoritative floor per unit; slot falls back to the code's
      // trailing digits purely for floor-plan ordering.
      const trailing = u.code.replace(/\D/g, "").slice(-2);
      const unit: UnitLike = {
        id: u.databaseId || u.id,
        towerId: u.towerId,
        floor: 0,
        slot: Number(trailing) || 0,
        code: u.code,
        name: u.code,
        type: "36 m²",
        area: 36,
        residents: 0,
      };
      byId.set(unit.id, unit);
      byCode.set(unit.code, unit);
    }
    return { units: [...byId.values()], byId, byCode, catalog };
  }, [catalog.data]);
  return units;
}

/** Daily series for one or more units. */
export function useSeries(
  rusun: string,
  monthKey: string,
  opts: { unitIds?: string[]; towerId?: string } = {},
) {
  return useQuery({
    queryKey: ["series", rusun, monthKey, opts.unitIds?.join(","), opts.towerId],
    queryFn: () => fetchSeries(rusun, monthKey, opts),
    staleTime: STALE,
    enabled: Boolean(monthKey),
  });
}

/** Daily readings for a single unit (unit detail chart). */
export function useUnitSeries(
  rusun: string,
  monthKey: string,
  unitId: string,
  unitCode?: string,
) {
  // The API keys series by unit CODE (e.g. "3A1001"); twin.unitId is the
  // database UUID, so resolve the code from the catalog when available.
  const code = unitCode || unitId;
  const q = useSeries(rusun, monthKey, { unitIds: [code] });
  const rows = q.data?.units?.[code] ?? [];
  const readings: DailyReading[] = rows.map((r) => ({
    date: r.date,
    electricity: r.electricity ?? 0,
    water: r.water ?? 0,
  }));
  return { ...q, readings };
}

/** Z-score anomalies for the month. */
export function useAnomalies(rusun: string, monthKey: string, threshold = 2) {
  return useQuery({
    queryKey: ["anomalies", rusun, monthKey, threshold],
    queryFn: () => fetchAnomalies(rusun, monthKey, threshold),
    staleTime: STALE,
    enabled: Boolean(monthKey),
  });
}

/**
 * 5-minute interval readings. The internal database stores daily usage only, so the
 * API returns an empty list with a note; callers should hide the interval chart and
 * show the note instead.
 */
export function useIntervals(unitId: string, date: string) {
  return useQuery({
    queryKey: ["intervals", unitId, date],
    queryFn: () => fetchIntervals(unitId, date),
    staleTime: STALE,
    enabled: Boolean(unitId && date),
  });
}
