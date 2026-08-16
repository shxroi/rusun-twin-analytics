import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/towers")({
  component: TowersPage,
});

function TowersPage() {
  return null;
}
