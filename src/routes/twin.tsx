import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/twin")({
  component: TwinPage,
});

function TwinPage() {
  return null;
}
