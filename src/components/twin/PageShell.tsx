import type { ReactNode } from "react";

import { TopBar } from "./TopBar";

export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <TopBar title={title} {...(subtitle ? { subtitle } : {})} />
      <main className="flex-1 space-y-3 p-4 xl:p-5">{children}</main>
    </div>
  );
}
