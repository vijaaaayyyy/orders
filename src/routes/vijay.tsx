import { createFileRoute } from "@tanstack/react-router";
import { VijayOrderApp } from "@/components/vijay-order-app";
import { getBoard } from "@/lib/orders.functions";

export const Route = createFileRoute("/vijay")({
  loader: () => getBoard(),
  component: VijayPage,
});

function VijayPage() {
  const initial = Route.useLoaderData();
  return <VijayOrderApp initial={initial} />;
}
