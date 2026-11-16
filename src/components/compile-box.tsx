import { useQuery } from "@tanstack/react-query";
import { getServerPulse, type ServerPulse } from "@/lib/orders.functions";

function formatUptime(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}

function formatEventTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const STATUS_META: Record<
  ServerPulse["events"][number]["status"],
  { label: string; tone: string }
> = {
  preparing: { label: "cooking", tone: "text-[#fbbf24]" },
  ready: { label: "ready", tone: "text-[#6ee7a8]" },
  collected: { label: "picked up", tone: "text-[#7dd3fc]" },
};

export function CompileBox() {
  const pulse = useQuery({
    queryKey: ["server-pulse"],
    queryFn: () => getServerPulse(),
    refetchInterval: 5000,
    staleTime: 2000,
    retry: 1,
  });

  const data = pulse.data;
  const live = Boolean(data);

  return (
    <div className="mt-10 flex justify-center pb-2">
      <div className="w-full max-w-md -rotate-1 overflow-hidden rounded-2xl border border-border bg-[#14110e] shadow-[6px_8px_0_0_rgba(26,21,18,0.12)]">
        <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.04] px-3 py-2">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 font-mono text-[11px] tracking-wide text-white/50">
            messline — server.log
          </span>
          <span
            className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
              live ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-white/40"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${live ? "bg-emerald-400" : "bg-white/30"}`}
            />
            {live ? "live" : "connecting"}
          </span>
        </div>

        <div className="space-y-1 px-4 py-3 font-mono text-[11px] leading-relaxed sm:text-xs">
          {pulse.isError ? (
            <p className="text-[#fca5a5]">! server unreachable — retrying…</p>
          ) : null}

          <p className="flex items-baseline gap-2">
            <span className="text-[#f4a261]">$</span>
            <span className="text-[#e9e1d3]">npm run start</span>
          </p>
          <p className="flex items-baseline gap-2">
            <span className="text-[#6ee7a8]">✓</span>
            <span className="text-[#e9e1d3]">node {data?.node ?? "…"}</span>
            <span className="ml-auto text-white/35">{data?.env ?? "…"}</span>
          </p>
          <p className="flex items-baseline gap-2">
            <span className="text-[#6ee7a8]">✓</span>
            <span className="text-[#e9e1d3]">db {data?.db ?? "…"}</span>
            <span className="ml-auto text-white/35">
              {data ? `${data.counts.ordersToday} orders today` : "…"}
            </span>
          </p>
          <p className="flex items-baseline gap-2">
            <span className="text-[#6ee7a8]">✓</span>
            <span className="text-[#e9e1d3]">
              {data ? `${data.counts.cooking} cooking` : "…"}
            </span>
            <span className="ml-auto text-white/35">
              {data ? `${data.counts.ready} ready · ${data.counts.served} served` : "…"}
            </span>
          </p>
          <p className="flex items-baseline gap-2">
            <span className="text-[#f4a261]">$</span>
            <span className="text-[#e9e1d3]">tail -f orders.log</span>
            <span className="ml-auto text-white/35">
              {data ? formatUptime(data.uptimeSec) : "…"}
            </span>
          </p>

          {data && data.events.length > 0 ? (
            data.events.map((event) => {
              const meta = STATUS_META[event.status];
              return (
                <p key={`${event.token}-${event.at}`} className="flex items-baseline gap-2">
                  <span className="text-white/30">{formatEventTime(event.at)}</span>
                  <span className="text-[#e9e1d3]">#{event.token}</span>
                  <span className="truncate text-white/55">{event.item}</span>
                  <span className={`ml-auto ${meta.tone}`}>→ {meta.label}</span>
                </p>
              );
            })
          ) : (
            <p className="text-white/35">› waiting for the first order…</p>
          )}

          <div className="!mt-3 flex items-center gap-2 border-t border-white/10 pt-2 text-[10px] text-white/30">
            <span className="text-[#6ee7a8]">●</span>
            <span>
              real server · refreshing every 5s
              {data?.commit ? ` · ${data.commit}` : ""}
            </span>
            <span className="ml-auto">{data ? formatEventTime(data.now) : ""}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
