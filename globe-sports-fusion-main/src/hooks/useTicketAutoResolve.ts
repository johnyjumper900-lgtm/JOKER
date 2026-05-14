import { useEffect, useRef } from "react";
import type { HistoryItem } from "@/types/magic";
import { resolveMatchScore } from "@/lib/score-resolver";

/**
 * Résout AUTOMATIQUEMENT les paris en cours en interrogeant en parallèle
 * TOUTES les API configurées par l'utilisateur (TheSportsDB, Football-Data,
 * API-Sports). Aucune intervention manuelle — la couleur (vert/rouge) est
 * mise à jour dès que le score réel est disponible.
 */

type Pick = NonNullable<HistoryItem["picks"]>[number];

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .trim();
}

function resolvePick(pick: Pick, h: number, a: number): "won" | "lost" | "pending" {
  const total = h + a;
  const opt = normalize(pick.option);
  const sep = /\s+(?:vs\.?|versus|contre|-|–|—)\s+/i;
  const parts = pick.match.split(sep);
  const home = parts[0] ? normalize(parts[0]) : "";
  const away = parts[1] ? normalize(parts[1]) : "";

  // Double chance
  if (/\b1x\b/.test(opt) || opt.includes("1 ou nul") || opt.includes("domicile ou nul")) {
    return h >= a ? "won" : "lost";
  }
  if (/\bx2\b/.test(opt) || opt.includes("nul ou 2") || opt.includes("nul ou exterieur")) {
    return a >= h ? "won" : "lost";
  }
  if (/\b12\b/.test(opt) || opt.includes("pas de nul")) {
    return h !== a ? "won" : "lost";
  }

  // Over/Under
  const over = opt.match(/(?:\+|over|plus\s*de\s*)(\d+(?:[.,]\d+)?)/);
  if (over) {
    const t = parseFloat(over[1].replace(",", "."));
    return total > t ? "won" : "lost";
  }
  const under = opt.match(/(?:^-\s*|under|moins\s*de\s*)(\d+(?:[.,]\d+)?)/);
  if (under) {
    const t = parseFloat(under[1].replace(",", "."));
    return total < t ? "won" : "lost";
  }

  // BTTS
  if (
    (opt.includes("btts") || opt.includes("les deux") || opt.includes("both")) &&
    (opt.includes("non") || /\bno\b/.test(opt))
  ) {
    return h === 0 || a === 0 ? "won" : "lost";
  }
  if (opt.includes("btts") || opt.includes("les deux") || opt.includes("both")) {
    return h > 0 && a > 0 ? "won" : "lost";
  }

  // 1X2
  if (opt === "1" || opt.includes("domicile") || (home && opt.includes(home))) {
    return h > a ? "won" : "lost";
  }
  if (
    opt === "2" ||
    opt.includes("exterieur") ||
    opt.includes("visiteur") ||
    (away && opt.includes(away))
  ) {
    return a > h ? "won" : "lost";
  }
  if (opt === "x" || opt.includes("nul") || opt.includes("draw")) {
    return h === a ? "won" : "lost";
  }

  return "pending";
}

interface Options {
  history: HistoryItem[];
  onSetPickResult: (
    ticketId: string,
    pickIndex: number,
    result: "won" | "lost" | "pending",
  ) => void;
  intervalMs?: number;
}

export function useTicketAutoResolve({ history, onSetPickResult, intervalMs = 60_000 }: Options) {
  const lastRunRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      const now = Date.now();
      if (now - lastRunRef.current < 5_000) return;
      lastRunRef.current = now;

      const tickets = history.filter((t) => t.status === "validated");
      for (const t of tickets) {
        const picks = t.picks ?? [];
        for (let i = 0; i < picks.length; i++) {
          const p = picks[i];
          if (p.result === "won" || p.result === "lost") continue;
          const score = await resolveMatchScore(p.match);
          if (cancelled) return;
          if (score.status === "finished" && score.homeScore != null && score.awayScore != null) {
            const r = resolvePick(p, score.homeScore, score.awayScore);
            if (r !== "pending") onSetPickResult(t.id, i, r);
          }
          await new Promise((res) => setTimeout(res, 200));
        }
      }
    }

    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [history, onSetPickResult, intervalMs]);
}
