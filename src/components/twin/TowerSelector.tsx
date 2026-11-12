import { useCatalogUnits } from "@/lib/twin/server";
import { useTwin } from "@/lib/twin/store";
import { cn } from "@/lib/utils";

export function TowerSelector() {
  const twin = useTwin();
  const rusun = twin.rusunId.replace(/\D/g, "") || "3";
  const { units } = useCatalogUnits(rusun);

  // Unique towers in stable order, labelled by their unit code prefix (e.g. "3-A").
  const towers = [...new Map(units.map((u) => [u.towerId, u])).values()].map((u) => ({
    id: u.towerId,
    name: u.code.split(/(\d)/)[0] ?? u.code,
  }));
  // De-duplicate by towerId while keeping the first label.
  const seen = new Set<string>();
  const unique = towers.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[11px] uppercase tracking-wide text-muted-foreground">Tower</span>
      {unique.map((t) => (
        <button
          key={t.id}
          onClick={() => twin.setTowerId(t.id)}
          className={cn(
            "rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground",
            twin.towerId === t.id && "border-primary bg-primary/15 font-medium text-primary",
          )}
        >
          {t.name}
        </button>
      ))}
    </div>
  );
}
