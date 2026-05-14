// Edge function: analyze-ticket
// Lit définitivement les tickets texte/photo envoyés par Magic via Lovable AI Gateway.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

type NormalizedPick = {
  match: string;
  teamA: string;
  teamB: string;
  option: string;
  type: string;
  odds: number;
};

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanJsonText(content: string) {
  return content.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
}

function splitTeams(match: string) {
  const parts = match.split(/\s+(?:vs\.?|v\.?|contre|—|–|-)\s+/i);
  return {
    teamA: (parts[0] || match || "Équipe A").trim(),
    teamB: (parts[1] || "Équipe B").trim(),
  };
}

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;
  const parsed = Number(value.replace(",", ".").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeTicket(raw: Record<string, unknown>) {
  const root = (raw.ticket && typeof raw.ticket === "object" ? raw.ticket : raw) as Record<string, unknown>;
  const source = Array.isArray(root.picks)
    ? root.picks
    : Array.isArray(root.selections)
      ? root.selections
      : [];

  const picks: NormalizedPick[] = source
    .map((item) => {
      const pick = (item ?? {}) as Record<string, unknown>;
      const match = String(pick.match || pick.fixture || pick.event || "").trim();
      const teams = splitTeams(match);
      const odds = toNumber(pick.odds || pick.cote || pick.price);
      if (!match || !odds || odds < 1.01) return null;
      return {
        match,
        teamA: String(pick.teamA || pick.homeTeam || teams.teamA).trim(),
        teamB: String(pick.teamB || pick.awayTeam || teams.teamB).trim(),
        option: String(pick.option || pick.selection || pick.pick || "Sélection").trim(),
        type: String(pick.type || pick.market || pick.betType || "Pari").trim(),
        odds,
      } satisfies NormalizedPick;
    })
    .filter((pick): pick is NormalizedPick => pick !== null);

  return {
    bookmaker: typeof root.bookmaker === "string" ? root.bookmaker : undefined,
    stake: toNumber(root.stake || root.mise),
    totalOdds: toNumber(root.totalOdds || root.coteTotale || root.total_odds),
    picks,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const text = String(body?.text || body?.ticketText || body?.raw || "").trim();
    const fileBase64 = body?.fileBase64 || body?.imageBase64 || body?.image || body?.file;
    const mimeType = String(body?.mimeType || body?.contentType || "image/jpeg");
    const dataUrl = typeof fileBase64 === "string" && fileBase64.trim()
      ? fileBase64.startsWith("data:")
        ? fileBase64
        : `data:${mimeType};base64,${fileBase64}`
      : "";

    if (!text && !dataUrl) return jsonResponse({ error: "Aucun ticket à lire" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonResponse({ error: "Service IA indisponible" }, 500);

    const userContent: Array<Record<string, unknown>> = [
      {
        type: "text",
        text:
          "Lis le ticket de pari sportif fourni. Tu dois extraire tous les paris visibles, même si la photo est inclinée, sombre, partiellement floue ou contient plusieurs colonnes. " +
          "Réponds uniquement avec ce JSON STRICT, sans markdown: " +
          '{"bookmaker":string|null,"stake":number|null,"totalOdds":number|null,"picks":[{"match":string,"teamA":string,"teamB":string,"type":string,"option":string,"odds":number}]}. ' +
          "Normalise les cotes en nombre décimal, sépare les équipes, et n'invente pas de pari invisible. Texte collé si présent:\n" +
          text,
      },
    ];

    if (dataUrl) {
      userContent.push({ type: "image_url", image_url: { url: dataUrl } });
    }

    const aiResp = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: dataUrl ? "google/gemini-2.5-flash" : "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Tu es un OCR expert de tickets de paris sportifs. Tu réponds uniquement en JSON valide." },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      return jsonResponse({ error: `Lecture IA impossible (${aiResp.status})`, details: txt.slice(0, 300) }, 502);
    }

    const aiJson = await aiResp.json();
    const content = cleanJsonText(aiJson?.choices?.[0]?.message?.content || "{}");
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { raw: content };
    }

    return jsonResponse(normalizeTicket(parsed));
  } catch (e) {
    console.error("analyze-ticket error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
