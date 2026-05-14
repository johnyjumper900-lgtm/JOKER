import React, { useState, useEffect } from "react";
import { CheckCircle2, Clock, X, Trash2, Activity } from "lucide-react";
import { type HistoryItem } from "@/types/magic";
import { resolveMatchScore, type ResolvedScore } from "@/lib/score-resolver";

interface WinamaxTicketCardProps {
  ticket: HistoryItem;
  status: "won" | "lost" | "live" | "draft";
  onDelete: () => void;
  onValidate?: () => void;
  onSetPickResult?: (pickIndex: number, result: "won" | "lost" | "pending") => void;
}

export const WinamaxTicketCard = ({
  ticket,
  status,
  onDelete,
  onValidate,
  onSetPickResult,
}: WinamaxTicketCardProps) => {
  const picks = ticket.picks ?? [];
  const totalOdds = ticket.multiplier ?? (ticket.odds ? Number(ticket.odds) : 0);
  const stake = ticket.stake ?? 10;
  const potentialWinnings = ticket.potentialWin ? ticket.potentialWin : stake * totalOdds;

  const isDraft = ticket.status === "draft";

  const [liveScores, setLiveScores] = useState<Record<number, ResolvedScore>>({});

  useEffect(() => {
    if (isDraft || status === "won" || status === "lost") return;

    let cancelled = false;
    const fetchScores = async () => {
      const newScores: Record<number, ResolvedScore> = {};
      for (let i = 0; i < picks.length; i++) {
        const p = picks[i];
        if (p.result !== "won" && p.result !== "lost") {
          try {
            const sc = await resolveMatchScore(p.match);
            if (!cancelled) newScores[i] = sc;
          } catch (e) {
            // ignore
          }
        }
      }
      if (!cancelled && Object.keys(newScores).length > 0) {
        setLiveScores((prev) => ({ ...prev, ...newScores }));
      }
    };

    fetchScores();
    const interval = setInterval(fetchScores, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [ticket, isDraft, status, picks]);

  return (
    <div
      className={`bg-yellow-600/10 rounded-xl border p-4 shadow-xl mb-4 relative ${
        status === "won"
          ? "border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.15)] bg-green-950/20"
          : status === "lost"
            ? "border-red-500/30 bg-red-950/20"
            : "border-yellow-500/30 bg-yellow-900/20"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${status === "won" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" : status === "lost" ? "bg-red-500" : isDraft ? "bg-orange-400 animate-pulse" : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"}`}
          />
          <span className="text-sm font-bold uppercase">
            {isDraft ? (
              <span className="text-slate-200">Brouillon</span>
            ) : status === "won" ? (
              <span className="text-green-400">Ticket Gagnant</span>
            ) : status === "lost" ? (
              <span className="text-red-500">Ticket Perdant</span>
            ) : (
              <span className="text-green-500 drop-shadow-[0_0_4px_rgba(34,197,94,0.5)]">Ticket Validé</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-lg font-black text-red-500 drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]">{Number(totalOdds).toFixed(2)}</div>
          <button
            onClick={onDelete}
            className="p-1 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-full transition-colors ml-2"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Picks */}
      <div className="flex flex-col mb-4">
        {picks.map((p, i) => {
          const live = liveScores[i];
          const hasScore = live?.homeScore != null && live?.awayScore != null;

          return (
            <div key={i} className={`flex justify-between items-center text-sm py-4 ${i !== picks.length - 1 ? 'border-b border-yellow-800/40' : ''}`}>
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-full transition-colors ${
                    p.result === "won"
                      ? "bg-green-900/40 text-green-400 border border-green-500/30 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                      : p.result === "lost"
                        ? "bg-red-900/40 text-red-500 border border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                        : live?.status === "live"
                          ? "bg-blue-900/40 text-blue-400 border border-blue-500/30 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                          : "bg-slate-800 text-yellow-400 border border-yellow-500/30 shadow-[0_0_8px_rgba(234,179,8,0.2)]"
                  }`}
                >
                  {p.result === "won" ? (
                    <CheckCircle2 size={16} />
                  ) : p.result === "lost" ? (
                    <X size={16} />
                  ) : live?.status === "live" ? (
                    <Activity size={14} />
                  ) : (
                    <Clock size={14} />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-amber-400 font-bold leading-tight drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]">
                    {p.match}
                    {hasScore && (
                      <span className="ml-2 font-black text-blue-400 tabular-nums">
                        {live.homeScore} - {live.awayScore}
                      </span>
                    )}
                    {!hasScore && live?.status === "live" && (
                      <span className="ml-2 font-black text-blue-400 text-xs">En cours</span>
                    )}
                  </span>
                  <span className="text-xs text-[#39ff14] font-medium mt-1">
                    {!hasScore && live?.status !== "live" && (p.date || p.time) && (
                      <span className="mr-2 inline-flex items-center text-blue-400">
                        <Clock size={10} className="mr-1 opacity-70" />
                        {p.date} {p.time}
                        <span className="mx-2 opacity-50 text-slate-500">|</span>
                      </span>
                    )}
                    {p.type} — <span className="font-bold drop-shadow-[0_0_3px_rgba(57,255,20,0.5)]">{p.option}</span>
                  </span>
                </div>
              </div>
              <span className="font-black text-red-500 ml-2 shrink-0 drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]">
                {Number(p.odds).toFixed(2)}
              </span>
            </div>
          );
        })}
        {!isDraft && (
          <div className="text-[10px] text-blue-400 text-center italic mt-2 animate-pulse">
            Suivi automatique du score en temps réel...
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="border-t border-slate-800 pt-4 space-y-2 text-sm">
        <div className="flex justify-between text-slate-400">
          <span>Cote totale</span>
          <span className="text-red-500 font-bold drop-shadow-[0_0_4px_rgba(239,68,68,0.3)]">{Number(totalOdds).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Mise</span>
          <span className="text-green-400 font-bold">{Number(stake).toFixed(2)} €</span>
        </div>
        <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-slate-800">
          <span>{status === "won" ? "Gains obtenus" : "Gains potentiels"}</span>
          <span className="text-green-400 drop-shadow-[0_0_4px_rgba(34,197,94,0.3)]">
            {Number(potentialWinnings).toFixed(2)} €
          </span>
        </div>
      </div>

      {isDraft && onValidate && (
        <button
          onClick={onValidate}
          className="w-full mt-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-lg transition-colors border border-blue-400/30 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
        >
          Valider ce ticket
        </button>
      )}
    </div>
  );
};
