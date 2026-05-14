import { createFileRoute } from "@tanstack/react-router";
import MagicApp from "@/components/magic-page/MagicApp";

export const Route = createFileRoute("/")({
  component: () => <MagicApp />,
});
