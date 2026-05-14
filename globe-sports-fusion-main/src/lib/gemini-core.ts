/**
 * Gemini Core — passerelle unique pour TOUS les modules Magic.
 *
 * Tous les modules (analyse, Top 20, tickets, coach, calendrier) appellent
 * Gemini via ce fichier. Une seule clé est utilisée (celle saisie dans
 * Réglages → "Google Gemini API"). Cette clé est également synchronisée
 * automatiquement vers `cotes-engine` (LS_GEMINI_KEY) via {@link syncGeminiKeys}.
 */

import { getUserApiKeys, setUserApiKey } from "./user-api-keys";

// Modèle Flash par défaut pour tous les modules (rapide + économique).
// Le Coach utilise un modèle Pro (3.1) pour des réponses plus intelligentes.
const GEMINI_MODEL_DEFAULT = "gemini-2.5-flash";
export const GEMINI_MODEL_COACH = "gemini-3.1-pro-preview";
const COTES_ENGINE_GEMINI_KEY = "cotes-engine.geminiKey";
const COTES_ENGINE_FOOTBALL_KEY = "cotes-engine.footballKey";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Garantit que la clé Gemini saisie dans Réglages est aussi disponible
 * pour `cotes-engine` (et inversement). À appeler au boot de l'app et
 * après chaque sauvegarde de clé.
 */
export function syncGeminiKeys(): void {
  if (typeof window === "undefined") return;
  try {
    const userGemini = getUserApiKeys().gemini;
    const cotesGemini = localStorage.getItem(COTES_ENGINE_GEMINI_KEY) ?? "";
    if (userGemini && userGemini !== cotesGemini) {
      localStorage.setItem(COTES_ENGINE_GEMINI_KEY, userGemini);
    } else if (!userGemini && cotesGemini) {
      // L'utilisateur a saisi une clé via /settings (cotes-engine) → on la propage
      setUserApiKey("gemini", cotesGemini);
    }
    // Idem pour la clé API-Football : `apiSports` ↔ `cotes-engine.footballKey`
    const userFootball = getUserApiKeys().apiSports;
    const cotesFootball = localStorage.getItem(COTES_ENGINE_FOOTBALL_KEY) ?? "";
    if (userFootball && userFootball !== cotesFootball) {
      localStorage.setItem(COTES_ENGINE_FOOTBALL_KEY, userFootball);
    } else if (!userFootball && cotesFootball) {
      setUserApiKey("apiSports", cotesFootball);
    }
  } catch {
    /* noop */
  }
}

/** Format attendu d'une clé Google AI Studio (Gemini). */
const GEMINI_KEY_REGEX = /^AIza[0-9A-Za-z_-]{30,}$/;

export function isValidGeminiKey(k: string): boolean {
  return GEMINI_KEY_REGEX.test(k.trim());
}

export function getActiveGeminiKey(): string {
  syncGeminiKeys();
  const k = getUserApiKeys().gemini.trim();
  if (!k) return "";
  if (!isValidGeminiKey(k)) {
    // Clé corrompue (ex: texte d'erreur enregistré par accident) → on purge
    try {
      setUserApiKey("gemini", "");
      if (typeof window !== "undefined") {
        localStorage.removeItem("cotes-engine.geminiKey");
      }
    } catch {
      /* noop */
    }
    return "";
  }
  return k;
}

export class GeminiUnavailableError extends Error {
  constructor() {
    super(
      "Aucune clé IA configurée. Va dans Réglages → Google Gemini API.",
    );
    this.name = "GeminiUnavailableError";
  }
}

interface AskOptionsBase {
  systemInstruction?: string;
  enableSearch?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
  model?: string;
  topP?: number;
}


/* eslint-disable @typescript-eslint/no-explicit-any */

export type AskOptions = AskOptionsBase;

export interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: unknown };
}

export interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

export interface GeminiToolDeclaration {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

/**
 * Appel bas-niveau — renvoie la réponse brute Gemini (utile pour le coach,
 * l'agent avec function-calling, ou les prompts multimodaux).
 */
export async function callGeminiRaw(
  contents: GeminiContent[],
  opts: AskOptions & {
    tools?: GeminiToolDeclaration[];
    toolMode?: "AUTO" | "ANY" | "NONE";
  } = {},
): Promise<any> {
  const key = getActiveGeminiKey();
  if (!key) throw new GeminiUnavailableError();
  const model = opts.model ?? GEMINI_MODEL_DEFAULT;
  const body: any = {
    contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      maxOutputTokens: opts.maxOutputTokens ?? 4096,
      ...(opts.topP !== undefined ? { topP: opts.topP } : {}),
    },
  };
  if (opts.systemInstruction) {
    body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
  }
  const toolsArr: any[] = [];
  if (opts.enableSearch) toolsArr.push({ googleSearch: {} });
  if (opts.tools?.length) toolsArr.push({ functionDeclarations: opts.tools });
  if (toolsArr.length) body.tools = toolsArr;
  if (opts.toolMode) {
    body.toolConfig = { functionCallingConfig: { mode: opts.toolMode } };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) {
      throw new Error("Clé Gemini refusée (401/403). Vérifie la clé dans Réglages.");
    }
    if (res.status === 429) throw new Error("Quota Gemini atteint (429). Réessaye plus tard.");
    throw new Error(`Gemini HTTP ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

export function extractTextFromGeminiResponse(json: any): string {
  return (
    json?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text ?? "")
      .join("")
      ?.trim() ?? ""
  );
}

/**
 * Analyse multimodale (image/PDF) — utilisée par l'import de tickets.
 */
export async function askGeminiMultimodal(
  prompt: string,
  file: { base64: string; mimeType: string },
  opts: AskOptions & { json?: boolean } = {},
): Promise<string> {
  const key = getActiveGeminiKey();
  if (!key) throw new GeminiUnavailableError();
  const model = opts.model ?? GEMINI_MODEL_DEFAULT;
  const body: any = {
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: file.mimeType, data: file.base64 } },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      temperature: opts.temperature ?? 0.2,
      maxOutputTokens: opts.maxOutputTokens ?? 4096,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (opts.systemInstruction) {
    body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
  }
  if (opts.enableSearch) body.tools = [{ googleSearch: {} }];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Gemini HTTP ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = await res.json();
  const text = extractTextFromGeminiResponse(json);
  if (!text) throw new Error("Gemini n'a renvoyé aucun contenu.");
  return text;
}

/**
 * Fallback via Lovable AI Gateway (sans clé Gemini perso requise).
 */
async function askLovableFallback(
  prompt: string,
  opts: AskOptions & { json?: boolean } = {},
): Promise<string> {
  const res = await fetch("/api/public/ai-fallback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      system: opts.systemInstruction,
      json: opts.json,
      temperature: opts.temperature,
      maxOutputTokens: opts.maxOutputTokens,
    }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(`Lovable AI fallback: ${(j as any)?.error ?? res.status}`);
  }
  const j = (await res.json()) as { text?: string };
  if (!j.text) throw new Error("Lovable AI: réponse vide.");
  return j.text;
}

/**
 * Appel direct Gemini, retourne le texte brut.
 */
export async function askGemini(prompt: string, opts: AskOptions = {}): Promise<string> {
  const key = getActiveGeminiKey();
  if (!key) {
    // Pas de clé perso → fallback Lovable AI Gateway
    return askLovableFallback(prompt, opts);
  }
  const model = opts.model ?? GEMINI_MODEL_DEFAULT;
  const body: any = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      maxOutputTokens: opts.maxOutputTokens ?? 4096,
    },
  };
  if (opts.systemInstruction) {
    body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
  }
  if (opts.enableSearch) body.tools = [{ googleSearch: {} }];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    if (res.status === 429 || res.status === 401 || res.status === 403) {
      // Quota ou clé refusée → fallback transparent
      try {
        return await askLovableFallback(prompt, opts);
      } catch {
        /* on retombe sur l'erreur d'origine */
      }
    }
    throw new Error(`Gemini HTTP ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = await res.json();
  const text =
    json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("") ?? "";
  if (!text) throw new Error("Gemini n'a renvoyé aucun contenu.");
  return text;
}

/**
 * Appel Gemini avec parsing JSON automatique. Idéal pour l'analyse,
 * le Top 20, et toute extraction structurée.
 */
export async function askGeminiJson<T = any>(
  prompt: string,
  opts: AskOptions = {},
): Promise<T> {
  const key = getActiveGeminiKey();
  if (!key) {
    throw new GeminiUnavailableError();
  }
  const model = opts.model ?? GEMINI_MODEL_DEFAULT;
  const body: any = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      // Gemini refuse responseMimeType=json quand un tool (googleSearch) est actif.
      ...(opts.enableSearch ? {} : { responseMimeType: "application/json" }),
      temperature: opts.temperature ?? 0.2,
      maxOutputTokens: opts.maxOutputTokens ?? 4096,
    },
  };
  if (opts.systemInstruction) {
    body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
  }
  if (opts.enableSearch) body.tools = [{ googleSearch: {} }];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Gemini HTTP ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = await res.json();
  const text =
    json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("") ?? "";
  if (!text) throw new Error("Gemini n'a renvoyé aucun contenu.");
  return parseJsonLoose<T>(text);
}

function parseJsonLoose<T = any>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const arr = cleaned.indexOf("[");
    const open = start >= 0 && (arr < 0 || start < arr) ? start : arr;
    const closeChar = open === start ? "}" : "]";
    const end = cleaned.lastIndexOf(closeChar);
    if (open >= 0 && end > open) return JSON.parse(cleaned.slice(open, end + 1)) as T;
    throw new Error("Réponse IA non JSON.");
  }
}
