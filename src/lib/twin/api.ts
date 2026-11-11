import { useQuery } from "@tanstack/react-query";

import type { Tower, Unit } from "./types";

export interface TwinCatalog {
  rusunId: string;
  towers: Pick<Tower, "id" | "code" | "name" | "rusunId">[];
  units: (Pick<Unit, "id" | "code" | "towerId"> & { databaseId: string })[];
}

const API_URL = import.meta.env.VITE_INTELLIGENCE_API_URL ?? "http://127.0.0.1:8000/api/forecast";
const API_ROOT = API_URL.replace(/\/api\/forecast\/?$/, "");

export async function fetchCatalog(rusun = "3"): Promise<TwinCatalog> {
  const response = await fetch(`${API_ROOT}/api/catalog?rusun=${encodeURIComponent(rusun)}`);
  if (!response.ok) {
    throw new Error(`Catalog API returned ${response.status}: ${await response.text()}`);
  }
  return (await response.json()) as TwinCatalog;
}

export function useTwinCatalog(rusun = "3") {
  return useQuery({
    queryKey: ["twin-catalog", rusun],
    queryFn: () => fetchCatalog(rusun),
    staleTime: 5 * 60 * 1000,
  });
}
