import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Star,
  Trophy,
  RefreshCw,
  AlertCircle,
  X,
  TrendingUp,
  Brain,
  CheckCircle2,
} from "lucide-react";
import { repairedInvoke } from "@/lib/auto-repair";
import { translateBetType, translateBetOption } from "@/lib/bet-fr";
import type { CalendarMatch, Prediction } from "@/types/magic";
import { useServerFn } from "@tanstack/react-start";
import { fetchWinamaxFootball, type WinaMatch } from "@/server-api/winamax";
import { HoloCard } from "./HoloCard";
import { HoloLogo } from "./HoloLogo";
import { TeamCrest, CountryFlag } from "./TeamCrest";
import { MatchHeroFx } from "./MatchHeroFx";
import { RealisticGlobe } from "./RealisticGlobe";
import { onKeysUpdated, emitKeysUpdated } from "@/lib/keys-events";
import { autoDiscoverKeys } from "@/lib/auto-discover-keys";

interface ComboItem {
  rank: number;
  matchId: string;
  match: string;
  teamA: string;
  teamB: string;
  teamALogo?: string;
  teamBLogo?: string;
  countryFlag?: string;
  countryCode?: string;
  option: string;
  type: string;
  odds: number;
  probability: number;
  valueScore: number;
  reasoning?: string;
  league: string;
  date: string;
  time: string;
  hasRealOdds: boolean;
  bookmaker?: string | null;
}

// Cache mémoire — persiste entre les changements d'onglets, se vide
// uniquement lors d'un rechargement complet de la page.
let TOP20_MEM: { ts: number; items: ComboItem[] } | null = null;

const formatParisDateShort = (date?: string) => {
  if (!date) return "—";
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(d);
};

function winaToCalendar(m: WinaMatch): CalendarMatch {
  const d = new Date(m.matchStart);
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
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
  } as CalendarMatch;
}

export const Top20Combo = ({
  onAddMatch,
}: {
  onAddMatch?: (a: string, b: string, details?: Record<string, unknown>) => void;
}) => {
  const fetchWina = useServerFn(fetchWinamaxFootball);
  const [items, setItems] = useState<ComboItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [detail, setDetail] = useState<ComboItem | null>(null);
  const [autoKeys, setAutoKeys] = useState<number>(0);
  const [scanning, setScanning] = useState(false);

  const runDiscovery = async (force = false) => {
    setScanning(true);
    try {
      const promoted = await autoDiscoverKeys(force);
      // Compte total de clés foot valides détectées
      try {
        const raw = localStorage.getItem("magic.extraApiKeys");
        const list: Array<{
          provider: string;
          valid: boolean;
          enabled?: boolean;
        }> = raw ? JSON.parse(raw) : [];
        const footProviders = new Set([
          "theOddsApi",
          "apiFootball",
          "apiSports",
          "footballData",
          "sportmonks",
          "rapidApi",
          "rapidApiFreeFootball",
        ]);
        const count = list.filter(
          (e) =>
            footProviders.has(e.provider) && e.valid && e.enabled !== false,
        ).length;
        setAutoKeys(count);
      } catch {
        /* noop */
      }
      return promoted;
    } finally {
      setScanning(false);
    }
  };

  const generate = async (force = false) => {
    // Cache instantané (mémoire — purgé au rechargement complet de la page)
    if (!force && TOP20_MEM && TOP20_MEM.items?.length) {
      const containsDemo = TOP20_MEM.items.some((item) =>
        item.matchId.startsWith("demo-"),
      );
      if (!containsDemo) {
        setItems(TOP20_MEM.items);
        setUpdatedAt(new Date(TOP20_MEM.ts));
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      // Source unique = module Match (Winamax) via server function proxy
      const winaRes = await fetchWina();
      const winaMatches = (winaRes?.matches ?? []).filter(
        (m) => m.sportId === 1 && m.status !== "finished",
      );
      const rawCalendar: CalendarMatch[] = winaMatches.map(winaToCalendar);
      // Ne garder QUE les matchs à venir (heure de Paris) — on exclut tout
      // match dont le coup d'envoi est passé pour éviter de proposer des
      // rencontres déjà jouées.
      const nowMs = Date.now();
      const calendar = rawCalendar.filter((m) => {
        const iso =
          (m as { utc?: string; utcDate?: string }).utc ||
          (m as { utcDate?: string }).utcDate;
        if (iso) {
          const t = Date.parse(iso);
          if (Number.isFinite(t)) return t > nowMs;
        }
        if (m.date && m.time) {
          const [y, mo, d] = m.date.split("-").map(Number);
          const [hh, mm] = m.time.split(":").map(Number);
          if ([y, mo, d, hh, mm].every((n) => Number.isFinite(n))) {
            const guessUtc = Date.UTC(
              y,
              (mo ?? 1) - 1,
              d ?? 1,
              hh ?? 0,
              mm ?? 0,
            );
            const probe = new Date(guessUtc);
            const tz =
              new Intl.DateTimeFormat("en-US", {
                timeZone: "Europe/Paris",
                timeZoneName: "shortOffset",
              })
                .formatToParts(probe)
                .find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
            const off = /GMT([+-]\d+)/.exec(tz);
            const hours = off ? parseInt(off[1], 10) : 1;
            return guessUtc - hours * 3600_000 > nowMs;
          }
        }
        return true;
      });
      if (calendar.length === 0) {
        setItems([]);
        setError("Aucun match à venir dans le calendrier — réessaye plus tard");
        return;
      }

      const today = new Date().toLocaleDateString("fr-CA", {
        timeZone: "Europe/Paris",
      });
      const todayMatches = calendar.filter((m) => m.date === today);
      const otherMatches = calendar.filter((m) => m.date !== today);
      // 22 matchs (au lieu de 30) → analyse IA ~30% plus rapide
      const picked = [...todayMatches, ...otherMatches].slice(0, 22);
      const analyseRes = await repairedInvoke<{
        predictions?: Prediction[];
        error?: string;
      }>(
        "analyze-matches",
        {
          module: "top20",
          matches: picked.map((m) => ({
            id: m.id,
            teamA: m.teamA,
            teamB: m.teamB,
            realOdds: m.realOdds,
          })),
        },
        { label: "Top 20 · Analyse IA", maxAttempts: 3 },
      );
      if (analyseRes.error) throw analyseRes.error;
      if (analyseRes.data?.error) throw new Error(analyseRes.data.error);

      const preds = analyseRes.data?.predictions ?? [];
      const byId = new Map(picked.map((m) => [m.id, m]));

      const ranked: ComboItem[] = preds
        .map((p) => {
          const m = byId.get(p.matchId);
          return {
            matchId: p.matchId,
            match: p.match,
            teamA: m?.teamA ?? p.match.split(" vs ")[0] ?? "",
            teamB: m?.teamB ?? p.match.split(" vs ")[1] ?? "",
            teamALogo: m?.teamALogo,
            teamBLogo: m?.teamBLogo,
            countryFlag: m?.countryFlag,
            countryCode: m?.countryCode,
            option:
              (p as Prediction & { label?: string }).label ||
              translateBetOption(p.option),
            type: translateBetType(p.type),
            odds: p.odds,
            probability: p.probability,
            valueScore: p.valueScore,
            reasoning: p.reasoning,
            league: m?.league ?? "—",
            date: m?.date ?? "",
            time: m?.time ?? "",
            hasRealOdds: !!p.hasRealOdds,
            bookmaker: p.bookmaker,
          };
        })
        .sort((a, b) => {
          // Sort preferentially by valueScore (intelligent analysis)
          // then by probability (reliability)
          if (b.valueScore !== a.valueScore) return b.valueScore - a.valueScore;
          return b.probability - a.probability;
        })
        .slice(0, 20)
        .map((it, i) => ({ ...it, rank: i + 1 }));

      setItems(ranked);
      const now = Date.now();
      setUpdatedAt(new Date(now));
      TOP20_MEM = { ts: now, items: ranked };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Détection automatique des clés API foot stockées localement —
    // l'utilisateur n'a rien à reconfigurer : Odds API / API-Football /
    // Football-Data sont identifiées par signature + vérif live, puis
    // verrouillées (mémorisées) pour ce module et le calendrier.
    (async () => {
      const promoted = await runDiscovery(false);
      if (promoted > 0) emitKeysUpdated({ action: "update" });
      generate();
    })();
    // Pas d'auto-refresh : la liste reste affichée telle quelle entre les
    // changements d'onglets, jusqu'à un rechargement complet ou un clic
    // manuel sur "Actualiser".
  }, []);

  useEffect(
    () =>
      onKeysUpdated(() => {
        TOP20_MEM = null;
        generate(true);
      }),
    [],
  );

  return (
    <>
      <HoloCard variant="violet">
        <div className="flex flex-col">
          <div className="p-4 border-b border-border/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <HoloLogo icon={Trophy} size={40} />
              <div className="min-w-0">
                <h2 className="text-xs font-display font-black uppercase tracking-[0.2em] holo-text truncate">
                  Top 20 du jour
                </h2>
                <p className="text-[8.5px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5 truncate">
                  {updatedAt
                    ? `MAJ ${updatedAt.toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })} · Auto 10min`
                    : "Génération..."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={async () => {
                  const promoted = await runDiscovery(true);
                  if (promoted > 0) {
                    emitKeysUpdated({ action: "update" });
                    generate(true);
                  }
                }}
                disabled={scanning}
                className={`tap px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border ${
                  autoKeys > 0
                    ? "border-success/60 text-success bg-success/10"
                    : "border-border text-muted-foreground glass"
                }`}
                title="Détection automatique des clés API foot dans le storage"
              >
                {scanning
                  ? "Scan…"
                  : autoKeys > 0
                    ? `🔒 ${autoKeys} clé${autoKeys > 1 ? "s" : ""}`
                    : "Auto-scan"}
              </button>
            </div>
            <button
              onClick={() => generate(true)}
              disabled={loading}
              className="tap p-2.5 rounded-lg glass border border-border shrink-0"
              aria-label="Régénérer"
            >
              <RefreshCw
                size={14}
                className={
                  loading ? "animate-spin text-primary" : "text-foreground"
                }
              />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-none">
            {error && (
              <div className="flex flex-col items-center py-10 text-center">
                <AlertCircle size={28} className="text-accent mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest text-accent">
                  {error}
                </p>
              </div>
            )}

            {loading && items.length === 0 && !error && (
              <div className="flex flex-col items-center py-10 opacity-60">
                <RefreshCw
                  size={28}
                  className="text-primary mb-2 animate-spin"
                />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Analyse IA en cours...
                </p>
              </div>
            )}

            {!loading && !error && items.length === 0 && (
              <div className="flex flex-col items-center py-10 text-center">
                <Trophy size={28} className="text-muted-foreground mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Aucune prédiction disponible
                </p>
                <button
                  onClick={() => generate(true)}
                  className="mt-3 tap text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-gradient-holo text-primary-foreground"
                >
                  Réessayer
                </button>
              </div>
            )}

            {items.map((it) => (
              <motion.button
                key={it.rank}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: it.rank * 0.02 }}
                onClick={() => setDetail(it)}
                className="tap w-full p-2.5 sm:p-3 bg-muted/30 border border-border rounded-lg flex items-center gap-2 text-left hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-holo flex items-center justify-center shrink-0 font-display font-black text-xs text-primary-foreground shadow-holo">
                  {it.rank}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <TeamCrest src={it.teamALogo} name={it.teamA} size={22} />
                  <TeamCrest src={it.teamBLogo} name={it.teamB} size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CountryFlag
                      code={it.countryCode}
                      src={it.countryFlag}
                      size={11}
                    />
                    <p className="text-[8px] font-black text-primary uppercase tracking-widest truncate">
                      {it.league}
                    </p>
                  </div>
                  <p className="text-[11px] font-display font-black text-foreground uppercase truncate">
                    {it.match}
                  </p>
                  <p className="text-[9px] text-muted-foreground truncate">
                    {it.option}
                  </p>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground truncate">
                    {formatParisDateShort(it.date)} · {it.time} FR
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-display font-black holo-text">
                    {it.odds.toFixed(2)}
                  </div>
                  <div
                    className={
                      it.hasRealOdds
                        ? "text-[7px] font-black uppercase tracking-widest text-success"
                        : "text-[7px] font-black uppercase tracking-widest text-muted-foreground"
                    }
                  >
                    {it.hasRealOdds ? "Réelle" : "IA"}
                  </div>
                  <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                    <Star size={9} className="text-gold" />
                    {Math.round(it.probability)}%
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </HoloCard>

      {detail && (
        <div
          className="fixed inset-0 z-[100] bg-background flex flex-col shadow-prism overflow-hidden"
          onClick={() => setDetail(null)}
          style={{
            paddingTop: "env(safe-area-inset-top)",
          }}
        >
          {/* Globe d'arrière-plan fixe plein écran */}
          <div className="absolute inset-0 pointer-events-none z-0">
            <RealisticGlobe
              className="w-full h-full opacity-40"
              points={[]}
              rotationSpeed={0.1}
            />
            {/* Dégradé pour la lisibilité du texte */}
            <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background" />
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full h-full sm:h-auto sm:max-h-[85vh] overflow-y-auto sm:max-w-md sm:rounded-3xl relative z-10 sm:glass-strong sm:border border-border/50 shadow-prism animate-fade-in-up overscroll-contain flex flex-col mx-auto"
          >
            {/* Bouton fermeture */}
            <button
              onClick={() => setDetail(null)}
              className="tap absolute top-4 right-4 w-9 h-9 rounded-full glass flex items-center justify-center z-[110]"
              aria-label="Fermer"
            >
              <X size={20} />
            </button>

            {/* Futuristic hero — stadium parallax + 3D crests + jersey + odds prism */}
            <div className="relative pt-0">
              <div className="mx-auto max-w-md pt-2">
                <MatchHeroFx
                  teamA={detail.teamA}
                  teamB={detail.teamB}
                  teamALogoUrl={detail.teamALogo}
                  teamBLogoUrl={detail.teamBLogo}
                  league={detail.league}
                  countryCode={detail.countryCode}
                  kickoff={`${formatParisDateShort(detail.date)} · ${detail.time} FR`}
                />
              </div>
            </div>

            <div 
              className="px-4 space-y-3 mt-4 mb-4"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-gradient-holo text-primary-foreground shadow-holo">
                    #{detail.rank}
                  </span>
                  <CountryFlag
                    code={detail.countryCode}
                    src={detail.countryFlag}
                    size={14}
                  />
                  <p className="text-[9px] font-black uppercase tracking-widest text-primary truncate">
                    {detail.league}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="glass rounded-xl p-3 text-center">
                    <TrendingUp size={12} className="text-primary mx-auto mb-1" />
                    <p className="text-base font-display font-black holo-text">
                      {detail.odds.toFixed(2)}
                    </p>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                      Cote
                    </p>
                  </div>
                  <div className="glass rounded-xl p-3 text-center">
                    <Star size={12} className="text-gold mx-auto mb-1" />
                    <p className="text-base font-display font-black text-foreground">
                      {Math.round(detail.probability)}%
                    </p>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                      Confiance
                    </p>
                  </div>
                  <div className="glass rounded-xl p-3 text-center">
                    <CheckCircle2
                      size={12}
                      className="text-success mx-auto mb-1"
                    />
                    <p className="text-base font-display font-black text-foreground">
                      ×{detail.valueScore.toFixed(2)}
                    </p>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                      Value
                    </p>
                  </div>
                </div>

                <div className="glass rounded-xl p-4">
                  <p className="text-[8.5px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                    Pari recommandé · {detail.type}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-display font-black text-foreground uppercase break-words leading-tight">
                      {detail.option}
                    </p>
                    {onAddMatch && (
                      <button
                        onClick={() => {
                          onAddMatch(detail.teamA, detail.teamB, {
                            a: detail.teamALogo,
                            b: detail.teamBLogo,
                            date: detail.date,
                            odds: {
                              [detail.type === "1"
                                ? "home"
                                : detail.type === "N"
                                  ? "draw"
                                  : "away"]: detail.hasRealOdds
                                ? detail.odds
                                : undefined,
                              homeName: "Winamax",
                            },
                          });
                        }}
                        className="tap text-[10px] bg-primary/20 hover:bg-primary/40 text-primary px-3 py-1.5 rounded-lg shrink-0 outline-none"
                      >
                        Ajouter +
                      </button>
                    )}
                  </div>
                </div>

                {detail.reasoning && (
                  <div className="glass rounded-xl p-4 border border-white/10 relative overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.4)] mt-2">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
                    <div className="flex items-center gap-1.5 text-[8.5px] font-bold uppercase tracking-widest text-secondary mb-2">
                      <Brain size={10} /> Analyse stratégique
                    </div>
                    <p className="text-[12px] text-foreground leading-snug">
                      {detail.reasoning}
                    </p>
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-holo opacity-30"></div>
                  </div>
                )}

                <div className="glass rounded-xl p-3 border border-white/5 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest relative overflow-hidden mx-auto max-w-[90%] mt-3 shadow-holo">
                  <div className="absolute inset-0 bg-primary/5"></div>
                  <span
                    className={`relative z-10 ${
                      detail.hasRealOdds
                        ? "text-success"
                        : "text-muted-foreground"
                    }`}
                  >
                    {detail.hasRealOdds
                      ? `Cote réelle · ${detail.bookmaker}`
                      : "Cote estimée IA"}
                  </span>
                  <span className="text-muted-foreground truncate relative z-10 ml-2">
                    Rang #{detail.rank} / 20
                  </span>
                </div>
              </div>
          </div>
        </div>
      )}
    </>
  );
};
