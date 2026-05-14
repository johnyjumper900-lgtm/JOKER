import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Trophy,
  PlusCircle,
  Tv,
  TrendingUp,
  Star,
  CheckCircle2,
  Brain,
  Activity,
  Swords,
  Users,
  Info,
  BarChart3,
  LineChart,
} from "lucide-react";
import { CountryFlag } from "./TeamCrest";
import { MatchHeroFx } from "./MatchHeroFx";
import { LiveScoreBadge } from "./LiveScoreBadge";
import { getMatchExtras, type FormResult } from "@/lib/match-extras";
import type { WinaMatch } from "@/server-api/winamax";

interface Props {
  match: WinaMatch | null;
  onClose: () => void;
  onAdd?: (m: WinaMatch) => void;
}

const fmtParisDateShort = (ts: number) => {
  const d = new Date(ts);
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "short",
    day: "2-digit",
    month: "short",
  })
    .format(d)
    .toUpperCase();
};

const fmtTime = (ts: number) =>
  new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));

/** Calcule un pari recommandé "à la Top 20" à partir des cotes Winamax. */
function recommendedBet(odds: { home: number | null; draw: number | null; away: number | null }, teamA: string, teamB: string) {
  const home = odds.home ?? 2.2;
  const draw = odds.draw ?? 3.3;
  const away = odds.away ?? 3.2;
  const inv = [1 / home, 1 / draw, 1 / away];
  const s = inv[0] + inv[1] + inv[2];
  const p = inv.map((v) => v / s);
  const favIdx = p.indexOf(Math.max(...p));
  const favKey = (["home", "draw", "away"] as const)[favIdx];

  // Double chance plus sûre
  const dcProb = Math.min(
    92,
    Math.round(
      (favKey === "home"
        ? p[0] + p[1]
        : favKey === "away"
          ? p[2] + p[1]
          : p[0] + p[2]) * 100,
    ),
  );
  const dcOdd = Number((1 / (dcProb / 100) / 1.05).toFixed(2));
  const dcLabel =
    favKey === "home"
      ? `1 ou Nul (${teamA} ou Nul)`
      : favKey === "away"
        ? `Nul ou 2 (Nul ou ${teamB})`
        : "1 ou 2";

  const value = Number((dcProb / (100 / dcOdd)).toFixed(2));
  return {
    type: "Double chance",
    label: dcLabel,
    odds: dcOdd,
    probability: dcProb,
    value,
  };
}

export function MatchDetailModal({ match, onClose, onAdd }: Props) {
  useEffect(() => {
    if (!match) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [match]);

  return createPortal(
    <AnimatePresence>
      {match && (
        <motion.div
          key="match-page"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-background flex flex-col shadow-prism"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {/* Header fixe */}
          <div className="relative p-5 border-b border-border/60 flex-none bg-background z-20">
            <button
              onClick={onClose}
              className="tap absolute top-4 right-4 w-9 h-9 rounded-full glass flex items-center justify-center z-10"
              aria-label="Fermer"
            >
              <X size={16} />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-gradient-holo text-primary-foreground shadow-holo">
                <Trophy size={10} className="inline -mt-0.5 mr-1" />
                Match
              </span>
              {match.category && (
                <CountryFlag
                  code={match.category.slice(0, 2).toLowerCase()}
                  size={14}
                />
              )}
              <p className="text-[9px] font-black uppercase tracking-widest text-primary truncate">
                {match.tournament}
              </p>
            </div>
            {/* VS Block */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center match-globe-bg relative rounded-xl px-2 py-1">
              <p className="text-[11px] font-display font-black text-foreground uppercase break-words leading-tight relative z-10">
                {match.homeTeam}
              </p>
              <div className="text-xl font-display font-black holo-text relative z-10">VS</div>
              <p className="text-[11px] font-display font-black text-foreground uppercase break-words leading-tight relative z-10">
                {match.awayTeam}
              </p>
            </div>
            {/* Live score temps réel — toutes sources, tous sports */}
            <LiveScoreBadge homeTeam={match.homeTeam} awayTeam={match.awayTeam} />
          </div>

          {/* Body scrollable content */}
          <div className="p-5 overflow-y-auto flex-1 space-y-6 pb-12 overscroll-contain">
            {/* Hero — globe + jerseys + pari recommandé en overlay plein largeur */}
            {(() => {
              const reco = recommendedBet(match.odds, match.homeTeam, match.awayTeam);
              return (
                <div className="relative pt-2">
                  <div className="mx-auto max-w-md p-3">
                    <MatchHeroFx
                      teamA={match.homeTeam}
                      teamB={match.awayTeam}
                      teamALogoUrl={match.homeLogo ?? match.homeJersey ?? undefined}
                      teamBLogoUrl={match.awayLogo ?? match.awayJersey ?? undefined}
                      teamAJerseyUrl={match.homeJersey ?? undefined}
                      teamBJerseyUrl={match.awayJersey ?? undefined}
                      league={match.tournament}
                      countryCode={match.category?.slice(0, 2).toLowerCase()}
                      globeScale="sm"
                      odds={{
                        home: match.odds.home ?? undefined,
                        draw: match.odds.draw ?? undefined,
                        away: match.odds.away ?? undefined,
                      }}
                    />
                  </div>

                  {/* Pari recommandé — boîte de dialogue plein largeur sur le ballon */}
                  <div className="mt-3 rounded-2xl bg-gradient-to-br from-primary/20 via-card/85 to-primary/10 backdrop-blur-xl border border-primary/40 shadow-[0_8px_32px_rgba(212,160,23,0.35)] overflow-hidden">
                    <div className="px-4 py-2 bg-gradient-prism flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-background flex items-center gap-1">
                        <TrendingUp size={11} /> Pari recommandé · {reco.type}
                      </span>
                      <span className="text-[10px] font-black tabular-nums text-background">
                        {reco.odds.toFixed(2)}
                      </span>
                    </div>
                    <div className="p-4 grid grid-cols-3 gap-2 border-b border-border/30">
                      <StatCell icon={<TrendingUp size={12} />} value={reco.odds.toFixed(2)} label="Cote" holo />
                      <StatCell icon={<Star size={12} />} value={`${reco.probability}%`} label="Confiance" />
                      <StatCell icon={<CheckCircle2 size={12} />} value={`×${reco.value.toFixed(2)}`} label="Value" />
                    </div>
                    <div className="px-4 py-3 flex items-center justify-between gap-2">
                      <p className="text-sm font-display font-black text-foreground uppercase break-words leading-tight flex-1">
                        {reco.label}
                      </p>
                      {onAdd && (
                        <button
                          onClick={() => {
                            onAdd(match);
                            onClose();
                          }}
                          className="tap text-[10px] bg-primary text-primary-foreground px-3 py-1.5 rounded-lg shrink-0 flex items-center gap-1 font-black uppercase tracking-widest shadow-glow-gold"
                        >
                          <PlusCircle size={12} /> Ajouter
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Form & H2H */}
            {(() => {
              const extras = getMatchExtras(match.homeTeam, match.awayTeam, match.id);
              return (
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Activity size={12} /> Forme & H2H
                  </h3>
                  <div className="glass rounded-xl p-4">
                      <FormRow team={match.homeTeam} form={extras.formHome} />
                      <div className="my-2 h-px bg-white/5" />
                      <FormRow team={match.awayTeam} form={extras.formAway} />
                  </div>
                  <div className="glass rounded-xl p-4">
                    <div className="flex items-center gap-1.5 text-[8.5px] font-bold uppercase tracking-widest text-secondary mb-3">
                      <Swords size={10} /> Confrontations ({extras.h2h.total})
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <H2HBox label={match.homeTeam} value={extras.h2h.homeWins} sub="V" tone="primary" />
                      <H2HBox label="Nuls" value={extras.h2h.draws} sub="N" tone="muted" />
                      <H2HBox label={match.awayTeam} value={extras.h2h.awayWins} sub="V" tone="secondary" />
                    </div>
                  </div>
                </section>
              );
            })()}

            {/* Lineups */}
            {(() => {
              const extras = getMatchExtras(match.homeTeam, match.awayTeam, match.id);
              return (
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Users size={12} /> Alignements
                  </h3>
                  <div className="glass rounded-xl p-4 grid grid-cols-2 gap-3">
                    <LineupCol team={match.homeTeam} lineup={extras.lineupHome} accent="text-primary" />
                    <LineupCol team={match.awayTeam} lineup={extras.lineupAway} accent="text-secondary" />
                  </div>
                </section>
              );
            })()}

            {/* Odds */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Brain size={12} /> Cotes
              </h3>
              <div className="glass rounded-xl p-4">
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <OddBox label="1" val={match.odds.home} />
                  <OddBox label="N" val={match.odds.draw} />
                  <OddBox label="2" val={match.odds.away} />
                </div>
                <a
                  href={`https://www.winamax.fr/paris-sportifs/match/${match.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1 rounded-lg border border-border bg-white/5 w-full py-2 text-[9px] font-black uppercase tracking-widest"
                >
                  <Tv size={10} /> Parier sur Winamax
                </a>
              </div>
            </section>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function OddBox({ label, val }: { label: string; val: number | null }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg bg-white/5 border border-white/5 px-1 py-1.5">
      <span className="text-[7px] font-black uppercase tracking-widest text-muted-foreground mb-0.5 text-center leading-tight truncate w-full">
        {label}
      </span>
      <span className="font-display text-base font-black holo-text leading-none tabular-nums">
        {val != null ? val.toFixed(2) : "—"}
      </span>
    </div>
  );
}

function StatCell({
  icon,
  value,
  label,
  holo,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  holo?: boolean;
}) {
  return (
    <div className="glass rounded-xl p-2.5 text-center min-w-0">
      {icon}
      <p
        className={`text-sm font-display font-black leading-none tabular-nums truncate ${
          holo ? "holo-text" : "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[8px] font-bold uppercase tracking-widest text-muted-foreground truncate">
        {label}
      </p>
    </div>
  );
}

function FormRow({ team, form }: { team: string; form: { results: FormResult[]; rating: number } }) {
  const colorMap: Record<FormResult, string> = {
    W: "bg-success/20 text-success border-success/40",
    D: "bg-white/5 text-muted-foreground border-white/10",
    L: "bg-destructive/20 text-destructive border-destructive/40",
  };
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-[10px] font-display font-black text-foreground uppercase truncate min-w-0 flex-1">
        {team}
      </p>
      <div className="flex items-center gap-1 shrink-0">
        {form.results.map((r, i) => (
          <span
            key={i}
            className={`flex h-5 w-5 items-center justify-center rounded-md border text-[9px] font-black ${colorMap[r]}`}
          >
            {r}
          </span>
        ))}
        <span className="ml-2 text-[9px] font-black tabular-nums text-primary">{form.rating}</span>
      </div>
    </div>
  );
}

function H2HBox({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number;
  sub: string;
  tone: "primary" | "secondary" | "muted";
}) {
  const toneCls =
    tone === "primary" ? "text-primary" : tone === "secondary" ? "text-secondary" : "text-foreground";
  return (
    <div className="flex flex-col items-center justify-center rounded-lg bg-white/5 border border-white/5 px-1 py-2 min-w-0">
      <span className={`font-display text-xl font-black leading-none tabular-nums ${toneCls}`}>
        {value}
      </span>
      <span className="mt-1 text-[7.5px] font-black uppercase tracking-widest text-muted-foreground truncate w-full text-center">
        {sub}
      </span>
      <span className="text-[8px] font-bold uppercase text-foreground/70 truncate w-full text-center leading-tight">
        {label}
      </span>
    </div>
  );
}

function LineupCol({
  team,
  lineup,
  accent,
}: {
  team: string;
  lineup: { starters: string[]; subs: string[] };
  accent: string;
}) {
  return (
    <div className="min-w-0">
      <p className={`mb-2 text-[9px] font-display font-black uppercase truncate ${accent}`}>
        {team}
      </p>
      <p className="mb-1 text-[7.5px] font-bold uppercase tracking-widest text-muted-foreground">
        Titulaires
      </p>
      <ul className="space-y-0.5 mb-2">
        {lineup.starters.map((p, i) => (
          <li
            key={p}
            className="text-[10px] text-foreground truncate flex items-center gap-1.5"
          >
            <span className="text-[8px] tabular-nums text-muted-foreground w-4 shrink-0">
              {i + 1}
            </span>
            <span className="truncate">{p}</span>
          </li>
        ))}
      </ul>
      <p className="mb-1 text-[7.5px] font-bold uppercase tracking-widest text-muted-foreground">
        Remplaçants
      </p>
      <ul className="space-y-0.5">
        {lineup.subs.map((p) => (
          <li key={p} className="text-[10px] text-muted-foreground truncate">
            · {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default MatchDetailModal;
