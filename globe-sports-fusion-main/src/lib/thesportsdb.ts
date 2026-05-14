/**
 * TheSportsDB v1 API client
 * Base URL configured per user request: https://www.thesportsdb.com/api/v1/json
 * Free tier uses key "3" (test key). Replace with user's premium key in localStorage if available.
 */

const BASE = "https://www.thesportsdb.com/api/v1/json";

/**
 * Renvoie la clé TheSportsDB utilisateur si présente, sinon null.
 * Aucune clé par défaut — toutes les fonctions retournent un résultat vide
 * silencieux quand aucune clé n'est configurée.
 */
function getKey(): string | null {
  try {
    const k = localStorage.getItem("thesportsdb.apikey");
    if (k) return k;
    const extrasStr =
      localStorage.getItem("magic.extraApiKeys") ||
      localStorage.getItem("magic_user_extra_api_keys");
    if (extrasStr) {
      const extras = JSON.parse(extrasStr);
      const found = extras.find((e: any) => e.provider === "theSportsDB" && (e.enabled ?? true));
      if (found) return found.key;
    }
    return "3"; // free test key
  } catch {
    return "3";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function safeFetch(path: string): Promise<any> {
  const k = getKey();
  if (!k) return {};
  try {
    const r = await fetch(`${BASE}/${k}${path}`);
    if (!r.ok) return {};
    return await r.json();
  } catch {
    return {};
  }
}

export const TheSportsDB = {
  baseUrl: BASE,
  hasKey: () => getKey() !== null,
  async searchTeams(name: string) {
    return safeFetch(`/searchteams.php?t=${encodeURIComponent(name)}`);
  },
  async searchEvents(query: string) {
    return safeFetch(`/searchevents.php?e=${encodeURIComponent(query)}`);
  },
  async leagueNextEvents(leagueId: string) {
    return safeFetch(`/eventsnextleague.php?id=${leagueId}`);
  },
  async eventsOnDate(date: string, sport = "Soccer") {
    return safeFetch(`/eventsday.php?d=${date}&s=${sport}`);
  },
  async leaguePastEvents(leagueId: string) {
    return safeFetch(`/eventspastleague.php?id=${leagueId}`);
  },
  async lookupEvent(eventId: string) {
    return safeFetch(`/lookupevent.php?id=${eventId}`);
  },
  async allLeagues() {
    return safeFetch(`/all_leagues.php`);
  },
  async lookupTeam(teamId: string) {
    return safeFetch(`/lookupteam.php?id=${teamId}`);
  },
  async lastTeamEvents(teamId: string) {
    return safeFetch(`/eventslast.php?id=${teamId}`);
  },
  async nextTeamEvents(teamId: string) {
    return safeFetch(`/eventsnext.php?id=${teamId}`);
  },
  async headToHead(teamA: string, teamB: string) {
    const q = `${teamA}_vs_${teamB}`.replace(/\s+/g, "_");
    return safeFetch(`/searchevents.php?e=${encodeURIComponent(q)}`);
  },
};

export type SDBEvent = {
  idEvent: string;
  strEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  strHomeTeamBadge?: string;
  strAwayTeamBadge?: string;
  intHomeScore: string | null;
  intAwayScore: string | null;
  strStatus?: string;
  strProgress?: string;
  dateEvent?: string;
  strTime?: string;
  strLeague?: string;
  strLeagueBadge?: string;
  strCountry?: string;
  strVenue?: string;
};
