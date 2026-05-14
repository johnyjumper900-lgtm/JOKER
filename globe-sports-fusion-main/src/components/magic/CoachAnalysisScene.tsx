import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, ScanLine, X, Sparkles, Zap, Star, TrendingUp } from "lucide-react";
import { CoachOrb3D } from "./CoachOrb3D";

export type AnalyzedPick = {
  match: string;
  teamA: string;
  teamB: string;
  type: string;
  option: string;
  odds: number;
  verdict?: "value" | "risky" | "neutral";
  confidence?: number;
  comment?: string;
  league?: string;
  time?: string;
  probability?: number;
};

export type CoachScene =
  | { kind: "idle" }
  | { kind: "scanning"; fileName?: string }
  | { kind: "analyzing"; picks: AnalyzedPick[] }
  | { kind: "result"; picks: AnalyzedPick[]; verdict: string; score: number }
  | { kind: "suggestions"; picks: AnalyzedPick[] };

interface Props {
  scene: CoachScene;
  listening: boolean;
  streaming: boolean;
  onClose?: () => void;
}

/**
 * Cadre visuel du coach :
 * - idle → ballon 3D qui tourne
 * - scanning/analyzing/result → le ballon disparaît, place à un HUD sci-fi
 *   (grille holographique, balayage, pics, cartes pari)
 */
export const CoachAnalysisScene = ({ scene, listening, streaming, onClose }: Props) => {
  const active = scene.kind !== "idle" || streaming || listening;

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* GRILLE HOLO (toujours présente, intensifiée pendant l'analyse) */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: active ? 0.55 : 0.15 }}
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary) / 0.25) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.25) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 75%)",
        }}
      />

      {/* BALAYAGE SCI-FI */}
      {active && (
        <motion.div
          className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_18px_hsl(var(--primary))] pointer-events-none"
          initial={{ top: 0 }}
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* CIBLE / RETICULE */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-3 rounded-full border border-primary/40 pointer-events-none"
            style={{
              boxShadow:
                "inset 0 0 60px hsl(var(--primary) / 0.25), 0 0 40px hsl(var(--accent) / 0.25)",
            }}
          >
            <div className="absolute inset-6 rounded-full border border-secondary/30 animate-[spin_18s_linear_infinite]" />
            <div className="absolute inset-12 rounded-full border border-accent/30 animate-[spin_9s_linear_reverse_infinite]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* BALLON 3D — disparaît quand actif */}
      <AnimatePresence>
        {!active && (
          <motion.div
            key="orb"
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.4, filter: "blur(8px)" }}
            transition={{ duration: 0.5 }}
          >
            <CoachOrb3D listening={listening} streaming={streaming} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* FX SPEAKING (orbe énergie quand coach parle, sans ballon) */}
      {streaming && scene.kind === "idle" && (
        <motion.div
          key="speaking-fx"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <motion.div
            className="relative w-32 h-32 rounded-full"
            style={{
              background:
                "radial-gradient(circle, hsl(var(--primary) / 0.6) 0%, hsl(var(--accent) / 0.3) 40%, transparent 70%)",
              boxShadow: "0 0 80px hsl(var(--primary) / 0.7), inset 0 0 40px hsl(var(--accent) / 0.5)",
            }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full border border-primary/60"
                animate={{ scale: [1, 2], opacity: [0.8, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}

      {/* HUD D'ANALYSE */}
      <AnimatePresence mode="wait">
        {scene.kind === "scanning" && (
          <motion.div
            key="scan"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4"
          >
            <div className="relative">
              <ScanLine size={42} className="text-primary drop-shadow-[0_0_12px_hsl(var(--primary))]" />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-primary/60"
                animate={{ scale: [1, 1.6], opacity: [0.7, 0] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              />
            </div>
            <div className="text-center">
              <div className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/90">
                Lecture du ticket
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 max-w-[220px] truncate">
                {scene.fileName ?? "OCR neural en cours…"}
              </div>
            </div>
          </motion.div>
        )}

        {scene.kind === "analyzing" && (
          <motion.div
            key="ana"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3"
          >
            <div className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] holo-text">
                Coach analyse {scene.picks.length} pari{scene.picks.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="w-full max-w-[260px] flex flex-col gap-1">
              {scene.picks.slice(0, 5).map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.12 }}
                  className="flex items-center justify-between text-[10px] px-2 py-1 rounded border border-primary/30 bg-background/40 backdrop-blur-sm"
                >
                  <span className="truncate text-foreground/90 font-bold">{p.match}</span>
                  <span className="font-display font-black holo-text ml-2">
                    {p.odds.toFixed(2)}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {scene.kind === "result" && (
          <motion.div
            key="res"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className="relative"
            >
              <Sparkles size={30} className="text-primary drop-shadow-[0_0_14px_hsl(var(--primary))]" />
            </motion.div>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] holo-text">
              Verdict
            </div>
            <div className="text-[11px] text-foreground/95 text-center max-w-[260px] line-clamp-3 leading-snug">
              {scene.verdict}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <Zap size={11} className="text-gold" />
              <span className="text-[10px] font-black holo-text">
                Score {scene.score}/100
              </span>
            </div>
          </motion.div>
        )}

        {scene.kind === "suggestions" && (
          <SuggestionsCarousel key="sugg" picks={scene.picks} />
        )}
      </AnimatePresence>

      {/* Bouton fermer (revient au ballon) */}
      {active && onClose && (
        <button
          onClick={onClose}
          className="absolute top-1.5 right-1.5 tap p-1.5 rounded-lg bg-background/70 border border-border/60 text-muted-foreground hover:text-foreground"
          aria-label="Fermer l'analyse"
        >
          <X size={12} />
        </button>
      )}

      {/* Coins HUD */}
      {active && (
        <>
          {[
            "top-1 left-1 border-l-2 border-t-2",
            "top-1 right-1 border-r-2 border-t-2",
            "bottom-1 left-1 border-l-2 border-b-2",
            "bottom-1 right-1 border-r-2 border-b-2",
          ].map((cls) => (
            <div
              key={cls}
              className={`absolute w-3 h-3 border-primary/70 ${cls} pointer-events-none`}
            />
          ))}
          {/* Indicateur ok */}
          {scene.kind === "result" && (
            <Check className="absolute bottom-1.5 right-1.5 text-primary" size={14} />
          )}
        </>
      )}
    </div>
  );
};

const SuggestionsCarousel = ({ picks }: { picks: AnalyzedPick[] }) => {
  const list = picks.slice(0, 5);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (list.length <= 1) return;
    const id = window.setInterval(
      () => setIdx((i) => (i + 1) % list.length),
      3200,
    );
    return () => window.clearInterval(id);
  }, [list.length]);

  if (list.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 flex items-center justify-center px-4"
      >
        <div className="text-[10px] text-center text-muted-foreground">
          Ouvre le Top 20 pour générer les pronostics du jour.
        </div>
      </motion.div>
    );
  }

  const current = list[idx];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4"
    >
      <div className="flex items-center gap-1.5">
        <Star size={12} className="text-gold drop-shadow-[0_0_8px_hsl(var(--gold))]" />
        <span className="text-[10px] font-black uppercase tracking-[0.32em] holo-text">
          Suggestions du jour
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.96 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-[280px] rounded-xl border border-primary/40 bg-background/55 backdrop-blur-md px-3 py-2 shadow-[0_0_24px_hsl(var(--primary)/0.25)]"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-black uppercase tracking-[0.28em] text-primary/90">
              #{idx + 1} · {current.league ?? "Match"}
            </span>
            <span className="text-[9px] text-muted-foreground">{current.time ?? ""}</span>
          </div>
          <div className="text-[12px] font-black text-foreground/95 truncate">
            {current.match}
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[10px] text-foreground/85 truncate mr-2">
              {current.type} · <span className="text-primary font-bold">{current.option}</span>
            </span>
            <span className="font-display text-sm font-black holo-text">
              {current.odds.toFixed(2)}
            </span>
          </div>
          {typeof current.probability === "number" && (
            <div className="mt-1 flex items-center gap-1.5">
              <TrendingUp size={10} className="text-gold" />
              <span className="text-[9px] font-bold text-gold">
                {Math.round(current.probability * 100)}% probabilité
              </span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center gap-1 mt-1">
        {list.map((_, i) => (
          <span
            key={i}
            className={`h-1 rounded-full transition-all ${
              i === idx ? "w-4 bg-primary" : "w-1.5 bg-primary/30"
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default CoachAnalysisScene;
