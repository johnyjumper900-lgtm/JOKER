import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { resolveMatchScore, type ResolvedScore } from "@/lib/score-resolver";

interface Props {
  homeTeam: string;
  awayTeam: string;
  /** Refresh interval ms — 30s by default for live polling */
  intervalMs?: number;
  className?: string;
}

/**
 * Badge "live score" qui interroge en boucle le score-resolver
 * pour TOUTES les sources (Football-Data, API-Sports, TheSportsDB).
 * Marche pour tous les sports gérés par les API configurées.
 * S'affiche seulement si un score est trouvé.
 */
export const LiveScoreBadge = ({ homeTeam, awayTeam, intervalMs = 30_000, className = "" }: Props) => {
  const [data, setData] = useState<ResolvedScore | null>(null);

  useEffect(() => {
    let alive = true;
    const fetchScore = async () => {
      try {
        const r = await resolveMatchScore(`${homeTeam} vs ${awayTeam}`);
        if (alive && r && (r.homeScore !== null || r.status === "live")) {
          setData(r);
        }
      } catch {
        /* noop */
      }
    };
    fetchScore();
    const id = setInterval(fetchScore, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [homeTeam, awayTeam, intervalMs]);

  if (!data || (data.homeScore === null && data.awayScore === null)) return null;

  const isLive = data.status === "live";
  const isFinished = data.status === "finished";

  return (
    <div className={`mt-2 flex items-center justify-center ${className}`}>
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border ${
          isLive
            ? "bg-red-500/15 border-red-500/50 shadow-[0_0_18px_rgba(239,68,68,0.45)]"
            : isFinished
              ? "bg-muted/30 border-border"
              : "bg-primary/15 border-primary/40"
        }`}
      >
        {isLive && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
        )}
        {!isLive && <Activity size={11} className={isFinished ? "text-muted-foreground" : "text-primary"} />}
        <span className={`text-[11px] font-black tabular-nums tracking-widest uppercase ${isLive ? "text-red-400" : "text-foreground"}`}>
          {data.homeScore ?? "-"} <span className="text-muted-foreground">·</span> {data.awayScore ?? "-"}
        </span>
        <span className="text-[8px] font-black uppercase tracking-[0.22em] text-muted-foreground">
          {isLive ? "LIVE" : isFinished ? "FIN" : data.status}
        </span>
      </div>
    </div>
  );
};
