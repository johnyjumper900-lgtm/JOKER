import {
  History as HistoryIcon,
  Trash2,
  Trophy,
  X,
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { HistoryItem } from "@/types/magic";
import { HoloCard } from "./HoloCard";
import { HoloLogo } from "./HoloLogo";
import { RoiStatsPanel } from "./RoiStatsPanel";
import { SmartTrash } from "./SmartTrash";

interface HistoryViewProps {
  history: HistoryItem[];
  onClear?: () => void;
}

type GlobalStatus = "won" | "lost" | "live" | "draft";

const computeGlobalStatus = (t: HistoryItem): GlobalStatus => {
  if (t.status !== "validated") return "draft";
  const picks = t.picks ?? [];
  if (picks.length === 0) return "live";
  if (picks.some((p) => p.result === "lost")) return "lost";
  if (picks.every((p) => p.result === "won")) return "won";
  return "live";
};

type FilterKey = "all" | "won" | "lost";

export const HistoryView = ({ history, onClear }: HistoryViewProps) => {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  // On ne garde que les tickets RÉSOLUS (gagnés ou perdus) — l'historique
  // c'est le passé : les en-cours sont dans "Mes Paris".
  const settled = useMemo(
    () =>
      history
        .filter((t) => {
          const s = computeGlobalStatus(t);
          return s === "won" || s === "lost";
        })
        .sort((a, b) =>
          (b.validatedAt || b.date || "").localeCompare(a.validatedAt || a.date || ""),
        ),
    [history],
  );

  const counts = useMemo(() => {
    const acc = { all: settled.length, won: 0, lost: 0 };
    for (const t of settled) {
      const s = computeGlobalStatus(t);
      if (s === "won") acc.won += 1;
      else if (s === "lost") acc.lost += 1;
    }
    return acc;
  }, [settled]);

  const visible = useMemo(() => {
    if (filter === "all") return settled;
    return settled.filter((t) => computeGlobalStatus(t) === filter);
  }, [settled, filter]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <HoloLogo icon={HistoryIcon} size={40} />
          <div>
            <h2 className="text-sm font-display font-black uppercase tracking-[0.18em] holo-text">
              Historique
            </h2>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
              {settled.length} ticket{settled.length > 1 ? "s" : ""} résolu
              {settled.length > 1 ? "s" : ""} · {counts.won} ✓ · {counts.lost} ✗
            </p>
          </div>
        </div>
        {settled.length > 0 && onClear && (
          <SmartTrash onClick={onClear} size={14} className="p-2" />
        )}
      </div>

      <RoiStatsPanel history={history} />

      {/* Filtres Tous / Gagnés / Perdus */}
      {settled.length > 0 && (
        <div className="flex items-center gap-1.5">
          {[
            { key: "all" as const, label: "Tous", n: counts.all, Icon: HistoryIcon },
            { key: "won" as const, label: "Gagnés", n: counts.won, Icon: Trophy },
            { key: "lost" as const, label: "Perdus", n: counts.lost, Icon: X },
          ].map((f) => {
            const active = filter === f.key;
            const Icon = f.Icon;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`tap flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-[9.5px] font-black uppercase tracking-widest border transition-all ${
                  active
                    ? f.key === "won"
                      ? "bg-success/20 text-success border-success/50 shadow-[0_0_12px_oklch(var(--success)/0.4)]"
                      : f.key === "lost"
                        ? "bg-destructive/15 text-destructive border-destructive/50 shadow-[0_0_12px_oklch(var(--destructive)/0.3)]"
                        : "bg-gradient-holo text-primary-foreground border-transparent shadow-holo"
                    : "bg-muted/20 text-muted-foreground border-border"
                }`}
              >
                <Icon size={11} />
                {f.label}
                <span
                  className={`px-1.5 rounded-full text-[8.5px] ${active ? "bg-background/25" : "bg-muted/40"}`}
                >
                  {f.n}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {settled.length === 0 ? (
        <HoloCard variant="violet">
          <div className="p-8 text-center">
            <p className="text-xs text-muted-foreground">
              Aucun ticket résolu pour le moment.
              <br />
              Les tickets apparaitront ici dès que les matchs seront terminés.
            </p>
          </div>
        </HoloCard>
      ) : visible.length === 0 ? (
        <div className="p-6 text-center text-[11px] text-muted-foreground">
          Aucun ticket dans cette catégorie.
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {visible.map((h) => {
            const status = computeGlobalStatus(h);
            const won = status === "won";
            const totalOdds = parseFloat(h.odds || "1");
            const stake = h.stake ?? 0;
            const gain = won ? stake * totalOdds : 0;
            const isOpen = openId === h.id;
            const picks = h.picks ?? [];
            const wonCount = picks.filter((p) => p.result === "won").length;
            const lostCount = picks.filter((p) => p.result === "lost").length;

            return (
              <motion.div
                key={h.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: "spring", damping: 24, stiffness: 260 }}
                className="relative group"
              >
                {/* Orbital Glow for historical winners */}
                {won && (
                  <div className="absolute -inset-2 bg-gradient-to-r from-success/20 via-gold/10 to-success/20 blur-2xl opacity-40 animate-pulse-slow pointer-events-none" />
                )}

                <HoloCard variant={won ? "gold" : "violet"}>
                  <div className="relative overflow-hidden">
                    {/* Futuristic Background Pattern */}
                    <div className="absolute inset-0 bg-scanline opacity-[0.03] pointer-events-none" />
                    
                    <button
                      onClick={() => setOpenId(isOpen ? null : h.id)}
                      className="tap w-full text-left p-5 relative"
                    >
                      {/* Header: ID + Symbol */}
                      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-2xl ${
                            won ? "bg-success/10 border-success/30 text-success" : "bg-destructive/10 border-destructive/30 text-destructive"
                          }`}>
                            {won ? <Trophy size={20} /> : <X size={24} />}
                          </div>
                          <div>
                            <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-foreground leading-none">
                              Ticket {won ? "Gagnant" : "Perdu"}
                            </span>
                            <span className="text-[8px] text-white/20 font-bold uppercase tracking-widest mt-1 block">
                              ID: {h.id.slice(0, 8).toUpperCase()} · {picks.length} Sélections
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-white/20 font-black uppercase tracking-widest flex items-center gap-1 justify-end">
                            <Calendar size={10} />
                            {h.validatedAt || h.date}
                          </p>
                        </div>
                      </div>

                      {/* Main Title / Event */}
                      <div className="mb-4">
                        <h4 className="text-sm font-display font-black text-white uppercase tracking-wide truncate">
                          {h.title}
                        </h4>
                      </div>

                      {/* Financials Grid */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-center">
                          <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">Mise</p>
                          <p className="text-base font-display font-black text-white">{stake.toFixed(0)}€</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-center">
                          <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">Cote</p>
                          <p className="text-base font-display font-black holo-text">x{h.odds}</p>
                        </div>
                        <div className={`p-3 rounded-2xl border text-center transition-all ${
                          won ? "bg-success/10 border-success/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]" : "bg-destructive/10 border-destructive/20"
                        }`}>
                          <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/40 mb-1">{won ? "Gain" : "Perte"}</p>
                          <div className={`text-base font-display font-black flex items-center justify-center gap-1 ${
                            won ? "text-success" : "text-destructive"
                          }`}>
                            {won ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {won ? `+${gain.toFixed(0)}€` : `-${stake.toFixed(0)}€`}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-center">
                        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-white/5 text-[9px] font-black uppercase tracking-[0.4em] transition-all ${isOpen ? 'text-primary' : 'text-white/30'}`}>
                          {isOpen ? "Fermer les détails" : "Inspecter le ticket"}
                          <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
                            <TrendingUp size={12} className="rotate-90" />
                          </motion.div>
                        </div>
                      </div>
                    </button>

                    {/* Expandable Detail Section */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="bg-black/20 border-t border-white/5"
                        >
                          <div className="p-5 space-y-2">
                            {picks.map((p, i) => {
                              const r = p.result ?? "pending";
                              return (
                                <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${
                                  r === "won" ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"
                                }`}>
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                                      r === "won" ? "bg-success/10 border-success/20 text-success" : "bg-destructive/10 border-destructive/20 text-destructive"
                                    }`}>
                                      {r === "won" ? <CheckCircle2 size={14} /> : <X size={14} />}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-[11px] font-bold text-foreground truncate uppercase tracking-tight">{p.match}</p>
                                      <p className="text-[9px] text-white/40 font-black uppercase tracking-widest mt-0.5">
                                        {p.type} <span className="text-white/10 mx-1">|</span> <span className={r === "lost" ? "line-through" : "text-primary/80"}>{p.option}</span>
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-display font-black holo-text">{p.odds.toFixed(2)}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </HoloCard>
              </motion.div>
            );

          })}
        </AnimatePresence>
      )}
    </div>
  );
};
