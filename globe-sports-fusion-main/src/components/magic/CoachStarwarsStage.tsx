import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Star, TrendingUp, Calendar, Clock, Trophy, ChevronLeft, ChevronRight } from "lucide-react";
import type { CoachScene, AnalyzedPick } from "./CoachAnalysisScene";

interface Props {
  scene: CoachScene;
  onClose: () => void;
}

/**
 * Coach Star Wars Stage : prend tout l'écran pour présenter
 * les pronostics du Coach comme une scène cinématique :
 * - fond noir étoilé animé
 * - cartes "ticket" qui apparaissent une par une bloc par bloc
 * - match vs match, date/heure, cote, type de pari encadrés
 */
export function CoachStarwarsStage({ scene, onClose }: Props) {
  // Récupère les picks suivant la scène
  const picks: AnalyzedPick[] = useMemo(() => {
    if (scene.kind === "suggestions" || scene.kind === "analyzing" || scene.kind === "result") {
      return scene.picks ?? [];
    }
    return [];
  }, [scene]);

  const showStage = picks.length > 0 && (scene.kind === "suggestions" || scene.kind === "result");
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [picks.length, scene.kind]);

  useEffect(() => {
    if (!showStage || picks.length <= 1) return;
    const id = window.setInterval(() => setIdx((i) => (i + 1) % picks.length), 4500);
    return () => window.clearInterval(id);
  }, [showStage, picks.length]);

  // Lock body scroll
  useEffect(() => {
    if (!showStage) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showStage]);

  if (!showStage) return null;

  const stars = useMemo(
    () =>
      Array.from({ length: 80 }).map(() => ({
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() * 1.6 + 0.4,
        delay: Math.random() * 4,
        dur: 2 + Math.random() * 4,
      })),
    [],
  );

  const current = picks[idx];

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="sw-stage"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-[120] bg-black overflow-hidden"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Étoiles scintillantes */}
        <div className="absolute inset-0 pointer-events-none">
          {stars.map((s, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                top: `${s.top}%`,
                left: `${s.left}%`,
                width: `${s.size}px`,
                height: `${s.size}px`,
              }}
              animate={{ opacity: [0.15, 1, 0.15] }}
              transition={{ duration: s.dur, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
            />
          ))}
        </div>

        {/* Nébuleuses dorées */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at 20% 80%, rgba(212,160,23,0.25), transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(57,255,20,0.15), transparent 55%)",
          }}
        />

        {/* Grille perspective Star Wars */}
        <div
          className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(212,160,23,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(212,160,23,0.4) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            transform: "perspective(400px) rotateX(60deg)",
            transformOrigin: "bottom",
            maskImage: "linear-gradient(to top, black, transparent)",
            WebkitMaskImage: "linear-gradient(to top, black, transparent)",
          }}
        />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-4 pt-4">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-primary drop-shadow-[0_0_10px_rgba(212,160,23,0.8)]" />
            <span className="text-[10px] font-display font-black uppercase tracking-[0.4em] holo-text">
              Coach Magic · Pronostics
            </span>
          </div>
          <button
            onClick={onClose}
            className="tap w-9 h-9 rounded-full bg-background/40 border border-primary/40 flex items-center justify-center text-foreground"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Carte centrale */}
        <div className="relative z-10 flex-1 flex items-center justify-center h-[calc(100%-7rem)] px-4">
          <AnimatePresence mode="wait">
            {current && (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 80, rotateX: 25, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                exit={{ opacity: 0, y: -120, rotateX: -25, scale: 0.85 }}
                transition={{ type: "spring", stiffness: 70, damping: 18 }}
                className="w-full max-w-[380px]"
                style={{ perspective: "1000px" }}
              >
                <div className="relative rounded-3xl overflow-hidden border-2 border-primary/50 bg-gradient-to-br from-background/95 via-card/90 to-background/95 backdrop-blur-2xl shadow-[0_0_60px_rgba(212,160,23,0.45)]">
                  {/* Bandeau type pari + cote */}
                  <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/30 via-primary/15 to-transparent border-b border-primary/30">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Trophy size={11} className="text-primary shrink-0" />
                      <span className="text-[9px] font-black uppercase tracking-[0.25em] text-primary truncate">
                        {current.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                        cote
                      </span>
                      <span className="text-2xl font-display font-black holo-text leading-none tabular-nums">
                        {current.odds.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Match vs match */}
                  <div className="px-4 py-5 bg-black/40">
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
                      <p className="text-sm font-display font-black text-foreground uppercase break-words leading-tight">
                        {current.teamA || current.match.split(" vs ")[0]}
                      </p>
                      <motion.div
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-2xl font-display font-black holo-text drop-shadow-[0_0_14px_rgba(212,160,23,0.7)]"
                      >
                        VS
                      </motion.div>
                      <p className="text-sm font-display font-black text-foreground uppercase break-words leading-tight">
                        {current.teamB || current.match.split(" vs ")[1] || ""}
                      </p>
                    </div>
                    {current.league && (
                      <p className="mt-3 text-[8.5px] font-bold uppercase tracking-[0.3em] text-primary text-center truncate">
                        {current.league}
                      </p>
                    )}
                  </div>

                  {/* Date / Heure */}
                  {current.time && (
                    <div className="px-4 py-2.5 flex items-center justify-center gap-4 border-t border-b border-border/40 bg-black/20">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        <Calendar size={11} className="text-primary" />
                        <span>{current.time}</span>
                      </div>
                    </div>
                  )}

                  {/* Pronostic + confiance */}
                  <div className="px-4 py-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <Star size={14} className="text-gold shrink-0 mt-0.5 drop-shadow-[0_0_6px_rgba(212,160,23,0.6)]" />
                      <p className="text-sm font-display font-black text-foreground uppercase leading-snug flex-1">
                        {current.option}
                      </p>
                    </div>
                    {typeof current.probability === "number" && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                          <span className="text-muted-foreground">Confiance</span>
                          <span className="text-primary tabular-nums">
                            {Math.round((current.probability ?? 0) * (current.probability && current.probability <= 1 ? 100 : 1))}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.round(
                                (current.probability ?? 0) *
                                  (current.probability && current.probability <= 1 ? 100 : 1),
                              )}%`,
                            }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-primary via-gold to-primary shadow-[0_0_10px_rgba(212,160,23,0.7)]"
                          />
                        </div>
                      </div>
                    )}
                    {current.comment && (
                      <p className="text-[10px] text-muted-foreground italic leading-snug">
                        {current.comment}
                      </p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2 flex items-center justify-between border-t border-border/40 bg-black/40">
                    <span className="text-[8.5px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                      <TrendingUp size={9} /> Pari #{idx + 1}/{picks.length}
                    </span>
                    {current.verdict && (
                      <span
                        className={`text-[8.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                          current.verdict === "value"
                            ? "border-success/40 text-success bg-success/10"
                            : current.verdict === "risky"
                              ? "border-destructive/40 text-destructive bg-destructive/10"
                              : "border-border text-muted-foreground bg-muted/20"
                        }`}
                      >
                        {current.verdict}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation bas */}
        <div className="absolute inset-x-0 bottom-0 z-10 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 flex items-center justify-center gap-3">
          <button
            onClick={() => setIdx((i) => (i - 1 + picks.length) % picks.length)}
            className="tap w-10 h-10 rounded-full bg-background/40 border border-primary/40 flex items-center justify-center text-primary"
            aria-label="Précédent"
            disabled={picks.length <= 1}
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-1.5">
            {picks.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Pari ${i + 1}`}
                className={`tap h-1.5 rounded-full transition-all ${
                  i === idx ? "w-6 bg-primary shadow-[0_0_8px_rgba(212,160,23,0.7)]" : "w-1.5 bg-muted-foreground/40"
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => setIdx((i) => (i + 1) % picks.length)}
            className="tap w-10 h-10 rounded-full bg-background/40 border border-primary/40 flex items-center justify-center text-primary"
            aria-label="Suivant"
            disabled={picks.length <= 1}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

export default CoachStarwarsStage;
