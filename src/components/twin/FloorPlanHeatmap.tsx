import { useMemo, useState } from "react";

import { CATEGORY_LABEL, CATEGORY_TOKEN, categoryFor } from "@/lib/twin/config";
import { getFloorSummaries, getTower } from "@/lib/twin/data";
import { nf, rp } from "@/lib/twin/format";
import { useTwin } from "@/lib/twin/store";
import type { EfficiencyCategory, HeatmapDimension, UnitSummary } from "@/lib/twin/types";
import { cn } from "@/lib/utils";

/**
 * Interactive floor-plan heatmap.
 * Unit regions are vector polygons positioned like the architectural plan
 * (3 units on the north wing, 3 on the south wing, core + corridor between),
 * so each unit is a selectable, data-driven region instead of a static image.
 */
const PLAN_W = 900;
const PLAN_H = 460;

const UNIT_RECTS: { slot: number; x: number; y: number; w: number; h: number }[] = [
  { slot: 1, x: 120, y: 34, w: 200, h: 150 },
  { slot: 2, x: 360, y: 34, w: 200, h: 150 },
  { slot: 3, x: 570, y: 34, w: 200, h: 150 },
  { slot: 4, x: 120, y: 268, w: 200, h: 150 },
  { slot: 5, x: 360, y: 268, w: 200, h: 150 },
  { slot: 6, x: 570, y: 268, w: 200, h: 150 },
];

const DIMENSIONS: { id: HeatmapDimension; label: string }[] = [
  { id: "electricity", label: "Electricity" },
  { id: "water", label: "Water" },
  { id: "cost", label: "Cost" },
  { id: "anomaly", label: "Anomaly" },
];

const CATEGORY_ORDER: EfficiencyCategory[] = [
  "sangat-hemat",
  "hemat",
  "wajar",
  "cukup-boros",
  "sangat-boros",
  "no-data",
];

function categoryOf(s: UnitSummary, dim: HeatmapDimension): EfficiencyCategory {
  if (dim === "water") return s.waterCategory;
  if (dim === "anomaly") {
    if (s.maxSigma >= 2.6) return "sangat-boros";
    if (s.maxSigma >= 2) return "cukup-boros";
    if (s.maxSigma >= 1.5) return "wajar";
    return "hemat";
  }
  if (dim === "cost") return categoryFor(s.avgElectricity, "electricity");
  return s.electricityCategory;
}

function valueOf(s: UnitSummary, dim: HeatmapDimension, tariffKwh: number) {
  if (dim === "water") return `${nf(s.avgWater, 2)} m³/day`;
  if (dim === "cost") return rp(s.avgElectricity * tariffKwh);
  if (dim === "anomaly") return `${nf(s.maxSigma, 2)}σ`;
  return `${nf(s.avgElectricity, 2)} kWh/day`;
}

export function FloorPlanHeatmap() {
  const twin = useTwin();
  const tower = getTower(twin.towerId);
  const [hover, setHover] = useState<string | null>(null);

  const summaries = useMemo(
    () => getFloorSummaries(twin.towerId, twin.floor, twin.monthKey),
    [twin.towerId, twin.floor, twin.monthKey],
  );

  const hovered = summaries.find((s) => s.unit.id === hover);

  return (
    <section className="panel flex flex-col p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">
            Interactive Floor Plan — {tower?.name}, Floor {twin.floor}
          </h2>
          <p className="text-xs text-muted-foreground">
            Average daily usage per unit. Click a unit region to sync the 3D model, charts and unit
            detail.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-background/50 p-1">
          {DIMENSIONS.map((d) => (
            <button
              key={d.id}
              onClick={() => twin.setHeatmapDim(d.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground",
                twin.heatmapDim === d.id && "bg-secondary text-foreground",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-3 grid-floor rounded-lg border border-border/70 bg-background/40">
        <svg viewBox={`0 0 ${PLAN_W} ${PLAN_H}`} className="w-full">
          {/* building shell */}
          <rect
            x="70"
            y="14"
            width="760"
            height="424"
            rx="6"
            fill="none"
            stroke="var(--border)"
            strokeWidth="2"
          />
          {/* corridor */}
          <rect x="100" y="196" width="700" height="60" fill="var(--muted)" opacity="0.35" />
          <text x="450" y="232" textAnchor="middle" fill="var(--muted-foreground)" fontSize="13">
            KORIDOR
          </text>
          {/* cores */}
          <rect x="336" y="196" width="0" height="0" />
          <rect x="30" y="120" width="70" height="220" fill="var(--muted)" opacity="0.5" />
          <text
            x="65"
            y="236"
            textAnchor="middle"
            fill="var(--muted-foreground)"
            fontSize="11"
            transform="rotate(-90 65 236)"
          >
            TANGGA / LIFT
          </text>
          <rect x="800" y="120" width="70" height="220" fill="var(--muted)" opacity="0.5" />
          <text
            x="835"
            y="236"
            textAnchor="middle"
            fill="var(--muted-foreground)"
            fontSize="11"
            transform="rotate(-90 835 236)"
          >
            TANGGA DARURAT
          </text>

          {UNIT_RECTS.map((r) => {
            const s = summaries.find((u) => u.unit.slot === r.slot);
            const cat = s ? categoryOf(s, twin.heatmapDim) : "no-data";
            const token = CATEGORY_TOKEN[cat];
            const selected = s && twin.unitId === s.unit.id;
            return (
              <g
                key={r.slot}
                className="cursor-pointer"
                onClick={() => s && twin.selectUnit(s.unit.id)}
                onMouseEnter={() => setHover(s?.unit.id ?? null)}
                onMouseLeave={() => setHover(null)}
              >
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  rx="4"
                  fill={`var(--${token})`}
                  fillOpacity={selected ? 0.95 : 0.72}
                  stroke={selected ? "var(--foreground)" : "var(--border)"}
                  strokeWidth={selected ? 3 : 1.5}
                />
                <text
                  x={r.x + r.w / 2}
                  y={r.y + 46}
                  textAnchor="middle"
                  fontSize="20"
                  fontWeight="700"
                  fill="oklch(0.16 0.02 264)"
                >
                  {s?.unit.code ?? "—"}
                </text>
                <text
                  x={r.x + r.w / 2}
                  y={r.y + 74}
                  textAnchor="middle"
                  fontSize="15"
                  fill="oklch(0.2 0.02 264)"
                >
                  {s ? valueOf(s, twin.heatmapDim, twin.tariff.electricityRpPerKwh) : "No Data"}
                </text>
                <text
                  x={r.x + r.w / 2}
                  y={r.y + 100}
                  textAnchor="middle"
                  fontSize="13"
                  fill="oklch(0.25 0.02 264)"
                >
                  {CATEGORY_LABEL[cat]}
                </text>
                <text
                  x={r.x + r.w / 2}
                  y={r.y + 126}
                  textAnchor="middle"
                  fontSize="12"
                  fill="oklch(0.3 0.02 264)"
                >
                  UNIT {r.slot} · {s?.unit.type ?? ""}
                </text>
              </g>
            );
          })}
        </svg>

        {hovered ? (
          <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg border border-border bg-card/95 px-3 py-2 text-xs shadow-lg">
            <p className="font-semibold">{hovered.unit.code}</p>
            <p className="text-elec">{nf(hovered.avgElectricity, 2)} kWh/day</p>
            <p className="text-water">{nf(hovered.avgWater, 2)} m³/day</p>
            <p className="text-muted-foreground">
              {rp(hovered.cost)} · {hovered.unit.residents} residents
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span>Category:</span>
        {CATEGORY_ORDER.map((c) => (
          <span key={c} className="flex items-center gap-1.5">
            <span
              className="size-3 rounded-sm"
              style={{ backgroundColor: `var(--${CATEGORY_TOKEN[c]})` }}
            />
            {CATEGORY_LABEL[c]}
          </span>
        ))}
      </div>
    </section>
  );
}
