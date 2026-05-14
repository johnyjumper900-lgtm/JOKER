/**
 * Lecture vocale via ElevenLabs (clé personnelle de l'utilisateur stockée en
 * localStorage par le module extra-api-keys). Si aucune clé activée n'est
 * disponible ou que l'API échoue, on retombe sur `speechSynthesis` natif.
 */
import { getExtraKeys } from "./extra-api-keys";

// Voix masculine française par défaut — "George" (multilingue v2 capable de FR).
// L'utilisateur peut surcharger via localStorage("magic.elevenlabs.voiceId").
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const VOICE_ID_STORAGE = "magic.elevenlabs.voiceId";

let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;

function getElevenKey(): string | null {
  try {
    const all = getExtraKeys?.() ?? [];
    const k = all.find(
      (x: any) => x.provider === "elevenlabs" && x.enabled !== false && x.key,
    );
    return k?.key ?? null;
  } catch {
    return null;
  }
}

function getVoiceId(): string {
  try {
    return localStorage.getItem(VOICE_ID_STORAGE) || DEFAULT_VOICE_ID;
  } catch {
    return DEFAULT_VOICE_ID;
  }
}

export function setElevenLabsVoice(voiceId: string) {
  try {
    localStorage.setItem(VOICE_ID_STORAGE, voiceId);
  } catch {
    /* noop */
  }
}

export function stopElevenLabsSpeak() {
  try {
    currentAudio?.pause();
    currentAudio = null;
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }
  } catch {
    /* noop */
  }
}

export type ElevenLabsTtsResult =
  | { ok: true }
  | { ok: false; reason: "no-key" | "quota" | "auth" | "voice" | "network"; message: string };

/**
 * Lit `text` avec la voix ElevenLabs de l'utilisateur. Retourne un objet
 * détaillé pour permettre des messages d'erreur précis.
 */
export async function speakWithElevenLabsDetailed(text: string): Promise<ElevenLabsTtsResult> {
  const clean = text.replace(/[*_`#>~]/g, "").replace(/\s+/g, " ").trim();
  if (!clean) return { ok: false, reason: "no-key", message: "Texte vide." };
  const apiKey = getElevenKey();
  if (!apiKey) return { ok: false, reason: "no-key", message: "Aucune clé ElevenLabs activée." };

  try {
    stopElevenLabsSpeak();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    const voiceId = getVoiceId();
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: clean,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.35,
            use_speaker_boost: true,
            speed: 1.0,
          },
        }),
      },
    );

    if (!res.ok) {
      const bodyTxt = await res.text().catch(() => "");
      console.warn("[ElevenLabs] TTS HTTP", res.status, bodyTxt);
      // ElevenLabs renvoie 401 même quand la clé est valide mais que le quota
      // est épuisé ou qu'il manque une permission. On démêle ici.
      if (/quota_exceeded/i.test(bodyTxt)) {
        return {
          ok: false,
          reason: "quota",
          message: "Quota ElevenLabs épuisé (0 crédits restants). Recharge ton compte sur elevenlabs.io.",
        };
      }
      if (/missing_permissions/i.test(bodyTxt)) {
        return {
          ok: false,
          reason: "auth",
          message: "Cette clé ElevenLabs n'a pas la permission text_to_speech. Crée une clé avec ce scope.",
        };
      }
      if (/voice_not_found|voice_id/i.test(bodyTxt)) {
        return {
          ok: false,
          reason: "voice",
          message: "Voice ID introuvable sur ce compte ElevenLabs.",
        };
      }
      if (res.status === 401 || res.status === 403) {
        return { ok: false, reason: "auth", message: "Clé ElevenLabs refusée (401/403)." };
      }
      return { ok: false, reason: "network", message: `ElevenLabs HTTP ${res.status}` };
    }

    const blob = await res.blob();
    if (!blob.size) return { ok: false, reason: "network", message: "Réponse audio vide." };

    const url = URL.createObjectURL(blob);
    currentObjectUrl = url;
    const audio = new Audio(url);
    currentAudio = audio;
    audio.onended = () => {
      if (currentObjectUrl === url) {
        URL.revokeObjectURL(url);
        currentObjectUrl = null;
      }
      if (currentAudio === audio) currentAudio = null;
    };
    audio.onerror = () => {
      if (currentObjectUrl === url) {
        URL.revokeObjectURL(url);
        currentObjectUrl = null;
      }
      if (currentAudio === audio) currentAudio = null;
    };
    await audio.play();
    return { ok: true };
  } catch (e) {
    console.warn("[ElevenLabs] TTS failed:", e);
    return {
      ok: false,
      reason: "network",
      message: e instanceof Error ? e.message : "Erreur réseau ElevenLabs.",
    };
  }
}

/**
 * Compatibilité : retourne true si la lecture a réussi à démarrer.
 */
export async function speakWithElevenLabs(text: string): Promise<boolean> {
  const r = await speakWithElevenLabsDetailed(text);
  return r.ok;
}
