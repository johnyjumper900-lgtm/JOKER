// 🔄 Mise à jour automatique des cotes toutes les 30 minutes
// Appelle l'edge function `sync-odds` côté Supabase pour rafraîchir
// la table odds_cache. Tourne tant que l'app (ou la PWA) est ouverte.

import { supabase } from "@/integrations/supabase-external/client";

const THIRTY_MIN = 30 * 60 * 1000;
let oddsInterval: ReturnType<typeof setInterval> | null = null;
let lastOddsSync = 0;
let inFlight = false;

async function runOddsSync() {
  if (inFlight) return;
  inFlight = true;
  try {
    // Edge function externe `sync-odds` désactivée (ancien projet hors-ligne).
    // Les cotes sont récupérées côté client via le pipeline multi-provider.
    void supabase;
    lastOddsSync = Date.now();
    try {
      localStorage.setItem("lastOddsSync", String(lastOddsSync));
    } catch {/* ignore */}
    window.dispatchEvent(new CustomEvent("odds-updated", { detail: { skipped: true } }));
  } finally {
    inFlight = false;
  }
}

export function startOddsScheduler() {
  if (oddsInterval) return; // déjà démarré

  // Récupère le dernier sync stocké pour éviter de spammer au reload
  try {
    const stored = Number(localStorage.getItem("lastOddsSync") || 0);
    if (Number.isFinite(stored)) lastOddsSync = stored;
  } catch {/* ignore */}

  const sinceLast = Date.now() - lastOddsSync;
  // Si plus de 30 min depuis le dernier sync (ou jamais) → refresh immédiat
  if (sinceLast >= THIRTY_MIN) {
    runOddsSync();
  } else {
    console.log(
      `[odds-scheduler] dernier sync il y a ${Math.round(sinceLast / 60000)} min, prochaine màj dans ${Math.round((THIRTY_MIN - sinceLast) / 60000)} min`,
    );
  }

  oddsInterval = setInterval(runOddsSync, THIRTY_MIN);

  // Refresh quand l'app revient au premier plan (PWA iOS notamment)
  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      const since = Date.now() - lastOddsSync;
      if (since >= THIRTY_MIN) runOddsSync();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("focus", onVisibility);

  return () => stopOddsScheduler();
}

export function stopOddsScheduler() {
  if (oddsInterval) {
    clearInterval(oddsInterval);
    oddsInterval = null;
  }
}

export function getLastOddsSync() {
  return lastOddsSync || null;
}
