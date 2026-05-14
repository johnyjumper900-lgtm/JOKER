// ⚙️ CONFIGURATION (clés saisies via /settings, stockées en localStorage)
const LS_GEMINI_KEY = "cotes-engine.geminiKey";
const LS_FOOTBALL_KEY = "cotes-engine.footballKey";

export const API_FOOTBALL_URL = "https://v3.football.api-sports.io";

export function getGeminiKey(): string {
  return (typeof window !== "undefined" && localStorage.getItem(LS_GEMINI_KEY)) || "";
}
export function getFootballKey(): string {
  return (typeof window !== "undefined" && localStorage.getItem(LS_FOOTBALL_KEY)) || "";
}
export function setApiKeys(gemini: string, football: string) {
  localStorage.setItem(LS_GEMINI_KEY, gemini);
  localStorage.setItem(LS_FOOTBALL_KEY, football);
}
export function hasApiKeys(): boolean {
  return Boolean(getGeminiKey() && getFootballKey());
}

// 🌍 CHAMPIONNATS
export const ALL_LEAGUES: Record<string, number> = {
  "Ligue 1": 61, "Ligue 2": 62, "National 1": 63,
  "Premier League": 39, "Championship": 40, "League One": 41, "League Two": 42,
  "La Liga": 140, "La Liga 2": 141,
  "Bundesliga": 78, "Bundesliga 2": 79,
  "Serie A": 135, "Serie B": 136,
  "Primeira Liga": 94, "Eredivisie": 88, "Pro League": 144,
  "Scottish Premiership": 179, "Süper Lig": 203,
  "Liga Profesional Argentina": 128, "Brasileirão Serie A": 71,
  "MLS": 253, "Liga MX": 262, "J1 League": 98,
  "Saudi Pro League": 307, "Botola Pro": 200,
  "Ligue des Champions": 2, "Europa League": 3,
};

// 📦 IndexedDB
const DB_NAME = "cotes-engine";
const DB_VERSION = 1;
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("matches")) db.createObjectStore("matches", { keyPath: "id" });
      if (!db.objectStoreNames.contains("forces")) db.createObjectStore("forces", { keyPath: "team" });
      if (!db.objectStoreNames.contains("logos")) db.createObjectStore("logos", { keyPath: "id" });
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveMatches(matches: any[]) {
  const db = await openDB();
  const tx = db.transaction("matches", "readwrite");
  const store = tx.objectStore("matches");
  for (const m of matches) store.put(m);
  return new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
}
export async function loadMatches(): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("matches", "readonly");
    const r = tx.objectStore("matches").getAll();
    r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
  });
}
export async function saveForces(forces: Record<string, any>) {
  const db = await openDB();
  const tx = db.transaction("forces", "readwrite");
  const store = tx.objectStore("forces");
  for (const [team, data] of Object.entries(forces)) store.put({ team, ...data });
  return new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
}
export async function loadForces(): Promise<Record<string, any>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("forces", "readonly");
    const r = tx.objectStore("forces").getAll();
    r.onsuccess = () => {
      const f: Record<string, any> = {};
      r.result.forEach((x: any) => { f[x.team] = { attack: x.attack, defense: x.defense, matches: x.matches }; });
      resolve(f);
    };
    r.onerror = () => reject(r.error);
  });
}
export async function saveLogos(logos: any[]) {
  const db = await openDB();
  const tx = db.transaction("logos", "readwrite");
  const store = tx.objectStore("logos");
  for (const l of logos) store.put({ ...l, cachedAt: Date.now() });
  return new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
}
export async function loadLogos(): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("logos", "readonly");
    const r = tx.objectStore("logos").getAll();
    r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
  });
}
export async function saveMeta(key: string, value: any) {
  const db = await openDB();
  const tx = db.transaction("meta", "readwrite");
  tx.objectStore("meta").put({ key, value, updatedAt: Date.now() });
  return new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
}
export async function loadMeta(key: string): Promise<any> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("meta", "readonly");
    const r = tx.objectStore("meta").get(key);
    r.onsuccess = () => resolve(r.result?.value || null); r.onerror = () => reject(r.error);
  });
}

// 🔗 API-FOOTBALL
async function callFootballAPI(endpoint: string, params?: Record<string, string>) {
  const key = getFootballKey();
  if (!key) throw new Error("Clé API-Football manquante. Configurez-la dans Paramètres.");
  const url = new URL(`${API_FOOTBALL_URL}/${endpoint}`);
  if (params) Object.keys(params).forEach((k) => url.searchParams.append(k, params[k]));
  const res = await fetch(url.toString(), { headers: { "x-apisports-key": key } });
  await new Promise((r) => setTimeout(r, 500));
  if (!res.ok) throw new Error(`Erreur API: ${res.statusText}`);
  return res.json();
}

// 📥 EXTRACTION
let extractionInProgress = false;
let extractionPaused = false;
let extractionCurrent = 0;
let extractionTotal = 0;

export async function extractAllAndStore(
  season: number = 2024,
  onProgress?: (current: number, total: number, league: string, added: number) => void,
) {
  if (extractionInProgress) return null;
  extractionInProgress = true;
  extractionPaused = false;
  const leagues = Object.entries(ALL_LEAGUES);
  extractionTotal = leagues.length;
  extractionCurrent = 0;
  let totalAdded = 0, totalSkipped = 0;
  const errors: string[] = [];
  const existing = await loadMatches();
  const existingIds = new Set(existing.map((m: any) => m.id));

  for (const [name, id] of leagues) {
    while (extractionPaused) await new Promise((r) => setTimeout(r, 1000));
    extractionCurrent++;
    onProgress?.(extractionCurrent, extractionTotal, name, 0);
    try {
      const data = await callFootballAPI("fixtures", {
        league: id.toString(), season: season.toString(), status: "FT",
      });
      const matches = data.response.map((f: any) => ({
        id: f.fixture.id, date: f.fixture.date.split("T")[0],
        league: f.league.name, league_id: id, season: f.league.season,
        home_team: f.teams.home.name, away_team: f.teams.away.name,
        home_score: f.goals.home, away_score: f.goals.away,
        home_halftime: f.score.halftime.home, away_halftime: f.score.halftime.away,
      }));
      const newOnes = matches.filter((m: any) => !existingIds.has(m.id));
      if (newOnes.length) {
        await saveMatches(newOnes);
        newOnes.forEach((m: any) => existingIds.add(m.id));
      }
      totalAdded += newOnes.length;
      totalSkipped += matches.length - newOnes.length;
      onProgress?.(extractionCurrent, extractionTotal, name, newOnes.length);
    } catch {
      errors.push(name);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  await saveMeta("lastExtraction", { date: new Date().toISOString(), season, totalAdded, totalSkipped, errors });
  const all = await loadMatches();
  const forces = computeForces(all);
  await saveForces(forces);
  await saveMeta("lastForceUpdate", new Date().toISOString());
  extractionInProgress = false;
  return { totalLeagues: leagues.length, success: leagues.length - errors.length, errors, totalAdded, totalSkipped, totalStored: all.length };
}
export function pauseExtraction() { extractionPaused = true; }
export function resumeExtraction() { extractionPaused = false; }
export function getExtractionProgress() {
  return {
    inProgress: extractionInProgress, paused: extractionPaused,
    current: extractionCurrent, total: extractionTotal,
    percent: extractionTotal > 0 ? Math.round((extractionCurrent / extractionTotal) * 100) : 0,
  };
}

// 🔄 MISE À JOUR HEBDO
let schedulerInterval: any = null;
let nextUpdateDate: Date | null = null;

export async function startWeeklyUpdate(
  onUpdateStart?: () => void,
  onUpdateComplete?: (result: any) => void,
  onProgress?: (current: number, total: number, league: string, added: number) => void,
) {
  const lastMeta = await loadMeta("lastExtraction");
  const lastDate = lastMeta?.date ? new Date(lastMeta.date) : null;
  if (lastDate) {
    nextUpdateDate = new Date(lastDate);
    nextUpdateDate.setDate(nextUpdateDate.getDate() + 7);
  } else {
    nextUpdateDate = new Date();
  }
  console.log(`📅 Prochaine mise à jour : ${nextUpdateDate.toLocaleString()}`);
  schedulerInterval = setInterval(async () => {
    const now = new Date();
    if (nextUpdateDate && now >= nextUpdateDate && !extractionInProgress && hasApiKeys()) {
      onUpdateStart?.();
      const currentSeason = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
      try {
        const result = await extractAllAndStore(currentSeason, onProgress);
        nextUpdateDate = new Date();
        nextUpdateDate.setDate(nextUpdateDate.getDate() + 7);
        await saveMeta("nextUpdate", nextUpdateDate.toISOString());
        onUpdateComplete?.(result);
      } catch (e) {
        console.error("❌ Échec màj auto:", e);
      }
    }
  }, 60 * 60 * 1000);
  await saveMeta("nextUpdate", nextUpdateDate.toISOString());
  return {
    nextUpdate: nextUpdateDate,
    stop: () => { if (schedulerInterval) clearInterval(schedulerInterval); schedulerInterval = null; },
  };
}
export function stopWeeklyUpdate() {
  if (schedulerInterval) { clearInterval(schedulerInterval); schedulerInterval = null; }
}
export async function getNextUpdateInfo() {
  const nextUpdate = await loadMeta("nextUpdate");
  const lastExtraction = await loadMeta("lastExtraction");
  return {
    lastExtraction: lastExtraction?.date || null,
    nextUpdate: nextUpdate || null,
    daysRemaining: nextUpdate
      ? Math.max(0, Math.ceil((new Date(nextUpdate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null,
  };
}

// 📊 STATS
export async function getMatchStats(fixtureId: number) {
  const data = await callFootballAPI("fixtures/statistics", { fixture: fixtureId.toString() });
  const stats: Record<string, any> = {};
  data.response.forEach((team: any) => {
    stats[team.team.name] = {};
    team.statistics.forEach((s: any) => { stats[team.team.name][s.type] = s.value; });
  });
  return stats;
}

export interface TeamForce { attack: number; defense: number; matches: number; }

export function computeForces(matches: any[]): Record<string, TeamForce> {
  const forces: Record<string, TeamForce> = {};
  const leagueAvg = 1.4;
  for (const m of matches) {
    for (const team of [m.home_team, m.away_team]) {
      if (!forces[team]) forces[team] = { attack: 1.0, defense: 1.0, matches: 0 };
    }
    const { home_team: home, away_team: away, home_score: hg, away_score: ag } = m;
    forces[home].attack = (forces[home].attack + hg / leagueAvg) / 2;
    forces[home].defense = (forces[home].defense + ag / leagueAvg) / 2;
    forces[away].attack = (forces[away].attack + ag / leagueAvg) / 2;
    forces[away].defense = (forces[away].defense + hg / leagueAvg) / 2;
    forces[home].matches++;
    forces[away].matches++;
  }
  return forces;
}

function poissonPMF(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 1; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

export function calculateOdds(
  forces: Record<string, TeamForce>,
  home: string, away: string,
  margin: number = 0.08, homeAdvantage: number = 0.3,
) {
  const hF = forces[home], aF = forces[away];
  if (!hF || !aF) return null;
  const leagueAvg = 1.4;
  const xg_home = leagueAvg * hF.attack * aF.defense * (1 + homeAdvantage);
  const xg_away = leagueAvg * aF.attack * hF.defense;
  let pH = 0, pD = 0, pA = 0;
  for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) {
    const p = poissonPMF(i, xg_home) * poissonPMF(j, xg_away);
    if (i > j) pH += p; else if (i === j) pD += p; else pA += p;
  }
  const total = pH + pD + pA;
  const factor = (1 - margin) / total;
  const oH = 1 / (pH * factor), oD = 1 / (pD * factor), oA = 1 / (pA * factor);
  return {
    match: `${home} vs ${away}`,
    expected_goals: { home: Number(xg_home.toFixed(2)), away: Number(xg_away.toFixed(2)) },
    probabilities: { home: Number((pH * 100).toFixed(1)), draw: Number((pD * 100).toFixed(1)), away: Number((pA * 100).toFixed(1)) },
    odds: { home: Number(oH.toFixed(2)), draw: Number(oD.toFixed(2)), away: Number(oA.toFixed(2)) },
    payout: Number(((1 / (1 / oH + 1 / oD + 1 / oA)) * 100).toFixed(1)),
  };
}

// 🎨 VISUELS
export async function getTeamInfo(teamId: number) {
  const data = await callFootballAPI("teams", { id: teamId.toString() });
  const t = data.response[0];
  return {
    id: t.team.id, nom: t.team.name, pays: t.team.country,
    code_pays: t.team.country_code || "fr", logo: t.team.logo,
    drapeau: `https://media.api-sports.io/football/teams/countries/${t.team.country_code || "fr"}.svg`,
    stade: t.venue?.name || "",
    stade_image: `https://media.api-sports.io/football/teams/${teamId}/stadium.png`,
    fondation: t.team.founded,
  };
}
export async function getAllTeamLogos(leagueId: number, season: number = 2024) {
  const data = await callFootballAPI("teams", { league: leagueId.toString(), season: season.toString() });
  return data.response.map((item: any) => ({
    id: item.team.id, nom: item.team.name, code: item.team.code,
    pays: item.team.country, logo: item.team.logo,
    drapeau: `https://media.api-sports.io/football/teams/countries/${item.team.country_code || "fr"}.svg`,
  }));
}
export async function getLeagueVisuals(leagueId: number) {
  const data = await callFootballAPI("leagues", { id: leagueId.toString() });
  const l = data.response[0];
  return { id: l.league.id, nom: l.league.name, type: l.league.type, logo: l.league.logo, drapeau: l.league.flag || "", pays: l.country?.name || "" };
}
export function getKitUrl(teamId: number, type: "home" | "away" | "third" | "goalkeeper" = "home"): string {
  return `https://media.api-sports.io/football/teams/${teamId}/kits/${type}.png`;
}
export function getAllKitUrls(teamId: number) {
  return {
    domicile: getKitUrl(teamId, "home"), exterieur: getKitUrl(teamId, "away"),
    third: getKitUrl(teamId, "third"), gardien: getKitUrl(teamId, "goalkeeper"),
  };
}
export function getStadiumImage(teamId: number): string {
  return `https://media.api-sports.io/football/teams/${teamId}/stadium.png`;
}
export async function getTeamSquad(teamId: number) {
  const data = await callFootballAPI("players/squads", { team: teamId.toString() });
  return {
    equipe: data.response[0]?.team?.name || "", logo: data.response[0]?.team?.logo || "",
    joueurs: data.response[0]?.players?.map((p: any) => ({
      id: p.id, nom: p.name, age: p.age, nationalite: p.nationality,
      photo: p.photo, poste: p.position, numero: p.number,
    })) || [],
  };
}

// 📊 CLASSEMENT / LIVE / TODAY
export async function getStandings(leagueId: number, season: number = 2024) {
  const data = await callFootballAPI("standings", { league: leagueId.toString(), season: season.toString() });
  return data.response[0]?.league?.standings[0]?.map((team: any) => ({
    rang: team.rank, equipe: team.team.name, logo: team.team.logo,
    points: team.points, joues: team.all.played, gagnes: team.all.win,
    nuls: team.all.draw, perdus: team.all.lose,
    bp: team.all.goals.for, bc: team.all.goals.against,
    diff: team.goalsDiff, forme: team.form,
  })) || [];
}
export async function getLiveMatches() {
  const data = await callFootballAPI("fixtures", { live: "all" });
  return data.response.map((f: any) => ({
    id: f.fixture.id, league: f.league.name, logo_league: f.league.logo,
    home: f.teams.home.name, away: f.teams.away.name,
    logo_home: f.teams.home.logo, logo_away: f.teams.away.logo,
    score_home: f.goals.home, score_away: f.goals.away,
    minute: f.fixture.status.elapsed, status: f.fixture.status.short,
  }));
}
export async function getTodayMatches() {
  const today = new Date().toISOString().split("T")[0];
  const data = await callFootballAPI("fixtures", { date: today });
  return data.response.map((f: any) => ({
    id: f.fixture.id, heure: f.fixture.date.split("T")[1]?.substring(0, 5),
    league: f.league.name, home: f.teams.home.name, away: f.teams.away.name,
    logo_home: f.teams.home.logo, logo_away: f.teams.away.logo,
    score_home: f.goals.home, score_away: f.goals.away, status: f.fixture.status.short,
  }));
}

// 🤖 GEMINI
export async function askGemini(question: string): Promise<string> {
  const key = getGeminiKey();
  if (!key) throw new Error("Clé Gemini manquante. Configurez-la dans Paramètres.");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${key}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: question }] }] }) },
  );
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}
