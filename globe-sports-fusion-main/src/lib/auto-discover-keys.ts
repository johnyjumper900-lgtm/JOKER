/**
 * auto-discover-keys.ts — Scan localStorage et identifie automatiquement
 * toute clé API foot (Odds API / API-Football / Football-Data / Sportmonks /
 * RapidAPI / TheSportsDB) pour la promouvoir vers son bon slot.
 *
 * Utilisé au montage du module Top 20 (et de l'app) pour que l'utilisateur
 * n'ait JAMAIS à reconfigurer ses clés : si elle est quelque part dans le
 * storage, elle est détectée, vérifiée en live, et activée automatiquement.
 */

import {
  getExtraKeys,
  addExtraKey,
  resolveAndVerify,
  detectCandidates,
  EXTRA_PROVIDERS,
  type ExtraApiKey,
} from "./extra-api-keys";

/** Clés localStorage où l'utilisateur a pu stocker une clé brute */
const SCAN_KEYS = [
  "magic_user_rapidapi_key",
  "magic_user_footballdata_key",
  "magic_user_odds_key",
  "magic_user_apisports_key",
  "magic_user_sportmonks_key",
  "magic_user_apifootball_key",
  "magic_user_thesportsdb_key",
  "magic_user_gemini_key",
  "thesportsdb.apikey",
  // Anciens noms / variantes possibles
  "odds_api_key",
  "football_data_key",
  "api_football_key",
  "api_sports_key",
  "rapidapi_key",
  "gemini_key",
  "gemini_api_key",
  "google_ai_studio_key",
  "GEMINI_API_KEY",
];

const DISCOVER_FLAG = "magic.autoDiscover.lastRunAt";
const DISCOVER_INTERVAL_MS = 30 * 60 * 1000; // 30 min

let inflight: Promise<number> | null = null;

/** Collecte les candidats clé bruts trouvés dans le storage. */
function collectCandidates(): string[] {
  if (typeof window === "undefined") return [];
  const set = new Set<string>();
  try {
    for (const k of SCAN_KEYS) {
      const v = localStorage.getItem(k);
      if (v && v.trim().length >= 5) set.add(v.trim());
    }
    // Scan opportuniste : toute autre clé qui ressemble à une clé API foot
    for (let i = 0; i < localStorage.length; i++) {
      const name = localStorage.key(i);
      if (!name) continue;
      if (!/api|key|token/i.test(name)) continue;
      const v = localStorage.getItem(name);
      if (!v || v.length < 16 || v.length > 200) continue;
      // Filtre rapide : doit matcher au moins une signature connue
      const cands = detectCandidates(v.trim());
      if (cands.length && cands[0] !== "unknown") set.add(v.trim());
    }
  } catch {
    /* noop */
  }
  return [...set];
}

/**
 * Scan + détection + vérif live + promotion.
 * Renvoie le nombre de clés nouvellement identifiées et activées.
 */
export async function autoDiscoverKeys(force = false): Promise<number> {
  if (typeof window === "undefined") return 0;
  if (inflight) return inflight;

  if (!force) {
    try {
      const last = Number(localStorage.getItem(DISCOVER_FLAG) || 0);
      if (Date.now() - last < DISCOVER_INTERVAL_MS) return 0;
    } catch {
      /* noop */
    }
  }

  inflight = (async () => {
    const existing = getExtraKeys();
    const known = new Set(existing.map((e) => e.key));
    const candidates = collectCandidates().filter((k) => !known.has(k));

    let promoted = 0;
    for (const raw of candidates) {
      try {
        const { provider, result } = await resolveAndVerify(raw);
        if (provider === "unknown") continue;
        // Promotion spéciale Gemini : écrit aussi dans le slot "user key"
        // pour que tous les modules (Coach, calendrier, top20…) le voient.
        if (provider === "gemini") {
          try {
            localStorage.setItem("magic_user_gemini_key", raw);
          } catch {
            /* noop */
          }
        }
        const entry: ExtraApiKey = {
          id: crypto.randomUUID(),
          provider,
          key: raw,
          label: EXTRA_PROVIDERS[provider].label,
          addedAt: Date.now(),
          valid: result.valid,
          message: result.message,
          enabled: provider === "elevenlabs" ? true : undefined,
        };
        addExtraKey(entry);
        if (result.valid) promoted += 1;
      } catch {
        /* noop */
      }
    }

    try {
      localStorage.setItem(DISCOVER_FLAG, String(Date.now()));
    } catch {
      /* noop */
    }
    return promoted;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}
