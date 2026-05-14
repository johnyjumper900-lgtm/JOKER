import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TeamKit } from "./TeamCrest";
import { lookupCoords } from "@/lib/country-coords";
import { RealisticGlobe } from "./RealisticGlobe";
import { resolveMatchScore, type ResolvedScore } from "@/lib/score-resolver";
import { Activity } from "lucide-react";

interface MatchHeroFxProps {
  teamA: string;
  teamB: string;
  teamALogoUrl?: string;
  teamBLogoUrl?: string;
  teamAJerseyUrl?: string;
  teamBJerseyUrl?: string;
  odds?: { home?: number; draw?: number; away?: number };
  league?: string;
  kickoff?: string;
  countryCode?: string;
  /** Taille du globe 3D en arrière-plan. "sm" = plus discret. */
  globeScale?: "sm" | "md";
}

/** 
 * Fluid Match Hero with Parallax & 3D Globe
 */
export const MatchHeroFx = ({
  teamA,
  teamB,
  teamALogoUrl,
  teamBLogoUrl,
  teamAJerseyUrl,
  teamBJerseyUrl,
  odds,
  league,
  kickoff,
  countryCode,
  globeScale = "md",
}: MatchHeroFxProps) => {
  const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return "#" + "00000".substring(0, 6 - color.length) + color;
  };

  const teamAColor = useMemo(() => stringToColor(teamA), [teamA]);
  const teamBColor = useMemo(() => stringToColor(teamB), [teamB]);

  const points = useMemo(() => [], []);

  // Live score : poll toutes les 30s sur les noms d'équipes.
  const [live, setLive] = useState<ResolvedScore | null>(null);
  useEffect(() => {
    let cancelled = false;
    const fetchScore = async () => {
      try {
        const sc = await resolveMatchScore(`${teamA} vs ${teamB}`);
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
  }, [teamA, teamB]);

  const hasLive =
    live && live.homeScore != null && live.awayScore != null && live.status !== "scheduled";

  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-black shadow-2xl border-none">
      {/* Globe Background Layer — toujours actif dans le module Match */}
      <div className={`absolute inset-0 pointer-events-none mix-blend-screen overflow-hidden ${globeScale === "sm" ? "opacity-50" : "opacity-60"}`}>
        <RealisticGlobe
          className={
            globeScale === "sm"
              ? "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%]"
              : "absolute inset-0 w-[140%] h-[140%] -left-[20%] -top-[20%]"
          }
          points={points}
          rotationSpeed={0.15}
        />
      </div>

      {/* Background Glows (Parallax) */}
      <motion.div 
        className="absolute inset-0 opacity-40 blur-[120px]"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        style={{
          background: `radial-gradient(circle at 10% 50%, ${teamAColor}, transparent 60%), radial-gradient(circle at 90% 50%, ${teamBColor}, transparent 60%)`
        }}
      />

      <div className="relative h-[300px] sm:h-[360px] flex items-center justify-center">

        {/* VS + Live Score (centre, au-dessus des maillots) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex flex-col items-center gap-1.5">
          <div className="text-3xl sm:text-4xl font-display font-black holo-text drop-shadow-[0_0_18px_rgba(255,200,80,0.6)]">
            VS
          </div>
          {hasLive ? (
            <div className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 shadow-[0_0_24px_rgba(57,255,20,0.25)]">
              <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-[#39ff14]">
                <Activity size={9} className={live?.status === "live" ? "animate-pulse" : ""} />
                {live?.status === "live" ? "Live" : live?.status === "finished" ? "Final" : "Score"}
              </div>
              <div className="text-2xl sm:text-3xl font-display font-black tabular-nums text-white leading-none">
                {live!.homeScore}<span className="text-white/40 mx-1.5">-</span>{live!.awayScore}
              </div>
            </div>
          ) : kickoff ? (
            <div className="text-[9px] font-black uppercase tracking-widest text-white/60 bg-black/40 backdrop-blur-md rounded-md px-2 py-0.5 border border-white/5">
              {kickoff}
            </div>
          ) : null}
        </div>

        <motion.div 
          className="absolute left-0 w-1/2 h-full flex items-center justify-center pointer-events-none"
          initial={{ x: -120, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 25, stiffness: 80 }}
        >
          <motion.div
            className="relative"
            animate={{ 
              y: [0, -15, 0],
              rotate: [-2, 2, -2]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
             {/* Dynamic Glow */}
             <div className="absolute inset-0 blur-[60px] opacity-30 scale-125" style={{ backgroundColor: teamAColor }} />

             {/* Real jersey backdrop */}
             {teamAJerseyUrl && (
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-90">
                 <TeamKit src={teamAJerseyUrl} name={teamA} size={300} />
               </div>
             )}

             <div className="relative">
                {teamALogoUrl ? (
                  <img
                    src={teamALogoUrl}
                    alt={teamA}
                    className={`${teamAJerseyUrl ? "w-[110px] sm:w-[140px]" : "w-[160px] sm:w-[220px]"} h-auto object-contain drop-shadow-[0_0_40px_rgba(255,255,255,0.4)] select-none`}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-4xl font-black text-white/20">{teamA.substring(0,2)}</div>
                )}
             </div>
          </motion.div>
        </motion.div>



        {/* Team B Side */}
        <motion.div 
          className="absolute right-0 w-1/2 h-full flex items-center justify-center pointer-events-none"
          initial={{ x: 120, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 25, stiffness: 80 }}
        >
          <motion.div
            className="relative"
            animate={{ 
              y: [0, 15, 0],
              rotate: [2, -2, 2]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          >
             <div className="absolute inset-0 blur-[60px] opacity-30 scale-125" style={{ backgroundColor: teamBColor }} />

             {teamBJerseyUrl && (
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-90">
                 <TeamKit src={teamBJerseyUrl} name={teamB} size={300} />
               </div>
             )}

             <div className="relative">
                {teamBLogoUrl ? (
                  <img
                    src={teamBLogoUrl}
                    alt={teamB}
                    className={`${teamBJerseyUrl ? "w-[110px] sm:w-[140px]" : "w-[160px] sm:w-[220px]"} h-auto object-contain drop-shadow-[0_0_40px_rgba(255,255,255,0.4)] select-none`}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-4xl font-black text-white/20">{teamB.substring(0,2)}</div>
                )}
             </div>
          </motion.div>
        </motion.div>

      </div>

      {/* Odds Band */}
      {odds && (odds.home || odds.draw || odds.away) ? (
        <div className="relative grid grid-cols-3 gap-px bg-white/5 backdrop-blur-3xl border-t border-white/5">
          {[
            { label: "1", value: odds.home, hint: teamA, color: "text-primary" },
            { label: "X", value: odds.draw, hint: "Match Nul", color: "text-white/40" },
            { label: "2", value: odds.away, hint: teamB, color: "text-secondary" },
          ].map((c, i) => (
            <motion.div 
                key={c.label} 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 + (i * 0.1) }}
                className="py-5 px-2 text-center group hover:bg-white/5 transition-all cursor-default"
            >
              <div className="text-[7px] font-black uppercase tracking-[0.34em] text-white/20 mb-2 truncate px-2">
                {c.hint}
              </div>
              <div className={`text-xl font-display font-black tracking-tighter ${c.color} group-hover:scale-110 transition-transform duration-500`}>
                {c.value ? c.value.toFixed(2) : "—"}
              </div>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-white/10" />
                  <div className="text-[8px] font-bold uppercase tracking-widest text-white/10">{c.label}</div>
                  <div className="w-1 h-1 rounded-full bg-white/10" />
              </div>
            </motion.div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default MatchHeroFx;
