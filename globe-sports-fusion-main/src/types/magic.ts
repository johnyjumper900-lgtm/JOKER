export interface RealOdds {
  home?: number;
  draw?: number;
  away?: number;
  bestHome?: number;
  bestDraw?: number;
  bestAway?: number;
  bookmakers?: string[];
  bookmaker?: string;
  commenceTimeUTC?: string;
  impliedHome?: number;
  impliedDraw?: number;
  impliedAway?: number;
}

export interface Match {
  id: string;
  teamA: string;
  teamB: string;
  teamALogo?: string;
  teamBLogo?: string;
  date?: string;
  time?: string;
  league?: string;
  country?: string;
  countryCode?: string;
  utcDate?: string;
  realOdds?: RealOdds;
}

export interface Prediction {
  matchId: string;
  match: string;
  type: string;
  /** Marché normalisé : "1x2" | "double_chance" | "ht_1x2" | "btts" | "over_under" | "handicap" | "exact_goals" | "combo" */
  market?: string;
  option: string;
  /** Libellé humain en français déjà prêt à afficher (ex : "Plus de 2.5 buts"). */
  label?: string;
  probability: number;
  odds: number;
  valueScore: number;
  reasoning?: string;
  bookmaker?: string | null;
  hasRealOdds?: boolean;
  confidence?: number;
  highConfidence?: boolean;
  teamALogo?: string;
  teamBLogo?: string;
  date?: string;
  time?: string;
  utcDate?: string;
  /** Si combo : sous-sélections. */
  legs?: Array<{ market: string; option: string; label: string; odds?: number }>;
  /** 0-100 : grain de chance / créativité du pari. */
  luckFactor?: number;
}

export interface CalendarMatch extends Match {
  date: string;
  time: string;
  league: string;
  leagueEmblem?: string;
  leagueLogo?: string;
  country?: string;
  countryFlag?: string;
  countryCode?: string;
  utcDate?: string;
  utc?: string;
  venue?: string;
  status?: string;
  /** Real bookmaker odds aggregated from The Odds API (when key is set) */
  realOdds?: RealOdds;
  parisDate?: string;
  parisTime?: string;
  /** Lat/long du stade pour la météo (rempli quand connu). */
  venueLat?: number;
  venueLon?: number;
}

export interface HistoryItem {
  id: string;
  title: string;
  odds: string;
  confidence: string;
  profit: string;
  date: string;
  stake?: number;
  status?: "draft" | "validated";
  validatedAt?: string;
  potentialWin?: number;
  multiplier?: number;
  picks?: Array<{
    match: string;
    option: string;
    type: string;
    odds: number;
    probability: number;
    date?: string;
    time?: string;
    utcDate?: string;
    result?: "won" | "lost" | "pending";
    /** Identifiant TheSportsDB du match (rempli pour le suivi live). */
    eventId?: string;
  }>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}
