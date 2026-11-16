import { createFileRoute } from "@tanstack/react-router";
import { MessApp } from "@/components/mess-app";
import { getBoard } from "@/lib/orders.functions";

export const Route = createFileRoute("/")({
  loader: () => getBoard(),
  component: Home,
});

function Home() {
  const initial = Route.useLoaderData();
  return <MessApp initial={initial} />;
}
