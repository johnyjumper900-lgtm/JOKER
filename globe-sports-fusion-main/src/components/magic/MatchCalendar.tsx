import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  PlusCircle,
  RefreshCw,
  Search,
  AlertCircle,
  X,
  MapPin,
  Trophy,
  TrendingUp,
  History as HistoryIcon,
  Building2,
  Sparkles,
  Activity,
  SlidersHorizontal,
} from "lucide-react";
import { repairedInvoke } from "@/lib/auto-repair";
import { persistMatchesToCloud, getCachedMatches, getCachedOddsBulk, getCachedTeamsBulk, matchKey as buildMatchKey } from "@/lib/cloud-cache";
import type { CalendarMatch } from "@/types/magic";
import { HoloCard } from "./HoloCard";
import { HoloLogo } from "./HoloLogo";
import { TeamCrest, CountryFlag, TeamKit } from "./TeamCrest";
import { MatchHeroFx } from "./MatchHeroFx";
import { TheSportsDB, type SDBEvent } from "@/lib/thesportsdb";
import { fetchTeamMeta, type TeamMeta } from "@/lib/team-meta";
import { utcToParisLong, hasOddsApiKey } from "@/lib/odds-api";
import { onKeysUpdated } from "@/lib/keys-events";
import { MotivationBadge } from "./MotivationBadge";
import { WeatherCard } from "./WeatherCard";
import { TeamRadar } from "./TeamRadar";
import { GoalsHeatmap } from "./GoalsHeatmap";

interface MatchCalendarProps {
  onAddMatch: (m: CalendarMatch) => void;
}

/**
 * Garde uniquement les matchs à venir (heure de Paris).
 * - On considère "à venir" tout match dont le coup d'envoi est strictement
 *   postérieur à l'instant présent.
 * - Si on n'a pas de timestamp UTC, on reconstruit l'heure depuis date+time
 *   en supposant qu'elles sont déjà en Europe/Paris (cas du cache cloud).
 */
function isFutureMatch(m: { utc?: string; utcDate?: string; date?: string; time?: string }): boolean {
  const nowMs = Date.now();
  const iso = m.utc || m.utcDate;
  if (iso) {
    const t = Date.parse(iso);
    if (Number.isFinite(t)) return t > nowMs;
  }
  if (m.date && m.time) {
    // date/time sont en heure de Paris → on calcule l'offset Paris en évaluant la diff UTC
    const [y, mo, d] = m.date.split("-").map(Number);
    const [hh, mm] = m.time.split(":").map(Number);
    if ([y, mo, d, hh, mm].every((n) => Number.isFinite(n))) {
      const guessUtc = Date.UTC(y, (mo ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
      // Estime l'offset Paris (CET=+1, CEST=+2). On retire l'offset pour obtenir l'instant UTC.
      const probe = new Date(guessUtc);
      const tz = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", timeZoneName: "shortOffset" })
        .formatToParts(probe)
        .find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
      const off = /GMT([+-]\d+)/.exec(tz);
      const hours = off ? parseInt(off[1], 10) : 1;
      const realUtc = guessUtc - hours * 3600_000;
      return realUtc > nowMs;
    }
  }
  // Sans info exploitable : on garde par sécurité
  return true;
}

interface TeamForm {
  meta: TeamMeta;
  lastEvents: SDBEvent[];
  /** "W" / "D" / "L" sequence for the last 5 finished games */
  form: Array<"W" | "D" | "L">;
  goalsFor: number;
  goalsAgainst: number;
}

interface H2HSummary {
  total: number;
  homeWins: number;
  awayWins: number;
  draws: number;
  recent: SDBEvent[];
}

function computeForm(team: string, evs: SDBEvent[]): TeamForm["form"] {
  const t = team.toLowerCase();
  return evs
    .filter((e) => e.intHomeScore != null && e.intAwayScore != null)
    .slice(0, 5)
    .map((e) => {
      const h = parseInt(e.intHomeScore || "0", 10);
      const a = parseInt(e.intAwayScore || "0", 10);
      const isHome = e.strHomeTeam?.toLowerCase().includes(t);
      if (h === a) return "D" as const;
      if (isHome) return h > a ? "W" : "L";
      return a > h ? "W" : "L";
    });
}

function sumGoals(team: string, evs: SDBEvent[]) {
  const t = team.toLowerCase();
  let gf = 0;
  let ga = 0;
  for (const e of evs.slice(0, 5)) {
    const h = parseInt(e.intHomeScore || "0", 10);
    const a = parseInt(e.intAwayScore || "0", 10);
    if (Number.isNaN(h) || Number.isNaN(a)) continue;
    const isHome = e.strHomeTeam?.toLowerCase().includes(t);
    if (isHome) {
      gf += h;
      ga += a;
    } else {
      gf += a;
      ga += h;
    }
  }
  return { gf, ga };
}

function computeH2H(home: string, away: string, evs: SDBEvent[]): H2HSummary {
  const h = home.toLowerCase();
  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;
  const finished = evs.filter((e) => e.intHomeScore != null && e.intAwayScore != null);
  for (const e of finished) {
    const sh = parseInt(e.intHomeScore || "0", 10);
    const sa = parseInt(e.intAwayScore || "0", 10);
    if (sh === sa) {
      draws++;
      continue;
    }
    const homeIsHomeTeam = e.strHomeTeam?.toLowerCase().includes(h);
    const winnerIsHome = sh > sa;
    if (homeIsHomeTeam === winnerIsHome) homeWins++;
    else awayWins++;
  }
  return {
    total: finished.length,
    homeWins,
    awayWins,
    draws,
    recent: finished.slice(0, 5),
  };
}

const formatParisDateShort = (date?: string, utcDate?: string) => {
  const raw = utcDate || (date ? `${date}T12:00:00Z` : "");
  const d = raw ? new Date(raw) : null;
  if (!d || Number.isNaN(d.getTime())) return date || "—";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(d);
};

const formatParisKickoff = (m: CalendarMatch) => {
  if (m.utcDate) {
    const d = new Date(m.utcDate);
    if (!Number.isNaN(d.getTime())) {
      return new Intl.DateTimeFormat("fr-FR", {
        timeZone: "Europe/Paris",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    }
  }
  return m.parisTime || m.time || "—";
};

const FormBadge = ({ r }: { r: "W" | "D" | "L" }) => {
  const cls =
    r === "W"
      ? "bg-success text-success-foreground"
      : r === "L"
        ? "bg-destructive text-destructive-foreground"
        : "bg-muted text-muted-foreground border border-border";
  return (
    <span
      className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black ${cls}`}
    >
      {r}
    </span>
  );
};

/**
 * Hydrate les logos des équipes depuis teams_cache (Cloud) — résout le cas où
 * 200+ logos sont stockés mais ne s'affichent pas faute de jointure côté UI.
 */
async function hydrateTeamLogos(list: CalendarMatch[]): Promise<CalendarMatch[]> {
  if (!list.length) return list;
  const names = Array.from(new Set(list.flatMap((m) => [m.teamA, m.teamB]).filter(Boolean)));
  if (!names.length) return list;
  try {
    const cache = await getCachedTeamsBulk(names);
    const norm = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return list.map((m) => {
      const a = cache[norm(m.teamA)];
      const b = cache[norm(m.teamB)];
      return {
        ...m,
        teamALogo: m.teamALogo || a?.badge_url || undefined,
        teamBLogo: m.teamBLogo || b?.badge_url || undefined,
        country: m.country || a?.country || undefined,
        countryCode: m.countryCode || a?.country_code || undefined,
      };
    });
  } catch {
    return list;
  }
}

type SportKey = "soccer" | "basketball" | "tennis";

const SPORT_OPTIONS: Array<{ key: SportKey; label: string; sdb: string }> = [
  { key: "soccer", label: "Foot", sdb: "Soccer" },
  { key: "basketball", label: "Basket", sdb: "Basketball" },
  { key: "tennis", label: "Tennis", sdb: "Tennis" },
];

async function fetchSportEvents(sport: SportKey, daysAhead: number): Promise<CalendarMatch[]> {
  const sdb = SPORT_OPTIONS.find((s) => s.key === sport)?.sdb || "Soccer";
  const days = Math.min(14, Math.max(3, daysAhead));
  const out: CalendarMatch[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    try {
      const json = await TheSportsDB.eventsOnDate(dateStr, sdb);
      const events: SDBEvent[] = (json as { events?: SDBEvent[] } | null)?.events ?? [];
      for (const ev of events) {
        if (!ev.strHomeTeam || !ev.strAwayTeam) continue;
        const iso = (ev as { strTimestamp?: string }).strTimestamp
          || `${ev.dateEvent || dateStr}T${ev.strTime || "00:00:00"}Z`;
        out.push({
          id: `sdb-${ev.idEvent}`,
          teamA: ev.strHomeTeam,
          teamB: ev.strAwayTeam,
          teamALogo: ev.strHomeTeamBadge,
          teamBLogo: ev.strAwayTeamBadge,
          league: ev.strLeague || sdb,
          country: ev.strCountry,
          date: dateStr,
          time: (ev.strTime || "").slice(0, 5),
          utc: iso,
          utcDate: iso,
          venue: ev.strVenue,
          status: ev.strStatus,
        } as CalendarMatch);
      }
    } catch {
      /* noop */
    }
  }
  return out;
}

export const MatchCalendar = ({ onAddMatch }: MatchCalendarProps) => {
  const [sport, setSport] = useState<SportKey>(() => {
    try {
      return (localStorage.getItem("magic.sport") as SportKey) || "soccer";
    } catch {
      return "soccer";
    }
  });
  const [matches, setMatches] = useState<CalendarMatch[]>([]);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [daysAhead, setDaysAhead] = useState<number>(() => {
    try {
      return Math.min(31, Math.max(7, Number(localStorage.getItem("magic.matchDaysAhead")) || 7));
    } catch {
      return 7;
    }
  });
  const [selectedLeague, setSelectedLeague] = useState<string>(() => {
    try {
      return localStorage.getItem("magic.selectedLeague") || "all";
    } catch {
      return "all";
    }
  });
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<CalendarMatch | null>(null);

  // Detail-modal enriched data
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [homeForm, setHomeForm] = useState<TeamForm | null>(null);
  const [awayForm, setAwayForm] = useState<TeamForm | null>(null);
  const [h2h, setH2h] = useState<H2HSummary | null>(null);

  useEffect(() => {
    try { localStorage.setItem("magic.sport", sport); } catch {/* noop */}
  }, [sport]);


  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      // Sports non-foot : pipeline TheSportsDB direct (sans cloud cache)
      if (sport !== "soccer") {
        const list = await fetchSportEvents(sport, daysAhead);
        const sorted = list
          .filter(isFutureMatch)
          .sort((a, b) => (a.utc || "").localeCompare(b.utc || ""));
        setMatches(sorted);
        setLastUpdate(new Date());
        return;
      }
      // Fetch fresh APIs
      const { data, error: invokeErr } = await repairedInvoke<{
        matches?: CalendarMatch[];
        error?: string;
      }>(
        "fetch-matches",
        {
          daysAhead,
          league: selectedLeague === "all" ? undefined : selectedLeague,
        },
        { label: "Calendrier", maxAttempts: 3 },
      );
      if (invokeErr) throw invokeErr;
      if (data?.error) {
        setError(data.error);
        setMatches([]);
      } else {
        const fetched = (data?.matches ?? []) as CalendarMatch[];
        
        // Fetch Cloud matches again to get EVERYTHING that is cached
        const cached = await getCachedMatches(daysAhead);
        const keys = cached.map((m) => m.match_key);
        const oddsMap = await getCachedOddsBulk(keys);
        const mappedCached: CalendarMatch[] = cached.map((m) => {
          const o = oddsMap[m.match_key];
          const dt = new Date(m.commence_time);
          return {
            id: `cache-${m.match_key}`,
            teamA: m.home_team,
            teamB: m.away_team,
            league: m.league ?? "—",
            date: m.paris_date ?? dt.toISOString().slice(0, 10),
            time: m.paris_time ?? dt.toISOString().slice(11, 16),
            utc: m.commence_time,
            utcDate: m.commence_time,
            realOdds: o
              ? {
                  home: o.home ?? undefined,
                  draw: o.draw ?? undefined,
                  away: o.away ?? undefined,
                  bestHome: o.best_home ?? undefined,
                  bestDraw: o.best_draw ?? undefined,
                  bestAway: o.best_away ?? undefined,
                  bookmakers: o.bookmakers ?? undefined,
                  commenceTimeUTC: o.commence_time ?? undefined,
                }
              : undefined,
          } as CalendarMatch;
        });

        const seen = new Set<string>();
        const merged: CalendarMatch[] = [];
        
        // Add fresh fetch first, then cached
        for(const m of [...fetched, ...mappedCached]) {
            const key = `${m.teamA?.toLowerCase()}|${m.teamB?.toLowerCase()}|${m.date}`;
            if (!seen.has(key)) {
                seen.add(key);
                merged.push(m);
            } else if (m.realOdds) {
                // If it exists but we have realOdds now, we could try to upgrade it. Let's keep it simple.
            }
        }
        
        const sorted = merged.filter(isFutureMatch).sort((a,b) => (a.utc || "").localeCompare(b.utc || ""));
        const hydrated = await hydrateTeamLogos(sorted);
        setMatches(hydrated);
        setLastUpdate(new Date());

        // Persistance cloud — préserve les matchs fraîchement fetchés
        if (fetched.length) {
          persistMatchesToCloud(fetched as never)
            .then((r) => console.log(`[cache] ${r.matches} matchs / ${r.odds} cotes persistés`))
            .catch((e) => console.warn("[cache] persist échec:", e));
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
      setMatches([]);
    } finally {
      setIsRefreshing(false);
    }
  }, [daysAhead, selectedLeague, sport]);

  // Au démarrage : afficher d'abord les matchs du cache cloud (instantané, sans clés API)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cached = await getCachedMatches(daysAhead);
        if (cancelled || !cached.length) return;
        const keys = cached.map((m) => m.match_key);
        const oddsMap = await getCachedOddsBulk(keys);
        const mapped: CalendarMatch[] = cached.map((m) => {
          const o = oddsMap[m.match_key];
          const dt = new Date(m.commence_time);
          return {
            id: `cache-${m.match_key}`,
            teamA: m.home_team,
            teamB: m.away_team,
            league: m.league ?? "—",
            date: m.paris_date ?? dt.toISOString().slice(0, 10),
            time: m.paris_time ?? dt.toISOString().slice(11, 16),
            utc: m.commence_time,
            utcDate: m.commence_time,
            realOdds: o
              ? {
                  home: o.home ?? undefined,
                  draw: o.draw ?? undefined,
                  away: o.away ?? undefined,
                  bestHome: o.best_home ?? undefined,
                  bestDraw: o.best_draw ?? undefined,
                  bestAway: o.best_away ?? undefined,
                  bookmakers: o.bookmakers ?? undefined,
                  commenceTimeUTC: o.commence_time ?? undefined,
                }
              : undefined,
          } as CalendarMatch;
        });
        const hydrated = await hydrateTeamLogos(mapped.filter(isFutureMatch));
        if (!cancelled) {
          setMatches((prev) => (prev.length ? prev : hydrated));
        }
      } catch (e) {
        console.warn("[cache] hydrate échec:", e);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = window.setTimeout(refresh, 450);
    return () => window.clearTimeout(id);
  }, [daysAhead, selectedLeague, sport, refresh]);

  useEffect(() => {
    const interval = setInterval(refresh, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Auto-refresh whenever the user adds/updates/removes an API key in Settings
  // so matches, kickoff times, dates and odds reflect the new sources instantly.
  useEffect(() => onKeysUpdated(refresh), [refresh]);

  useEffect(() => {
    try {
      localStorage.setItem("magic.matchDaysAhead", String(daysAhead));
      localStorage.setItem("magic.selectedLeague", selectedLeague);
    } catch {
      /* noop */
    }
  }, [daysAhead, selectedLeague]);

  const realSourceActive = useMemo(
    () =>
      matches.some(
        (m) =>
          m.id.startsWith("apis-") ||
          Boolean(m.teamALogo || m.teamBLogo || m.countryFlag || m.realOdds),
      ) || hasOddsApiKey(),
    [matches],
  );

  const leagues = useMemo(
    () =>
      Array.from(new Set(matches.map((m) => m.league).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [matches],
  );

  useEffect(() => {
    if (selectedLeague !== "all" && matches.length && !leagues.includes(selectedLeague)) {
      setSelectedLeague("all");
      setSelectedDate("all");
    }
  }, [leagues, matches.length, selectedLeague]);

  // Whenever a match is selected, load deep info (parallel)
  useEffect(() => {
    if (!detail) {
      setHomeForm(null);
      setAwayForm(null);
      setH2h(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    setHomeForm(null);
    setAwayForm(null);
    setH2h(null);

    (async () => {
      try {
        const [metaA, metaB, h2hRaw] = await Promise.all([
          fetchTeamMeta(detail.teamA),
          fetchTeamMeta(detail.teamB),
          TheSportsDB.headToHead(detail.teamA, detail.teamB).catch(() => null),
        ]);

        const [lastA, lastB] = await Promise.all([
          metaA.id ? TheSportsDB.lastTeamEvents(metaA.id).catch(() => null) : Promise.resolve(null),
          metaB.id ? TheSportsDB.lastTeamEvents(metaB.id).catch(() => null) : Promise.resolve(null),
        ]);

        if (cancelled) return;

        const evsA: SDBEvent[] = (lastA as { results?: SDBEvent[] } | null)?.results ?? [];
        const evsB: SDBEvent[] = (lastB as { results?: SDBEvent[] } | null)?.results ?? [];
        const ga = sumGoals(detail.teamA, evsA);
        const gb = sumGoals(detail.teamB, evsB);
        setHomeForm({
          meta: metaA,
          lastEvents: evsA,
          form: computeForm(detail.teamA, evsA),
          goalsFor: ga.gf,
          goalsAgainst: ga.ga,
        });
        setAwayForm({
          meta: metaB,
          lastEvents: evsB,
          form: computeForm(detail.teamB, evsB),
          goalsFor: gb.gf,
          goalsAgainst: gb.ga,
        });

        const h2hEvents: SDBEvent[] = (h2hRaw as { event?: SDBEvent[] } | null)?.event ?? [];
        setH2h(computeH2H(detail.teamA, detail.teamB, h2hEvents));
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [detail]);

  const dates = useMemo(
    () => Array.from(new Set(matches.map((m) => m.date))).sort((a, b) => a.localeCompare(b)),
    [matches],
  );

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return matches.filter((m) => {
      const matchSearch =
        !term ||
        m.teamA.toLowerCase().includes(term) ||
        m.teamB.toLowerCase().includes(term) ||
        m.league.toLowerCase().includes(term);
      const matchDate = selectedDate === "all" || m.date === selectedDate;
      return matchSearch && matchDate;
    });
  }, [matches, search, selectedDate]);

  return (
    <>
      <HoloCard variant="cyan">
        <div className="flex flex-col">
          <div className="p-4 border-b border-border/60">
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <HoloLogo icon={Calendar} size={38} />
                <div className="min-w-0">
                  <h2 className="text-xs font-display font-black uppercase tracking-[0.2em] holo-text truncate">
                    Calendrier · Live
                  </h2>
                  <p className="text-[8.5px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5 truncate">
                    {realSourceActive
                      ? "Données réelles vérifiées · Auto 10min"
                      : "Heure FR · Auto 10min"}
                  </p>
                </div>
              </div>
              <button
                onClick={refresh}
                disabled={isRefreshing}
                className="tap flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest shrink-0"
                aria-label="Rafraîchir"
              >
                <RefreshCw size={11} className={isRefreshing ? "animate-spin text-primary" : ""} />
                {lastUpdate.toLocaleTimeString("fr-FR", {
                  timeZone: "Europe/Paris",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </button>
            </div>

            {/* Switcher Sport — Foot / Basket / Tennis */}
            <div className="flex gap-1.5 mb-3 p-1 rounded-xl bg-muted/30 border border-border/60">
              {SPORT_OPTIONS.map((s) => {
                const isActive = sport === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => {
                      setSport(s.key);
                      setSelectedLeague("all");
                      setSelectedDate("all");
                    }}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all tap min-h-11 ${
                      isActive
                        ? "bg-gradient-prism text-primary-foreground shadow-holo"
                        : "text-muted-foreground active:bg-muted/40"
                    }`}
                    aria-pressed={isActive}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            <div className="relative mb-3">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Équipe, ligue..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-input/60 border border-border rounded-lg pl-9 pr-3 py-2.5 text-[13px] font-bold text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="mb-3 rounded-xl border border-border/70 bg-muted/25 p-3">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <SlidersHorizontal size={13} className="text-primary shrink-0" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground truncate">
                    Recherche matchs
                  </span>
                </div>
                <span className="text-[10px] font-display font-black text-primary shrink-0">
                  {daysAhead} jours
                </span>
              </div>
              <input
                type="range"
                min={7}
                max={31}
                step={1}
                value={daysAhead}
                onChange={(e) => setDaysAhead(Number(e.target.value))}
                className="w-full accent-primary"
                aria-label="Nombre de jours à rechercher"
              />
              <select
                value={selectedLeague}
                onChange={(e) => {
                  setSelectedLeague(e.target.value);
                  setSelectedDate("all");
                }}
                className="mt-2 w-full rounded-lg border border-border bg-input/70 px-3 py-2.5 text-[12px] font-bold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-label="Championnat"
              >
                <option value="all">Tous les championnats</option>
                {leagues.map((league) => (
                  <option key={league} value={league}>
                    {league}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1">
              <button
                onClick={() => setSelectedDate("all")}
                className={`shrink-0 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                  selectedDate === "all"
                    ? "bg-gradient-prism text-primary-foreground border-transparent shadow-holo"
                    : "bg-muted/40 border-border text-muted-foreground"
                }`}
              >
                Tous
              </button>
              {dates.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className={`shrink-0 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                    selectedDate === d
                      ? "bg-gradient-prism text-primary-foreground border-transparent shadow-holo"
                      : "bg-muted/40 border-border text-muted-foreground"
                  }`}
                >
                  {formatParisDateShort(d)}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[460px] overflow-y-auto p-2 space-y-1.5 scrollbar-none">
            {error && (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <AlertCircle size={28} className="text-accent mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest text-accent">
                  {error}
                </p>
              </div>
            )}

            {!error && isRefreshing && matches.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 opacity-60">
                <RefreshCw size={28} className="text-primary mb-2 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Chargement...
                </p>
              </div>
            )}

            {!error && !isRefreshing && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 opacity-40">
                <Calendar size={28} className="text-muted-foreground mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Aucun match
                </p>
              </div>
            )}

            {!error && !isRefreshing && filtered.length > 0 && (
              <div className="px-2 py-1 text-[8.5px] font-black uppercase tracking-widest text-muted-foreground">
                {filtered.length} match{filtered.length > 1 ? "s" : ""} · {dates.length} jour
                {dates.length > 1 ? "s" : ""} ·{" "}
                {selectedLeague === "all" ? "tous championnats" : selectedLeague}
              </div>
            )}

            {filtered.map((m, idx) => {
              const kickoff = formatParisKickoff(m);
              const bestOdd = m.realOdds
                ? Math.max(
                    m.realOdds.home ?? 0,
                    m.realOdds.draw ?? 0,
                    m.realOdds.away ?? 0,
                  )
                : 0;
              return (
                <div
                  key={m.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetail(m)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setDetail(m);
                    }
                  }}
                  className="tap w-full p-2.5 sm:p-3 bg-muted/30 border border-border rounded-lg flex items-center gap-2 text-left hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-holo flex flex-col items-center justify-center shrink-0 font-display font-black text-primary-foreground shadow-holo leading-none">
                    <span className="text-[10px]">{kickoff}</span>
                    <span className="text-[7.5px] opacity-80 mt-0.5">FR</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <TeamCrest src={m.teamALogo} name={m.teamA} size={22} />
                    <TeamCrest src={m.teamBLogo} name={m.teamB} size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CountryFlag code={m.countryCode} src={m.countryFlag} size={11} />
                      <p className="text-[8px] font-black text-primary uppercase tracking-widest truncate">
                        {m.league}
                      </p>
                      <MotivationBadge home={m.teamA} away={m.teamB} league={m.league} compact />
                    </div>
                    <p className="text-[11px] font-display font-black text-foreground uppercase truncate">
                      {m.teamA} <span className="text-muted-foreground italic">vs</span> {m.teamB}
                    </p>
                    <p className="text-[9px] text-muted-foreground truncate">
                      {m.realOdds && (m.realOdds.home || m.realOdds.draw || m.realOdds.away)
                        ? `1 ${m.realOdds.home?.toFixed(2) ?? "—"} · N ${m.realOdds.draw?.toFixed(2) ?? "—"} · 2 ${m.realOdds.away?.toFixed(2) ?? "—"}`
                        : "Cotes en attente"}
                    </p>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground truncate">
                      {formatParisDateShort(m.date, m.utcDate)} · {kickoff} FR
                    </p>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                    {bestOdd > 0 ? (
                      <>
                        <div className="text-sm font-display font-black holo-text leading-none">
                          {bestOdd.toFixed(2)}
                        </div>
                        <div className="text-[7px] font-black uppercase tracking-widest text-success">
                          Réelle
                        </div>
                      </>
                    ) : (
                      <div className="text-[7px] font-black uppercase tracking-widest text-muted-foreground">
                        IA
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddMatch(m);
                      }}
                      className="tap mt-1 p-1.5 rounded-full bg-primary/20 border border-primary/40 hover:bg-primary/30 transition-all active:scale-90"
                      title="Sélectionner directement"
                      aria-label={`Ajouter ${m.teamA} vs ${m.teamB}`}
                    >
                      <PlusCircle size={18} className="text-primary" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </HoloCard>

      {/* Detailed modal — H2H, form, real odds, kits, country */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-md p-4"
          onClick={() => setDetail(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md max-h-[calc(100dvh-1rem)] sm:max-h-[88vh] overflow-y-auto rounded-3xl glass-strong shadow-prism animate-fade-in-up overscroll-contain"
          >
            {/* Futuristic hero — stadium parallax + 3D crests + jersey + odds prism */}
            <div className="p-3">
              <MatchHeroFx
                teamA={detail.teamA}
                teamB={detail.teamB}
                teamALogoUrl={detail.teamALogo || homeForm?.meta.badge}
                teamBLogoUrl={detail.teamBLogo || awayForm?.meta.badge}
                teamAJerseyUrl={homeForm?.meta.kit}
                teamBJerseyUrl={awayForm?.meta.kit}
                odds={detail.realOdds}
                league={detail.league}
                countryCode={detail.countryCode}
                kickoff={`${formatParisDateShort(detail.date, detail.utcDate)} · ${formatParisKickoff(detail)} FR`}
              />
            </div>
            <div className="relative p-5 border-b border-border/60">
              <button
                onClick={() => setDetail(null)}
                className="tap absolute top-4 right-4 w-9 h-9 rounded-full glass flex items-center justify-center z-20"
                aria-label="Fermer"
              >
                <X size={16} />
              </button>

              {/* Info section below MatchHeroFx */}
              <div className="flex items-center justify-center py-2">
                 <div className="h-px w-24 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
            </div>

            <div className="p-5 space-y-3">
              {/* Date / heure / stade en haut */}
              {(detail.leagueLogo ||
                detail.leagueEmblem ||
                detail.country ||
                detail.countryFlag) && (
                <div className="glass rounded-xl p-3 flex items-center gap-3">
                  {(detail.leagueLogo || detail.leagueEmblem) && (
                    <TeamCrest
                      src={detail.leagueLogo || detail.leagueEmblem}
                      name={detail.league}
                      size={34}
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-[8.5px] font-bold uppercase tracking-widest text-muted-foreground">
                      Compétition vérifiée
                    </p>
                    <p className="text-xs font-display font-black text-foreground uppercase truncate">
                      {detail.league}
                    </p>
                    {detail.country && (
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest truncate">
                        {detail.country}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Date / heure / stade en haut */}
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                <div className="glass rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-[8.5px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                    <Calendar size={10} /> Date · Heure FR
                  </div>
                  <p className="text-[11px] font-display font-black text-foreground leading-tight">
                    {detail.utcDate
                      ? utcToParisLong(detail.utcDate)
                      : `${formatParisDateShort(detail.date)} · ${formatParisKickoff(detail)} FR`}
                  </p>
                </div>
                <div className="glass rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-[8.5px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                    <Clock size={10} /> Coup d'envoi
                  </div>
                  <p className="text-xs font-display font-black holo-text">
                    {formatParisKickoff(detail)} FR
                  </p>
                </div>
                {(detail.venue || homeForm?.meta.stadium) && (
                  <div className="glass rounded-xl p-3 col-span-2">
                    <div className="flex items-center gap-1.5 text-[8.5px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                      <MapPin size={10} /> Stade
                    </div>
                    <p className="text-xs font-display font-black text-foreground truncate">
                      {detail.venue || homeForm?.meta.stadium}
                    </p>
                  </div>
                )}
              </div>

              {/* Vraies cotes */}
              {detail.realOdds && (
                <div className="glass rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-[8.5px] font-bold uppercase tracking-widest text-muted-foreground">
                      <TrendingUp size={10} /> Cotes bookmakers
                    </div>
                    <span className="text-[8px] font-bold text-success uppercase tracking-widest">
                      ✓ Réelles
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      {
                        k: "1",
                        label: "Domicile",
                        o: detail.realOdds.home,
                        p: detail.realOdds.impliedHome,
                      },
                      {
                        k: "N",
                        label: "Nul",
                        o: detail.realOdds.draw,
                        p: detail.realOdds.impliedDraw,
                      },
                      {
                        k: "2",
                        label: "Extérieur",
                        o: detail.realOdds.away,
                        p: detail.realOdds.impliedAway,
                      },
                    ].map((c) => (
                      <div
                        key={c.k}
                        className="rounded-lg bg-primary/5 border border-primary/30 p-2 text-center"
                      >
                        <div className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                          {c.label}
                        </div>
                        <div className="text-base font-display font-black holo-text mt-0.5">
                          {c.o ? c.o.toFixed(2) : "—"}
                        </div>
                        {c.p != null && (
                          <div className="text-[8px] font-bold text-primary/80 mt-0.5">
                            {Math.round(c.p)}%
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {(detail.realOdds.bookmakers?.length ?? 0) > 0 && (
                    <p className="mt-2 text-[8px] text-muted-foreground italic break-words">
                      Médiane sur {detail.realOdds.bookmakers?.length ?? 0} bookmakers :{" "}
                      {detail.realOdds.bookmakers?.slice(0, 4).join(", ")}
                    </p>
                  )}
                </div>
              )}

              {!detail.realOdds && (
                <div className="glass rounded-xl p-3 border border-dashed border-border">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                    <Sparkles size={10} className="text-primary" /> Cotes réelles
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    Active une clé The Odds API gratuite dans les Réglages pour afficher les vraies
                    cotes bookmakers (1X2, médiane EU).
                  </p>
                </div>
              )}

              {/* Forme récente */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { who: detail.teamA, form: homeForm },
                  { who: detail.teamB, form: awayForm },
                ].map((side) => (
                  <div key={side.who} className="glass rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-[8.5px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                      <Trophy size={10} /> Forme · 5 derniers
                    </div>
                    {loadingDetail && !side.form ? (
                      <p className="text-[9px] text-muted-foreground italic">Chargement...</p>
                    ) : side.form?.form.length ? (
                      <>
                        <div className="flex gap-1 mb-2">
                          {side.form.form.map((r, i) => (
                            <FormBadge key={i} r={r} />
                          ))}
                        </div>
                        <p className="text-[9px] text-muted-foreground font-bold">
                          Buts · {side.form.goalsFor} <span className="opacity-60">/</span>{" "}
                          {side.form.goalsAgainst}
                        </p>
                      </>
                    ) : (
                      <p className="text-[9px] text-muted-foreground italic">Pas de données</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Enjeux du match */}
              <MotivationBadge home={detail.teamA} away={detail.teamB} league={detail.league} />

              {/* Météo au coup d'envoi */}
              <WeatherCard
                venue={detail.venue || homeForm?.meta.stadium}
                utcDate={detail.utcDate}
              />

              {/* Radar comparatif des équipes */}
              {homeForm?.lastEvents.length || awayForm?.lastEvents.length ? (
                <div className="glass rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-[8.5px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    <Activity size={10} /> Radar comparatif
                  </div>
                  <TeamRadar
                    homeName={detail.teamA}
                    awayName={detail.teamB}
                    homeEvents={homeForm?.lastEvents ?? []}
                    awayEvents={awayForm?.lastEvents ?? []}
                  />
                </div>
              ) : null}

              {/* Heatmap des buts */}
              {homeForm?.lastEvents.length || awayForm?.lastEvents.length ? (
                <div className="glass rounded-xl p-3 space-y-3">
                  {homeForm?.lastEvents.length ? (
                    <GoalsHeatmap team={detail.teamA} events={homeForm.lastEvents} />
                  ) : null}
                  {awayForm?.lastEvents.length ? (
                    <GoalsHeatmap team={detail.teamB} events={awayForm.lastEvents} />
                  ) : null}
                </div>
              ) : null}
              <div className="glass rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-[8.5px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  <HistoryIcon size={10} /> Confrontations directes
                </div>
                {loadingDetail && !h2h ? (
                  <p className="text-[9px] text-muted-foreground italic">Chargement...</p>
                ) : h2h && h2h.total > 0 ? (
                  <>
                    <div className="grid grid-cols-3 gap-1.5 mb-2">
                      <div className="rounded-md bg-primary/10 border border-primary/30 p-1.5 text-center">
                        <div className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                          {detail.teamA.split(" ")[0]}
                        </div>
                        <div className="text-sm font-display font-black holo-text">
                          {h2h.homeWins}
                        </div>
                      </div>
                      <div className="rounded-md bg-muted/40 border border-border p-1.5 text-center">
                        <div className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                          Nuls
                        </div>
                        <div className="text-sm font-display font-black text-muted-foreground">
                          {h2h.draws}
                        </div>
                      </div>
                      <div className="rounded-md bg-primary/10 border border-primary/30 p-1.5 text-center">
                        <div className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                          {detail.teamB.split(" ")[0]}
                        </div>
                        <div className="text-sm font-display font-black holo-text">
                          {h2h.awayWins}
                        </div>
                      </div>
                    </div>
                    <p className="text-[9px] text-muted-foreground font-bold">
                      {h2h.total} confrontation{h2h.total > 1 ? "s" : ""} analysée
                      {h2h.total > 1 ? "s" : ""}
                    </p>
                    {h2h.recent.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {h2h.recent.slice(0, 3).map((e) => (
                          <div
                            key={e.idEvent}
                            className="flex items-center justify-between text-[9px] py-0.5 border-t border-border/30 pt-1"
                          >
                            <span className="text-muted-foreground truncate flex-1">
                              {e.dateEvent}
                            </span>
                            <span className="font-bold text-foreground truncate flex-[2]">
                              {e.strHomeTeam}{" "}
                              <span className="holo-text font-display font-black">
                                {e.intHomeScore}-{e.intAwayScore}
                              </span>{" "}
                              {e.strAwayTeam}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-[9px] text-muted-foreground italic">
                    Aucune confrontation directe trouvée
                  </p>
                )}
              </div>

              {/* Description / club info */}
              {(homeForm?.meta.founded || awayForm?.meta.founded) && (
                <div className="glass rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-[8.5px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    <Building2 size={10} /> Fiche clubs
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[9px]">
                    {[homeForm?.meta, awayForm?.meta].map((m, i) => (
                      <div key={i} className="space-y-0.5">
                        <p className="font-black text-foreground truncate">{m?.name}</p>
                        {m?.founded && <p className="text-muted-foreground">Fondé · {m.founded}</p>}
                        {m?.stadium && (
                          <p className="text-muted-foreground truncate">{m.stadium}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  onAddMatch(detail);
                  setDetail(null);
                }}
                className="tap w-full py-3 rounded-xl bg-gradient-holo text-primary-foreground font-display font-black uppercase tracking-[0.2em] text-[10.5px] flex items-center justify-center gap-2 shadow-holo"
              >
                <PlusCircle size={14} />
                Sélectionner ce match
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
