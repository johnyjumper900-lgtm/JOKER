/**
 * Score resolver INTELLIGENT — interroge en parallèle TOUTES les API
 * pour lesquelles l'utilisateur a fourni une clé (Football-Data, API-Sports,
 * TheSportsDB), et retourne le score réel + statut du match dès qu'il
 * est trouvé. Aucune clé par défaut.
 */

import { TheSportsDB, type SDBEvent } from "./thesportsdb";
import { getUserApiKeys } from "./user-api-keys";

export interface ResolvedScore {
  homeScore: number | null;
  awayScore: number | null;
  status: "scheduled" | "live" | "finished" | "unknown";
  source?: string;
}

const sep = /\s+(?:vs\.?|v\.s\.?|versus|contre|-|–|—)\s+/i;

function parseTeams(label: string): [string, string] | null {
  const parts = label.split(sep);
  if (parts.length < 2) return null;
  return [parts[0].trim(), parts[1].trim()];
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\b(fc|cf|sc|ac|afc|ssc|club|sporting)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function teamsMatch(a1: string, b1: string, a2: string, b2: string): boolean {
  const n1 = norm(a1);
  const n2 = norm(b1);
  const n3 = norm(a2);
  const n4 = norm(b2);
  return (n3.includes(n1) || n1.includes(n3)) && (n4.includes(n2) || n2.includes(n4));
}

function classifySDB(ev: SDBEvent | null): ResolvedScore {
  if (!ev) return { homeScore: null, awayScore: null, status: "unknown" };
  const s = (ev.strStatus || ev.strProgress || "").toLowerCase();
  const h = ev.intHomeScore != null ? parseInt(ev.intHomeScore, 10) : null;
  const a = ev.intAwayScore != null ? parseInt(ev.intAwayScore, 10) : null;
  if (/(ft|finished|terminé|aet|pen|match\s*fini)/i.test(s)) {
    return { homeScore: h, awayScore: a, status: "finished", source: "TheSportsDB" };
  }
  if (/(ht|half|1h|2h|live|in play|in progress|\d+'?)/.test(s)) {
    return { homeScore: h, awayScore: a, status: "live", source: "TheSportsDB" };
  }
  if (h != null && a != null)
    return { homeScore: h, awayScore: a, status: "finished", source: "TheSportsDB" };
  return { homeScore: null, awayScore: null, status: "scheduled", source: "TheSportsDB" };
}

async function fromTheSportsDB(home: string, away: string): Promise<ResolvedScore | null> {
  if (!TheSportsDB.hasKey()) return null;
  try {
    const j = await TheSportsDB.searchEvents(`${home}_vs_${away}`.replace(/\s+/g, "_"));
    const events: SDBEvent[] = j?.event ?? [];
    if (!events.length) return null;
    const finished = events.filter((e) => e.intHomeScore != null && e.intAwayScore != null);
    const ev = finished.length
      ? finished.sort((a, b) => (b.dateEvent || "").localeCompare(a.dateEvent || ""))[0]
      : events[0];
    return classifySDB(ev);
  } catch {
    return null;
  }
}

interface FDMatch {
  utcDate: string;
  status: string;
  score?: { fullTime?: { home: number | null; away: number | null } };
  homeTeam: { name: string };
  awayTeam: { name: string };
}

async function fromFootballData(
  home: string,
  away: string,
  key: string,
): Promise<ResolvedScore | null> {
  // Récupère matchs du jour ± 2 jours
  try {
    const today = new Date();
    const from = new Date(today.getTime() - 2 * 86400_000).toISOString().slice(0, 10);
    const to = new Date(today.getTime() + 2 * 86400_000).toISOString().slice(0, 10);
    const r = await fetch(
      `https://api.football-data.org/v4/matches?dateFrom=${from}&dateTo=${to}`,
      {
        headers: { "X-Auth-Token": key },
      },
    );
    if (!r.ok) return null;
    const j = (await r.json()) as { matches?: FDMatch[] };
    const found = (j.matches ?? []).find((m) =>
      teamsMatch(home, away, m.homeTeam.name, m.awayTeam.name),
    );
    if (!found) return null;
    const h = found.score?.fullTime?.home ?? null;
    const a = found.score?.fullTime?.away ?? null;
    const s = (found.status || "").toUpperCase();
    const status: ResolvedScore["status"] =
      s === "FINISHED" ? "finished" : s === "IN_PLAY" || s === "PAUSED" ? "live" : "scheduled";
    return { homeScore: h, awayScore: a, status, source: "Football-Data" };
  } catch {
    return null;
  }
}

interface APSFix {
  fixture: { date: string; status: { short?: string } };
  teams: { home: { name: string }; away: { name: string } };
  goals: { home: number | null; away: number | null };
}

async function fromApiSports(
  home: string,
  away: string,
  key: string,
): Promise<ResolvedScore | null> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const r = await fetch(`https://v3.football.api-sports.io/fixtures?date=${today}`, {
      headers: { "x-apisports-key": key },
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { response?: APSFix[] };
    const found = (j.response ?? []).find((f) =>
      teamsMatch(home, away, f.teams.home.name, f.teams.away.name),
    );
    if (!found) return null;
    const s = (found.fixture.status.short || "").toUpperCase();
    const status: ResolvedScore["status"] =
      s === "FT" || s === "AET" || s === "PEN"
        ? "finished"
        : s === "1H" || s === "2H" || s === "HT" || s === "ET" || s === "LIVE"
          ? "live"
          : "scheduled";
    return {
      homeScore: found.goals.home,
      awayScore: found.goals.away,
      status,
      source: "API-Sports",
    };
  } catch {
    return null;
  }
}

/**
 * Résout le score d'un match en interrogeant en parallèle TOUTES les API
 * dispo. Retourne le 1er résultat "finished", sinon "live", sinon "scheduled".
 */
export async function resolveMatchScore(matchLabel: string): Promise<ResolvedScore> {
  const teams = parseTeams(matchLabel);
  if (!teams) return { homeScore: null, awayScore: null, status: "unknown" };
  const [home, away] = teams;
  const keys = getUserApiKeys();

  const tasks: Array<Promise<ResolvedScore | null>> = [];
  if (TheSportsDB.hasKey()) tasks.push(fromTheSportsDB(home, away));
  if (keys.footballData) tasks.push(fromFootballData(home, away, keys.footballData));
  if (keys.apiSports) tasks.push(fromApiSports(home, away, keys.apiSports));

  if (tasks.length === 0) {
    return { homeScore: null, awayScore: null, status: "unknown" };
  }

  const results = (await Promise.allSettled(tasks))
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((x): x is ResolvedScore => !!x);

  // Priorité : finished > live > scheduled
  const finished = results.find((r) => r.status === "finished");
  if (finished) return finished;
  const live = results.find((r) => r.status === "live");
  if (live) return live;
  const sched = results.find((r) => r.status === "scheduled");
  if (sched) return sched;

  return { homeScore: null, awayScore: null, status: "unknown" };
}
