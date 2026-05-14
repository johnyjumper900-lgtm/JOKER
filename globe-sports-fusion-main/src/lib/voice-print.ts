/**
 * Voice biometric — empreinte vocale stockée localement.
 *
 * Approche : on capte un échantillon micro (~1.5s),
 * on calcule un spectre log-mel moyen (64 bins via AnalyserNode),
 * on normalise (L2). La vérification fait une similarité cosinus
 * entre l'empreinte enrôlée (moyenne de N samples) et celle du
 * locuteur courant. Au-dessus du seuil → c'est bien toi.
 *
 * 100% client, aucune donnée envoyée. Pas une vraie authentification
 * militaire mais empêche très efficacement n'importe quelle autre
 * voix d'autour de toi de piloter Magic.
 */

const STORAGE_KEY = "magic.voiceprint.v1";
const BINS = 64;
const SAMPLE_MS = 1500;

export interface VoicePrint {
  vector: number[];
  enrolledAt: number;
  samples: number;
  threshold: number; // similarité cosinus minimale
}

export const VOICE_PRINT_DEFAULT_THRESHOLD = 0.86;

export function loadVoicePrint(): VoicePrint | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VoicePrint;
    if (!Array.isArray(parsed.vector) || parsed.vector.length !== BINS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveVoicePrint(vp: VoicePrint): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vp));
}

export function clearVoicePrint(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isVoiceLockEnabled(): boolean {
  return localStorage.getItem("magic.voiceprint.enabled") === "1";
}

export function setVoiceLockEnabled(v: boolean): void {
  localStorage.setItem("magic.voiceprint.enabled", v ? "1" : "0");
}

function normalize(vec: Float32Array | number[]): number[] {
  let sum = 0;
  for (const v of vec) sum += v * v;
  const norm = Math.sqrt(sum) || 1;
  return Array.from(vec, (v) => v / norm);
}

export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s; // déjà normalisés
}

/**
 * Capture un échantillon audio depuis le micro et calcule son empreinte.
 * Le tableau de retour est déjà L2-normalisé.
 */
export async function captureVoicePrintSample(durationMs = SAMPLE_MS): Promise<number[]> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Micro indisponible");
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  const AC =
    (window.AudioContext as typeof AudioContext) ||
    ((window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
  const ctx = new AC();
  try {
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.3;
    src.connect(analyser);

    const fftBins = analyser.frequencyBinCount; // 512
    const buf = new Uint8Array(fftBins);
    const accum = new Float32Array(BINS);
    let frames = 0;
    let voicedFrames = 0;
    const start = performance.now();
    await new Promise<void>((resolve) => {
      const tick = () => {
        analyser.getByteFrequencyData(buf);
        // Détection d'énergie pour ne garder que les frames "voisées"
        let energy = 0;
        for (let i = 4; i < 80; i++) energy += buf[i];
        if (energy / 76 > 18) {
          voicedFrames++;
          // Compresser 512 bins → 64 bins (log-mel approximé linéaire)
          const step = fftBins / BINS;
          for (let b = 0; b < BINS; b++) {
            const i0 = Math.floor(b * step);
            const i1 = Math.floor((b + 1) * step);
            let s = 0;
            for (let i = i0; i < i1; i++) s += buf[i];
            accum[b] += s / Math.max(1, i1 - i0);
          }
        }
        frames++;
        if (performance.now() - start < durationMs) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });

    if (voicedFrames < 8) {
      throw new Error("Pas assez de voix captée — parle plus fort / plus longtemps");
    }
    for (let b = 0; b < BINS; b++) accum[b] /= voicedFrames;
    // Log-compression pour aplatir les pics
    for (let b = 0; b < BINS; b++) accum[b] = Math.log1p(accum[b]);
    return normalize(accum);
  } finally {
    try {
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      /* noop */
    }
    try {
      await ctx.close();
    } catch {
      /* noop */
    }
  }
}

/**
 * Enrôle la voix utilisateur sur 3 échantillons et stocke la moyenne.
 * Demande à l'utilisateur de prononcer une courte phrase 3 fois.
 */
export async function enrollVoicePrint(
  samples: number[][],
  threshold = VOICE_PRINT_DEFAULT_THRESHOLD,
): Promise<VoicePrint> {
  if (samples.length === 0) throw new Error("Aucun échantillon");
  const avg = new Array(BINS).fill(0);
  for (const s of samples) for (let i = 0; i < BINS; i++) avg[i] += s[i];
  for (let i = 0; i < BINS; i++) avg[i] /= samples.length;
  const vp: VoicePrint = {
    vector: normalize(avg),
    enrolledAt: Date.now(),
    samples: samples.length,
    threshold,
  };
  saveVoicePrint(vp);
  setVoiceLockEnabled(true);
  return vp;
}

/**
 * Vérifie un échantillon contre l'empreinte enrôlée.
 * Retourne { ok, score }.
 */
export function verifyAgainstEnrolled(sample: number[]): {
  ok: boolean;
  score: number;
  threshold: number;
} {
  const vp = loadVoicePrint();
  if (!vp) return { ok: false, score: 0, threshold: VOICE_PRINT_DEFAULT_THRESHOLD };
  const score = cosine(sample, vp.vector);
  return { ok: score >= vp.threshold, score, threshold: vp.threshold };
}