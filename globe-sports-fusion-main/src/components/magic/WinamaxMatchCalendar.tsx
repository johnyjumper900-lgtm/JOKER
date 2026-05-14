import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Calendar, Clock, PlusCircle, RefreshCw, Search, AlertCircle, Trophy, Sparkles } from "lucide-react";
import type { CalendarMatch } from "@/types/magic";
import { fetchWinamaxFootball, type WinaMatch } from "@/server-api/winamax";
import { getWinaCache, setWinaCache } from "@/lib/winamax-cache";
import { HoloLogo } from "./HoloLogo";
import { MatchDetailModal } from "./MatchDetailModal";

interface Props {
  onAddMatch: (m: CalendarMatch) => void;
}

function toCalendarMatch(m: WinaMatch): CalendarMatch {
  const d = new Date(m.matchStart);
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const get = (t: string) => fmt.find((p) => p.type === t)?.value ?? "";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const time = `${get("hour")}:${get("minute")}`;
  return {
    id: `wina:${m.id}`,
    teamA: m.homeTeam,
    teamB: m.awayTeam,
    teamALogo: m.homeLogo ?? m.homeJersey ?? undefined,
    teamBLogo: m.awayLogo ?? m.awayJersey ?? undefined,
    date,
    time,
    league: m.tournament || m.category || "Football",
    country: m.category,
    utcDate: new Date(m.matchStart).toISOString(),
    parisDate: date,
    parisTime: time,
    realOdds: {
      home: m.odds.home ?? undefined,
      draw: m.odds.draw ?? undefined,
      away: m.odds.away ?? undefined,
      bestHome: m.odds.home ?? undefined,
      bestDraw: m.odds.draw ?? undefined,
      bestAway: m.odds.away ?? undefined,
      bookmaker: "Winamax",
      bookmakers: ["Winamax"],
      commenceTimeUTC: new Date(m.matchStart).toISOString(),
    },
  };
}

export function WinamaxMatchCalendar({ onAddMatch }: Props) {
  const fetchFn = useServerFn(fetchWinamaxFootball);
  const [q, setQ] = useState("");
  const [sportId, setSportId] = useState<number | "all">("all");
  const [showLive, setShowLive] = useState(true);
  const [selected, setSelected] = useState<WinaMatch | null>(null);
  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["winamax-all"],
    queryFn: async () => {
      const payload = await fetchFn();
      setWinaCache(payload);
      return payload;
    },
    initialData: () => getWinaCache() ?? undefined,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const sports = useMemo(() => data?.sports ?? [], [data]);

  const matches = useMemo(() => {
    let list = (data?.matches ?? []).filter((m) =>
      showLive ? m.status !== "finished" : m.status === "upcoming"
    );
    if (sportId !== "all") list = list.filter((m) => m.sportId === sportId);
    list.sort((a, b) => {
      if (a.status === "live" && b.status !== "live") return -1;
      if (b.status === "live" && a.status !== "live") return 1;
      return a.matchStart - b.matchStart;
    });
    if (!q.trim()) return list;
    const t = q.toLowerCase();
    return list.filter(
      (m) =>
        m.homeTeam.toLowerCase().includes(t) ||
        m.awayTeam.toLowerCase().includes(t) ||
        (m.tournament ?? "").toLowerCase().includes(t)
    );
  }, [data, q, sportId, showLive]);

  return (
    <div className="space-y-4 pb-32">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <HoloLogo icon={Sparkles} size={28} />
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-tight truncate">Matchs Winamax</h2>
            <p className="text-[11px] text-muted-foreground truncate">
              Cotes & matchs en direct — clique un match pour voir les maillots
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border/60 bg-card/60 px-3 py-1.5 text-xs hover:bg-card disabled:opacity-50"
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          Actualiser
        </button>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une équipe, une compétition…"
          className="w-full rounded-md border border-border/60 bg-card/60 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none snap-x ios-scroll">
        <button
          onClick={() => setSportId("all")}
          className={`shrink-0 snap-start rounded-full border px-3 py-1.5 text-xs font-bold transition ${
            sportId === "all"
              ? "border-primary bg-primary/20 text-primary"
              : "border-border/60 bg-card/60 text-muted-foreground hover:bg-card"
          }`}
        >
          Tous ({data?.matches?.length ?? 0})
        </button>
        {sports.map((s) => (
          <button
            key={s.id}
            onClick={() => setSportId(s.id)}
            className={`shrink-0 snap-start rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              sportId === s.id
                ? "border-primary bg-primary/20 text-primary"
                : "border-border/60 bg-card/60 text-muted-foreground hover:bg-card"
            }`}
          >
            {s.name} ({s.count})
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowLive((v) => !v)}
          className={`rounded-md border px-2 py-1.5 text-xs transition ${
            showLive
              ? "border-primary/60 bg-primary/10 text-primary"
              : "border-border/60 bg-card/60 text-muted-foreground hover:bg-card"
          }`}
        >
          {showLive ? "🔴 Live + à venir" : "À venir uniquement"}
        </button>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {matches.length} match{matches.length > 1 ? "s" : ""}
        </span>
      </div>

      {isLoading && (
        <div className="rounded-md border border-border/60 bg-card/40 p-6 text-center text-sm text-muted-foreground">
          Chargement des matchs Winamax…
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle size={14} className="mt-0.5" />
          <span>Impossible de récupérer les matchs Winamax pour le moment.</span>
        </div>
      )}

      {!isLoading && matches.length === 0 && !error && (
        <div className="rounded-md border border-border/60 bg-card/40 p-6 text-center text-sm text-muted-foreground">
          Aucun match trouvé pour ce filtre.
        </div>
      )}

      <div className="grid gap-3">
        {matches.map((m, i) => {
          const cm = toCalendarMatch(m);
          const isLive = m.status === "live";
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.012, 0.25) }}
              onClick={() => setSelected(m)}
              className="group relative w-full overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card/80 via-card/60 to-card/30 px-2.5 py-2 text-left transition hover:border-primary/60 hover:shadow-[0_0_20px_-8px_oklch(from_var(--primary)_l_c_h/0.55)]"
            >
              {isLive && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute -left-px top-0 h-full w-[2px] bg-red-400/80 shadow-[0_0_10px_1px_oklch(0.7_0.2_20/0.7)]"
                />
              )}

              <div className="relative flex items-center gap-2">
                {/* Team logos face-off */}
                <div className="relative flex h-9 w-12 shrink-0 items-center justify-center">
                  {m.homeLogo || m.homeJersey ? (
                    <img
                      src={m.homeLogo ?? m.homeJersey ?? ""}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="absolute left-0 h-7 w-7 rounded-full object-contain bg-background/40 ring-1 ring-border/60"
                      onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                    />
                  ) : null}
                  {m.awayLogo || m.awayJersey ? (
                    <img
                      src={m.awayLogo ?? m.awayJersey ?? ""}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="absolute right-0 h-7 w-7 rounded-full object-contain bg-background/40 ring-1 ring-border/60"
                      onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                    />
                  ) : null}
                  {!m.homeLogo && !m.awayLogo && !m.homeJersey && !m.awayJersey && (
                    <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">
                      {m.sportName.slice(0, 3)}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                    <span className="rounded bg-primary/15 px-1 py-px text-primary">
                      {m.sportName}
                    </span>
                    {isLive && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-red-500/20 px-1 py-px text-red-400">
                        <span className="h-1 w-1 animate-pulse rounded-full bg-red-400" />
                        LIVE{m.minute ? ` ${m.minute}'` : ""}
                      </span>
                    )}
                    <Trophy size={9} />
                    <span className="truncate">{m.tournament || m.category}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[12px] font-bold leading-tight">
                    {(m.homeLogo || m.homeJersey) && (
                      <img
                        src={m.homeLogo ?? m.homeJersey ?? ""}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="h-4 w-4 shrink-0 rounded-full object-contain"
                        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                      />
                    )}
                    <span className="truncate">{m.homeTeam}</span>
                    <span className="text-primary text-[10px]">vs</span>
                    {(m.awayLogo || m.awayJersey) && (
                      <img
                        src={m.awayLogo ?? m.awayJersey ?? ""}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="h-4 w-4 shrink-0 rounded-full object-contain"
                        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                      />
                    )}
                    <span className="truncate">{m.awayTeam}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-0.5">
                      <Calendar size={9} /> {cm.date}
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      <Clock size={9} /> {cm.time}
                    </span>
                    {(m.odds.home || m.odds.draw || m.odds.away) && (
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                        <span className="rounded border border-border/60 bg-card/60 px-1 leading-tight">
                          1 {m.odds.home?.toFixed(2) ?? "—"}
                        </span>
                        <span className="rounded border border-border/60 bg-card/60 px-1 leading-tight">
                          N {m.odds.draw?.toFixed(2) ?? "—"}
                        </span>
                        <span className="rounded border border-border/60 bg-card/60 px-1 leading-tight">
                          2 {m.odds.away?.toFixed(2) ?? "—"}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddMatch(cm);
                  }}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md bg-gradient-to-r from-primary to-accent px-2 py-1 text-[10px] font-bold text-primary-foreground hover:opacity-90"
                  aria-label="Ajouter au ticket"
                >
                  <PlusCircle size={11} /> Ajouter
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <MatchDetailModal
        match={selected}
        onClose={() => setSelected(null)}
        onAdd={(m) => onAddMatch(toCalendarMatch(m))}
      />
    </div>
  );
}

export default WinamaxMatchCalendar;
