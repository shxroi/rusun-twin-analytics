import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/floor-plans")({
  component: FloorPlansPage,
});

function FloorPlansPage() {
  return null;
}
