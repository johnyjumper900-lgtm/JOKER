import { useEffect, useState } from "react";
import { Mic2, Play, Check } from "lucide-react";
import { toast } from "sonner";
import { HoloCard } from "./HoloCard";
import { setElevenLabsVoice, speakWithElevenLabsDetailed } from "@/lib/elevenlabs-tts";

const STORAGE = "magic.elevenlabs.voiceId";
const DEFAULT_ID = "JBFqnCBsd6RMkjVDRZzb";

const PRESETS: Array<{ id: string; label: string; gender: "M" | "F" }> = [
  { id: "JBFqnCBsd6RMkjVDRZzb", label: "George (FR/EN · M)", gender: "M" },
  { id: "onwK4e9ZLuTAKqWW03F9", label: "Daniel (M)", gender: "M" },
  { id: "CwhRBWXzGAHq8TQ4Fs17", label: "Roger (M)", gender: "M" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", label: "Liam (M)", gender: "M" },
  { id: "nPczCjzI2devNBz1zQrb", label: "Brian (M)", gender: "M" },
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah (F)", gender: "F" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", label: "Alice (F)", gender: "F" },
  { id: "FGY2WhTYpPnrIDTdsKH5", label: "Laura (F)", gender: "F" },
];

export const VoiceIdCard = () => {
  const [voiceId, setVoiceId] = useState<string>(DEFAULT_ID);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    try {
      setVoiceId(localStorage.getItem(STORAGE) || DEFAULT_ID);
    } catch {
      /* noop */
    }
  }, []);

  const save = (id: string) => {
    const v = id.trim();
    if (!v) return;
    setVoiceId(v);
    setElevenLabsVoice(v);
    toast.success("Voice ID enregistré ✓");
  };

  const test = async () => {
    setTesting(true);
    try {
      const r = await speakWithElevenLabsDetailed(
        "Bonjour, je suis ton coach Magic. Voici ma voix.",
      );
      if (!r.ok) {
        if (r.reason === "quota") toast.error(r.message, { duration: 6000 });
        else if (r.reason === "no-key")
          toast.warning("Ajoute d'abord une clé ElevenLabs activée dans Réglages.");
        else toast.error(r.message);
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <HoloCard variant="cyan">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <Mic2 size={16} className="text-primary shrink-0" />
          <h3 className="text-xs font-display font-black uppercase tracking-[0.2em] text-foreground truncate">
            Voice ID · ElevenLabs
          </h3>
        </div>
        <p className="text-[9.5px] text-muted-foreground mb-3 leading-snug">
          Choisis une voix prédéfinie ou colle l'<strong className="text-primary">ID</strong> d'une
          voix de ta bibliothèque ElevenLabs.
        </p>

        <div className="relative mb-2">
          <input
            type="text"
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            onBlur={(e) => save(e.target.value)}
            placeholder="ex: JBFqnCBsd6RMkjVDRZzb"
            className="w-full pr-20 px-3 py-2.5 rounded-xl bg-background/60 border border-border text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none font-mono"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => save(voiceId)}
            className="absolute right-2 top-1/2 -translate-y-1/2 tap px-2 py-1 rounded-lg bg-primary/15 text-primary text-[9px] font-black uppercase tracking-widest flex items-center gap-1"
          >
            <Check size={11} /> OK
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {PRESETS.map((p) => {
            const active = p.id === voiceId;
            return (
              <button
                key={p.id}
                onClick={() => save(p.id)}
                className={`tap py-1.5 px-2 rounded-lg text-[9.5px] font-bold uppercase tracking-wider truncate text-left ${
                  active
                    ? "bg-gradient-holo text-primary-foreground shadow-holo"
                    : "bg-card/40 border border-border text-muted-foreground"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={test}
          disabled={testing}
          className="tap w-full py-2.5 rounded-xl border border-primary/40 bg-primary/10 text-primary font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Play size={12} /> {testing ? "Lecture…" : "Tester la voix"}
        </button>

        <a
          href="https://elevenlabs.io/app/voice-library"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center mt-2 text-[9px] uppercase tracking-widest text-muted-foreground hover:text-primary transition"
        >
          Bibliothèque de voix →
        </a>
      </div>
    </HoloCard>
  );
};
