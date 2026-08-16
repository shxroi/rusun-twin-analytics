import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/units")({
  component: UnitsPage,
});

function UnitsPage() {
  return null;
}
