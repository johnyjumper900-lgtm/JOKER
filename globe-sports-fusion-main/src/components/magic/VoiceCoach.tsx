import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Mic, MicOff, ImageIcon, FileUp, Loader2, Volume2, Sparkles } from "lucide-react";
import type { Prediction } from "@/types/magic";
import { toast } from "sonner";
import { HoloCard } from "./HoloCard";
import { CoachAnalysisScene, type CoachScene } from "./CoachAnalysisScene";
import { CoachStarwarsStage } from "./CoachStarwarsStage";
import { askGemini, GeminiUnavailableError, GEMINI_MODEL_COACH } from "@/lib/gemini-core";
import {
  captureVoicePrintSample,
  isVoiceLockEnabled,
  loadVoicePrint,
  verifyAgainstEnrolled,
} from "@/lib/voice-print";

/* eslint-disable @typescript-eslint/no-explicit-any */

type SpeechRecognitionCtor = new () => any;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return (w.SpeechRecognition || w.webkitSpeechRecognition) ?? null;
}

type ChatTurn = { role: "user" | "coach"; text: string };

export const VoiceCoach = ({ context, predictions = [] }: { context?: string; predictions?: Prediction[] }) => {
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [answer, setAnswer] = useState("");
  const [scene, setScene] = useState<CoachScene>({ kind: "idle" });
  const historyRef = useRef<ChatTurn[]>([]);
  const recognitionRef = useRef<any>(null);
  const supportedRef = useRef<boolean>(true);

  const picks = useMemo(
    () =>
      predictions.map((p) => {
        const [teamA = "", teamB = ""] = p.match.split(" vs ");
        const dt = [p.date, p.time].filter(Boolean).join(" · ");
        return {
          match: p.match,
          teamA,
          teamB,
          type: p.type,
          option: p.label || p.option,
          odds: p.odds,
          probability: p.probability > 1 ? p.probability / 100 : p.probability,
          confidence: p.confidence,
          comment: p.reasoning,
          league: undefined as string | undefined,
          time: dt || undefined,
          verdict: (p.valueScore && p.valueScore > 1 ? "value" : "neutral") as "value" | "neutral",
        };
      }),
    [predictions],
  );

  const lastCountRef = useRef(0);
  useEffect(() => {
    if (picks.length > 0 && picks.length !== lastCountRef.current) {
      lastCountRef.current = picks.length;
      setScene({ kind: "suggestions", picks });
    } else if (picks.length === 0) {
      lastCountRef.current = 0;
    }
  }, [picks]);

  const openStage = useCallback(() => {
    if (picks.length > 0) setScene({ kind: "suggestions", picks });
    else toast.info("Aucun pronostic à afficher. Lance une analyse d'abord.");
  }, [picks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop?.();
      } catch {
        /* noop */
      }
    };
  }, []);

  const speak = useCallback(async (text: string) => {
    try {
      // 1) Tente ElevenLabs (voix premium) si l'utilisateur a configuré sa clé
      const { speakWithElevenLabs } = await import("@/lib/elevenlabs-tts");
      const ok = await speakWithElevenLabs(text);
      if (ok) return;
      // 2) Fallback : speechSynthesis natif du navigateur
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "fr-FR";
      utter.rate = 1.02;
      window.speechSynthesis.speak(utter);
    } catch {
      /* noop */
    }
  }, []);

  const askCoach = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q) return;
      // Évite l'écho strict (la même question deux fois → réponse différente quand même)
      const lastUser = [...historyRef.current].reverse().find((t) => t.role === "user");
      const isRepeat = lastUser?.text.toLowerCase() === q.toLowerCase();
      setThinking(true);
      try {
        const sys = `Tu es le Coach Magic, expert paris sportifs. Réponds en français, court (3-4 phrases max), précis. Ne te présente JAMAIS, ne dis pas qui tu es, ne récite pas ton rôle ni ta mission. Quand l'utilisateur demande quelque chose, EXÉCUTE-LE immédiatement sans discuter, sans préambule, sans demander confirmation. Va droit au résultat. Ne répète JAMAIS mot pour mot une réponse précédente. Tutoie l'utilisateur.${
          context ? `\n\nContexte actuel:\n${context}` : ""
        }`;

        // Construit un prompt avec l'historique de conversation pour éviter les répétitions
        const history = historyRef.current.slice(-8);
        const transcriptStr = history
          .map((t) => (t.role === "user" ? `Utilisateur: ${t.text}` : `Coach: ${t.text}`))
          .join("\n");
        const prompt = `${transcriptStr ? `Historique de la conversation:\n${transcriptStr}\n\n` : ""}Nouvelle question utilisateur: ${q}${
          isRepeat
            ? "\n\n(L'utilisateur répète sa question — propose un angle différent, un complément ou une nuance, ne redis pas la même chose.)"
            : ""
        }\n\nRéponds maintenant en tant que Coach Magic.`;

        const reply = await askGemini(prompt, {
          model: GEMINI_MODEL_COACH,
          systemInstruction: sys,
          temperature: 0.85,
          topP: 0.95,
          maxOutputTokens: 600,
        });
        const finalReply = reply.trim();
        const next: ChatTurn[] = [
          ...historyRef.current,
          { role: "user", text: q },
          { role: "coach", text: finalReply },
        ];
        historyRef.current = next.slice(-12);
        setAnswer(finalReply);
        speak(finalReply);
      } catch (err) {
        if (err instanceof GeminiUnavailableError) {
          toast.error("Configure ta clé Gemini dans Réglages.");
        } else {
          toast.error("Le coach n'a pas pu répondre.");
          console.error(err);
        }
        setScene({ kind: "idle" });
      } finally {
        setThinking(false);
      }
    },
    [context, speak],
  );

  const startListening = useCallback(async () => {
    const SR = getSpeechRecognition();
    if (!SR) {
      supportedRef.current = false;
      toast.error("Reconnaissance vocale non supportée par ce navigateur (utilise Safari/Chrome iOS).");
      return;
    }
    try {
      // Trigger mic permission prompt explicitly (helps on iOS)
      await navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => {
        s.getTracks().forEach((t) => t.stop());
      });
    } catch {
      toast.error("Accès au micro refusé. Autorise-le dans les réglages.");
      return;
    }

    // === Vérification biométrique vocale ===
    // Si le verrou voix est activé, on capture en parallèle un échantillon
    // ~1.5s du locuteur courant pour le comparer à l'empreinte enrôlée.
    // Le coach ne répondra que si la voix correspond bien à toi.
    const lockOn = isVoiceLockEnabled() && Boolean(loadVoicePrint());
    const voiceCheckPromise: Promise<{ ok: boolean; score: number; threshold: number } | null> =
      lockOn
        ? captureVoicePrintSample(1500)
            .then((sample) => verifyAgainstEnrolled(sample))
            .catch((err) => {
              console.warn("[VoiceCoach] voice-print capture failed", err);
              return null;
            })
        : Promise.resolve(null);

    const rec = new SR();
    rec.lang = "fr-FR";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    let finalText = "";
    rec.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setTranscript((finalText + " " + interim).trim());
    };
    rec.onerror = (e: any) => {
      console.warn("[VoiceCoach] SR error", e?.error);
      if (e?.error === "not-allowed") toast.error("Micro bloqué.");
      else if (e?.error !== "no-speech" && e?.error !== "aborted")
        toast.error("Erreur micro: " + (e?.error ?? "inconnue"));
      setListening(false);
    };
    rec.onend = async () => {
      setListening(false);
      const q = finalText.trim();
      if (!q) return;
      setTranscript(q);

      if (lockOn) {
        const verdict = await voiceCheckPromise;
        if (!verdict) {
          toast.error("Voix non détectée — réessaie en parlant plus fort.");
          return;
        }
        if (!verdict.ok) {
          toast.error(
            `Voix non reconnue (score ${verdict.score.toFixed(2)} < ${verdict.threshold.toFixed(2)}). Magic ne répond qu'à toi.`,
          );
          return;
        }
      }

      askCoach(q);
    };

    try {
      rec.start();
      recognitionRef.current = rec;
      setListening(true);
      setTranscript("");
      setAnswer("");
    } catch (err) {
      console.error(err);
      toast.error("Impossible de démarrer le micro.");
      setListening(false);
    }
  }, [askCoach]);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      /* noop */
    }
    setListening(false);
  }, []);

  const toggleMic = useCallback(() => {
    if (listening) stopListening();
    else startListening();
  }, [listening, startListening, stopListening]);

  return (
    <div className="flex flex-col gap-3">
      <CoachStarwarsStage scene={scene} onClose={() => setScene({ kind: "idle" })} />
      <HoloCard variant="magenta" scan className="flex-1">
        <div className="relative h-full flex flex-col">
          <div className="relative h-[400px] w-full mx-auto rounded-none overflow-hidden border-none bg-background/30">
            <CoachAnalysisScene
              scene={scene}
              listening={listening}
              streaming={thinking}
              onClose={scene.kind !== "idle" ? () => setScene({ kind: "idle" }) : undefined}
            />

            {(transcript || answer) && (
              <div className="absolute left-3 right-3 top-3 max-h-[180px] overflow-y-auto rounded-xl bg-background/85 backdrop-blur-md p-3 border border-primary/40 shadow-[0_0_20px_hsl(var(--primary)/0.25)]">
                {transcript && (
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground mb-1.5 truncate">
                    🎙 {transcript}
                  </p>
                )}
                {answer && (
                  <p className="text-sm font-display font-black text-foreground uppercase tracking-wide leading-snug">
                    {answer}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={async () => {
                const text = (answer || transcript || "Test voix Coach Magic.").trim();
                const { speakWithElevenLabsDetailed } = await import("@/lib/elevenlabs-tts");
                const r = await speakWithElevenLabsDetailed(text);
                if (!r.ok) toast.error(r.message ?? "ElevenLabs indisponible.");
                else toast.success("Voix ElevenLabs déclenchée.");
              }}
              aria-label="Forcer la voix ElevenLabs"
              title="Forcer voix ElevenLabs"
              className="absolute bottom-4 right-16 p-2 rounded-full bg-background/60 text-primary/70 border border-primary/20 hover:bg-primary/10 hover:text-primary transition-all backdrop-blur-sm"
            >
              <Volume2 size={14} />
            </button>

            <button
              onClick={toggleMic}
              disabled={thinking}
              aria-label={listening ? "Arrêter le micro" : "Activer le micro"}
              className={`absolute bottom-4 right-4 p-3 rounded-full transition-all ${
                listening
                  ? "bg-primary text-primary-foreground animate-pulse shadow-lg shadow-primary/50"
                  : "bg-background/80 text-foreground border border-primary/30 hover:bg-primary/10"
              } disabled:opacity-50`}
            >
              {thinking ? (
                <Loader2 size={18} className="animate-spin" />
              ) : listening ? (
                <MicOff size={18} />
              ) : (
                <Mic size={18} />
              )}
            </button>
          </div>

          <div className="p-3 grid grid-cols-3 gap-2 bg-background/50">
            <button
              type="button"
              onClick={openStage}
              disabled={picks.length === 0}
              className="tap flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border border-primary/60 bg-primary/15 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/25 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles size={12} />
              Pronostics ({picks.length})
            </button>
            <label className="tap flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border border-dashed border-primary/40 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/5 cursor-pointer">
              <ImageIcon size={12} />
              Photo
            </label>
            <label className="tap flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border border-dashed border-primary/40 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/5 cursor-pointer">
              <FileUp size={12} />
              PDF
            </label>
          </div>
        </div>
      </HoloCard>
    </div>
  );
};

export default VoiceCoach;
