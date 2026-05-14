/**
 * Persistance robuste iPhone/PWA — miroir IndexedDB pour les valeurs critiques
 * (clé Gemini, profils, etc.).
 *
 * Pourquoi ?
 * iOS Safari applique l'ITP : le `localStorage` peut être purgé après ~7 jours
 * sans interaction si l'utilisateur n'a pas ajouté l'app à l'écran d'accueil.
 * IndexedDB n'est PAS soumis à cette purge (sauf si Safari est nettoyé
 * manuellement). On stocke donc en double et on restaure au boot.
 *
 * Plus : on tente `navigator.storage.persist()` pour demander à Safari de
 * conserver les données.
 */

const DB_NAME = "magic-persistent";
const STORE = "kv";
const VERSION = 1;

const MIRRORED_KEYS = [
  "magic_user_gemini_key",
  "magic_user_rapidapi_key",
  "magic_user_footballdata_key",
  "magic_user_odds_key",
  "magic_user_apisports_key",
  "magic_user_sportmonks_key",
  "magic_user_elevenlabs_key",
  "magic.extraApiKeys",
  "magic_user_extra_api_keys",
  "magic.creator.name",
  "magic.user.profile.v1",
  "cotes-engine.geminiKey",
  "cotes-engine.footballKey",
];

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    try {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbSet(key: string, value: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

async function idbGet(key: string): Promise<string | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as string) ?? null);
    req.onerror = () => resolve(null);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

/** Mirror a localStorage key to IndexedDB. */
export function mirrorToPersistent(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  if (value && value.length > 0) {
    void idbSet(key, value);
  } else {
    void idbDelete(key);
  }
}

/**
 * À appeler au boot : restaure dans `localStorage` les valeurs miroitées
 * dans IndexedDB qui auraient été purgées par Safari/ITP. N'écrase jamais
 * une valeur déjà présente dans `localStorage`.
 */
export async function restorePersistentKeys(): Promise<{ restored: string[] }> {
  const restored: string[] = [];
  if (typeof window === "undefined") return { restored };
  // Demande à Safari de conserver les données (best-effort)
  try {
    if (navigator.storage?.persist) {
      const already = await navigator.storage.persisted?.();
      if (!already) await navigator.storage.persist();
    }
  } catch {
    /* noop */
  }
  for (const k of MIRRORED_KEYS) {
    try {
      const ls = localStorage.getItem(k);
      if (ls && ls.length > 0) {
        // Présent en LS : on synchronise vers IDB
        void idbSet(k, ls);
        continue;
      }
      const idb = await idbGet(k);
      if (idb && idb.length > 0) {
        localStorage.setItem(k, idb);
        restored.push(k);
      }
    } catch {
      /* noop */
    }
  }
  return { restored };
}

/** Patch global : intercepte `localStorage.setItem/removeItem` pour les clés
 *  miroitées et propage automatiquement vers IndexedDB. */
let patched = false;
export function installPersistenceMirror(): void {
  if (patched || typeof window === "undefined") return;
  patched = true;
  try {
    const origSet = Storage.prototype.setItem;
    const origRem = Storage.prototype.removeItem;
    Storage.prototype.setItem = function (k: string, v: string) {
      origSet.apply(this, [k, v]);
      if (this === window.localStorage && MIRRORED_KEYS.includes(k)) {
        mirrorToPersistent(k, v);
      }
    };
    Storage.prototype.removeItem = function (k: string) {
      origRem.apply(this, [k]);
      if (this === window.localStorage && MIRRORED_KEYS.includes(k)) {
        mirrorToPersistent(k, null);
      }
    };
  } catch {
    /* noop */
  }
}
