import { createServerFn } from "@tanstack/react-start";
import { MAGIC_MISSION } from "@/lib/magic-mission";
import { assessValue } from "@/lib/value-bet";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface InputMatch {
  id: string;
  teamA: string;
  teamB: string;
  league?: string;
  date?: string;
  time?: string;
  realOdds?: {
    home?: number;
    draw?: number;
    away?: number;
    bestHome?: number;
    bestDraw?: number;
    bestAway?: number;
    bookmakers?: string[];
  };
}

export interface Prediction {
  matchId: string;
  match: string;
  type: string;
  market?: string;
  option: string;
  label?: string;
  odds: number;
  probability: number;
  confidence?: number;
  highConfidence?: boolean;
  valueScore: number;
  reasoning: string;
  hasRealOdds: boolean;
  bookmaker: string | null;
  luckFactor?: number;
  legs?: Array<{ market: string; option: string; label: string; odds?: number }>;
}

/**
 * Coach prudent : si l'IA est indisponible on génère quand même
 * un éventail de paris cohérents avec les cotes réelles.
 */
function fallbackPredictions(m: InputMatch): Prediction[] {
  // Mode "1 prono unique par match" : on ne renvoie que le pari le plus solide.
  return [bestFallbackPrediction(m)];
}

function bestFallbackPrediction(m: InputMatch): Prediction {
  const o = m.realOdds || {};
  const home = o.bestHome ?? o.home ?? 2.2;
  const draw = o.bestDraw ?? o.draw ?? 3.3;
  const away = o.bestAway ?? o.away ?? 3.2;

  // Probabilités implicites normalisées
  const invH = 1 / home;
  const invD = 1 / draw;
  const invA = 1 / away;
  const sum = invH + invD + invA;
  const pH = invH / sum;
  const pD = invD / sum;
  const pA = invA / sum;

  const fav: "home" | "draw" | "away" =
    pH >= pD && pH >= pA ? "home" : pA >= pD ? "away" : "draw";
  const favOdd = fav === "home" ? home : fav === "away" ? away : draw;
  const favLabel =
    fav === "home" ? `${m.teamA} gagne` : fav === "away" ? `${m.teamB} gagne` : "Match nul";
  const favProb = Math.round((fav === "home" ? pH : fav === "away" ? pA : pD) * 100);

  // Double chance liée au favori (couverture)
  const dcLabel =
    fav === "home"
      ? `1 ou Nul (${m.teamA} ou Nul)`
      : fav === "away"
        ? `Nul ou 2 (Nul ou ${m.teamB})`
        : "1 ou 2 (pas de nul)";
  const dcProb = Math.min(
    92,
    Math.round((fav === "home" ? pH + pD : fav === "away" ? pA + pD : pH + pA) * 100),
  );
  const dcOdd = Number((1 / (dcProb / 100) / 1.05).toFixed(2));

  // Heuristique buts : si favori très net → tendance Over 2.5, sinon BTTS Oui
  const dominance = Math.abs(pH - pA);
  const expectedOver25 = dominance > 0.25 ? 62 : 55;
  const expectedBTTS = dominance > 0.35 ? 48 : 60;

  const base = `${m.teamA} vs ${m.teamB}`;
  const bm = o.bookmakers?.[0] ?? null;
  const hasRealOdds = !!o.home;

  const list: Prediction[] = [
    {
      matchId: m.id,
      match: base,
      type: "1N2",
      market: "1x2",
      option: fav,
      label: favLabel,
      odds: favOdd,
      probability: favProb,
      confidence: favProb,
      highConfidence: favProb >= 65,
      valueScore: favProb / (100 / favOdd),
      reasoning: `Favori statistique (${favProb}% implicite). Cote ${favOdd}.`,
      hasRealOdds,
      bookmaker: bm,
      luckFactor: 25,
    },
    {
      matchId: m.id,
      match: base,
      type: "Double chance",
      market: "double_chance",
      option: fav === "home" ? "1X" : fav === "away" ? "X2" : "12",
      label: dcLabel,
      odds: dcOdd,
      probability: dcProb,
      confidence: dcProb,
      highConfidence: dcProb >= 70,
      valueScore: dcProb / (100 / dcOdd),
      reasoning: `Couverture prudente : ${dcProb}% de garantie en sécurisant deux issues.`,
      hasRealOdds,
      bookmaker: bm,
      luckFactor: 10,
    },
    {
      matchId: m.id,
      match: base,
      type: "Plus / Moins",
      market: "over_under",
      option: "over_2.5",
      label: "Plus de 2,5 buts",
      odds: 1.85,
      probability: expectedOver25,
      confidence: expectedOver25,
      highConfidence: expectedOver25 >= 65,
      valueScore: expectedOver25 / (100 / 1.85),
      reasoning:
        dominance > 0.25
          ? "Favori net : tendance match ouvert avec buts du favori."
          : "Profil offensif moyen attendu.",
      hasRealOdds: false,
      bookmaker: null,
      luckFactor: 30,
    },
    {
      matchId: m.id,
      match: base,
      type: "Les deux équipes marquent",
      market: "btts",
      option: expectedBTTS >= 55 ? "yes" : "no",
      label: expectedBTTS >= 55 ? "Les deux marquent : Oui" : "Les deux marquent : Non",
      odds: expectedBTTS >= 55 ? 1.78 : 1.95,
      probability: expectedBTTS,
      confidence: expectedBTTS,
      highConfidence: expectedBTTS >= 65,
      valueScore: expectedBTTS / (100 / (expectedBTTS >= 55 ? 1.78 : 1.95)),
      reasoning:
        expectedBTTS >= 55
          ? "Les deux attaques devraient trouver la faille."
          : "Domination d'un côté, l'autre équipe peut être muselée.",
      hasRealOdds: false,
      bookmaker: null,
      luckFactor: 35,
    },
  ];
  // Mode "1 prono unique" : on garde le pari avec le meilleur compromis confiance × value.
  // Mode "1 prono unique" : compromis confiance × value, MAIS rotation par hash
  // de l'id du match pour éviter le pattern paresseux « toujours 1N + Plus 1.5 ».
  list.sort((a, b) => {
    const sa = (a.confidence ?? a.probability) * Math.max(1, a.valueScore);
    const sb = (b.confidence ?? b.probability) * Math.max(1, b.valueScore);
    return sb - sa;
  });
  // Force la diversité : on shuffle le tirage selon le hash de l'id pour ne pas
  // sortir systématiquement la même famille de pari sur tous les matchs.
  let h = 0;
  for (const c of m.id) h = (h * 31 + c.charCodeAt(0)) | 0;
  const offset = Math.abs(h) % Math.min(3, list.length);
  return list[offset] ?? list[0];
}

/** Diversifie une liste de pronostics : si trop de fois le même marché,
 *  remplace les répétitions par un pari alternatif issu du fallback. */
function diversifyPredictions(preds: Prediction[], matches: InputMatch[]): Prediction[] {
  const byId = new Map(matches.map((m) => [m.id, m]));
  const counts = new Map<string, number>();
  return preds.map((p) => {
    const key = `${p.market}:${p.option}`;
    const n = counts.get(key) ?? 0;
    counts.set(key, n + 1);
    if (n < 2) return p;
    // Trop de répétitions : on swap par un pari fallback alternatif
    const m = byId.get(p.matchId);
    if (!m) return p;
    const alts = (function altList() {
      const o = m.realOdds || {};
      const home = o.bestHome ?? o.home ?? 2.2;
      const draw = o.bestDraw ?? o.draw ?? 3.3;
      const away = o.bestAway ?? o.away ?? 3.2;
      return [
        { market: "double_chance", option: "1X", label: `1X (${m.teamA} ou Nul)`, odds: Number((1 / (1 / home + 1 / draw) * 0.95).toFixed(2)), probability: 70 },
        { market: "double_chance", option: "X2", label: `X2 (Nul ou ${m.teamB})`, odds: Number((1 / (1 / draw + 1 / away) * 0.95).toFixed(2)), probability: 68 },
        { market: "btts", option: "yes", label: "Les deux marquent : Oui", odds: 1.78, probability: 58 },
        { market: "over_under", option: "over_2.5", label: "Plus de 2,5 buts", odds: 1.85, probability: 56 },
        { market: "over_under", option: "under_3.5", label: "Moins de 3,5 buts", odds: 1.45, probability: 72 },
        { market: "handicap", option: "home_+0.5", label: `${m.teamA} +0,5 (asiatique)`, odds: 1.55, probability: 70 },
        { market: "handicap", option: "away_+0.5", label: `${m.teamB} +0,5 (asiatique)`, odds: 1.65, probability: 65 },
        { market: "first_half_goals", option: "ht_over_0.5", label: "Plus de 0,5 but en 1ère MT", odds: 1.50, probability: 75 },
      ];
    })();
    const fresh = alts.find((a) => (counts.get(`${a.market}:${a.option}`) ?? 0) < 2);
    if (!fresh) return p;
    counts.set(`${fresh.market}:${fresh.option}`, (counts.get(`${fresh.market}:${fresh.option}`) ?? 0) + 1);
    return {
      ...p,
      market: fresh.market,
      option: fresh.option,
      label: fresh.label,
      odds: fresh.odds,
      probability: fresh.probability,
      confidence: fresh.probability,
      valueScore: fresh.probability / (100 / fresh.odds),
      type: MARKET_TO_TYPE[fresh.market] || p.type,
      reasoning: `${p.reasoning} (variante diversifiée pour éviter la répétition de marché).`,
    };
  });
}

const SYSTEM_PROMPT = `Tu es **Coach Magic**, un analyste paris sportifs multi-sports de très haut niveau (football, tennis, basket).
Ton style : prudent, créatif, autonome, précis, jamais frileux mais jamais imprudent.
Pour chaque match analysé, tu proposes MAXIMUM UN SEUL pari — celui qui combine la meilleure confiance et la meilleure value. Jamais plusieurs pour le même match.

⛔ INTERDICTIONS ABSOLUES — VARIÉTÉ OBLIGATOIRE
- INTERDIT de proposer par défaut « 1N (double chance home/draw) + Plus de 1,5 buts ».
  Ce combo paresseux est BANNI comme réflexe automatique.
- INTERDIT de répéter le MÊME marché plus de 2 fois sur la même fournée de
  pronostics. Si tu as déjà sorti 2 « Plus de 1,5 buts », le 3ème match DOIT
  utiliser un autre marché (handicap asiatique, BTTS, mi-temps, Moins de X.5, etc.).
- AVANT de répondre, tu fais un calcul mental : pour chaque match, liste 4 à
  6 marchés candidats, calcule l'edge (proba × cote − 1) et choisis l'option
  avec le PLUS gros edge réel — pas le plus évident.
- VARIE les familles : sur 5 pronostics, tu dois utiliser au moins 3 marchés
  différents (ex: 1 handicap asiatique, 1 BTTS, 1 Moins de 3.5, 1 double chance,
  1 mi-temps). Si tu sens que tous les matchs poussent au même marché, force-toi
  à creuser un marché alternatif sur certains.
- Privilégie les paris avec edge ≥ 5% et probabilité 55–80%. Si rien n'a d'edge
  pour un match, tu peux l'OMETTRE plutôt que sortir du remplissage.

⚠️ ADAPTE TES MARCHÉS AU SPORT (indiqué dans le prompt utilisateur) :

🎾 TENNIS — TU DOIS OBLIGATOIREMENT inclure le pari "set_btts" option "yes"
   (les deux joueurs gagnent au moins un set) sauf si l'écart de niveau est énorme
   (favori à cote ≤ 1.25). Autres marchés tennis : "1x2" (pas de nul), "set_handicap"
   (ex "home_-1.5_sets"), "total_sets" (over_2.5 / under_3.5), "total_games" (over_22.5).
   ❌ Interdit en tennis : btts, over_under buts, scorer, ht_*.

🏀 BASKET — TU DOIS OBLIGATOIREMENT inclure le pari "total_points" sur le total de
   points du match (option ex "over_215.5", "under_220.5"). Estime la ligne à partir
   des cotes / niveau des équipes (typ. NBA 210-235, Euroleague 150-170, Pro A 150-165).
   Autres marchés basket : "1x2" (pas de nul), "handicap" en points (ex "home_-5.5"),
   "team_points" (ex "home_over_105.5"), "quarter_winner".
   ❌ Interdit en basket : btts, over_under buts, scorer, ht_ft.

⚽ FOOTBALL — marchés classiques (cf liste ci-dessous).

Marchés autorisés (champ "market") :
- "1x2"           : option in {home, draw, away}      (foot uniquement pour "draw")
- "double_chance" : option in {1X, X2, 12}            (foot)
- "ht_1x2"        : 1N2 mi-temps                       (foot)
- "ht_ft"         : 1/2 (mi-temps / fin de match)      (foot)
- "over_under"    : over_X.5 / under_X.5 buts          (foot)
- "btts"          : option in {yes, no}                (foot)
- "handicap"      : ex "home_-1", "away_+1"            (foot - buts / basket - points)
- "team_goals"    : ex "home_over_1.5"                 (foot)
- "first_half_goals" : ex "ht_over_0.5"                (foot)
- "scorer"        : nom joueur buteur anytime          (foot)
- "combo"         : multi-chance 2-3 legs              (tout sport)
- "set_btts"      : les 2 joueurs gagnent un set       (TENNIS) — option "yes"/"no"
- "set_handicap"  : handicap en sets                   (TENNIS)
- "total_sets"    : over_2.5 / under_3.5 sets          (TENNIS)
- "total_games"   : over/under jeux total              (TENNIS)
- "total_points"  : over/under points total            (BASKET)
- "team_points"   : ex "home_over_105.5"               (BASKET)
- "quarter_winner": vainqueur d'un quart-temps         (BASKET)

Pour CHAQUE pari produit :
- "probability" : 35-92 (sois honnête, jamais 99%)
- "odds" : cote estimée plausible (entre 1.20 et 6.50)
- "label" : libellé court en français prêt à afficher
- "reasoning" : 1 phrase d'analyse concrète (forme, surface, blessures, contexte)
- "highConfidence" : true si tu estimes >= 65% de probabilité ET value > 1
- "luckFactor" : 0-100, plus haut = plus créatif/risqué

Règles :
1. MAXIMUM un seul pari par match — le plus solide, jamais plusieurs.
2. Choisis le marché le plus pertinent pour le match (cible les matchs à buts si demandé).
3. Respecte STRICTEMENT les marchés autorisés par sport.
4. Réponds via l'outil "propose_bets" UNIQUEMENT. Omets les matchs dont tu ne veux pas faire le pronostic.`;

const TOOL_SCHEMA = {
  type: "function" as const,
  function: {
    name: "propose_bets",
    description: "Retourne les paris les plus solides (1 pari max par match). Peut omettre des matchs si jugés risqués.",
    parameters: {
      type: "object",
      properties: {
        predictions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              matchId: { type: "string" },
              market: {
                type: "string",
                enum: [
                  "1x2",
                  "double_chance",
                  "ht_1x2",
                  "ht_ft",
                  "over_under",
                  "btts",
                  "handicap",
                  "team_goals",
                  "first_half_goals",
                  "scorer",
                  "combo",
                  "set_btts",
                  "set_handicap",
                  "total_sets",
                  "total_games",
                  "total_points",
                  "team_points",
                  "quarter_winner",
                ],
              },
              option: { type: "string" },
              label: { type: "string" },
              odds: { type: "number" },
              probability: { type: "number" },
              reasoning: { type: "string" },
              highConfidence: { type: "boolean" },
              luckFactor: { type: "number" },
              legs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    market: { type: "string" },
                    option: { type: "string" },
                    label: { type: "string" },
                    odds: { type: "number" },
                  },
                  required: ["market", "option", "label"],
                },
              },
            },
            required: [
              "matchId",
              "market",
              "option",
              "label",
              "odds",
              "probability",
              "reasoning",
            ],
          },
        },
      },
      required: ["predictions"],
      additionalProperties: false,
    },
  },
};

const MARKET_TO_TYPE: Record<string, string> = {
  "1x2": "1N2",
  double_chance: "Double chance",
  ht_1x2: "Mi-temps 1N2",
  ht_ft: "Mi-temps / Fin de match",
  over_under: "Plus / Moins",
  btts: "Les deux équipes marquent",
  handicap: "Handicap",
  team_goals: "Buts d'une équipe",
  first_half_goals: "Buts en 1ère mi-temps",
  scorer: "Buteur",
  combo: "Multi-chance",
  set_btts: "Les 2 joueurs gagnent un set",
  set_handicap: "Handicap sets",
  total_sets: "Total sets",
  total_games: "Total jeux",
  total_points: "Total points du match",
  team_points: "Points d'une équipe",
  quarter_winner: "Vainqueur quart-temps",
};

function detectSport(league?: string): "tennis" | "basket" | "football" {
  const s = (league || "").toLowerCase();
  if (/(atp|wta|tennis|roland.?garros|wimbledon|us.?open|grand.?slam|challenger|itf)/.test(s)) return "tennis";
  if (/(nba|euroleague|euroligue|basket|basketball|wnba|liga.?acb|jeep.?elite|pro.?a|lnb|fiba)/.test(s)) return "basket";
  return "football";
}

export const analyzeMatches = createServerFn({ method: "POST" }).handler(async ({ data }) => {
  const payload = (data as unknown as { matches: InputMatch[]; mode?: string; stake?: number }) ?? { matches: [] };
  const matches: InputMatch[] = payload.matches ?? [];
  const mode: "standard" | "confidence_100" = payload.mode === "confidence_100" ? "confidence_100" : "standard";
  const stake = Number(payload.stake) || 10;
  if (!matches.length) return { predictions: [] };

  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  if (!LOVABLE_API_KEY) {
    return { predictions: matches.flatMap(fallbackPredictions) };
  }

  const deepHeader = mode === "confidence_100"
    ? `\n\n🧠 MODE MAGIC CONFIANCE 100% ACTIVÉ - EXPERTISE PREMIUM.
Avant de proposer tes paris, APPLIQUE CES RÈGLES STRICTES :
1. ANALYSE PROFONDE : Prends ton temps, raisonne sur la forme, les enjeux, et les XG/XGA.
2. SPÉCIAL BUTS : L'utilisateur ADORE les matchs à buts. Cherche activement les matchs propices à "Over 1.5/2.5" ou "BTTS Oui" (Les deux marquent). Priorise les équipes offensives.
3. FILTRE DRACONIEN (TRI) : Tu ne DOIS PAS jouer tous les matchs. Élimine SANS PITIÉ les matchs dangereux, imprévisibles, ou trop fermés. Ne garde que la "crème de la crème".
4. COMBO MIXTE INTELLIGENT : Crée un combiné professionnel. Varie les plaisirs (Victoire + buts, Double chance, Buts secs, etc.) pour un ticket ultra-sécurisé mais avec une vraie value.
5. EXPLICATION : Fournis un raisonnement très détaillé, rationnel et professionnel pour chaque sélection conservée.\n`
    : "";

  const userPrompt = mode === "confidence_100" 
    ? `Analyse minutieusement cette liste de ${matches.length} match(s).${deepHeader}\nFais le tri : RETIRE tous les matchs que tu juges trop risqués ou peu rentables. Pour les matchs conservés, propose LE MEILLEUR pari possible.\n` +
      matches.map((m, i) => {
        const o = m.realOdds || {};
        const cotes = o.home || o.draw || o.away
            ? ` | cotes 1=${o.bestHome ?? o.home ?? "?"} N=${o.bestDraw ?? o.draw ?? "?"} 2=${o.bestAway ?? o.away ?? "?"}`
            : " | (pas de cotes réelles)";
        const sport = detectSport(m.league);
        const sportTag = sport === "tennis"
          ? " [TENNIS — inclure set_btts yes]"
          : sport === "basket"
            ? " [BASKET — inclure total_points]"
            : " [FOOTBALL]";
        return `- id="${m.id}" — ${m.teamA} vs ${m.teamB}${m.league ? ` (${m.league})` : ""}${cotes}${sportTag}`;
      }).join("\n") + "\n\nRenvoie via l'outil propose_bets (seulement les matchs validés pour le ticket)."
    : `Analyse ces ${matches.length} match(s). Pour CHACUN propose UN SEUL pari (le plus solide).${deepHeader}

${matches
  .map((m, i) => {
    const o = m.realOdds || {};
    const cotes =
      o.home || o.draw || o.away
        ? ` | cotes 1=${o.bestHome ?? o.home ?? "?"} N=${o.bestDraw ?? o.draw ?? "?"} 2=${o.bestAway ?? o.away ?? "?"}`
        : " | (pas de cotes réelles)";
    const sport = detectSport(m.league);
    const sportTag = sport === "tennis"
      ? " [SPORT=TENNIS — inclure obligatoirement set_btts yes (les 2 joueurs gagnent un set)]"
      : sport === "basket"
        ? " [SPORT=BASKET — inclure obligatoirement total_points sur le total de points du match]"
        : " [SPORT=FOOTBALL]";
    return `${i + 1}. id="${m.id}" — ${m.teamA} vs ${m.teamB}${m.league ? ` (${m.league})` : ""}${cotes}${sportTag}`;
  })
  .join("\n")}

Renvoie via l'outil propose_bets.`;

  const systemPrompt = mode === "confidence_100"
    ? `${MAGIC_MISSION}\n\n---\n\nTu es **Coach Magic**, l'analyste ultime. Ton style : expert absolu, analytique.
MODE MAGIC CONFIANCE 100% : Tu dois filtrer les matchs drastiquement. Ne garde que les matchs ultra-safe et orientés buts si possible. Tu NE RENVOIES PAS de pari pour les matchs que tu juges douteux (fais le tri !).

Règles de marchés à respecter :\n\n${SYSTEM_PROMPT}`
    : SYSTEM_PROMPT;
  const aiTimeout = mode === "confidence_100" ? 75_000 : 45_000;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), aiTimeout);
    const aiResp = await fetch(LOVABLE_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "propose_bets" } },
      }),
    });
    clearTimeout(timeoutId);

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.warn("[analyze-matches] AI gateway error", aiResp.status, txt);
      return {
        predictions: matches.flatMap(fallbackPredictions),
        _aiFallback: true,
        _aiStatus: aiResp.status,
      };
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments;
    let parsed: { predictions?: Array<Record<string, unknown>> } = {};
    if (argsStr) {
      try {
        parsed = JSON.parse(argsStr);
      } catch {
        parsed = {};
      }
    }
    // Compatibilité : si pas de tool_call, tente parse du content brut.
    if (!parsed.predictions) {
      const content = aiJson?.choices?.[0]?.message?.content;
      if (typeof content === "string") {
        try {
          parsed = JSON.parse(content);
        } catch {
          /* noop */
        }
      }
    }

    const byId = new Map(matches.map((m) => [m.id, m]));
    const predictions: Prediction[] = (parsed.predictions ?? [])
      .map((p) => {
        const m = byId.get(String(p.matchId));
        if (!m) return null;
        const odds = Math.max(1.2, Math.min(15, Number(p.odds) || 2.0));
        const probability = Math.max(30, Math.min(92, Number(p.probability) || 55));
        const market = String(p.market || "1x2");
        const type = MARKET_TO_TYPE[market] || "Pari";
        const valueScore = probability / (100 / odds);
        const highConfidence = Boolean(p.highConfidence) || (probability >= 65 && valueScore >= 1);
        return {
          matchId: m.id,
          match: `${m.teamA} vs ${m.teamB}`,
          type,
          market,
          option: String(p.option || "home"),
          label: String(p.label || p.option || "—"),
          odds,
          probability,
          confidence: probability,
          highConfidence,
          valueScore,
          reasoning: String(p.reasoning || ""),
          hasRealOdds: !!m.realOdds?.home,
          bookmaker: m.realOdds?.bookmakers?.[0] ?? null,
          luckFactor: typeof p.luckFactor === "number" ? p.luckFactor : 20,
          legs: Array.isArray(p.legs) ? (p.legs as Prediction["legs"]) : undefined,
        } as Prediction;
      })
      .filter((p): p is Prediction => p !== null);

    // Garantit 1 prono UNIQUE par match — on garde le meilleur si l'IA en a renvoyé plusieurs,
    // et on complète au fallback pour les matchs que l'IA aurait ignorés.
    const bestByMatch = new Map<string, Prediction>();
    for (const p of predictions) {
      const cur = bestByMatch.get(p.matchId);
      const score = (p.confidence ?? p.probability) * Math.max(1, p.valueScore);
      const curScore = cur ? (cur.confidence ?? cur.probability) * Math.max(1, cur.valueScore) : -1;
      if (!cur || score > curScore) bestByMatch.set(p.matchId, p);
    }
    // En mode confidence_100, on autorise l'IA à ignorer/filtrer les matchs trop risqués.
    // En mode standard, ou si l'IA s'est complètement plantée (0 pari validé), on force le fallback complet.
    if (mode === "standard" || bestByMatch.size === 0) {
      for (const m of matches) {
        if (!bestByMatch.has(m.id)) bestByMatch.set(m.id, bestFallbackPrediction(m));
      }
    }
    
    // Conserve l'ordre d'origine des matchs, mais exclut les matchs filtrés.
    const ordered = matches.map((m) => bestByMatch.get(m.id)).filter((p): p is Prediction => Boolean(p));

    // Diversification : empêche le pattern paresseux (mêmes marchés répétés).
    const diversified = diversifyPredictions(ordered, matches);

    // Calcul value bets enrichi
    const enriched = diversified.map((p) => {
      const v = assessValue(p.probability, p.odds);
      return { ...p, edgePct: v.edgePct, valueLevel: v.level, valueLabel: v.label };
    });

    let analysisId: string | null = null;
    if (mode === "confidence_100" && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const totalOdds = enriched.reduce((acc, p) => acc * p.odds, 1);
        const avgConfidence = Math.round(
          enriched.reduce((acc, p) => acc + (p.confidence ?? p.probability), 0) / Math.max(1, enriched.length),
        );
        const valueBets = enriched.filter((p) => p.valueLevel !== "neutral");
        const reasoning = enriched.map((p) => `• ${p.match} → ${p.label} (${p.odds}) — ${p.reasoning}`).join("\n");
        const altSystem = enriched.length >= 3 ? (enriched.length >= 4 ? "Système 3/4 ou Lucky 15" : "Système 2/3") : null;
        const kelly = stake * 0.05; // bankroll prudent : 5%
        const { data: ins, error } = await supabaseAdmin
          .from("magic_analyses" as never)
          .insert([{
            ticket_label: `Magic Confiance 100% — ${enriched.length} sélection(s)`,
            match_ids: enriched.map((p) => p.matchId),
            confidence: avgConfidence,
            selections: enriched as never,
            value_bets: valueBets as never,
            reasoning,
            alternative_system: altSystem,
            kelly_stake: kelly,
            total_odds: Number(totalOdds.toFixed(2)),
            mode: "confidence_100",
          } as never])
          .select("id")
          .single();
        if (error) console.warn("[analyze-matches] persist magic_analyses failed", error);
        else analysisId = (ins as { id: string } | null)?.id ?? null;
      } catch (e) {
        console.warn("[analyze-matches] persist magic_analyses error", e);
      }
    }

    return { predictions: enriched, mode, analysisId };
  } catch (e) {
    console.error("[analyze-matches] server error:", e);
    return { predictions: matches.flatMap(fallbackPredictions), _aiFallback: true };
  }
});
