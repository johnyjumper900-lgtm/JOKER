/**
 * System status — auto-diagnostic des API au démarrage.
 * Vérifie en parallèle toutes les clés API foot configurées et renvoie
 * leur état (OK / quota / clé invalide / pas configurée).
 */

import { getUserApiKeys } from "./user-api-keys";
import { getExtraKeys, syncToUserKeys } from "./extra-api-keys";

export type ProviderStatus = "ok" | "missing" | "quota" | "invalid" | "error";

export interface ProviderCheck {
  id:
    | "apiSports"
    | "odds"
    | "gemini";
  label: string;
  status: ProviderStatus;
  message: string;
}

async function checkApiSports(key: string): Promise<ProviderCheck> {
  const base = { id: "apiSports" as const, label: "API-Sports" };
  if (!key) return { ...base, status: "missing", message: "Clé non configurée" };
  try {
    const r = await fetch("https://v3.football.api-sports.io/status", {
      headers: { "x-apisports-key": key },
    });
    const j = (await r.json()) as {
      errors?: Record<string, string> | string[];
      response?: unknown;
    };
    const errs = j?.errors;
    if (errs && Object.keys(errs).length > 0) {
      const msg = Object.values(errs)[0] as string;
      if (/token|key/i.test(msg)) return { ...base, status: "invalid", message: "Clé invalide" };
      if (/limit|quota/i.test(msg)) return { ...base, status: "quota", message: "Quota dépassé" };
      return { ...base, status: "error", message: msg };
    }
    if (j.response) return { ...base, status: "ok", message: "Opérationnel" };
    return { ...base, status: "error", message: "Réponse invalide" };
  } catch {
    return { ...base, status: "error", message: "Réseau" };
  }
}

async function checkOdds(key: string): Promise<ProviderCheck> {
  const base = { id: "odds" as const, label: "The Odds API" };
  if (!key) return { ...base, status: "missing", message: "Clé non configurée" };
  try {
    const r = await fetch(
      `https://api.the-odds-api.com/v4/sports?apiKey=${encodeURIComponent(key)}`,
    );
    if (r.ok) return { ...base, status: "ok", message: "Opérationnel" };
    if (r.status === 429) return { ...base, status: "quota", message: "Quota dépassé" };
    if (r.status === 401) return { ...base, status: "invalid", message: "Clé invalide" };
    return { ...base, status: "error", message: `HTTP ${r.status}` };
  } catch {
    return { ...base, status: "error", message: "Réseau" };
  }
}

async function checkGemini(
  key: string,
  id: ProviderCheck["id"] = "gemini",
  label = "Gemini IA",
): Promise<ProviderCheck> {
  const base = { id, label };
  if (!key) return { ...base, status: "missing", message: "Clé personnelle requise" };

  // Vérification multi-endpoint agressive : on essaie 3 endpoints différents.
  // Si AU MOINS UN répond OK, la clé est considérée valide.
  const endpoints = [
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
    `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(key)}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash?key=${encodeURIComponent(key)}`,
  ];
  let lastStatus = 0;
  for (const url of endpoints) {
    try {
      const r = await fetch(url);
      if (r.ok) return { ...base, status: "ok", message: "Opérationnel" };
      lastStatus = r.status;
      if (r.status === 429) return { ...base, status: "quota", message: "Quota Gemini dépassé" };
    } catch {
      /* try next */
    }
  }
  if (lastStatus === 401 || lastStatus === 403) {
    return { ...base, status: "invalid", message: "Clé Gemini refusée" };
  }
  return { ...base, status: "error", message: "Gemini inaccessible" };
}

export async function runSystemDiagnostic(): Promise<ProviderCheck[]> {
  // Force la synchronisation des clés préconfigurées/futures avant diagnostic.
  const extras = getExtraKeys();
  syncToUserKeys(extras);

  const k = getUserApiKeys();
  const results = await Promise.all([
    checkApiSports(k.apiSports),
    checkOdds(k.odds),
    checkGemini(k.gemini),
  ]);
  return results;
}
