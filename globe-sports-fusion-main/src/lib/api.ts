import { getUserApiKeys, userKeysToHeaders } from "./user-api-keys";
import { getExtraKeys } from "./extra-api-keys";
import { fetchAllMatchesMultiProvider } from "./multi-provider-matches";
import { persistMatchesToCloud } from "./cloud-cache";
import { supabase } from "@/integrations/supabase/client";
export type { EnrichedMatch } from "./multi-provider-matches";

// Legacy external Supabase project — used only as fallback for non-migrated functions.
const EXTERNAL_SUPABASE_URL = "https://kvqhocuuyzwszspuqxmp.supabase.co";
const EXTERNAL_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cWhvY3V1eXp3c3pzcHVxeG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4ODkzMTYsImV4cCI6MjA5MzQ2NTMxNn0.KXL1JKXuJ-h9KQwJU75SitApajGU01nnA5dquU-jggk";

const REQUEST_TIMEOUT_MS = 35_000;

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    window.clearTimeout(timeout);
  }
}

/**
 * invokeFn — appel centralisé des fonctions backend Magic.
 *
 * Routage :
 *  - fetch-matches  → pipeline multi-provider 100% client (aspire toutes les
 *    sources foot dont l'utilisateur a ajouté les clés API)
 *  - analyze-matches / analyze-ticket → edge functions Lovable Cloud
 *    qui s'appuient sur Lovable AI Gateway (pas de clé requise côté user)
 *  - tout le reste → ancien backend externe (compatibilité)
 */
export async function invokeFn<T = unknown>(
  name: string,
  options: { body?: unknown } = {},
): Promise<{ data: T | null; error: Error | null }> {
  try {
    getExtraKeys(); // déclenche la sync auto des clés détectées

    // ---------- fetch-matches : agrégation client multi-provider ----------
    if (name === "fetch-matches") {
      try {
        const body = (options.body ?? {}) as { daysAhead?: number; league?: string };
        const daysAhead = Math.min(31, Math.max(3, Number(body.daysAhead) || 7));
        const result = await fetchAllMatchesMultiProvider(daysAhead);
        let matches = result.matches;
        if (body.league) {
          matches = matches.filter((m) => m.league === body.league);
        }
        if (matches.length) {
          persistMatchesToCloud(matches as never).catch((e) =>
            console.warn("[fetch-matches] stockage cache échoué:", e),
          );
        }
        return {
          data: {
            matches,
            providersUsed: result.providersUsed,
            providersFailed: result.providersFailed,
            counts: result.counts,
          } as unknown as T,
          error: null,
        };
      } catch (e) {
        return {
          data: null,
          error: e instanceof Error ? e : new Error("fetch-matches failed"),
        };
      }
    }

    // ---------- analyze-matches / analyze-ticket : edge functions locales ----------
    if (name === "analyze-matches" || name === "analyze-ticket") {
      let data, error;
      try {
        if (name === "analyze-matches") {
          const { analyzeMatches } = await import("@/server-api/analyze-matches");
          data = await analyzeMatches({ data: options.body as any });
        } else if (name === "analyze-ticket") {
          const { analyzeTicket } = await import("@/server-api/analyze-ticket");
          data = await analyzeTicket({ data: options.body as any });
        }
      } catch (e) {
        error = e;
      }

      if (error) return { data: null, error: new Error(error instanceof Error ? error.message : "Erreur Serveur") };
      if (data && typeof data === "object" && "error" in (data as object)) {
        const errMsg = (data as { error?: string }).error;
        if (errMsg) return { data: data as T, error: new Error(errMsg) };
      }
      return { data: data as T, error: null };
    }

    // ---------- legacy : ancien backend externe ----------
    const userKeys = getUserApiKeys();
    const url = `${EXTERNAL_SUPABASE_URL}/functions/v1/${name}`;
    const resp = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EXTERNAL_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${EXTERNAL_SUPABASE_ANON_KEY}`,
        ...userKeysToHeaders(userKeys),
      },
      body: JSON.stringify(options.body ?? {}),
    });
    const text = await resp.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      /* noop */
    }
    if (!resp.ok) {
      const msg = (parsed as { error?: string } | null)?.error || `HTTP ${resp.status}`;
      return { data: parsed as T | null, error: new Error(msg) };
    }
    return { data: parsed as T, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error("Network error"),
    };
  }
}
