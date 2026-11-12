import { useCatalogUnits } from "@/lib/twin/server";
import { useTwin } from "@/lib/twin/store";
import { cn } from "@/lib/utils";

export function FloorSelector({ compact = false }: { compact?: boolean }) {
  const twin = useTwin();
  const rusun = twin.rusunId.replace(/\D/g, "") || "3";
  const { units } = useCatalogUnits(rusun);

  // Highest floor among the tower's units (catalog is the source of truth; the
  // summary API carries the authoritative per-unit floor once data loads).
  const towerFloors = units.filter((u) => u.towerId === twin.towerId).map((u) => u.floor);
  const maxFloor = towerFloors.length ? Math.max(...towerFloors) : 10;
  const floors = Array.from({ length: maxFloor }, (_, i) => maxFloor - i);

  return (
    <div className={cn("flex w-16 flex-col gap-1", compact && "w-14")}>
      <div className="rounded-md bg-secondary/60 px-2 py-1 text-center text-[10px] uppercase tracking-wide text-muted-foreground">
        Roof
      </div>
      {floors.map((f) => (
        <button
          key={f}
          onClick={() => {
            twin.setFloor(f);
            twin.selectUnit(null);
          }}
          className={cn(
            "rounded-md border border-border/60 bg-card px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground",
            twin.floor === f && "border-primary bg-primary/15 font-medium text-primary",
          )}
        >
          {f}
        </button>
      ))}
      <p className="mt-1 text-center text-[10px] text-muted-foreground">Floor</p>
    </div>
  );
}
