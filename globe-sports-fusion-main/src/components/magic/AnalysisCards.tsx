import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Brain, CheckCircle2, AlertTriangle, Sparkles, Flame, Activity, Clock } from "lucide-react";
import type { Prediction } from "@/types/magic";
import { HoloCard } from "./HoloCard";
import { HoloLogo } from "./HoloLogo";
import { TeamCrest } from "./TeamCrest";
import { translateBetType, translateBetOption } from "@/lib/bet-fr";
import { resolveMatchScore, type ResolvedScore } from "@/lib/score-resolver";

interface AnalysisCardsProps {
  predictions: Prediction[];
}

/** Carte pronostic au format "ticket de paris" — match vs match avec live score. */
function PredictionTicket({ p, index }: { p: Prediction; index: number }) {
  const isValue = p.valueScore > 1;
  const conf = Math.round(p.confidence ?? p.probability);
  const isTopConf = (p.confidence ?? p.probability) >= 88 || p.highConfidence === true;
  const [teamA = "", teamB = ""] = p.match.split(" vs ");

  const [live, setLive] = useState<ResolvedScore | null>(null);
  useEffect(() => {
    let cancelled = false;
    const fetchScore = async () => {
      try {
        const sc = await resolveMatchScore(p.match);
        if (!cancelled) setLive(sc);
      } catch {
        /* noop */
      }
    };
    fetchScore();
    const t = setInterval(fetchScore, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [p.match]);

  const hasLive =
    live && live.homeScore != null && live.awayScore != null && live.status !== "scheduled";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative rounded-2xl overflow-hidden border border-primary/30 bg-gradient-to-br from-card/90 via-card/70 to-card/90 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
    >
      {/* Bandeau type de pari + cote */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-primary/15 via-primary/10 to-transparent border-b border-primary/20">
        <div className="flex items-center gap-1.5 min-w-0">
          {isTopConf && <Flame size={11} className="text-primary shrink-0 animate-pulse" />}
          <span className="text-[9px] font-black uppercase tracking-[0.22em] text-primary truncate">
            {translateBetType(p.type)}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
            cote
          </div>
          <div className="text-lg font-display font-black holo-text leading-none tabular-nums">
            {p.odds.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Bloc match vs match */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3.5 bg-black/20">
        {/* Team A */}
        <div className="flex flex-col items-center gap-1.5 min-w-0">
          <TeamCrest src={p.teamALogo} name={teamA} size={36} />
          <p className="text-[10px] font-display font-black text-foreground uppercase text-center leading-tight break-words w-full">
            {teamA}
          </p>
        </div>

        {/* VS / Live score central */}
        <div className="flex flex-col items-center gap-1 px-1">
          {hasLive ? (
            <>
              <div className="flex items-center gap-1 text-[7.5px] font-black uppercase tracking-widest text-[#39ff14]">
                <Activity size={8} className={live?.status === "live" ? "animate-pulse" : ""} />
                {live?.status === "live" ? "Live" : "Final"}
              </div>
              <div className="text-xl font-display font-black tabular-nums text-foreground leading-none">
                {live!.homeScore}<span className="text-muted-foreground mx-1">-</span>{live!.awayScore}
              </div>
            </>
          ) : (
            <>
              <div className="text-base font-display font-black holo-text leading-none">VS</div>
              {(p.date || p.time) && (
                <div className="flex items-center gap-0.5 text-[7.5px] font-bold uppercase tracking-widest text-muted-foreground">
                  <Clock size={8} />
                  {p.time || p.date}
                </div>
              )}
            </>
          )}
        </div>

        {/* Team B */}
        <div className="flex flex-col items-center gap-1.5 min-w-0">
          <TeamCrest src={p.teamBLogo} name={teamB} size={36} />
          <p className="text-[10px] font-display font-black text-foreground uppercase text-center leading-tight break-words w-full">
            {teamB}
          </p>
        </div>
      </div>

      {/* Pronostic + barre de confiance */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          {isValue ? (
            <CheckCircle2 size={14} className="text-success shrink-0" />
          ) : (
            <AlertTriangle size={14} className="text-gold shrink-0" />
          )}
          <span className="text-xs font-bold text-foreground flex-1 leading-snug">
            {(p as typeof p & { label?: string }).label || translateBetOption(p.option)}
          </span>
          <span className="text-[10px] font-black text-primary shrink-0 tabular-nums">
            {conf}%
          </span>
        </div>

        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${conf}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-prism shadow-[0_0_8px_rgba(255,200,80,0.5)]"
          />
        </div>

        {p.reasoning && (
          <p className="text-[10px] text-muted-foreground italic leading-snug break-words">
            {p.reasoning}
          </p>
        )}
      </div>

      {/* Footer source / value */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 text-[8.5px] font-bold uppercase tracking-widest border-t border-border/30 bg-black/20">
        <span
          className={`flex items-center gap-1 truncate ${
            p.hasRealOdds ? "text-success" : "text-muted-foreground"
          }`}
        >
          <Sparkles size={9} className="shrink-0" />
          <span className="truncate">
            {p.hasRealOdds ? `Cote réelle · ${p.bookmaker}` : "Estimation IA"}
          </span>
        </span>
        <span className={`shrink-0 ${isValue ? "text-success" : "text-muted-foreground"}`}>
          Value × {p.valueScore.toFixed(2)}
        </span>
      </div>
    </motion.div>
  );
}

export const AnalysisCards = ({ predictions }: AnalysisCardsProps) => {
  if (predictions.length === 0) {
    return (
      <HoloCard variant="cyan">
        <div className="p-8 flex flex-col items-center text-center gap-3">
          <HoloLogo icon={Brain} size={56} />
          <h3 className="text-sm font-display font-black uppercase tracking-[0.18em] holo-text">
            En attente d'analyse
          </h3>
          <p className="text-[11px] text-muted-foreground max-w-[240px] leading-snug">
            Ajoute des matchs et lance le moteur IA pour révéler les meilleures opportunités de la
            journée.
          </p>
        </div>
      </HoloCard>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {predictions.map((p, i) => (
        <PredictionTicket key={`${p.matchId}-${i}`} p={p} index={i} />
      ))}
    </div>
  );
};
