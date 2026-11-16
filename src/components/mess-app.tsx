import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  BellOff,
  ChefHat,
  Clock3,
  Maximize2,
  Moon,
  Search,
  Sun,
  Ticket,
  UtensilsCrossed,
} from "lucide-react";
import { MENU } from "@/lib/menu";
import { stationTone } from "@/lib/station-tone";
import { getBoard, lookupToken, type Board, type Lookup } from "@/lib/orders.functions";

const WATCH_KEY = "messline-watch";
const THEME_KEY = "messline-theme";
const CHIME_KEY = "messline-chime";

const STATION_BY_ITEM = new Map<string, string>(MENU.map((item) => [item.name, item.station]));

function serviceName(date: Date) {
  const hour = date.getHours();
  if (hour < 10) return "Breakfast";
  if (hour < 15) return "Lunch";
  if (hour < 18) return "Snacks";
  return "Dinner";
}

function formatClock(date: Date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDay(date: Date) {
  return date.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
}

function minutesAgo(iso: string, now: number) {
  const mins = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min";
  return `${mins} min`;
}

let chimeCtx: AudioContext | null = null;

function playChime() {
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = chimeCtx ?? new AudioCtx();
  chimeCtx = ctx;
  if (ctx.state === "suspended") void ctx.resume();
  const start = ctx.currentTime;
  [523.25, 659.25, 783.99].forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const at = start + index * 0.11;
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.07, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.38);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.4);
  });
}

function useNow(active: boolean) {
  // Start at 0 so the server render and the first client render agree (relative
  // times read as "just now"), then jump to real time after mount. This avoids
  // a hydration mismatch on "x min" labels.
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "dark" : "light");
    setReady(true);
  }, []);

  function apply(next: "light" | "dark") {
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem(THEME_KEY, next);
    setTheme(next);
  }

  return { theme, ready, toggle: () => apply(theme === "dark" ? "light" : "dark") };
}

export function MessApp({ initial }: { initial: Board }) {
  const theme = useTheme();
  const now = useNow(true);
  const clock = useMemo(() => new Date(now), [now]);
  const [mounted, setMounted] = useState(false);
  const [watch, setWatch] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [chimeOn, setChimeOn] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const [fresh, setFresh] = useState<number[]>([]);
  const seenReady = useRef<Set<number> | null>(null);

  const boardQuery = useQuery({
    queryKey: ["board"],
    queryFn: () => getBoard(),
    initialData: initial,
    initialDataUpdatedAt: 0,
    refetchInterval: 2500,
  });
  const board = boardQuery.data;

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(WATCH_KEY);
    if (saved && /^\d+$/.test(saved)) setWatch(Number(saved));
    const chime = localStorage.getItem(CHIME_KEY);
    if (chime === "off") setChimeOn(false);
  }, []);

  useEffect(() => {
    const ids = new Set(board.ready.map((order) => order.id));
    if (seenReady.current) {
      const newly = board.ready.filter((order) => !seenReady.current?.has(order.id));
      if (newly.length > 0) {
        setFresh(newly.map((order) => order.id));
        const names = newly.map((order) => order.token).join(", ");
        setAnnouncement(`Token ${names} is ready for pickup.`);
        if (chimeOn) playChime();
      }
    }
    seenReady.current = ids;
  }, [board.ready, chimeOn]);

  useEffect(() => {
    if (!watch) return;
    const onBoard = [...board.ready, ...board.preparing].some((order) => order.token === watch);
    if (onBoard) return;
    let cancelled = false;
    lookupToken({ data: { token: watch } })
      .then((result) => {
        if (!cancelled) setLookup(result);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [board.ready, board.preparing, watch]);

  const live = useMemo(() => {
    if (!watch) return null;
    const row =
      board.ready.find((order) => order.token === watch) ??
      board.preparing.find((order) => order.token === watch);
    if (row) {
      const ahead = board.preparing.filter((order) => order.id < row.id).length;
      return { found: true as const, order: row, ahead };
    }
    if (lookup && lookup.found && lookup.order.token === watch) return lookup;
    if (lookup && !lookup.found) return lookup;
    return null;
  }, [board.preparing, board.ready, lookup, watch]);

  async function onTrack(event: FormEvent) {
    event.preventDefault();
    const token = Number(draft.trim());
    if (!Number.isInteger(token) || token < 1) {
      setLookupError("Enter the token from the counter.");
      return;
    }
    setLookupError("");
    setWatch(token);
    localStorage.setItem(WATCH_KEY, String(token));
    try {
      const result = await lookupToken({ data: { token } });
      setLookup(result);
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : "Could not check that token.");
    }
  }

  function clearWatch() {
    setWatch(null);
    setLookup(null);
    setDraft("");
    localStorage.removeItem(WATCH_KEY);
  }

  const watchedReady = live?.found === true && live.order.status === "ready";

  return (
    <div className="relative z-10 min-h-dvh">
      <div className = "header1">
        <header className="glass sticky top-0 z-20 overflow-hidden rounded-[23px]">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 overflow-hidden rounded-[138px] px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Brand */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl brand-tile text-primary-fg">
                  <UtensilsCrossed className="size-5" aria-hidden="true" />
                  <span className="live-dot absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-ready ring-2 ring-bg" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-3xl leading-none font-bold tracking-tight sm:text-4xl">
                      Messline
                    </span>
                    <span className="mt-px mb-px rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-xs font-semibold tracking-wider text-accent uppercase">
                      {mounted ? serviceName(clock) : "Today"}
                    </span>
                  </div>
                  <p className="mt-1.5 flex items-center gap-2 text-sm text-muted">
                    <span className="inline-flex items-center gap-1 font-medium text-ready">
                      <span className="live-dot size-1.5 rounded-full bg-ready" />
                      Live pickup
                    </span>
                    <span aria-hidden="true"></span>
                    <span className="tabular-nums">{mounted ? formatDay(clock) : "뿯ν뿯½뿯½"}</span>
                  </p>
                </div>
              </div>
              <p className="my-[7px] pt-[49px] px-[35px] font-display text-2xl leading-none tabular-nums lg:hidden">
                {mounted ? formatClock(clock) : ""}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-2 lg:justify-end lg:gap-3">
              <div className="flex items-center gap-2">
                <p className="mr-1 hidden font-display text-3xl leading-none tabular-nums lg:block">
                  {mounted ? formatClock(clock) : ""}
                </p>
                <IconButton
                  label={chimeOn ? "Mute call chime" : "Turn on call chime"}
                  onClick={() => {
                    const next = !chimeOn;
                    setChimeOn(next);
                    localStorage.setItem(CHIME_KEY, next ? "on" : "off");
                    if (next) playChime();
                  }}
                >
                  {chimeOn ? <Bell className="size-5" /> : <BellOff className="size-5" />}
                </IconButton>
                <IconButton
                  label={theme.theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                  onClick={theme.toggle}
                >
                  {theme.ready && theme.theme === "dark" ? (
                    <Sun className="size-5" />
                  ) : (
                    <Moon className="size-5" />
                  )}
                </IconButton>
                <IconButton
                  label="Fill the screen"
                  onClick={() => {
                    if (document.fullscreenElement) void document.exitFullscreen();
                    else void document.documentElement.requestFullscreen();
                  }}
                >
                  <Maximize2 className="size-5" />
                </IconButton>
              </div>
            </div>
          </div>
        </header>
      </div>

      <main className={`mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 ${watchedReady ? "pb-44" : "pb-[49px]"}`}>
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>

        <BoardView
          board={board}
          now={now}
          fresh={fresh}
          watch={watch}
          draft={draft}
          setDraft={setDraft}
          onTrack={onTrack}
          lookupError={lookupError}
          live={live}
          clearWatch={clearWatch}
        />

      </main>

      {watchedReady && live?.found ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ready bg-gradient-to-r from-ready to-ready-2 text-ready-fg">
          <div className="-my-4 mx-auto flex max-w-6xl items-center justify-between gap-4 overflow-hidden rounded-[23px] px-4 py-4 sm:px-6">
            <div>
              <p className="text-sm font-semibold tracking-widest uppercase">Your token is ready</p>
              <p className="font-display text-5xl leading-none font-semibold tabular-nums lining-nums">
                {live.order.token}
                <span className="ml-3 font-sans text-lg font-medium tracking-normal not-italic">
                  {live.order.item}
                </span>
              </p>
            </div>
            <p className="hidden text-base sm:block">Come to the pickup counter now.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BoardView({
  board,
  now,
  fresh,
  watch,
  draft,
  setDraft,
  onTrack,
  lookupError,
  live,
  clearWatch,
}: {
  board: Board;
  now: number;
  fresh: number[];
  watch: number | null;
  draft: string;
  setDraft: (value: string) => void;
  onTrack: (event: FormEvent) => void;
  lookupError: string;
  live: Lookup | null;
  clearWatch: () => void;
}) {
  const watchedReady = live?.found === true && live.order.status === "ready";
  const featured = board.ready.length > 0
    ? board.ready.reduce((a, b) =>
        (a.readyAt ?? a.createdAt) < (b.readyAt ?? b.createdAt) ? a : b
      )
    : null;
  const featuredStation = featured ? STATION_BY_ITEM.get(featured.item) : undefined;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-5">
      <section
        aria-label="Now serving"
        className="relative overflow-hidden rounded-2xl lg:col-span-full flex justify-center"
      >
        <img
          src={featured ? "/now-serving.jpg" : "/no-order.jpg"}
          alt={featured ? `Now serving token ${featured.token}` : "Pickup counter is clear"}
          className="w-full max-w-lg mx-auto h-auto object-cover rounded-2xl"
          loading="lazy"
        />
        {!featured && (
          <div className="pointer-events-none absolute top-0 left-1/2 h-full w-full max-w-lg -translate-x-1/2">
            <p className="absolute left-[78%] top-[32%] font-display text-2xl leading-none font-semibold italic text-[#1a1512] sm:text-3xl">
              No
              <br />
              order
            </p>
          </div>
        )}
        {featured && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg flex items-end justify-start p-5 sm:p-7">
            <div className="min-w-0">
              <p className="font-display text-7xl leading-[0.82] font-semibold tabular-nums sm:text-8xl text-black drop-shadow-lg">
                {featured.token}
              </p>
              <p className="truncate text-base font-medium text-black drop-shadow-md">
                {featured.item}
              </p>
              <p className="truncate text-sm text-black/80 drop-shadow-md">
                {featuredStation ?? "Kitchen"} · ready to collect
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="glass min-w-0 lg:col-span-3 rounded-2xl p-4 sm:p-5" aria-labelledby="ready-heading">
        <SectionHead
          id="ready-heading"
          kicker="Walk up now"
          title="Ready"
          count={board.ready.length}
        />
        {board.ready.length === 0 ? (
          <EmptyPanel
            icon={<Ticket className="size-5" />}
            title="nothing to take"
            body="Nothing is waiting. Stay where you are,  your number will light up here."
          />
        ) : (
          <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [column-fill:_balance]">
            {board.ready.map((order, index) => {
              const pinHeight = ["h-20 sm:h-24", "h-28 sm:h-36", "h-24 sm:h-28", "h-36 sm:h-44", "h-28 sm:h-32", "h-32 sm:h-40"][index % 6];
              const station = STATION_BY_ITEM.get(order.item);
              const tone = stationTone(station);
              return (
                <article
                  key={order.id}
                  className={`pinterest-card mb-4 break-inside-avoid overflow-hidden rounded-2xl glass ${
                    fresh.includes(order.id) ? "just-called" : ""
                  } ${watch === order.token ? "ring-4 ring-primary ring-offset-2 ring-offset-bg" : ""}`}
                >
                  <div
                    className={`relative flex ${pinHeight} items-center justify-center bg-gradient-to-br ${tone.grad} px-4 text-white pt-8`}
                  >
                    <div className="absolute inset-x-3 top-3 flex items-center justify-between text-[11px] font-semibold tracking-widest uppercase">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 backdrop-blur-sm">
                        <span className="size-1.5 rounded-full bg-white" />
                        Ready
                      </span>
                      <span className="tabular-nums text-white/85">
                        {minutesAgo(order.readyAt ?? order.createdAt, now)}
                      </span>
                    </div>
                    <p className="font-display text-5xl sm:text-7xl leading-none font-semibold tabular-nums lining-nums drop-shadow-sm">
                      {order.token}
                    </p>
                  </div>
                  <div className="p-3">
                    <p className="truncate text-lg font-semibold">{order.item}</p>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      {station ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${tone.chip}`}
                        >
                          {station}
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className={`text-xs font-semibold tracking-widest uppercase ${tone.text}`}>
                        Pick up
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <ol className="mt-6 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
          <Step n="1" text="Order at the counter and take your token." tone="bg-orange-500/15 text-orange-600 dark:text-orange-300" />
          <Step n="2" text="Leave the pickup counter. Don't stand in the crowd." tone="bg-teal-500/15 text-teal-600 dark:text-teal-300" />
          <Step n="3" text="Come back only when your number turns green." tone="bg-violet-500/15 text-violet-600 dark:text-violet-300" />
        </ol>
      </section>

      <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
        <section className="glass min-w-0 rounded-2xl p-4 sm:p-5" aria-labelledby="cook-heading">
          <SectionHead
            id="cook-heading"
            kicker="Still on the pass"
            title="Cooking"
            count={board.preparing.length}
          />
          {board.preparing.length === 0 ? (
            <EmptyPanel
              icon={<ChefHat className="size-5" />}
              title="Kitchen is caught up"
              body="New tokens show up here the moment the counter takes an order."
            />
          ) : (
            <div className="columns-2 gap-3 sm:columns-3 [column-fill:_balance]">
              {board.preparing.map((order, index) => {
                const pinHeight = ["h-20 sm:h-24", "h-28 sm:h-36", "h-24 sm:h-28", "h-36 sm:h-44", "h-28 sm:h-32", "h-32 sm:h-40"][index % 6];
                const station = STATION_BY_ITEM.get(order.item);
                const tone = stationTone(station);
                return (
                <article
                  key={order.id}
                  className={`pinterest-card mb-4 break-inside-avoid overflow-hidden rounded-2xl glass ${
                    watch === order.token ? "ring-4 ring-primary ring-offset-2 ring-offset-bg" : ""
                  }`}
                >
                  <div
                    className={`relative flex ${pinHeight} items-center justify-center bg-gradient-to-br ${tone.grad} px-4 text-white pt-8`}
                  >
                    {/* Background sketch text */}
                    <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
                      <span className="absolute top-1 left-2 text-[10px] font-mono italic text-white/60 rotate-[-5deg]">
                        F = ma
                      </span>
                      <span className="absolute bottom-2 right-2 text-[10px] font-mono italic text-white/60 rotate-[3deg]">
                        $ vite build
                      </span>
                      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] font-mono text-white/40 rotate-[8deg]">
                        ∮B·dl=μ₀I
                      </span>
                    </div>
                    <div className="absolute inset-x-3 top-3 flex items-center justify-between text-[11px] font-semibold tracking-widest uppercase">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 backdrop-blur-sm">
                        <span className="size-1.5 rounded-full bg-white" />
                        Cooking
                      </span>
                      <span className="tabular-nums text-white/85">
                        {minutesAgo(order.createdAt, now)}
                      </span>
                    </div>
                    <p className="font-display text-5xl sm:text-7xl leading-none font-semibold tabular-nums lining-nums drop-shadow-sm">
                      {order.token}
                    </p>
                  </div>
                  <div className="p-3">
                    <p className="truncate text-lg font-semibold">{order.item}</p>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      {station ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${tone.chip}`}
                        >
                          {station}
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className={`text-xs font-semibold tracking-widest uppercase ${tone.text}`}>
                        Cooking
                      </span>
                    </div>
                  </div>
                </article>
                );
              })}
            </div>
          )}
        </section>

        <section className={`fixed ${watchedReady ? "bottom-40" : "bottom-6"} left-1/2 -translate-x-1/2 z-20 mt-[7px] mb-[7px] rounded-3xl glass border border-border shadow-[0_8px_32px_-8px_color-mix(in_oklab,var(--fg)_30%,transparent)] overflow-hidden transition-all duration-300 ${live ? "w-[calc(100%-2rem)] max-w-lg" : "w-auto max-w-sm"}`}
          aria-labelledby="track-heading"
        >
          <div className="mx-[9px] mt-px mb-px pl-px pr-3 pt-2 pb-[5px]">
            <div className="flex items-center justify-between gap-2">
              <h2 id="track-heading" className="sr-only">Track a token</h2>
            </div>
            <form className="flex items-center gap-2" onSubmit={onTrack}>
              <label className="sr-only" htmlFor="token">
                Token number
              </label>
              <input
                id="token"
                inputMode="numeric"
                value={draft}
                onChange={(event) => setDraft(event.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="Track token…"
                autoComplete="off"
                suppressHydrationWarning
                className="-mx-px h-10 min-w-0 flex-1 rounded-full border border-border bg-bg/50 px-[13px] text-base backdrop-blur-md tabular-nums outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-primary"
              />
              <button
                type="submit"
                className="btn-primary -mx-[3px] inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-transform duration-150 ease-out active:scale-[0.96]"
              >
                <Search className="size-3.5" aria-hidden="true" />
                Check
              </button>
            </form>
            {lookupError ? (
              <p className="mt-3 text-sm text-primary" role="alert">
                {lookupError}
              </p>
            ) : null}
            {live ? <LookupCard live={live} onClear={clearWatch} /> : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function LookupCard({ live, onClear }: { live: Lookup; onClear: () => void }) {
  if (!live.found) {
    return (
      <div className="mt-4 rounded-xl bg-surface-2 px-4 py-3">
        <p className="text-lg font-medium">Not on today's board</p>
        <p className="mt-1 text-base text-muted">Tokens reset every day. Check the number again.</p>
        <button type="button" onClick={onClear} className="mt-2 text-base font-semibold text-primary">
          Clear
        </button>
      </div>
    );
  }

  const { order, ahead } = live;
  if (order.status === "ready") {
    return (
      <div className="mt-4 flex flex-col items-center text-center">
        <SuccessBadge />
        <p className="mt-4 font-display text-3xl leading-none font-semibold">Come to the pickup counter</p>
        <p className="mt-2 text-base text-muted">Token {order.token} · {order.item} is ready.</p>
        <button type="button" onClick={onClear} className="mt-5 h-11 w-full rounded-xl bg-fg text-base font-semibold text-bg">
          Done
        </button>
      </div>
    );
  }
  if (order.status === "collected") {
    return (
      <div className="mt-4 rounded-xl bg-surface-2 px-4 py-3">
        <p className="text-lg font-medium">Token {order.token} was already picked up</p>
        <p className="mt-1 text-base text-muted">{order.item}</p>
        <button type="button" onClick={onClear} className="mt-2 text-base font-semibold text-primary">
          Clear
        </button>
      </div>
    );
  }
  return (
    <div className="mt-4 flex flex-col items-center text-center">
      <SuccessBadge />
      <p className="mt-4 font-display text-3xl leading-none font-semibold">Still cooking</p>
      <p className="mt-2 text-base text-muted">
        Token {order.token} · {order.item}
        {ahead === 0 ? " is next on the pass." : ` · ${ahead} order${ahead === 1 ? "" : "s"} ahead.`}
      </p>
      <button type="button" onClick={onClear} className="mt-5 h-11 w-full rounded-xl bg-fg text-base font-semibold text-bg">
        Done
      </button>
    </div>
  );
}

function SuccessBadge() {
  return (
    <svg viewBox="0 0 24 24" className="size-20" aria-hidden="true">
      <path
        d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
        className="fill-ready-soft"
      />
      <path
        d="m9 12 2 2 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-ready"
      />
    </svg>
  );
}

function SectionHead({
  id,
  kicker,
  title,
  count,
}: {
  id: string;
  kicker: string;
  title: string;
  count?: number;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold tracking-widest text-muted uppercase">
          <span className="h-1 w-5 rounded-full bg-primary-2" />
          {kicker}
        </p>
        <h2 id={id} className="mt-1 font-display text-5xl leading-none font-semibold italic">
          {title}
        </h2>
      </div>
      {typeof count === "number" ? (
        <p className="flex size-11 items-center justify-center rounded-full bg-surface-2 font-display text-2xl leading-none text-fg tabular-nums">
          {count}
        </p>
      ) : null}
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-16 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-center backdrop-blur-sm">
      <p className="font-display text-3xl leading-none font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-[11px] font-semibold tracking-widest text-white/70 uppercase">{label}</p>
    </div>
  );
}

function Step({ n, text, tone }: { n: string; text: string; tone: string }) {
  return (
    <li className="rounded-xl border border-border bg-surface/40 px-3 py-3 backdrop-blur-md">
      <span
        className={`inline-flex size-7 items-center justify-center rounded-full font-display text-base leading-none font-semibold ${tone}`}
      >
        {n}
      </span>
      <p className="mt-2 text-base">{text}</p>
    </li>
  );
}

function EmptyPanel({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/40 px-5 py-8 backdrop-blur-md">
      <span className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <p className="mt-3 font-display text-3xl leading-none font-semibold italic">{title}</p>
      <p className=" text-base text-muted">{body}</p>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface/40 text-fg backdrop-blur-md transition-transform duration-150 ease-out active:scale-[0.96]"
    >
      {children}
    </button>
  );
}
