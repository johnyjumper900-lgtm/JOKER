// localStorage keys for user-provided external API credentials.
// Stored locally and forwarded as headers to edge functions on each call.
export const USER_API_STORAGE_KEYS = {
  rapidApi: "magic_user_rapidapi_key",
  footballData: "magic_user_footballdata_key",
  odds: "magic_user_odds_key",
  apiSports: "magic_user_apisports_key",
  sportmonks: "magic_user_sportmonks_key",
  gemini: "magic_user_gemini_key",
} as const;

export interface UserApiKeys {
  rapidApi: string;
  footballData: string;
  odds: string;
  apiSports: string;
  sportmonks: string;
  gemini: string;
}

export type MagicModule = "analyze" | "calendar" | "top20" | "coach" | "global";

const empty = (): UserApiKeys => ({
  rapidApi: "",
  footballData: "",
  odds: "",
  apiSports: "",
  sportmonks: "",
  gemini: "",
});

export function getUserApiKeys(): UserApiKeys {
  if (typeof window === "undefined") return empty();
  const gemini = localStorage.getItem(USER_API_STORAGE_KEYS.gemini) ?? "";

  let extraOdds = "";
  let extraApiSports = "";
  let extraFootballData = "";
  let extraSportmonks = "";
  let extraRapid = "";

  try {
    const extrasStr =
      localStorage.getItem("magic.extraApiKeys") ||
      localStorage.getItem("magic_user_extra_api_keys");
    if (extrasStr) {
      const extras = JSON.parse(extrasStr);
      const pick = (p: string) =>
        extras.find((e: any) => e.provider === p && (e.enabled ?? true))?.key || "";
      extraOdds = pick("theOddsApi");
      extraApiSports = pick("apiFootball") || pick("apiSports");
      extraFootballData = pick("footballData");
      extraSportmonks = pick("sportmonks");
      extraRapid = pick("rapidApi") || pick("rapidApiFreeFootball");
    }
  } catch (e) {
    // ignore
  }

  return {
    rapidApi: localStorage.getItem(USER_API_STORAGE_KEYS.rapidApi) || extraRapid || "",
    footballData: localStorage.getItem(USER_API_STORAGE_KEYS.footballData) || extraFootballData || "",
    odds: localStorage.getItem(USER_API_STORAGE_KEYS.odds) || extraOdds || "",
    apiSports: localStorage.getItem(USER_API_STORAGE_KEYS.apiSports) || extraApiSports || "",
    sportmonks: localStorage.getItem(USER_API_STORAGE_KEYS.sportmonks) || extraSportmonks || "",
    gemini,
  };
}

export function setUserApiKey(field: keyof UserApiKeys, value: string) {
  if (typeof window === "undefined") return;
  const k = USER_API_STORAGE_KEYS[field];
  // Nettoie les caractères que iOS Safari peut introduire au collage
  // (espaces invisibles, guillemets typographiques, retours-chariot).
  const v = value
    .replace(/[\u2018\u2019\u201C\u201D]/g, "")
    .replace(/\s+/g, "")
    .trim();
  // Persistance permissive : on enregistre toute clé non-vide.
  // (La validation visuelle dans Settings indique si le format est OK.)
  if (v) localStorage.setItem(k, v);
  else localStorage.removeItem(k);
}

export function getGeminiKeyForModule(module: MagicModule = "global", keys = getUserApiKeys()) {
  // Tous les modules utilisent désormais la clé Gemini globale unique.
  void module;
  return keys.gemini;
}

export function getModuleApiKeys(module: MagicModule = "global") {
  const keys = getUserApiKeys();
  return {
    ...keys,
    gemini: getGeminiKeyForModule(module, keys),
    module,
    geminiModel: "gemini-2.5-flash" as const,
  };
}

// Forwarded header names — picked up by Supabase edge functions.
export const USER_KEY_HEADERS: Record<keyof UserApiKeys, string> = {
  rapidApi: "x-user-rapidapi-key",
  footballData: "x-user-footballdata-key",
  odds: "x-user-odds-key",
  apiSports: "x-user-apisports-key",
  sportmonks: "x-user-sportmonks-key",
  gemini: "x-user-gemini-key",
};

export function userKeysToHeaders(
  keys: UserApiKeys,
  module: MagicModule = "global",
): Record<string, string> {
  const h: Record<string, string> = {};
  (Object.keys(keys) as Array<keyof UserApiKeys>).forEach((k) => {
    if (keys[k]) h[USER_KEY_HEADERS[k]] = keys[k];
  });
  const moduleGeminiKey = getGeminiKeyForModule(module, keys);
  if (moduleGeminiKey) h[USER_KEY_HEADERS.gemini] = moduleGeminiKey;
  h["x-magic-module"] = module;
  h["x-gemini-model"] = "gemini-2.5-flash";
  return h;
}
