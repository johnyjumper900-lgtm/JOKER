/**
 * Extra API keys — détection ROBUSTE et NON AMBIGÜE.
 *
 * Stratégie anti-confusion :
 *  - Chaque provider a une "signature" stricte (préfixe, longueur, charset).
 *  - Quand plusieurs providers matchent (cas typique : clé 32-hex partagée
 *    entre Odds-API / Football-Data / API-Football), on lance une
 *    VÉRIFICATION RÉELLE en cascade auprès de chaque endpoint candidat
 *    et on garde celui qui répond OK. La clé est ensuite mémorisée avec
 *    son provider correctement identifié — plus jamais de confusion.
 *  - Ajout d'ElevenLabs (clé `sk_...`) avec toggle activer/désactiver.
 */

import { getUserApiKeys, setUserApiKey } from "./user-api-keys";

/** Clé TheSportsDB par défaut (gratuit, public) — utilisée UNIQUEMENT pour
 *  logos / bannières / drapeaux des clubs et pays. */
const THESPORTSDB_DEFAULT_KEY = "3";
const THESPORTSDB_STORAGE = "thesportsdb.apikey";

export type ExtraProvider =
  | "apiFootball"
  | "footballData"
  | "theOddsApi"
  | "theSportsDB"
  | "rapidApi"
  | "rapidApiFreeFootball"
  | "sportmonks"
  | "apiSports"
  | "gemini"
  | "elevenlabs"
  | "unknown";

export interface ExtraProviderInfo {
  label: string;
  hint: string;
  /** Détection stricte (signature seule) */
  detect: (k: string) => boolean;
  /** Slot UserApiKeys correspondant si applicable */
  userKeySlot?: "rapidApi" | "footballData" | "odds" | "apiSports" | "sportmonks" | "gemini";
}

export const EXTRA_PROVIDERS: Record<ExtraProvider, ExtraProviderInfo> = {
  // --- Signatures UNIQUES (pas d'ambiguïté possible) ---
  gemini: {
    label: "Google Gemini",
    hint: "Préfixe AIza… (Google AI Studio)",
    detect: (k) => /^AIza[0-9A-Za-z_-]{30,}$/.test(k),
    userKeySlot: "gemini",
  },
  elevenlabs: {
    label: "ElevenLabs (Voix IA)",
    hint: "Préfixe sk_… (elevenlabs.io)",
    detect: (k) => /^sk_[A-Za-z0-9]{40,}$/.test(k),
  },
  rapidApiFreeFootball: {
    label: "RapidAPI · Free Football Live",
    hint: "Clé RapidAPI contenant 'msh' + 'jsn'",
    detect: (k) => /^[A-Za-z0-9]{45,60}$/.test(k) && k.includes("msh") && k.includes("jsn"),
    userKeySlot: "rapidApi",
  },
  rapidApi: {
    label: "RapidAPI (générique)",
    hint: "rapidapi.com — 50 chars contenant 'msh'",
    detect: (k) => /^[A-Za-z0-9]{45,}$/.test(k) && k.includes("msh"),
    userKeySlot: "rapidApi",
  },
  theSportsDB: {
    label: "TheSportsDB",
    hint: "thesportsdb.com (numérique 5-10 chiffres)",
    detect: (k) => /^\d{5,10}$/.test(k),
  },
  sportmonks: {
    label: "Sportmonks",
    hint: "sportmonks.com (60+ chars alphanum)",
    detect: (k) => /^[A-Za-z0-9]{60,}$/.test(k),
    userKeySlot: "sportmonks",
  },

  // --- Signatures AMBIGUËS (32-hex partagé) ---
  // Ces trois providers ont la même forme — on les départagera par vérif live.
  apiFootball: {
    label: "API-Football",
    hint: "api-football.com (32-hex)",
    detect: (k) => /^[a-f0-9]{32}$/i.test(k),
    userKeySlot: "apiSports",
  },
  apiSports: {
    label: "API-Sports",
    hint: "api-sports.io (32-hex)",
    detect: (k) => /^[a-f0-9]{32}$/i.test(k),
    userKeySlot: "apiSports",
  },
  theOddsApi: {
    label: "The Odds API",
    hint: "the-odds-api.com (32-hex)",
    detect: (k) => /^[a-f0-9]{32}$/i.test(k),
    userKeySlot: "odds",
  },
  footballData: {
    label: "Football-Data.org",
    hint: "football-data.org (32 alphanum)",
    detect: (k) => /^[a-z0-9]{32}$/i.test(k),
    userKeySlot: "footballData",
  },

  unknown: {
    label: "Autre",
    hint: "Provider inconnu",
    detect: () => false,
  },
};

export interface ExtraApiKey {
  id: string;
  provider: ExtraProvider;
  label: string;
  key: string;
  addedAt: number;
  valid: boolean;
  message?: string;
  /** ElevenLabs uniquement : toggle ON/OFF par l'utilisateur */
  enabled?: boolean;
}

const STORAGE_KEY = "magic.extraApiKeys";
const SEEDED_FLAG = "magic.extraApiKeys.seeded.v7";

// Clé ElevenLabs personnelle de l'utilisateur, pré-chargée pour activer la voix
// premium du Coach IA sans configuration manuelle.
const DEFAULT_SEEDED_KEYS: ExtraApiKey[] = [
  {
    id: "seed-elevenlabs-owner",
    provider: "elevenlabs",
    label: EXTRA_PROVIDERS.elevenlabs.label,
    key: "sk_517a0d4ad156836c6406550199eec6bf9576db2e089e17c3",
    addedAt: Date.now(),
    valid: true,
    enabled: true,
    message: "Clé propriétaire ElevenLabs (voix Coach IA)",
  },
];

/** Plus aucune clé "seed" — toujours false. Conservé pour compat API. */
export function isSeededKey(_key: string): boolean {
  return false;
}

function ensureSportsDbKey() {
  if (typeof window === "undefined") return;
  try {
    if (!localStorage.getItem(THESPORTSDB_STORAGE)) {
      localStorage.setItem(THESPORTSDB_STORAGE, THESPORTSDB_DEFAULT_KEY);
    }
  } catch {
    /* noop */
  }
}

/** Les anciennes clés "seed" hardcodées (Odds API / API-Football / Football-Data)
 *  sont purgées une fois au passage v5 pour libérer entièrement les 2 modules. */
const LEGACY_SEED_KEYS = [
  "c132c785e4a8abf46d4ad899c210d2a3",
  "babdec79faefd556db37cacd3af7c4f7",
  "eee9d042d12e478284e72731163d332e",
];

function seedDefaultsIfNeeded() {
  if (typeof window === "undefined") return;
  ensureSportsDbKey();
  try {
    if (localStorage.getItem(SEEDED_FLAG)) return;

    // Reset des anciens flags de seed
    localStorage.removeItem("magic.extraApiKeys.seeded");
    localStorage.removeItem("magic.extraApiKeys.seeded.v2");
    localStorage.removeItem("magic.extraApiKeys.seeded.v3");
    localStorage.removeItem("magic.extraApiKeys.seeded.v4");

    // Purge des slots qui pointaient vers les anciennes clés codées en dur :
    // si l'utilisateur a une clé personnelle, la sync auto la repromouvera.
    const slots: Array<["odds" | "apiSports" | "footballData", string]> = [
      ["odds", "magic_user_odds_key"],
      ["apiSports", "magic_user_apisports_key"],
      ["footballData", "magic_user_footballdata_key"],
    ];
    for (const [, lsKey] of slots) {
      const v = localStorage.getItem(lsKey);
      if (v && LEGACY_SEED_KEYS.includes(v)) localStorage.removeItem(lsKey);
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    const existing: ExtraApiKey[] = raw ? JSON.parse(raw) : [];
    // Purge des entrées correspondant aux anciennes clés seed
    // + purge de l'ancienne clé Bagui Football-Data
    const PURGED_KEYS = [
      ...LEGACY_SEED_KEYS,
      "63bfecb59d7f48038c5d465f764f621a",
    ];
    const cleaned = existing.filter((e) => !PURGED_KEYS.includes(e.key));
    const merged = [...cleaned];
    for (const seed of DEFAULT_SEEDED_KEYS) {
      if (!merged.some((e) => e.key === seed.key)) merged.unshift(seed);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    // Nettoyage du slot Football-Data si encore présent avec l'ancienne clé
    if (localStorage.getItem("magic_user_footballdata_key") === "63bfecb59d7f48038c5d465f764f621a") {
      localStorage.removeItem("magic_user_footballdata_key");
    }
    localStorage.setItem(SEEDED_FLAG, "1");
  } catch {
    /* noop */
  }
}

export function getExtraKeys(): ExtraApiKey[] {
  seedDefaultsIfNeeded();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ExtraApiKey[]) : [];
  } catch {
    return [];
  }
}

function saveAll(list: ExtraApiKey[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* noop */
  }
  syncToUserKeys(list);
}

export function syncToUserKeys(list: ExtraApiKey[]) {
  const current = getUserApiKeys();
  const bySlot = new Map<string, ExtraApiKey>();
  for (const e of list) {
    const slot = EXTRA_PROVIDERS[e.provider]?.userKeySlot;
    if (!slot) continue;
    if (!e.valid) continue;
    // Ne pas synchroniser une clé désactivée
    if (e.enabled === false) continue;
    const prev = bySlot.get(slot);
    if (!prev) bySlot.set(slot, e);
    else if (!prev.valid && e.valid) bySlot.set(slot, e);
    else if (prev.valid === e.valid && e.addedAt > prev.addedAt) bySlot.set(slot, e);
  }

  // Define all possible slots managed by Extra Providers
  const allManagedSlots = ["odds", "apiSports", "footballData", "sportmonks", "gemini"] as const;

  for (const slot of allManagedSlots) {
    const entry = bySlot.get(slot);
    if (entry) {
      setUserApiKey(slot, entry.key);
    } else if (!current[slot]) {
      setUserApiKey(slot, "");
    }
  }
}

export function addExtraKey(entry: ExtraApiKey): ExtraApiKey[] {
  const list = getExtraKeys();
  const filtered = list.filter((e) => !(e.provider === entry.provider && e.key === entry.key));
  const next = [entry, ...filtered];
  saveAll(next);
  return next;
}

export function removeExtraKey(id: string): ExtraApiKey[] {
  const next = getExtraKeys().filter((e) => e.id !== id);
  saveAll(next);
  return next;
}

export function setExtraKeyEnabled(id: string, enabled: boolean): ExtraApiKey[] {
  const next = getExtraKeys().map((e) => (e.id === id ? { ...e, enabled } : e));
  saveAll(next);
  return next;
}

export function updateExtraKey(id: string, patch: Partial<ExtraApiKey>): ExtraApiKey[] {
  const next = getExtraKeys().map((e) => (e.id === id ? { ...e, ...patch } : e));
  saveAll(next);
  return next;
}

/** Détection rapide par signature (peut renvoyer plusieurs candidats). */
export function detectCandidates(key: string): ExtraProvider[] {
  const k = key.trim();
  // Ordre : signatures UNIQUES d'abord, puis 32-hex ambigus
  const order: ExtraProvider[] = [
    "gemini",
    "elevenlabs",
    "rapidApiFreeFootball",
    "rapidApi",
    "theSportsDB",
    "sportmonks",
    "apiFootball",
    "apiSports",
    "theOddsApi",
    "footballData",
  ];
  const matches = order.filter((p) => EXTRA_PROVIDERS[p].detect(k));
  return matches.length ? matches : ["unknown"];
}

/** Compat — renvoie le 1er candidat (ne pas utiliser pour la détection finale ambiguë). */
export function detectProvider(key: string): ExtraProvider {
  return detectCandidates(key)[0];
}

export interface VerifyResult {
  valid: boolean;
  message: string;
}

/** Vérifie une clé contre L'endpoint réel du provider donné. */
export async function verifyKey(provider: ExtraProvider, key: string): Promise<VerifyResult> {
  try {
    switch (provider) {
      case "gemini": {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
        );
        if (r.ok) return { valid: true, message: "Gemini OK" };
        return { valid: false, message: `HTTP ${r.status}` };
      }
      case "elevenlabs": {
        // On valide via /v1/voices qui n'exige que la permission TTS
        // (la plus courante). Si la clé n'a pas voices_read non plus mais
        // renvoie un 401 "missing_permissions", c'est qu'elle est réelle
        // et utilisable pour le TTS — on l'accepte aussi.
        const r = await fetch("https://api.elevenlabs.io/v1/voices", {
          headers: { "xi-api-key": key },
        });
        if (r.ok) return { valid: true, message: "ElevenLabs OK" };
        if (r.status === 401) {
          const body = await r.text().catch(() => "");
          if (/missing_permissions/i.test(body)) {
            return { valid: true, message: "Clé scoped TTS OK" };
          }
        }
        return { valid: false, message: `HTTP ${r.status}` };
      }
      case "theOddsApi": {
        // /sports endpoint ne consomme pas de crédits → idéal pour valider la clé
        const r = await fetch(
          `https://api.the-odds-api.com/v4/sports/?apiKey=${encodeURIComponent(key)}`,
        );
        if (r.ok) return { valid: true, message: "Odds API OK" };
        if (r.status === 401 || r.status === 422) return { valid: false, message: "Clé invalide" };
        if (r.status === 429) return { valid: true, message: "Clé valide mais quota épuisé" };
        return { valid: false, message: `HTTP ${r.status}` };
      }
      case "footballData": {
        const r = await fetch("https://api.football-data.org/v4/competitions", {
          headers: { "X-Auth-Token": key },
        });
        if (r.ok) return { valid: true, message: "Football-Data OK" };
        return { valid: false, message: `HTTP ${r.status}` };
      }
      case "apiFootball":
      case "apiSports": {
        const r = await fetch("https://v3.football.api-sports.io/status", {
          headers: { "x-apisports-key": key },
        });
        if (r.ok) {
          const j = await r.json().catch(() => ({}));
          const errs = j?.errors;
          if (Array.isArray(errs) && errs.length === 0)
            return { valid: true, message: "API-Sports OK" };
          if (errs && typeof errs === "object" && Object.keys(errs).length === 0)
            return { valid: true, message: "API-Sports OK" };
          if (!errs && j?.response) return { valid: true, message: "API-Sports OK" };
          const msg = Array.isArray(errs)
            ? String(errs[0] ?? "Clé refusée")
            : String(Object.values(errs ?? {})[0] ?? "Clé refusée");
          return { valid: false, message: msg };
        }
        return { valid: false, message: `HTTP ${r.status}` };
      }
      case "rapidApi":
      case "rapidApiFreeFootball": {
        const r = await fetch(
          "https://free-api-live-football-data.p.rapidapi.com/football-players-search?search=m",
          {
            headers: {
              "X-RapidAPI-Key": key,
              "X-RapidAPI-Host": "free-api-live-football-data.p.rapidapi.com",
            },
          },
        );
        if (r.ok) {
          const j = await r.json().catch(() => ({}));
          if (j?.status === "success") return { valid: true, message: "RapidAPI OK" };
          return { valid: false, message: "Réponse invalide" };
        }
        return { valid: false, message: `HTTP ${r.status}` };
      }
      case "theSportsDB": {
        const r = await fetch(
          `https://www.thesportsdb.com/api/v1/json/${encodeURIComponent(key)}/all_leagues.php`,
        );
        if (r.ok) {
          const j = await r.json().catch(() => ({}));
          if (j && (j.leagues || j.countries)) return { valid: true, message: "TheSportsDB OK" };
          return { valid: false, message: "Réponse invalide" };
        }
        return { valid: false, message: `HTTP ${r.status}` };
      }
      case "sportmonks": {
        const r = await fetch(
          `https://api.sportmonks.com/v3/core/continents?api_token=${encodeURIComponent(key)}`,
        );
        if (r.ok) return { valid: true, message: "Sportmonks OK" };
        return { valid: false, message: `HTTP ${r.status}` };
      }
      default:
        return { valid: false, message: "Provider inconnu — non vérifié" };
    }
  } catch (e) {
    return {
      valid: false,
      message: e instanceof Error ? e.message : "Erreur réseau",
    };
  }
}

export interface ResolveResult {
  provider: ExtraProvider;
  result: VerifyResult;
  triedProviders: ExtraProvider[];
}

/**
 * Résolution INTELLIGENTE :
 *  - Si 1 seul candidat → vérification directe.
 *  - Si plusieurs candidats (cas 32-hex) → vérifie chacun jusqu'à ce qu'UN
 *    seul réponde OK. Le provider gagnant est mémorisé sans ambiguïté.
 */
export async function resolveAndVerify(key: string): Promise<ResolveResult> {
  const candidates = detectCandidates(key);
  if (candidates.length === 1 && candidates[0] === "unknown") {
    return {
      provider: "unknown",
      result: { valid: false, message: "Format non reconnu" },
      triedProviders: [],
    };
  }

  const tried: ExtraProvider[] = [];
  let lastFail: VerifyResult = { valid: false, message: "Aucun match" };

  for (const candidate of candidates) {
    tried.push(candidate);
    const r = await verifyKey(candidate, key);
    if (r.valid) {
      return { provider: candidate, result: r, triedProviders: tried };
    }
    lastFail = r;
  }

  // Aucune vérif n'a réussi → on retourne le 1er candidat avec l'erreur
  return {
    provider: candidates[0],
    result: lastFail,
    triedProviders: tried,
  };
}
