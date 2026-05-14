/**
 * Deterministic "extra" match data derived from team names.
 * Provides plausible fictional stats (form, H2H, possession, lineups)
 * when the upstream API doesn't expose them.
 */

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export type FormResult = "W" | "D" | "L";

export interface TeamForm {
  results: FormResult[]; // last 5, most recent first
  rating: number; // 0-100
}

export interface HeadToHead {
  total: number;
  homeWins: number;
  draws: number;
  awayWins: number;
}

export interface MatchExtras {
  formHome: TeamForm;
  formAway: TeamForm;
  h2h: HeadToHead;
  possession: { home: number; away: number };
  lineupHome: { starters: string[]; subs: string[] };
  lineupAway: { starters: string[]; subs: string[] };
}

const FIRST_NAMES = [
  "L.", "M.", "A.", "J.", "K.", "R.", "D.", "S.", "T.", "N.", "P.", "C.", "B.", "F.", "E.",
];
const LAST_BANK = [
  "Martín", "García", "Silva", "Rossi", "Dupont", "Müller", "Kovač", "Nilsson", "Andersen",
  "Costa", "Pereira", "Santos", "Romero", "Mendes", "Schmidt", "Bauer", "Lefèvre", "Moreau",
  "Bianchi", "Conti", "Russo", "Lopes", "Fernández", "Torres", "Vidal", "Ribeiro", "Marchand",
  "Olsen", "Hansen", "Larsen", "Novak", "Horvat", "Kowalski", "Wójcik", "Petrov", "Ivanov",
  "Diallo", "Camara", "Traoré", "Bamba", "Keïta", "Touré", "Sané", "Coulibaly",
];

function pickPlayers(rand: () => number, n: number, taken: Set<string>): string[] {
  const out: string[] = [];
  while (out.length < n) {
    const fn = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
    const ln = LAST_BANK[Math.floor(rand() * LAST_BANK.length)];
    const name = `${fn} ${ln}`;
    if (!taken.has(name)) {
      taken.add(name);
      out.push(name);
    }
  }
  return out;
}

function buildForm(rand: () => number): TeamForm {
  const results: FormResult[] = [];
  let pts = 0;
  for (let i = 0; i < 5; i++) {
    const r = rand();
    if (r < 0.5) {
      results.push("W");
      pts += 3;
    } else if (r < 0.78) {
      results.push("D");
      pts += 1;
    } else {
      results.push("L");
    }
  }
  return { results, rating: Math.round((pts / 15) * 100) };
}

export function getMatchExtras(
  homeTeam: string,
  awayTeam: string,
  matchId: string,
): MatchExtras {
  const seed = hash(`${matchId}|${homeTeam}|${awayTeam}`);
  const rand = rng(seed);

  const formHome = buildForm(rand);
  const formAway = buildForm(rand);

  const total = 4 + Math.floor(rand() * 9); // 4-12
  const homeWins = Math.floor(rand() * (total - 1));
  const awayWins = Math.floor(rand() * (total - homeWins));
  const draws = total - homeWins - awayWins;

  // Possession influenced by home rating
  const bias = (formHome.rating - formAway.rating) / 4;
  const homePoss = Math.max(35, Math.min(65, Math.round(50 + bias + (rand() - 0.5) * 8)));
  const awayPoss = 100 - homePoss;

  const taken = new Set<string>();
  const lineupHome = {
    starters: pickPlayers(rand, 11, taken),
    subs: pickPlayers(rand, 5, taken),
  };
  const lineupAway = {
    starters: pickPlayers(rand, 11, taken),
    subs: pickPlayers(rand, 5, taken),
  };

  return {
    formHome,
    formAway,
    h2h: { total, homeWins, draws, awayWins },
    possession: { home: homePoss, away: awayPoss },
    lineupHome,
    lineupAway,
  };
}
