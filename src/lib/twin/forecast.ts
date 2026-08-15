import { DEFAULT_TARIFF, type TariffConfig } from "./config";
import { aggregateSeries, daysInMonth, getUnitSeries } from "./data";
import type { DailyReading, ForecastPoint, ForecastResult } from "./types";

/**
 * FORECAST SERVICE LAYER.
 *
 * These functions are the single seam between the UI and the forecasting
 * backend. Today they run a deterministic statistical baseline
 * (trend + weekly seasonality + widening confidence band) on the mock data.
 * When the LSTM service is available, replace the body of `runForecast` with a
 * fetch call — the signatures and return shape must stay identical:
 *
 *   POST /api/forecast  { scope, unitIds, metric, horizonDays } -> ForecastResult
 */

export interface ForecastRequest {
  unitIds: string[];
  monthKey: string;
  horizonDays?: number;
  /** Set when a real model endpoint should be used instead of the baseline. */
  endpoint?: string;
}

const MODEL_NAME = "LSTM-baseline (mock)";

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function linreg(values: number[]) {
  const n = values.length;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((y, x) => {
    num += (x - meanX) * (y - meanY);
    den += (x - meanX) ** 2;
  });
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: meanY - slope * meanX, meanY };
}

function project(series: { date: string; value: number }[], horizonDays: number): ForecastPoint[] {
  const values = series.map((s) => s.value);
  const { slope, intercept } = linreg(values);
  const residualSd =
    Math.sqrt(
      values.reduce((a, y, x) => a + (y - (intercept + slope * x)) ** 2, 0) / (values.length || 1),
    ) || Math.max(0.001, Math.abs(intercept) * 0.05);

  // weekly seasonality factors from the observed window
  const weekly = new Array(7).fill(0).map((_, wd) => {
    const same = series.filter((s) => new Date(`${s.date}T00:00:00`).getDay() === wd);
    if (!same.length) return 1;
    const avg = same.reduce((a, s) => a + s.value, 0) / same.length;
    const overall = values.reduce((a, b) => a + b, 0) / values.length;
    return overall === 0 ? 1 : avg / overall;
  });

  const lastDate = series[series.length - 1]?.date ?? new Date().toISOString().slice(0, 10);
  const out: ForecastPoint[] = [];
  for (let i = 1; i <= horizonDays; i++) {
    const x = values.length - 1 + i;
    const date = addDays(lastDate, i);
    const wd = new Date(`${date}T00:00:00`).getDay();
    const value = Math.max(0, (intercept + slope * x) * weekly[wd]!);
    const band = residualSd * (1 + i * 0.09) * 1.28;
    out.push({
      date,
      value: +value.toFixed(3),
      lower: +Math.max(0, value - band).toFixed(3),
      upper: +(value + band).toFixed(3),
    });
  }
  return out;
}

function history(readings: DailyReading[], metric: "electricity" | "water") {
  return readings.map((d) => ({ date: d.date, value: metric === "electricity" ? d.electricity : d.water }));
}

async function runForecast(
  req: ForecastRequest,
  metric: "electricity" | "water",
): Promise<ForecastResult> {
  const horizonDays = req.horizonDays ?? 7;
  const readings = aggregateSeries(req.unitIds, req.monthKey);
  const hist = history(readings, metric);

  if (req.endpoint) {
    // Real model path (kept here so the UI never changes when it goes live).
    const res = await fetch(req.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...req, metric }),
    });
    if (res.ok) return (await res.json()) as ForecastResult;
  }

  const forecast = project(hist, horizonDays);
  const confidence = Math.max(0.62, 0.94 - horizonDays * 0.012);
  return { history: hist, forecast, horizonDays, confidence, model: MODEL_NAME };
}

export function forecastElectricity(req: ForecastRequest) {
  return runForecast(req, "electricity");
}

export function forecastWater(req: ForecastRequest) {
  return runForecast(req, "water");
}

export async function forecastCost(
  req: ForecastRequest,
  tariff: TariffConfig = DEFAULT_TARIFF,
): Promise<ForecastResult> {
  const base = await forecastElectricity(req);
  const k = tariff.electricityRpPerKwh;
  return {
    ...base,
    model: `${base.model} × tariff`,
    history: base.history.map((h) => ({ ...h, value: h.value * k })),
    forecast: base.forecast.map((f) => ({
      ...f,
      value: f.value * k,
      lower: f.lower * k,
      upper: f.upper * k,
    })),
  };
}

export interface PeakAnalysis {
  historicalPeak: { date: string; value: number } | null;
  predictedPeak: { date: string; value: number } | null;
  averageDaily: number;
}

export function analysePeak(result: ForecastResult): PeakAnalysis {
  const historicalPeak = result.history.reduce<{ date: string; value: number } | null>(
    (best, h) => (!best || h.value > best.value ? h : best),
    null,
  );
  const predictedPeak = result.forecast.reduce<{ date: string; value: number } | null>(
    (best, f) => (!best || f.value > best.value ? { date: f.date, value: f.value } : best),
    null,
  );
  const averageDaily =
    result.history.reduce((a, h) => a + h.value, 0) / (result.history.length || 1);
  return { historicalPeak, predictedPeak, averageDaily };
}

/** Next-day point forecast for a single unit (used in the unit detail panel). */
export async function forecastUnitNextDay(unitId: string, monthKey: string) {
  const readings = getUnitSeries(unitId, monthKey);
  const days = daysInMonth(monthKey);
  const elec = project(history(readings, "electricity"), 1)[0];
  const water = project(history(readings, "water"), 1)[0];
  return { days, electricity: elec, water };
}
