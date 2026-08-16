import { getTowers } from "@/lib/twin/data";
import { useTwin } from "@/lib/twin/store";
import { cn } from "@/lib/utils";

export function TowerSelector() {
  const twin = useTwin();
  const towers = getTowers(twin.rusunId);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[11px] uppercase tracking-wide text-muted-foreground">Tower</span>
      {towers.map((t) => (
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
