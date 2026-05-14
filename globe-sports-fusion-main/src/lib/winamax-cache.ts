// Cache mémoire client partagé pour le payload Winamax.
// Persiste pendant toute la session de navigation (entre les onglets) et
// se vide uniquement lors d'un rechargement complet de la page.
import type { WinaPayload } from "@/server-api/winamax";

let cached: WinaPayload | null = null;

export function getWinaCache(): WinaPayload | null {
  return cached;
}

export function setWinaCache(payload: WinaPayload | null) {
  cached = payload;
}
