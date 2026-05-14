import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CachePayload = {
  matches?: Array<Record<string, unknown>>;
  odds?: Array<Record<string, unknown>>;
};

const MAX_ROWS = 1_500;

function validMatch(row: Record<string, unknown>) {
  return (
    typeof row.match_key === "string" &&
    typeof row.home_team === "string" &&
    typeof row.away_team === "string" &&
    typeof row.commence_time === "string"
  );
}

function validOdd(row: Record<string, unknown>) {
  return (
    typeof row.match_key === "string" &&
    typeof row.home_team === "string" &&
    typeof row.away_team === "string"
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as CachePayload;
    const matches = (Array.isArray(body.matches) ? body.matches : []).filter(validMatch).slice(0, MAX_ROWS);
    const odds = (Array.isArray(body.odds) ? body.odds : []).filter(validOdd).slice(0, MAX_ROWS);

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) throw new Error("Backend cache credentials missing");

    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let matchCount = 0;
    let oddsCount = 0;
    const started = Date.now();

    for (let i = 0; i < matches.length; i += 200) {
      const part = matches.slice(i, i + 200);
      const { error } = await supabase.from("matches_cache").upsert(part, { onConflict: "match_key" });
      if (error) throw error;
      matchCount += part.length;
    }

    for (let i = 0; i < odds.length; i += 200) {
      const part = odds.slice(i, i + 200);
      const { error } = await supabase.from("odds_cache").upsert(part, { onConflict: "match_key" });
      if (error) throw error;
      oddsCount += part.length;
    }

    await supabase.from("sync_log").insert({
      job: "upsert-cache",
      status: "success",
      items_added: matchCount,
      items_updated: oddsCount,
      message: "Cache API-Football synchronisé",
      duration_ms: Date.now() - started,
      finished_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ ok: true, matches: matchCount, odds: oddsCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("upsert-cache error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});