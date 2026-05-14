import { createFileRoute } from "@tanstack/react-router";
import WinamaxDashboard from "@/components/WinamaxDashboard";

export const Route = createFileRoute("/winamax")({
  component: WinamaxDashboard,
});
