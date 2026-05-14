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

export interface WinaPayload {
  matches: WinaMatch[];
  tournaments: { id: string; name: string; count: number }[];
  sports: WinaSport[];
  fetchedAt: number;
  totalCount: number;
  liveCount: number;
}

function extractPreloadedState(html: string): any {
  const idx = html.indexOf("PRELOADED_STATE");
  if (idx < 0) throw new Error("PRELOADED_STATE introuvable");
  const eq = html.indexOf("=", idx);
  let i = eq + 1;
  while (i < html.length && html[i] !== "{") i++;
  const start = i;
  let depth = 0, inStr = false, esc = false;
  for (; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else {
      if (c === '"') inStr = true;
      else if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) return JSON.parse(html.slice(start, i + 1));
      }
    }
  }
  throw new Error("JSON non terminé");
}

const SIO_BASE = "https://sports-eu-west-3.winamax.fr/uof-sports-server/socket.io/";
const SIO_HEADERS: Record<string, string> = {
  "Origin": "https://www.winamax.fr",
  "Referer": "https://www.winamax.fr/",
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
  const r1 = await fetch(`${SIO_BASE}?EIO=4&transport=polling&t=${Date.now()}`, { headers: H() });
  cap(r1);
  const t1 = await r1.text();
  const sid = JSON.parse(t1.slice(t1.indexOf("{"))).sid as string;

  const post = (body: string) =>
    fetch(`${SIO_BASE}?EIO=4&transport=polling&sid=${sid}`, {
      method: "POST",
      headers: { ...H(), "Content-Type": "text/plain;charset=UTF-8" },
      body,
    }).then(async (r) => { cap(r); await r.text(); });
  const poll = () =>
    fetch(`${SIO_BASE}?EIO=4&transport=polling&sid=${sid}`, { headers: H() }).then(async (r) => {
      cap(r);
      return r.text();
    });

  // 2. Open default namespace + drain ack
  await post("40");
  await poll();

  // 3. Subscribe to live data routes
  for (const route of ["hot:calendar:24", "hot:home", "hot:live"]) {
    await post(`42["m",{"route":"${route}"}]`);
  }

  // 4. Drain pushes
  const merged: Record<string, any> = {
    matches: {}, tournaments: {}, categories: {}, sports: {},
    bets: {}, outcomes: {}, odds: {}, calendar: {}, home: {}, live: {},
  };
  const rgx = /42(\[(?:[^[\]]|\[(?:[^[\]]|\[[^[\]]*\])*\])*\])/g;
  for (let i = 0; i < 18; i++) {
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
                merged[k][id] = typeof merged[k][id] === "object" && typeof v === "object"
                  ? { ...merged[k][id], ...v } : v;
              }
            }
          }
        }
      } catch {}
    }
  }
  // best-effort close
  fetch(`${SIO_BASE}?EIO=4&transport=polling&sid=${sid}`, {
    method: "POST", headers: { ...H(), "Content-Type": "text/plain;charset=UTF-8" }, body: "41",
  }).catch(() => {});
  return merged;
}

function parseMatchesFromState(data: any, sportsMap: Record<string, string>): WinaMatch[] {
  const matches = data.matches || {};
  const bets = data.bets || {};
  const outcomes = data.outcomes || {};
  const odds = data.odds || {};
  const tournaments = data.tournaments || {};
  const categories = data.categories || {};
  const sports = data.sports || {};

  const list: WinaMatch[] = [];
  for (const mid of Object.keys(matches)) {
    const m = matches[mid];
    if (!m || !m.competitor1Name || !m.competitor2Name) continue;

    let home: number | null = null, draw: number | null = null, away: number | null = null;
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
      sports[String(m.sportId)]?.sportName || sportsMap[String(m.sportId)] || KNOWN_SPORTS[String(m.sportId)] || "Sport " + m.sportId;
    const tName = tournaments[String(m.tournamentId)]?.tournamentName || "—";
    const cName = categories[String(m.categoryId)]?.categoryName || "";

    list.push({
      id: String(m.matchId),
      title: m.title,
      homeTeam: m.competitor1Name,
      awayTeam: m.competitor2Name,
      homeLogo: m.competitor1Flag ? `https://s.winamax.fr/i/icons/${m.competitor1Flag}.png` : null,
      awayLogo: m.competitor2Flag ? `https://s.winamax.fr/i/icons/${m.competitor2Flag}.png` : null,
      homeJersey: m.competitor1Flag ? `https://s.winamax.fr/i/jerseys/${m.competitor1Flag}.png` : null,
      awayJersey: m.competitor2Flag ? `https://s.winamax.fr/i/jerseys/${m.competitor2Flag}.png` : null,
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
