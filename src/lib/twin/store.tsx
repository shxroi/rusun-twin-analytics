import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { DEFAULT_TARIFF, TARIFF_STORAGE_KEY, type TariffConfig } from "./config";
import { RUSUN_LIST, getTowers } from "./data";
import type { Granularity, HeatmapDimension, MetricMode } from "./types";

interface TwinState {
  rusunId: string;
  monthKey: string;
  metricMode: MetricMode;
  heatmapDim: HeatmapDimension;
  granularity: Granularity;
  towerId: string;
  floor: number;
  unitId: string | null;
  tariff: TariffConfig;
  forecastHorizon: number;
  setRusunId: (id: string) => void;
  setMonthKey: (m: string) => void;
  setMetricMode: (m: MetricMode) => void;
  setHeatmapDim: (d: HeatmapDimension) => void;
  setGranularity: (g: Granularity) => void;
  setTowerId: (id: string) => void;
  setFloor: (f: number) => void;
  selectUnit: (id: string | null) => void;
  setTariff: (t: TariffConfig) => void;
  setForecastHorizon: (n: number) => void;
  refreshedAt: string;
  refresh: () => void;
}

const TwinContext = createContext<TwinState | null>(null);

export const MONTH_OPTIONS = ["2026-05", "2026-06", "2026-07", "2026-08"];

export function TwinProvider({ children }: { children: ReactNode }) {
  const [rusunId, setRusunIdRaw] = useState(RUSUN_LIST[0]!.id);
  const [monthKey, setMonthKey] = useState("2026-07");
  const [metricMode, setMetricMode] = useState<MetricMode>("both");
  const [heatmapDim, setHeatmapDim] = useState<HeatmapDimension>("electricity");
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const [towerId, setTowerIdRaw] = useState(getTowers(RUSUN_LIST[0]!.id)[0]!.id);
  const [floor, setFloor] = useState(10);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [tariff, setTariffRaw] = useState<TariffConfig>(DEFAULT_TARIFF);
  const [forecastHorizon, setForecastHorizon] = useState(7);
  const [refreshedAt, setRefreshedAt] = useState("—");

  useEffect(() => {
    setRefreshedAt(new Date().toLocaleString("en-GB"));
    try {
      const raw = localStorage.getItem(TARIFF_STORAGE_KEY);
      if (raw) setTariffRaw({ ...DEFAULT_TARIFF, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  const setTariff = useCallback((t: TariffConfig) => {
    setTariffRaw(t);
    try {
      localStorage.setItem(TARIFF_STORAGE_KEY, JSON.stringify(t));
    } catch {
      /* ignore */
    }
  }, []);

  const setRusunId = useCallback((id: string) => {
    setRusunIdRaw(id);
    setTowerIdRaw(getTowers(id)[0]!.id);
    setUnitId(null);
  }, []);

  const setTowerId = useCallback((id: string) => {
    setTowerIdRaw(id);
    setUnitId(null);
  }, []);

  const value = useMemo<TwinState>(
    () => ({
      rusunId,
      monthKey,
      metricMode,
      heatmapDim,
      granularity,
      towerId,
      floor,
      unitId,
      tariff,
      forecastHorizon,
      setRusunId,
      setMonthKey,
      setMetricMode,
      setHeatmapDim,
      setGranularity,
      setTowerId,
      setFloor,
      selectUnit: setUnitId,
      setTariff,
      setForecastHorizon,
      refreshedAt,
      refresh: () => setRefreshedAt(new Date().toLocaleString("en-GB")),
    }),
    [
      rusunId,
      monthKey,
      metricMode,
      heatmapDim,
      granularity,
      towerId,
      floor,
      unitId,
      tariff,
      forecastHorizon,
      setRusunId,
      setTowerId,
      setTariff,
      refreshedAt,
    ],
  );

  return <TwinContext.Provider value={value}>{children}</TwinContext.Provider>;
}

export function useTwin() {
  const ctx = useContext(TwinContext);
  if (!ctx) throw new Error("useTwin must be used inside <TwinProvider>");
  return ctx;
}
