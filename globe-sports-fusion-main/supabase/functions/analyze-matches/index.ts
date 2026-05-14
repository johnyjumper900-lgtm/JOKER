// Edge function: analyze-matches
// Coach Magic : propose 4-7 paris diversifiés par match via Lovable AI Gateway.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `Tu es **Coach Magic**, analyste paris sportifs multi-sports (football, tennis, basket).
Pour chaque match tu DOIS proposer EXACTEMENT UN SEUL pari — le plus solide (meilleure confiance × value). Jamais plusieurs.

⚠️ ADAPTE AU SPORT (tag dans le prompt) :
🎾 TENNIS — marchés autorisés : 1x2 (pas de draw), set_btts, set_handicap, total_sets, total_games. ❌ Interdit : btts, over_under buts, scorer, ht_*.
🏀 BASKET — marchés autorisés : 1x2 (pas de draw), total_points, handicap (points), team_points, quarter_winner. ❌ Interdit : btts, over_under buts, scorer, ht_ft.
⚽ FOOTBALL — marchés classiques (1x2, double_chance, ht_1x2, ht_ft, over_under, btts, handicap, team_goals, first_half_goals, scorer, combo).

Probabilités 35-92, cotes 1.20-6.50. UN seul pari par match. Réponds via propose_bets uniquement.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "propose_bets",
    description: "Retourne EXACTEMENT 1 pari par match (le plus solide).",
    parameters: {
      type: "object",
      properties: {
        predictions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              matchId: { type: "string" },
              market: { type: "string" },
              option: { type: "string" },
              label: { type: "string" },
              odds: { type: "number" },
              probability: { type: "number" },
              reasoning: { type: "string" },
              highConfidence: { type: "boolean" },
              luckFactor: { type: "number" },
            },
            required: ["matchId", "market", "option", "label", "odds", "probability", "reasoning"],
          },
        },
      },
      required: ["predictions"],
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

interface InputMatch {
  id: string;
  teamA: string;
  teamB: string;
  league?: string;
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

function fallback(m: InputMatch) {
  const o = m.realOdds || {};
  const home = o.bestHome ?? o.home ?? 2.2;
  const draw = o.bestDraw ?? o.draw ?? 3.3;
  const away = o.bestAway ?? o.away ?? 3.2;
  const inv = [1 / home, 1 / draw, 1 / away];
  const s = inv[0] + inv[1] + inv[2];
  const p = inv.map((v) => v / s);
  const favIdx = p.indexOf(Math.max(...p));
  const favKey = (["home", "draw", "away"] as const)[favIdx];
  const favOdd = [home, draw, away][favIdx];
  const favLabel =
    favKey === "home" ? `${m.teamA} gagne` : favKey === "away" ? `${m.teamB} gagne` : "Match nul";
  const favProb = Math.round(p[favIdx] * 100);
  const dcProb = Math.min(
    92,
    Math.round((favKey === "home" ? p[0] + p[1] : favKey === "away" ? p[2] + p[1] : p[0] + p[2]) * 100),
  );
  const dcOdd = Number((1 / (dcProb / 100) / 1.05).toFixed(2));
  const base = `${m.teamA} vs ${m.teamB}`;
  const bm = o.bookmakers?.[0] ?? null;
  const hasRealOdds = !!o.home;
  const candidates = [
    {
      matchId: m.id,
      match: base,
      type: "1N2",
      market: "1x2",
      option: favKey,
      label: favLabel,
      odds: favOdd,
      probability: favProb,
      confidence: favProb,
      highConfidence: favProb >= 65,
      valueScore: favProb / (100 / favOdd),
      reasoning: `Favori statistique ${favProb}%.`,
      hasRealOdds,
      bookmaker: bm,
      luckFactor: 25,
    },
    {
      matchId: m.id,
      match: base,
      type: "Double chance",
      market: "double_chance",
      option: favKey === "home" ? "1X" : favKey === "away" ? "X2" : "12",
      label:
        favKey === "home"
          ? `${m.teamA} ou Nul`
          : favKey === "away"
            ? `Nul ou ${m.teamB}`
            : "1 ou 2",
      odds: dcOdd,
      probability: dcProb,
      confidence: dcProb,
      highConfidence: dcProb >= 70,
      valueScore: dcProb / (100 / dcOdd),
      reasoning: `Couverture prudente ${dcProb}%.`,
      hasRealOdds,
      bookmaker: bm,
      luckFactor: 10,
    },
  ];
  candidates.sort(
    (a, b) =>
      (b.confidence ?? b.probability) * Math.max(1, b.valueScore) -
      (a.confidence ?? a.probability) * Math.max(1, a.valueScore),
  );
  return [candidates[0]];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const matches: InputMatch[] = Array.isArray(body?.matches) ? body.matches : [];
    if (!matches.length) {
      return new Response(JSON.stringify({ predictions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ predictions: matches.flatMap(fallback) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Analyse ces ${matches.length} match(s). Pour CHACUN propose UN SEUL pari (le plus solide).

${matches
  .map((m, i) => {
    const o = m.realOdds || {};
    const cotes =
      o.home || o.draw || o.away
        ? ` | cotes 1=${o.bestHome ?? o.home} N=${o.bestDraw ?? o.draw} 2=${o.bestAway ?? o.away}`
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45_000);
    const aiResp = await fetch(LOVABLE_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "propose_bets" } },
      }),
    }).catch((e) => {
      console.warn("AI fetch failed/timeout:", e);
      return null as Response | null;
    });
    clearTimeout(timeoutId);

    if (!aiResp || !aiResp.ok) {
      if (aiResp) {
        const txt = await aiResp.text().catch(() => "");
        console.warn("AI gateway error", aiResp.status, txt);
      }
      return new Response(
        JSON.stringify({ predictions: matches.flatMap(fallback), _aiFallback: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: { predictions?: Array<Record<string, unknown>> } = {};
    if (toolCall?.function?.arguments) {
      try {
        parsed = JSON.parse(toolCall.function.arguments);
      } catch {
        parsed = {};
      }
    }

    const byId = new Map(matches.map((m) => [m.id, m]));
    const predictions = (parsed.predictions ?? [])
      .map((p) => {
        const m = byId.get(String(p.matchId));
        if (!m) return null;
        const odds = Math.max(1.2, Math.min(15, Number(p.odds) || 2.0));
        const probability = Math.max(30, Math.min(92, Number(p.probability) || 55));
        const market = String(p.market || "1x2");
        const valueScore = probability / (100 / odds);
        return {
          matchId: m.id,
          match: `${m.teamA} vs ${m.teamB}`,
          type: MARKET_TO_TYPE[market] || "Pari",
          market,
          option: String(p.option || "home"),
          label: String(p.label || p.option || "—"),
          odds,
          probability,
          confidence: probability,
          highConfidence: Boolean(p.highConfidence) || (probability >= 65 && valueScore >= 1),
          valueScore,
          reasoning: String(p.reasoning || ""),
          hasRealOdds: !!m.realOdds?.home,
          bookmaker: m.realOdds?.bookmakers?.[0] ?? null,
          luckFactor: typeof p.luckFactor === "number" ? p.luckFactor : 20,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    // 1 prono UNIQUE par match
    const bestByMatch = new Map<string, (typeof predictions)[number]>();
    for (const p of predictions) {
      const cur = bestByMatch.get(p.matchId);
      const score = (p.confidence ?? p.probability) * Math.max(1, p.valueScore);
      const curScore = cur ? (cur.confidence ?? cur.probability) * Math.max(1, cur.valueScore) : -1;
      if (!cur || score > curScore) bestByMatch.set(p.matchId, p);
    }
    for (const m of matches) {
      if (!bestByMatch.has(m.id)) bestByMatch.set(m.id, fallback(m)[0]);
    }
    const ordered = matches.map((m) => bestByMatch.get(m.id)!).filter(Boolean);

    return new Response(JSON.stringify({ predictions: ordered }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-matches error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
