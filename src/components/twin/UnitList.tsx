import { CATEGORY_LABEL, CATEGORY_TOKEN } from "@/lib/twin/config";
import { nf, rp } from "@/lib/twin/format";
import { useCatalogUnits, useUnitSummaries } from "@/lib/twin/server";
import { useTwin } from "@/lib/twin/store";
import { cn } from "@/lib/utils";

export function UnitList({ floorOnly = true }: { floorOnly?: boolean }) {
  const twin = useTwin();
  const rusun = twin.rusunId.replace(/\D/g, "") || "3";
  const { units } = useCatalogUnits(rusun);
  const towerUnits = units.filter((u) => u.towerId === twin.towerId);
  const { summaries, isPending, isError } = useUnitSummaries(rusun, twin.monthKey, towerUnits, {
    towerId: twin.towerId,
  });

  const rows = floorOnly ? summaries.filter((s) => s.unit.floor === twin.floor) : summaries;

  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold">
          Unit List {floorOnly ? `— Floor ${twin.floor}` : "— All Floors"}
        </h3>
        <span className="text-[11px] text-muted-foreground">
          {isPending ? "loading…" : isError ? "error" : `${rows.length} units`}
        </span>
      </div>
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-background/95 text-muted-foreground backdrop-blur">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Unit</th>
              <th className="px-3 py-2 text-left font-medium">Floor</th>
              <th className="px-3 py-2 text-right font-medium">kWh</th>
              <th className="px-3 py-2 text-right font-medium">m³</th>
              <th className="px-3 py-2 text-right font-medium">Cost</th>
              <th className="px-3 py-2 text-left font-medium">Kategori</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr
                key={s.unit.id}
                onClick={() => twin.selectUnit(s.unit.id)}
                className={cn(
                  "cursor-pointer border-t border-border/60 transition-colors hover:bg-secondary/50",
                  twin.unitId === s.unit.id && "bg-primary/10",
                )}
              >
                <td className="px-4 py-2 font-medium">{s.unit.code}</td>
                <td className="px-3 py-2 text-muted-foreground">{s.unit.floor}</td>
                <td className="px-3 py-2 text-right text-elec">{nf(s.totalElectricity)}</td>
                <td className="px-3 py-2 text-right text-water">{nf(s.totalWater, 2)}</td>
                <td className="px-3 py-2 text-right text-muted-foreground">{rp(s.cost)}</td>
                <td className="px-3 py-2">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="size-2.5 rounded-sm"
                      style={{
                        backgroundColor: `var(--${CATEGORY_TOKEN[s.electricityCategory]})`,
                      }}
                    />
                    {CATEGORY_LABEL[s.electricityCategory]}
                  </span>
                </td>
              </tr>
            ))}
            {!isPending && !isError && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  No readings for this month.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
