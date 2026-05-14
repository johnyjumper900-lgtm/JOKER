import { createServerFn } from "@tanstack/react-start";

export interface WinaMatch {
  id: string;
  title: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string | null;
  awayLogo: string | null;
  homeJersey: string | null;
  awayJersey: string | null;
  tournament: string;
  category: string;
  sportId: number;
  sportName: string;
  status: "live" | "upcoming" | "finished";
  matchStart: number;
  score?: string;
  minute?: number;
  odds: { home: number | null; draw: number | null; away: number | null };
}

export interface WinaSport {
  id: number;
  name: string;
  count: number;
}

const KNOWN_SPORTS: Record<string, string> = {
  "1": "Football",
  "2": "Basketball",
  "5": "Tennis",
  "12": "Rugby",
  "34": "Volleyball",
  "4": "Hockey sur glace",
  "16": "Baseball",
  "92": "Football Américain",
  "25": "Snooker",
  "10": "Boxe",
  "23": "Fléchettes",
  "11": "Cyclisme",
  "15": "Golf",
  "39": "Water-Polo",
  "117": "Esport",
};

export interface WinaPayload {
  matches: WinaMatch[];
  tournaments: { id: string; name: string; count: number }[];
  sports: WinaSport[];
  fetchedAt: number;
  totalCount: number;
  liveCount: number;
}

const SIO_BASE =
  "https://sports-eu-west-3.winamax.fr/uof-sports-server/socket.io/";
const SIO_HEADERS: Record<string, string> = {
  Origin: "https://www.winamax.fr",
  Referer: "https://www.winamax.fr/",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
};

/** Fetch live data via socket.io v4 HTTP polling (Worker-compatible, no ws). */
async function fetchViaSocketIO(): Promise<Record<string, any>> {
  let cookie = "";
  const H = (): Record<string, string> => ({
    ...SIO_HEADERS,
    ...(cookie ? { Cookie: cookie } : {}),
  });
  const cap = (r: Response) => {
    const sc = r.headers.get("set-cookie");
    if (sc) cookie = sc.split(";")[0];
  };

  // 1. Handshake
  const r1 = await fetch(
    `${SIO_BASE}?EIO=4&transport=polling&t=${Date.now()}`,
    { headers: H() },
  );
  cap(r1);
  const t1 = await r1.text();
  const sid = JSON.parse(t1.slice(t1.indexOf("{"))).sid as string;

  const post = (body: string) =>
    fetch(`${SIO_BASE}?EIO=4&transport=polling&sid=${sid}`, {
      method: "POST",
      headers: { ...H(), "Content-Type": "text/plain;charset=UTF-8" },
      body,
    }).then(async (r) => {
      cap(r);
      await r.text();
    });
  const poll = () =>
    fetch(`${SIO_BASE}?EIO=4&transport=polling&sid=${sid}`, {
      headers: H(),
    }).then(async (r) => {
      cap(r);
      return r.text();
    });

  // 2. Open default namespace + drain ack
  await post("40");
  await poll();

  // 3. Subscribe to live data routes (live + 7 jours suffit pour rester sous
  // le budget temps du Worker — au-delà, le drain timeout et on renvoie vide).
  // Aspiration 30 jours (720h) tout sport pour avoir l'offre complète du mois.
  const routes = [
    "hot:live",
    "hot:home",
    "hot:calendar:24",
    "hot:calendar:72",
    "hot:calendar:168",
    "hot:calendar:336",
    "hot:calendar:504",
    "hot:calendar:720",
  ];
  for (const route of routes) {
    await post(`42["m",{"route":"${route}"}]`);
  }

  // 4. Drain pushes
  const merged: Record<string, any> = {
    matches: {},
    tournaments: {},
    categories: {},
    sports: {},
    bets: {},
    outcomes: {},
    odds: {},
    calendar: {},
    home: {},
    live: {},
  };
  const rgx = /42(\[(?:[^[\]]|\[(?:[^[\]]|\[[^[\]]*\])*\])*\])/g;
  // Drain borné dans le temps (Worker = budget CPU court).
  const drainStart = Date.now();
  for (let i = 0; i < 60 && Date.now() - drainStart < 18000; i++) {
    const t = await poll();
    if (!t || t.includes('"code":1')) break;
    let m: RegExpExecArray | null;
    rgx.lastIndex = 0;
    while ((m = rgx.exec(t))) {
      try {
        const arr = JSON.parse(m[1]);
        const payload = arr[1];
        if (payload && typeof payload === "object") {
          for (const k of Object.keys(payload)) {
            if (merged[k] && payload[k] && typeof payload[k] === "object") {
              for (const id of Object.keys(payload[k])) {
                const v = payload[k][id];
                if (v == null) continue;
                merged[k][id] =
                  typeof merged[k][id] === "object" && typeof v === "object"
                    ? { ...merged[k][id], ...v }
                    : v;
              }
            }
          }
        }
      } catch {}
    }
  }
  // best-effort close
  fetch(`${SIO_BASE}?EIO=4&transport=polling&sid=${sid}`, {
    method: "POST",
    headers: { ...H(), "Content-Type": "text/plain;charset=UTF-8" },
    body: "41",
  }).catch(() => {});
  return merged;
}

function parseMatchesFromState(
  data: any,
  sportsMap: Record<string, string>,
): WinaMatch[] {
  const matches = data.matches || {};
  const bets = data.bets || {};
  const odds = data.odds || {};
  const tournaments = data.tournaments || {};
  const categories = data.categories || {};
  const sports = data.sports || {};

  const list: WinaMatch[] = [];
  for (const mid of Object.keys(matches)) {
    const m = matches[mid];
    if (!m || !m.competitor1Name || !m.competitor2Name) continue;

    let home: number | null = null,
      draw: number | null = null,
      away: number | null = null;
    const mainBet = m.mainBetId ? bets[String(m.mainBetId)] : null;
    if (mainBet && Array.isArray(mainBet.outcomes)) {
      const ocIds: number[] = mainBet.outcomes.slice(0, 3);
      const vals = ocIds.map((id) => odds[String(id)] ?? null);
      if (vals.length === 3) {
        home = typeof vals[0] === "number" ? vals[0] : null;
        draw = typeof vals[1] === "number" ? vals[1] : null;
        away = typeof vals[2] === "number" ? vals[2] : null;
      } else if (vals.length === 2) {
        home = typeof vals[0] === "number" ? vals[0] : null;
        away = typeof vals[1] === "number" ? vals[1] : null;
      }
    }

    const status: WinaMatch["status"] =
      m.status === "ENDED"
        ? "finished"
        : m.status === "LIVE" || (m.matchtime && m.status !== "PREMATCH")
          ? "live"
          : "upcoming";

    const sportName =
      sports[String(m.sportId)]?.sportName ||
      sportsMap[String(m.sportId)] ||
      KNOWN_SPORTS[String(m.sportId)] ||
      "Sport " + m.sportId;
    const tName = tournaments[String(m.tournamentId)]?.tournamentName || "—";
    const cName = categories[String(m.categoryId)]?.categoryName || "";

    list.push({
      id: String(m.matchId),
      title: m.title,
      homeTeam: m.competitor1Name,
      awayTeam: m.competitor2Name,
      homeLogo: m.competitor1Flag
        ? `https://s.winamax.fr/i/icons/${m.competitor1Flag}.png`
        : null,
      awayLogo: m.competitor2Flag
        ? `https://s.winamax.fr/i/icons/${m.competitor2Flag}.png`
        : null,
      homeJersey: m.competitor1Flag
        ? `https://s.winamax.fr/i/jerseys/${m.competitor1Flag}.png`
        : null,
      awayJersey: m.competitor2Flag
        ? `https://s.winamax.fr/i/jerseys/${m.competitor2Flag}.png`
        : null,
      tournament: tName,
      category: cName,
      sportId: m.sportId,
      sportName,
      status,
      matchStart: (m.matchStart || 0) * 1000,
      score: m.score || undefined,
      minute: m.matchtime || undefined,
      odds: { home, draw, away },
    });
  }
  return list;
}

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const hasSupabaseAdmin = () =>
  Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

let lastSyncTime = 0;

async function syncToDatabase(matches: WinaMatch[]) {
  if (!hasSupabaseAdmin()) return; // Cloud non connecté → on saute la persistance.
  const now = Date.now();
  if (now - lastSyncTime < 1000 * 60 * 2) {
    // 2 minutes throttle
    return;
  }
  lastSyncTime = now;

  const nowIso = new Date().toISOString();

  // 1. Upsert matches (foot, tennis, basket, ...)
  const dbMatches = matches.map((m) => ({
    id: m.id,
    sport_id: m.sportId,
    sport_name: m.sportName,
    tournament: m.tournament,
    category: m.category || null,
    title: m.title,
    home_team: m.homeTeam,
    away_team: m.awayTeam,
    home_logo: m.homeLogo,
    away_logo: m.awayLogo,
    home_jersey: m.homeJersey,
    away_jersey: m.awayJersey,
    status: m.status,
    match_start: new Date(m.matchStart || Date.now()).toISOString(),
    score: m.score ?? null,
    minute: m.minute ?? null,
    odds_home: m.odds.home,
    odds_draw: m.odds.draw,
    odds_away: m.odds.away,
    payload: JSON.parse(JSON.stringify(m)) as never,
    fetched_at: nowIso,
    updated_at: nowIso,
  }));

  for (let i = 0; i < dbMatches.length; i += 200) {
    const chunk = dbMatches.slice(i, i + 200) as never;
    try {
      const { error } = await supabaseAdmin
        .from("wina_matches" as never)
        .upsert(chunk, { onConflict: "id" });
      if (error) console.error("Failed to upsert wina_matches", error);
    } catch (err) {
      console.error("Failed to upsert wina_matches", err);
    }
  }

  // 2. Sports counters
  const sportRows = new Map<number, { id: number; name: string; count: number; updated_at: string }>();
  const tournamentRows = new Map<string, { name: string; sport_id: number; count: number; updated_at: string }>();
  for (const m of matches) {
    const sCur = sportRows.get(m.sportId);
    sportRows.set(m.sportId, {
      id: m.sportId,
      name: m.sportName,
      count: (sCur?.count ?? 0) + 1,
      updated_at: nowIso,
    });
    const tCur = tournamentRows.get(m.tournament);
    tournamentRows.set(m.tournament, {
      name: m.tournament,
      sport_id: m.sportId,
      count: (tCur?.count ?? 0) + 1,
      updated_at: nowIso,
    });
  }
  try {
    if (sportRows.size) {
      await (supabaseAdmin as never as { from: (t: string) => { upsert: (rows: unknown, opts: unknown) => Promise<unknown> } }).from("wina_sports").upsert(Array.from(sportRows.values()), { onConflict: "id" });
    }
    if (tournamentRows.size) {
      await (supabaseAdmin as never as { from: (t: string) => { upsert: (rows: unknown, opts: unknown) => Promise<unknown> } }).from("wina_tournaments").upsert(Array.from(tournamentRows.values()), { onConflict: "name" });
    }
  } catch (err) {
    console.error("Failed to upsert wina_sports/wina_tournaments", err);
  }
}

export const fetchWinamaxFootball = createServerFn({ method: "GET" }).handler(
  async (): Promise<WinaPayload> => {
    let data: Record<string, any> = {};
    try {
      data = await fetchViaSocketIO();
    } catch (e) {
      console.error("Winamax socket.io fetch failed:", e);
    }

    const sportsMap: Record<string, string> = {};
    for (const k of Object.keys(data.sports || {})) {
      if (data.sports[k]?.sportName) sportsMap[k] = data.sports[k].sportName;
    }
    const all = parseMatchesFromState(data, sportsMap);

    // Persistance Cloud (matchs + sports + tournois)
    syncToDatabase(all).catch((err) => console.error("Sync error:", err));

    let liveCount = 0;
    const tCounts: Record<string, number> = {};
    const sCounts: Record<number, { name: string; count: number }> = {};
    for (const m of all) {
      if (m.status === "live") liveCount++;
      tCounts[m.tournament] = (tCounts[m.tournament] || 0) + 1;
      const cur = sCounts[m.sportId];
      sCounts[m.sportId] = { name: m.sportName, count: (cur?.count || 0) + 1 };
    }

    all.sort((a, b) => {
      if (a.status === "live" && b.status !== "live") return -1;
      if (b.status === "live" && a.status !== "live") return 1;
      return a.matchStart - b.matchStart;
    });

    return {
      matches: all,
      tournaments: Object.entries(tCounts)
        .map(([name, count]) => ({ id: name, name, count }))
        .sort((a, b) => b.count - a.count),
      sports: Object.entries(sCounts)
        .map(([id, v]) => ({ id: Number(id), name: v.name, count: v.count }))
        .sort((a, b) => b.count - a.count),
      fetchedAt: Date.now(),
      totalCount: all.length,
      liveCount,
    };
  },
);
