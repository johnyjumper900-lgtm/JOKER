import { motion } from "framer-motion";
import { Sparkles as SparklesIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RealisticGlobe } from "./RealisticGlobe";
import { lookupCoords } from "@/lib/country-coords";
import { categoryToIso } from "@/lib/wina-country";
import { fetchWinamaxFootball } from "@/server-api/winamax";
import type { CalendarMatch, Match } from "@/types/magic";

interface MagicHeroProps {
  onMagicMode: () => void;
  isLoading: boolean;
  /** Codes pays ISO-2 des matchs en cours — feront scintiller le globe.
   *  Si non fourni, MagicHero fetch les matchs Winamax (module Match). */
  countries?: string[];
  /** Matchs sélectionnés — prioritaire pour animer le globe selon les vrais matchs. */
  matches?: Match[];
}

export const MagicHero = ({
  onMagicMode,
  isLoading,
  countries,
  matches: activeMatches,
}: MagicHeroProps) => {
  // Source unique = module Match (Winamax via server function proxy)
  const fetchWina = useServerFn(fetchWinamaxFootball);
  const { data: winaData } = useQuery({
    queryKey: ["winamax-all"],
    queryFn: () => fetchWina(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const calendarMatches = useMemo<CalendarMatch[]>(() => {
    const list = winaData?.matches ?? [];
    return list
      .filter((m) => m.sportId === 1)
      .map(
        (m) =>
          ({
            id: `wina:${m.id}`,
            teamA: m.homeTeam,
            teamB: m.awayTeam,
            date: "",
            time: "",
            league: m.tournament || m.category || "",
            countryCode: categoryToIso(m.category) ?? undefined,
            utcDate: new Date(m.matchStart).toISOString(),
          }) as CalendarMatch,
      );
  }, [winaData]);

  // Tick toutes les 15s pour recalculer les états live / start / end
  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  const points = useMemo(() => {
    const now = nowTs;

    // Si countries est passé, on utilise juste les codes (on ne sait pas s'ils sont live)
    if (countries && countries.length) {
      return countries
        .map((code) => {
          const c = lookupCoords(code);
          if (!c) return null;
          return { lat: c[0], lon: c[1], weight: 1, color: "#22e3ff" };
        })
        .filter((v): v is NonNullable<typeof v> => v !== null);
    }

    // Sinon utilise les matches pour déterminer le live / start / end
    const countryPointsMap = new Map<
      string,
      { n: number; isLive: boolean; isStarted: boolean; isFinished: boolean }
    >();

    const sourceMatches = calendarMatches;
    const STARTING_WINDOW = 5 * 60 * 1000; // ±5 min autour du coup d'envoi
    const MATCH_DURATION = 105 * 60 * 1000;
    const FINISHED_WINDOW = 30 * 60 * 1000; // Afficher comme fini pendant 30 min après la fin

    sourceMatches.forEach((m) => {
      if (!m.countryCode) return;
      const code = m.countryCode.toUpperCase();
      const existing =
        countryPointsMap.get(code) || { n: 0, isLive: false, isStarted: false, isFinished: false };

      let live = false;
      let started = false;
      let finished = false;
      if (m.utcDate) {
        const start = new Date(m.utcDate).getTime();
        const end = start + MATCH_DURATION;
        const now = nowTs;
        live = now >= start && now <= end;
        started = now < start && now >= start - STARTING_WINDOW;
        finished = now > end && now <= end + FINISHED_WINDOW;
      }

      countryPointsMap.set(code, {
        n: existing.n + 1,
        isLive: existing.isLive || live,
        isStarted: existing.isStarted || started,
        isFinished: existing.isFinished || finished,
      });
    });

    const max = Math.max(1, ...Array.from(countryPointsMap.values()).map((v) => v.n));

    return Array.from(countryPointsMap.entries())
      .map(([code, stats]) => {
        const c = lookupCoords(code);
        if (!c) return null;
        
        // Couleur: 
        //   Started: Vert (scintille)
        //   Live: Jaune (scintille fortement)
        //   Finished: Gris (pas de scintillement)
        //   Autre: Cyan (pas de scintillement)
        const color = stats.isLive
            ? "#fffc22"
            : stats.isStarted
              ? "#22ff88"
              : stats.isFinished
                ? "#aaa"
                : "#22e3ff";
        
        const flashing = stats.isLive || stats.isStarted;
        
        return {
          lat: c[0],
          lon: c[1],
          weight: 0.5 + (stats.n / max) * 0.8 + (flashing ? 0.6 : 0),
          color,
          live: flashing,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);
  }, [countries, calendarMatches, nowTs]);

  return (
    <div className="iphone-compact-hero magic-hero-shell relative overflow-hidden rounded-3xl glass-strong holo-scan h-[280px] flex flex-col isolate">
      <div className="absolute inset-0 grid-floor opacity-25 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-holo-soft opacity-50 pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none magic-hero-globe-layer">
        <RealisticGlobe
          className="absolute inset-0 w-full h-full"
          points={points}
          rotationSpeed={0.15}
        />
      </div>
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-background/45 via-transparent to-background/80" />
      <motion.div
        className="absolute inset-x-0 h-[1.5px] bg-gradient-prism pointer-events-none z-10"
        animate={{ top: ["-2%", "102%"] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
      />
      <div className="relative z-20 flex flex-col items-center text-center gap-1 pt-4 sm:pt-5 px-3 sm:px-4">
        <h1 className="text-xl sm:text-2xl font-display font-black uppercase tracking-[0.14em] sm:tracking-[0.18em] holo-text leading-none">
          Magic Combiné
        </h1>
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className="h-px w-8 bg-gradient-to-r from-transparent to-primary/60" />
          <p className="text-[7.5px] sm:text-[8.5px] font-bold uppercase tracking-[0.22em] sm:tracking-[0.32em] text-primary/85">
            Gemini 2.5 Flash · Football · Stratège
          </p>
          <div className="h-px w-8 bg-gradient-to-l from-transparent to-primary/60" />
        </div>
      </div>
      <div className="relative z-20 mt-auto p-4 pointer-events-auto">
        <button
          onClick={onMagicMode}
          disabled={isLoading}
          className="tap relative w-full px-4 py-3 rounded-2xl bg-gradient-holo text-primary-foreground font-display font-black uppercase tracking-[0.18em] text-[11px] flex items-center justify-center gap-2 shadow-holo disabled:opacity-50 animate-pulse-holo"
        >
          <SparklesIcon size={14} className={isLoading ? "animate-spin" : ""} />
          <span className="truncate">{isLoading ? "Génération..." : "Mode Magique"}</span>
          <span className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
        </button>
      </div>
    </div>
  );
};
