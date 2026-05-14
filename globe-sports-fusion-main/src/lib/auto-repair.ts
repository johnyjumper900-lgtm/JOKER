/**
 * auto-repair.ts — Système d'auto-réparation pour les appels Magic.
 *
 * Détecte les erreurs typiques (clé absente / invalide / quota / réseau / 5xx),
 * tente de réparer automatiquement (re-vérification des clés stockées,
 * re-routage vers le bon slot, retry avec backoff), et expose un diagnostic
 * lisible pour l'UI (toast / banner).
 */

import { invokeFn } from "./api";
import { getUserApiKeys } from "./user-api-keys";
import {
  getExtraKeys,
  resolveAndVerify,
  isSeededKey,
  updateExtraKey,
  type ExtraProvider,
} from "./extra-api-keys";
import { toast } from "sonner";

export type RepairCategory =
  | "no-key"
  | "key-invalid"
  | "quota"
  | "rate-limit"
  | "network"
  | "server"
  | "timeout"
  | "unknown";

export interface RepairDiagnostic {
  category: RepairCategory;
  message: string;
  /** Tentatives effectuées par le système d'auto-réparation */
  steps: string[];
  /** Action concrète recommandée à l'utilisateur si la réparation échoue */
  recommendation?: string;
}

const RAPID_QUOTA = /quota|exceed|too many|429/i;
const RATE_LIMIT = /429|rate.?limit/i;
const KEY_INVALID = /401|403|unauthor|invalid.*key|api.?key|forbidden/i;
const NO_KEY = /missing.*key|no.*key|not provided/i;
const TIMEOUT = /timeout|timed out|aborted/i;
const NETWORK = /network|failed to fetch|cors|dns|fetch failed/i;
const SERVER_5XX = /500|502|503|504|gateway|internal/i;

function classify(message: string): RepairCategory {
  if (NO_KEY.test(message)) return "no-key";
  if (KEY_INVALID.test(message)) return "key-invalid";
  if (RAPID_QUOTA.test(message) && !RATE_LIMIT.test(message)) return "quota";
  if (RATE_LIMIT.test(message)) return "rate-limit";
  if (TIMEOUT.test(message)) return "timeout";
  if (SERVER_5XX.test(message)) return "server";
  if (NETWORK.test(message)) return "network";
  return "unknown";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Réessaie de revalider toutes les clés extra stockées et resynchronise
 * leur slot. Renvoie le nombre de clés re-promues.
 */
async function reverifyStoredKeys(): Promise<number> {
  let promoted = 0;
  const list = getExtraKeys();
  for (const entry of list) {
    if (entry.enabled === false) continue;
    if (!entry.key) continue;
    try {
      if (isSeededKey(entry.key)) {
        updateExtraKey(entry.id, { valid: true, message: entry.message || "Pré-configurée" });
        promoted += 1;
        continue;
      }
      const res = await resolveAndVerify(entry.key);
      if (res.result.valid) promoted += 1;
    } catch {
      /* noop */
    }
  }
  return promoted;
}

interface RunOpts<T> {
  /** Nom convivial pour les logs ("Calendrier", "Top 20", …) */
  label: string;
  /** Nombre maximum de tentatives (1ère + retries). Défaut : 3 */
  maxAttempts?: number;
  /** Affiche les toasts de diagnostic. Défaut : true */
  notify?: boolean;
  /** Provider exigé (ex: "theOddsApi") — si la clé est absente, on stoppe avec no-key */
  requiredProviders?: ExtraProvider[];
  /** Callback diagnostic (pour bandeau in-UI) */
  onDiagnostic?: (d: RepairDiagnostic) => void;
  /** Appel réel — peut lever ou renvoyer { data, error } façon invokeFn */
  call: () => Promise<{ data: T | null; error: Error | null }>;
}

export async function runWithAutoRepair<T>(
  opts: RunOpts<T>,
): Promise<{ data: T | null; error: Error | null; diagnostic?: RepairDiagnostic }> {
  const max = opts.maxAttempts ?? 3;
  const steps: string[] = [];
  let lastError: Error | null = null;
  let lastData: T | null = null;

  // Vérification préalable des providers requis (best-effort, jamais bloquant)
  if (opts.requiredProviders?.length) {
    const userKeys = getUserApiKeys();
    const slotMap: Record<string, keyof typeof userKeys> = {
      theOddsApi: "odds",
      footballData: "footballData",
      apiFootball: "apiSports",
      apiSports: "apiSports",
      gemini: "gemini",
      rapidApi: "rapidApi",
    };
    const missing = opts.requiredProviders.filter((p) => {
      const slot = slotMap[p];
      return slot && !userKeys[slot];
    });
    if (missing.length) {
      steps.push(`Clé absente pour ${missing.join(", ")} — tentative de re-promotion`);
      const promoted = await reverifyStoredKeys();
      if (promoted) steps.push(`${promoted} clé(s) re-promue(s)`);
    }
  }

  for (let attempt = 1; attempt <= max; attempt++) {
    let res: { data: T | null; error: Error | null };
    try {
      res = await opts.call();
    } catch (e) {
      res = {
        data: null,
        error: e instanceof Error ? e : new Error("Erreur inconnue"),
      };
    }
    lastData = res.data;
    lastError = res.error;
    if (!res.error) {
      if (attempt > 1) {
        steps.push(`Réparation réussie au coup ${attempt}`);
        if (opts.notify !== false) {
          toast.success(`${opts.label} réparé automatiquement`);
        }
      }
      return { data: res.data, error: null };
    }

    const cat = classify(res.error.message);
    steps.push(`Tentative ${attempt} → ${cat} (${res.error.message})`);

    // Réparation selon la catégorie
    if (cat === "key-invalid" || cat === "no-key") {
      steps.push("Re-vérification des clés stockées");
      const promoted = await reverifyStoredKeys();
      steps.push(`${promoted} clé(s) re-promue(s)`);
      // Si rien à promouvoir et qu'on est déjà au dernier essai → stop
      if (promoted === 0 && attempt === max) break;
      await sleep(300);
      continue;
    }
    if (cat === "rate-limit" || cat === "quota") {
      // backoff exponentiel
      await sleep(1000 * Math.pow(2, attempt - 1));
      continue;
    }
    if (cat === "server" || cat === "network" || cat === "timeout") {
      await sleep(600 * attempt);
      continue;
    }
    // unknown → un petit retry suffit
    await sleep(400);
  }

  const cat = lastError ? classify(lastError.message) : "unknown";
  const diag: RepairDiagnostic = {
    category: cat,
    message: lastError?.message ?? "Erreur inconnue",
    steps,
    recommendation: recommendationFor(cat),
  };
  opts.onDiagnostic?.(diag);
  if (opts.notify !== false) {
    toast.error(`${opts.label} : ${diag.message}`, {
      description: diag.recommendation,
      duration: 6000,
    });
  }
  return { data: lastData, error: lastError, diagnostic: diag };
}

function recommendationFor(cat: RepairCategory): string {
  switch (cat) {
    case "no-key":
      return "Ajoute une clé API valide dans Réglages → Clés API.";
    case "key-invalid":
      return "Une clé API a été refusée. Re-vérifie-la dans Réglages.";
    case "quota":
      return "Quota dépassé sur l'un des providers. Réessaie plus tard ou ajoute une clé alternative.";
    case "rate-limit":
      return "Trop de requêtes — pause de quelques secondes recommandée.";
    case "timeout":
      return "Le serveur met trop de temps à répondre. Réessaie dans un instant.";
    case "server":
      return "Le service distant est temporairement indisponible.";
    case "network":
      return "Vérifie ta connexion internet.";
    default:
      return "Réessaie ou consulte la console pour plus d'infos.";
  }
}

/** Helper raccourci — wrappe un appel invokeFn standard. */
export function repairedInvoke<T>(
  fnName: string,
  body: unknown,
  meta: Omit<RunOpts<T>, "call"> = { label: fnName },
) {
  return runWithAutoRepair<T>({
    ...meta,
    call: () => invokeFn<T>(fnName, { body }),
  });
}
