import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Bell,
  Boxes,
  Building2,
  FileBarChart,
  LayoutDashboard,
  Map,
  Settings,
  Home,
} from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { title: "Overview", to: "/", icon: LayoutDashboard },
  { title: "3D Digital Twin", to: "/twin", icon: Boxes },
  { title: "Towers", to: "/towers", icon: Building2 },
  { title: "Floor Plans", to: "/floor-plans", icon: Map },
  { title: "Units", to: "/units", icon: Home },
  { title: "Analytics", to: "/analytics", icon: Activity },
  { title: "Alerts", to: "/alerts", icon: Bell },
  { title: "Reports", to: "/reports", icon: FileBarChart },
  { title: "Settings", to: "/settings", icon: Settings },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="flex w-[248px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Boxes className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Rusun ASN IKN</p>
          <p className="text-[11px] text-muted-foreground">Predictive Digital Twin</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {items.map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                active && "bg-primary/15 text-primary font-medium hover:bg-primary/20 hover:text-primary",
              )}
            >
              <item.icon className="size-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-lg border border-sidebar-border bg-background/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
        Smart Metering → Electricity + Water → Analytical Digital Twin → Forecast · Peak · Anomaly ·
        Cost → Decision Support
      </div>
    </aside>
  );
}
