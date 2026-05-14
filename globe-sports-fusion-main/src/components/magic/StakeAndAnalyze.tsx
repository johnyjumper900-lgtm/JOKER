import { Brain, Sparkles, Wallet } from "lucide-react";

interface StakeAndAnalyzeProps {
  stake: number;
  onStakeChange: (n: number) => void;
  onAnalyze: (mode?: "standard" | "confidence_100") => void;
  isAnalyzing: boolean;
  hasMatches: boolean;
}

export const StakeAndAnalyze = ({
  stake,
  onStakeChange,
  onAnalyze,
  isAnalyzing,
  hasMatches,
}: StakeAndAnalyzeProps) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <div className="glass rounded-2xl flex items-center gap-2 px-3 py-2.5">
          <Wallet size={14} className="text-primary" />
          <input
            type="number"
            inputMode="decimal"
            min={1}
            value={stake}
            onChange={(e) => onStakeChange(Number(e.target.value) || 0)}
            className="w-16 bg-transparent text-foreground font-bold text-sm focus:outline-none"
          />
          <span className="text-primary font-black text-sm">€</span>
        </div>
        <button
          onClick={() => onAnalyze("standard")}
          disabled={isAnalyzing || !hasMatches}
          className="tap py-3 px-5 rounded-2xl bg-gradient-holo text-primary-foreground font-display font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 shadow-holo disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Sparkles size={14} className={isAnalyzing ? "animate-spin" : ""} />
          {isAnalyzing ? "Analyse..." : "Analyser"}
        </button>
      </div>
      <button
        onClick={() => onAnalyze("confidence_100")}
        disabled={isAnalyzing || !hasMatches}
        className="tap py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-fuchsia-500 to-violet-600 text-white font-display font-black uppercase tracking-[0.18em] text-xs flex items-center justify-center gap-2 shadow-prism disabled:opacity-40 disabled:cursor-not-allowed"
        title="Analyse approfondie multi-passes — environ 30 à 60 s"
      >
        <Brain size={14} className={isAnalyzing ? "animate-pulse" : ""} />
        {isAnalyzing ? "Réflexion approfondie…" : "🧠 Magic Confiance 100%"}
      </button>
    </div>
  );
};
