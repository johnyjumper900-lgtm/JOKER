/**
 * Cache Cloud — lecture/sync des données API stockées dans Supabase.
 * Évite les appels répétés aux API tierces (économise les crédits).
 */

import { supabase } from "@/integrations/supabase-external/client";
import type { Json } from "@/integrations/supabase-external/types";

type MatchCacheUpsertRow = {
  match_key: string;
  home_team: string;
  away_team: string;
  league: string | null;
  country: string | null;
  commence_time: string;
  paris_date: string | null;
  paris_time: string | null;
  source: string;
  payload: Json;
  updated_at: string;
};

type OddsCacheUpsertRow = {
  match_key: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  home: number | null;
  draw: number | null;
  away: number | null;
  best_home: number | null;
  best_draw: number | null;
  best_away: number | null;
  bookmakers: NonNullable<PersistableMatch["realOdds"]>["bookmakers"] | null;
  raw: Json;
  updated_at: string;
};

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

export interface CachedTeam {
  name_key: string;
  name: string;
  badge_url: string | null;
  kit_url: string | null;
  banner_url: string | null;
  country: string | null;
  country_code: string | null;
  stadium: string | null;
  founded: string | null;
  description: string | null;
  updated_at: string;
}

export interface CachedMatch {
  match_key: string;
  home_team: string;
  away_team: string;
  league: string | null;
  commence_time: string;
  paris_date: string | null;
  paris_time: string | null;
  source: string | null;
}

export interface CachedOdds {
  match_key: string;
  home_team: string;
  away_team: string;
  commence_time: string | null;
  home: number | null;
  draw: number | null;
  away: number | null;
  best_home: number | null;
  best_draw: number | null;
  best_away: number | null;
  bookmakers:
    | string[]
    | Array<{
        key?: string;
        title?: string;
        home?: number;
        draw?: number;
        away?: number;
      }>
    | null;
  updated_at: string;
}

export interface CachedTeamStats {
  team_key: string;
  team_name: string;
  league: string | null;
  league_id: number | null;
  season: number | null;
  force: number | null;
  attack: number | null;
  defense: number | null;
  form: string | null;
}

export interface SyncLogEntry {
  id: string;
  job: string;
  status: string;
  items_added: number | null;
  items_updated: number | null;
  message: string | null;
  duration_ms: number | null;
  started_at: string;
  finished_at: string | null;
}

export function nameKey(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function matchKey(home: string, away: string, iso: string): string {
  const date = iso.slice(0, 10);
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${date}__${norm(home)}__vs__${norm(away)}`;
}

/* ---------- Lecture ---------- */

export async function getCachedTeam(name: string): Promise<CachedTeam | null> {
  const { data, error } = await supabase
    .from("teams_cache")
    .select("*")
    .eq("name_key", nameKey(name))
    .maybeSingle();
  if (error) return null;
  return data as CachedTeam | null;
}

export async function getCachedTeamsBulk(names: string[]): Promise<Record<string, CachedTeam>> {
  if (!names.length) return {};
  const keys = names.map(nameKey);
  const { data, error } = await supabase
    .from("teams_cache")
    .select("*")
    .in("name_key", keys);
  if (error || !data) return {};
  const out: Record<string, CachedTeam> = {};
  for (const t of data as CachedTeam[]) out[t.name_key] = t;
  return out;
}

export async function getCachedMatches(daysAhead = 30): Promise<CachedMatch[]> {
  const from = new Date().toISOString();
  const to = new Date(Date.now() + daysAhead * 86400_000).toISOString();
  
  const { data, error } = await supabase
    .from("matches_cache")
    .select("*")
    .gte("commence_time", from)
    .lte("commence_time", to)
    .order("commence_time");
    
  if (error || !data) {
    // FALLBACK local storage if supabase is missing
    try {
      const localStr = localStorage.getItem("magic_local_matches_cache");
      if (localStr) {
        const localMatches = JSON.parse(localStr) as CachedMatch[];
        return localMatches.filter(m => m.commence_time >= from && m.commence_time <= to);
      }
    } catch(e) {}
    return [];
  }
  return data as CachedMatch[];
}

export async function getCachedOdds(matchKey: string): Promise<CachedOdds | null> {
  const { data, error } = await supabase
    .from("odds_cache")
    .select("*")
    .eq("match_key", matchKey)
    .maybeSingle();
    
  if (error || !data) {
    try {
      const localStr = localStorage.getItem("magic_local_odds_cache");
      if (localStr) {
        const localOdds = JSON.parse(localStr) as Record<string, CachedOdds>;
        return localOdds[matchKey] || null;
      }
    } catch(e) {}
  }
  return (data as CachedOdds | null) ?? null;
}

export async function getCachedOddsBulk(keys: string[]): Promise<Record<string, CachedOdds>> {
  if (!keys.length) return {};
  const { data, error } = await supabase
    .from("odds_cache")
    .select("*")
    .in("match_key", keys);
    
  const out: Record<string, CachedOdds> = {};
  if (error || !data) {
    try {
       const localStr = localStorage.getItem("magic_local_odds_cache");
       if (localStr) {
         const localOdds = JSON.parse(localStr) as Record<string, CachedOdds>;
         for(const k of keys) {
             if(localOdds[k]) out[k] = localOdds[k];
         }
       }
    } catch(e) {}
    return out;
  }
  
  for (const o of (data as CachedOdds[] | null) ?? []) out[o.match_key] = o;
  return out;
}

export async function getCachedTeamStats(teamName: string): Promise<CachedTeamStats | null> {
  const { data } = await supabase
    .from("team_stats_cache")
    .select("*")
    .eq("team_key", nameKey(teamName))
    .order("season", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as CachedTeamStats | null) ?? null;
}

export async function getSyncLog(limit = 20): Promise<SyncLogEntry[]> {
  const { data } = await supabase
    .from("sync_log")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  return (data as SyncLogEntry[] | null) ?? [];
}

export async function getCacheStats() {
  const [teams, matches, odds, stats] = await Promise.all([
    supabase.from("teams_cache").select("*", { count: "exact", head: true }),
    supabase.from("matches_cache").select("*", { count: "exact", head: true }),
    supabase.from("odds_cache").select("*", { count: "exact", head: true }),
    supabase.from("team_stats_cache").select("*", { count: "exact", head: true }),
  ]);
  return {
    teams: teams.count ?? 0,
    matches: matches.count ?? 0,
    odds: odds.count ?? 0,
    stats: stats.count ?? 0,
  };
}

/* ---------- Persistance directe depuis le client ---------- */

interface PersistableMatch {
  id?: string;
  teamA: string;
  teamB: string;
  league?: string;
  country?: string;
  date?: string;
  time?: string;
  utc?: string;
  utcDate?: string;
  realOdds?: {
    home?: number; draw?: number; away?: number;
    bestHome?: number; bestDraw?: number; bestAway?: number;
    bookmakers?: string[];
    commenceTimeUTC?: string;
  };
}

/**
 * Persiste un lot de matchs (et leurs cotes) dans le cache cloud.
 * Permet de garder les 200+ matchs récupérés via les API tierces côté client
 * accessibles entre les sessions sans refaire la manip.
 */
export async function persistMatchesToCloud(matches: PersistableMatch[]): Promise<{ matches: number; odds: number }> {
  if (!matches.length) return { matches: 0, odds: 0 };

  const matchRows: MatchCacheUpsertRow[] = [];
  const oddsRows: OddsCacheUpsertRow[] = [];
  const seen = new Set<string>();
  const seenOdds = new Set<string>();

  for (const m of matches) {
    const iso = m.utc || m.utcDate || m.realOdds?.commenceTimeUTC;
    if (!iso || !m.teamA || !m.teamB) continue;
    const key = matchKey(m.teamA, m.teamB, iso);
    if (seen.has(key)) continue;
    seen.add(key);

    matchRows.push({
      match_key: key,
      home_team: m.teamA,
      away_team: m.teamB,
      league: m.league ?? null,
      country: m.country ?? null,
      commence_time: iso,
      paris_date: m.date ?? null,
      paris_time: m.time ?? null,
      source: "client-merge",
      payload: toJson(m),
      updated_at: new Date().toISOString(),
    });

    const o = m.realOdds;
    if (o && (o.home || o.draw || o.away) && !seenOdds.has(key)) {
      seenOdds.add(key);
      oddsRows.push({
        match_key: key,
        home_team: m.teamA,
        away_team: m.teamB,
        commence_time: iso,
        home: o.home ?? null,
        draw: o.draw ?? null,
        away: o.away ?? null,
        best_home: o.bestHome ?? null,
        best_draw: o.bestDraw ?? null,
        best_away: o.bestAway ?? null,
        bookmakers: o.bookmakers ?? null,
        raw: toJson(o),
        updated_at: new Date().toISOString(),
      });
    }
  }

  // Upsert par lots de 200 pour éviter les payloads trop gros
  const chunk = <T,>(arr: T[], n: number) =>
    Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

  let matchesPersisted = 0;
  let oddsPersisted = 0;
  try {
    const { data, error } = await supabase.functions.invoke("upsert-cache", {
      body: { matches: matchRows, odds: oddsRows },
    });
    if (error) throw error;
    const saved = data as { matches?: number; odds?: number } | null;
    matchesPersisted = saved?.matches ?? 0;
    oddsPersisted = saved?.odds ?? 0;
  } catch (error) {
    console.warn("[cloud-cache] edge persist error:", error instanceof Error ? error.message : error);
  }

  // FALLBACK LOCAL STORAGE
  if (matchesPersisted === 0 && matchRows.length > 0) {
    try {
      let existingMatches: MatchCacheUpsertRow[] = [];
      const exStr = localStorage.getItem("magic_local_matches_cache");
      if (exStr) existingMatches = JSON.parse(exStr);
      
      const matchMap = new Map(existingMatches.map(m => [m.match_key, m]));
      matchRows.forEach(m => matchMap.set(m.match_key, m));
      
      const newMatches = Array.from(matchMap.values());
      // On garde max 1000 matchs pour pas exploser le localStorage (5MB)
      if (newMatches.length > 800) newMatches.splice(0, newMatches.length - 800);
      
      localStorage.setItem("magic_local_matches_cache", JSON.stringify(newMatches));
      matchesPersisted = matchRows.length;
    } catch(e) {
      console.warn("Erreur fallback localStorage matches", e);
    }
  }

  if (oddsRows.length > 0) { // always try to save odds locally as well if anything failed
    try {
      let existingOdds: Record<string, OddsCacheUpsertRow> = {};
      const exStr = localStorage.getItem("magic_local_odds_cache");
      if (exStr) existingOdds = JSON.parse(exStr);
      
      oddsRows.forEach(o => {
          existingOdds[o.match_key] = o;
      });
      
      localStorage.setItem("magic_local_odds_cache", JSON.stringify(existingOdds));
      if (oddsPersisted === 0) oddsPersisted = oddsRows.length;
    } catch(e) {
      console.warn("Erreur fallback localStorage odds", e);
    }
  }

  return { matches: matchesPersisted, odds: oddsPersisted };
}

/* ---------- Trigger des syncs (edge functions) ---------- */

export type SyncJob = "sync-odds" | "sync-teams" | "sync-matches" | "sync-stats";

export interface SyncOptions {
  /** Clé API à utiliser. Si vide, l'edge function essaiera l'env serveur. */
  apiKey?: string;
  /** Pour sync-teams / sync-stats, sous-ensemble de ligues à traiter. */
  leagueIds?: number[];
}

export async function runSync(job: SyncJob, opts: SyncOptions = {}) {
  const { data, error } = await supabase.functions.invoke(job, { body: opts });
  if (error) throw new Error(error.message);
  return data as { ok?: boolean; updated?: number; errors?: string[]; duration_ms?: number; total?: number; events?: number; processed?: number };
}
