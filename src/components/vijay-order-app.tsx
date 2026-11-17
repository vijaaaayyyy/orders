import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ChefHat, Clock3, Ticket, UtensilsCrossed } from "lucide-react";
import { MENU } from "@/lib/menu";
import { stationTone } from "@/lib/station-tone";
import {
  getBoard,
  markCollected,
  markReady,
  placeOrderAt,
  recallOrder,
  type Board,
  type Order,
} from "@/lib/orders.functions";

const STATION_BY_ITEM = new Map<string, string>(MENU.map((item) => [item.name, item.station]));

function minutesAgo(iso: string, now: number) {
  if (!now) return "just now";
  const mins = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min";
  return `${mins} min`;
}

function useNow() {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function VijayOrderApp({ initial }: { initial: Board }) {
  const queryClient = useQueryClient();
  const now = useNow();
  const [selected, setSelected] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");
  const [actionError, setActionError] = useState("");
  const [slip, setSlip] = useState<{ token: number; item: string; ahead: number } | null>(null);

  const boardQuery = useQuery({
    queryKey: ["board"],
    queryFn: () => getBoard(),
    initialData: initial,
    initialDataUpdatedAt: 0,
    refetchInterval: 2500,
  });
  const board = boardQuery.data;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["board"] });

  const place = useMutation({
    mutationFn: async (input: { item: string; token: number }) => {
      const result = await placeOrderAt({ data: input });
      if (!result?.order) {
        throw new Error("The order was not saved. Check the connection and try again.");
      }
      return result;
    },
    onSuccess: async (result) => {
      setSlip({ token: result.order.token, item: result.order.item, ahead: result.ahead });
      setActionError("");
      setSelected(null);
      setToken("");
      await invalidate();
    },
    onError: (error: Error) => setActionError(error.message),
  });

  const readyMut = useMutation({
    mutationFn: (id: number) => markReady({ data: { id } }),
    onSuccess: async () => {
      setActionError("");
      await invalidate();
    },
    onError: (error: Error) => setActionError(error.message),
  });
  const collectedMut = useMutation({
    mutationFn: (id: number) => markCollected({ data: { id } }),
    onSuccess: async () => {
      setActionError("");
      await invalidate();
    },
    onError: (error: Error) => setActionError(error.message),
  });
  const recallMut = useMutation({
    mutationFn: (id: number) => recallOrder({ data: { id } }),
    onSuccess: async () => {
      setActionError("");
      await invalidate();
    },
    onError: (error: Error) => setActionError(error.message),
  });

  const busyId = readyMut.isPending
    ? readyMut.variables
    : collectedMut.isPending
      ? collectedMut.variables
      : recallMut.isPending
        ? recallMut.variables
        : null;

  function addOrder() {
    if (!selected) {
      setActionError("Pick a dish first.");
      return;
    }
    if (!token.trim()) {
      setActionError("Type the order number you're calling out.");
      return;
    }
    const tokenNum = Number(token);
    if (!Number.isInteger(tokenNum) || tokenNum < 1) {
      setActionError("Enter a valid order number.");
      return;
    }
    place.mutate({ item: selected, token: tokenNum });
  }

  const selectedStation = selected ? STATION_BY_ITEM.get(selected) : undefined;

  return (
    <div className="relative z-10 min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur-md supports-[backdrop-filter]:bg-bg/75">
        <div className="h-1 rainbow-rule" />
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl brand-tile text-primary-fg">
              <UtensilsCrossed className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl leading-none font-bold tracking-tight sm:text-4xl">
                  Mess counter
                </span>
                <span className="hidden rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-xs font-semibold tracking-wider text-accent uppercase sm:inline">
                  Staff
                </span>
              </div>
              <p className="mt-1.5 flex items-center gap-2 text-sm text-muted">
                <span className="inline-flex items-center gap-1 font-medium text-ready">
                  <span className="size-1.5 rounded-full bg-ready" />
                  {board.servedToday} picked up
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-primary">{board.preparing.length} cooking</span>
              </p>
            </div>
          </div>
          <Link
            to="/"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-fg transition-transform duration-150 ease-out active:scale-[0.96]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Board
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-5">
        {/* New order */}
        <div className="glass-frame min-w-0 rounded-[40px] border-2 border-solid p-2 lg:col-span-3">
        <section className="glass rounded-[32px] p-5 sm:p-6" aria-labelledby="new-order-heading">
          <div className="mb-4">
            <p className="flex items-center gap-2 text-sm font-semibold tracking-widest text-muted uppercase">
              <span className="h-1 w-5 rounded-full bg-primary-2" />
              Take an order
            </p>
            <h1 id="new-order-heading" className="mt-1 font-display text-5xl leading-none font-semibold italic">
              New order
            </h1>
          </div>

          <div className="glass-frame mb-4 rounded-[28px] sm:rounded-[24px] border-2 border-solid p-2">
          <div className="docket overflow-hidden rounded-[20px] sm:rounded-[16px] border border-border bg-surface">
            <div className="h-1.5 rainbow-rule" />
            <div className="p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <label
                    htmlFor="order-number"
                    className="text-xs font-semibold tracking-widest text-muted uppercase"
                  >
                    Order number
                  </label>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      id="order-number"
                      inputMode="numeric"
                      placeholder="Type number"
                      value={token}
                      onChange={(event) => setToken(event.target.value.replace(/\D/g, "").slice(0, 4))}
                      className="h-14 w-40 rounded-md border border-border bg-bg px-3 text-center font-display text-3xl font-semibold tabular-nums outline-none placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:text-muted focus-visible:ring-2 focus-visible:ring-primary"
                    />
                    <span className="sticker bg-accent/15 text-accent">Manual</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addOrder}
                  disabled={place.isPending}
                  className="btn-primary inline-flex h-12 items-center gap-2 rounded-md px-5 font-semibold transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-50"
                >
                  <Ticket className="size-4" aria-hidden="true" />
                  {place.isPending ? "Adding…" : "Add to queue"}
                </button>
              </div>
              <p className="mt-2 text-sm text-muted">
                {selected ? (
                  <>
                    Selected: <span className="font-semibold text-fg">{selected}</span>
                    {selectedStation ? ` · ${selectedStation}` : ""}
                  </>
                ) : (
                  "Pick a dish, type the order number, then add it to the queue."
                )}
              </p>
            </div>
          </div>
          </div>

          {actionError ? (
            <p className="mb-3 text-sm text-primary" role="alert">
              {actionError}
            </p>
          ) : null}

          {slip ? (
            <div className="glass-frame relative mb-4 rounded-[28px] sm:rounded-[24px] border-2 border-solid p-2">
            <div className="hero-ticket pinterest-card relative flex items-center justify-between gap-3 overflow-hidden rounded-[20px] sm:rounded-[16px] px-5 py-4">
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase opacity-80">Called out</p>
                <p className="font-display text-5xl leading-none font-semibold tabular-nums">{slip.token}</p>
                <p className="mt-1 text-base opacity-90">{slip.item}</p>
              </div>
              <button type="button" onClick={() => setSlip(null)} className="text-sm underline">
                Dismiss
              </button>
            </div>
            </div>
          ) : null}

          <ul className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3">
            {MENU.map((item) => {
              const active = selected === item.name;
              const tone = stationTone(item.station);
              return (
                <li key={item.name}>
                  <button
                    type="button"
                    onClick={() => setSelected(item.name)}
                    aria-pressed={active}
                    className={`group flex min-h-16 w-full flex-col items-start justify-center rounded-[20px] sm:rounded-[16px] border px-3 py-3 text-left transition-all duration-150 ease-out hover:-translate-y-0.5 active:scale-[0.97] ${
                      active
                        ? "border-primary bg-primary/10 ring-2 ring-primary"
                        : "border-border bg-surface hover:border-primary/40"
                    }`}
                  >
                    <span className={`mb-1.5 h-1 w-6 rounded-full ${tone.bar}`} />
                    <span className="text-lg font-medium">{item.name}</span>
                    <span className={`mt-0.5 text-xs font-semibold tracking-wide uppercase ${tone.text}`}>
                      {item.station}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
        </div>

        {/* Lanes */}
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <Lane
            title="Cooking"
            icon={<ChefHat className="size-4 text-primary" aria-hidden="true" />}
            empty="Nothing on the pass."
            orders={board.preparing}
            now={now}
            actionLabel="Call ready"
            onAction={(id) => readyMut.mutate(id)}
            busyId={busyId}
            tone="cook"
          />
          <Lane
            title="At the pickup counter"
            icon={<Ticket className="size-4 text-primary" aria-hidden="true" />}
            empty="No one to hand food to."
            orders={board.ready}
            now={now}
            actionLabel="Picked up"
            secondaryLabel="Still cooking"
            onAction={(id) => collectedMut.mutate(id)}
            onSecondary={(id) => recallMut.mutate(id)}
            busyId={busyId}
            tone="ready"
          />
        </div>
      </main>
    </div>
  );
}

function Lane({
  title,
  icon,
  empty,
  orders,
  now,
  actionLabel,
  secondaryLabel,
  onAction,
  onSecondary,
  busyId,
  tone,
}: {
  title: string;
  icon: ReactNode;
  empty: string;
  orders: Order[];
  now: number;
  actionLabel: string;
  secondaryLabel?: string;
  onAction: (id: number) => void;
  onSecondary?: (id: number) => void;
  busyId: number | null;
  tone: "cook" | "ready";
}) {
  return (
    <div className="glass-frame min-w-0 rounded-[40px] border-2 border-solid p-2">
    <section className="glass rounded-[32px] p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="font-display text-3xl leading-none font-semibold italic">{title}</h2>
        <span className="ml-auto flex size-8 items-center justify-center rounded-full bg-surface-2 font-display text-lg leading-none text-fg tabular-nums">
          {orders.length}
        </span>
      </div>
      {orders.length === 0 ? (
        <p className="rounded-[20px] sm:rounded-[16px] border border-dashed border-border px-4 py-6 text-sm text-muted">{empty}</p>
      ) : (
        <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [column-fill:_balance]">
          {orders.map((order) => {
            const station = STATION_BY_ITEM.get(order.item);
            const stationStyle = stationTone(station);
            return (
              <div
                key={order.id}
                className="glass-frame mb-3 break-inside-avoid overflow-hidden rounded-3xl border-2 border-solid border-[rgba(97,62,62,1)] p-2"
              >
              <div
                className="pinterest-card overflow-hidden rounded-[20px] sm:rounded-[16px] border border-border bg-surface"
              >
                <div
                  className={`flex items-center justify-between bg-gradient-to-br px-3 py-2 text-white ${stationStyle.grad}`}
                >
                  <p className="font-display text-5xl leading-none font-semibold tabular-nums lining-nums drop-shadow-sm">
                    {order.token}
                  </p>
                  <p className="flex items-center gap-1 text-xs tabular-nums text-white/85">
                    <Clock3 className="size-3" aria-hidden="true" />
                    {minutesAgo(tone === "ready" ? (order.readyAt ?? order.createdAt) : order.createdAt, now)}
                  </p>
                </div>
                <div className="p-3">
                  <p className="font-medium">{order.item}</p>
                  {station ? (
                    <span
                      className={`mt-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${stationStyle.chip}`}
                    >
                      {station}
                    </span>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => onAction(order.id)}
                      className={`h-11 rounded-md px-3 text-sm font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-50 bg-gradient-to-br ${
                        tone === "ready" ? "from-primary to-primary-2" : "from-ready to-ready-2"
                      }`}
                    >
                      {busyId === order.id ? "Saving…" : actionLabel}
                    </button>
                    {onSecondary && secondaryLabel ? (
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => onSecondary(order.id)}
                        className="h-11 rounded-md border border-border px-3 text-sm font-semibold transition-transform duration-150 ease-out hover:bg-surface-2 active:scale-[0.96] disabled:opacity-50"
                      >
                        {secondaryLabel}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
    </div>
  );
}
