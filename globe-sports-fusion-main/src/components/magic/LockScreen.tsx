import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Delete, ScanFace } from "lucide-react";
import { toast } from "sonner";
import { isBiometricEnrolled, isBiometricSupported, verifyBiometric } from "@/lib/biometric";

// Codes acceptés (insensibles à la casse). "187" = raccourci rapide.
const UNLOCK_CODES = ["187code", "187"];
// Durée de session déverrouillée (12 heures)
export const UNLOCK_SESSION_MS = 12 * 60 * 60 * 1000;
export const UNLOCK_STORAGE_KEY = "magic.unlock.until";

export const isUnlockedNow = () => {
  try {
    const raw = localStorage.getItem(UNLOCK_STORAGE_KEY);
    if (!raw) return false;
    const until = Number(raw);
    if (!Number.isFinite(until)) return false;
    if (Date.now() > until) {
      localStorage.removeItem(UNLOCK_STORAGE_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

const persistUnlock = () => {
  try {
    localStorage.setItem(UNLOCK_STORAGE_KEY, String(Date.now() + UNLOCK_SESSION_MS));
  } catch {
    /* noop */
  }
};

interface LockScreenProps {
  onUnlock: () => void;
}

// Web Speech API typings (loose)
interface SpeechRecognitionResult {
  readonly length: number;
  [index: number]: {
    transcript: string;
    confidence: number;
  };
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const haptic = (ms = 10) => {
  try {
    if ("vibrate" in navigator) (navigator as any).vibrate?.(ms);
  } catch {
    /* noop */
  }
};

/** Realistic padlock (SVG) — layered metal, engraved depth, iPhone-friendly scaling */
const RealisticPadlock = ({ open, scanning }: { open: boolean; scanning?: boolean }) => (
  <div className="relative w-full h-full">
    <svg
      viewBox="0 0 240 280"
      className="w-full h-full drop-shadow-[0_25px_45px_rgba(0,0,0,0.65)]"
      aria-hidden
    >
      <defs>
        <linearGradient id="shackle" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--foreground))" />
          <stop offset="18%" stopColor="hsl(var(--muted-foreground))" />
          <stop offset="46%" stopColor="hsl(var(--muted))" />
          <stop offset="72%" stopColor="hsl(var(--foreground) / 0.78)" />
          <stop offset="100%" stopColor="hsl(var(--background))" />
        </linearGradient>
        <linearGradient id="shackleInner" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--muted))" />
          <stop offset="100%" stopColor="hsl(var(--background))" />
        </linearGradient>
        <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary) / 0.42)" />
          <stop offset="22%" stopColor="hsl(var(--card))" />
          <stop offset="58%" stopColor="hsl(var(--background) / 0.95)" />
          <stop offset="100%" stopColor="hsl(var(--background))" />
        </linearGradient>
        <linearGradient id="bodyEdge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.32" />
          <stop offset="50%" stopColor="hsl(var(--foreground))" stopOpacity="0" />
          <stop offset="100%" stopColor="hsl(var(--primary-glow))" stopOpacity="0.2" />
        </linearGradient>
        <radialGradient id="bodyHighlight" cx="0.3" cy="0.2" r="0.7">
          <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.36" />
          <stop offset="60%" stopColor="hsl(var(--foreground))" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </radialGradient>
        <pattern id="brushed" width="7" height="7" patternUnits="userSpaceOnUse">
          <path d="M0 1 H7 M0 4 H7" stroke="hsl(var(--foreground) / 0.09)" strokeWidth="0.45" />
        </pattern>
        <filter id="soft">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
        <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Aura */}
      <ellipse cx="120" cy="270" rx="90" ry="8" fill="hsl(var(--background))" opacity="0.55" />
      <circle cx="120" cy="175" r="130" fill="url(#glow)" opacity={scanning ? 0.8 : 0.4} />

      {/* Shackle */}
      <g>
        <motion.path
          initial={false}
          animate={{ y: open ? -28 : 0, rotate: open ? -18 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          style={{ transformOrigin: "178px 110px" }}
          d="M 62 140 V 92 a 58 58 0 0 1 116 0 V 140"
          fill="none"
          stroke="url(#shackle)"
          strokeWidth="26"
          strokeLinecap="round"
        />
        {/* Inner shadow line on shackle */}
        <motion.path
          initial={false}
          animate={{ y: open ? -28 : 0, rotate: open ? -18 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          style={{ transformOrigin: "178px 110px" }}
          d="M 62 140 V 92 a 58 58 0 0 1 116 0 V 140"
          fill="none"
          stroke="url(#shackleInner)"
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.8"
        />
        {/* Shackle highlight */}
        <motion.path
          initial={false}
          animate={{ y: open ? -28 : 0, rotate: open ? -18 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          style={{ transformOrigin: "178px 110px" }}
          d="M 70 138 V 94 a 50 50 0 0 1 50 -50"
          fill="none"
          stroke="hsl(var(--foreground))"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.65"
          filter="url(#soft)"
        />
      </g>

      {/* Body */}
      <g>
        <rect x="28" y="132" width="184" height="128" rx="26" fill="url(#body)" />
        <rect x="32" y="136" width="176" height="120" rx="23" fill="url(#brushed)" opacity="0.75" />
        <rect x="28" y="132" width="184" height="128" rx="26" fill="url(#bodyHighlight)" />
        <rect x="28.5" y="132.5" width="183" height="127" rx="25.5" fill="none" stroke="url(#bodyEdge)" strokeWidth="1" />
        
        {/* Primary edge glow */}
        <rect
          x="28"
          y="132"
          width="184"
          height="128"
          rx="26"
          fill="none"
          stroke="hsl(var(--primary) / 0.75)"
          strokeWidth="1.5"
          filter="url(#neon-glow)"
        />
        
        <rect x="40" y="140" width="160" height="22" rx="12" fill="hsl(var(--foreground))" opacity="0.08" />
        <path d="M48 172 H192" stroke="hsl(var(--foreground) / 0.08)" strokeWidth="1" />
        <path d="M48 246 H192" stroke="hsl(var(--primary) / 0.14)" strokeWidth="1" />
        
        <g transform="translate(120 200)">
          <circle r="20" fill="hsl(var(--background))" opacity="0.8" />
          <circle r="17" fill="hsl(var(--background))" />
          <circle r="17" fill="none" stroke="hsl(var(--primary) / 0.75)" strokeWidth="1.5" />
          <rect x="-4" y="5" width="8" height="23" rx="2.5" fill="hsl(var(--background))" />
          <circle r="6.5" fill="hsl(var(--primary) / 0.46)" />
          <path d="M-8 -8 L8 8" stroke="hsl(var(--foreground) / 0.24)" strokeWidth="1" />
        </g>
        
        {/* Rivets */}
        {[
          [48, 152],
          [192, 152],
          [48, 240],
          [192, 240],
        ].map(([cx, cy], i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r="5.2" fill="hsl(var(--background) / 0.85)" />
            <circle cx={cx - 1} cy={cy - 1} r="2" fill="hsl(var(--foreground))" opacity="0.48" />
          </g>
        ))}

        {/* Digital HUD Elements */}
        {!open && (
          <g opacity="0.6">
            <rect x="40" y="160" width="40" height="2" fill="hsl(var(--primary))" rx="1" />
            <rect x="160" y="160" width="40" height="2" fill="hsl(var(--primary))" rx="1" />
            <circle cx="40" cy="200" r="3" fill="hsl(var(--primary))" />
            <circle cx="200" cy="200" r="3" fill="hsl(var(--primary))" />
            <path d="M 60 230 L 180 230" stroke="hsl(var(--primary))" strokeWidth="0.5" strokeDasharray="4 4" />
          </g>
        )}
      </g>
    </svg>

    {/* Laser Scanner Line */}
    {!open && (
      <div className="absolute inset-x-0 top-[132px] bottom-[20px] pointer-events-none overflow-hidden rounded-[26px] mx-[28px]">
        <motion.div
          animate={{ y: ["0%", "400%", "0%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_15px_var(--primary)] opacity-70"
        />
        <motion.div
           animate={{ opacity: [0.1, 0.3, 0.1] }}
           transition={{ duration: 2, repeat: Infinity }}
           className="absolute inset-0 bg-[radial-gradient(circle_at_center,oklch(from_var(--primary)_l_c_h/0.1)_0%,transparent_70%)]"
        />
      </div>
    )}
  </div>
);

export const LockScreen = ({ onUnlock }: LockScreenProps) => {
  const [code, setCode] = useState("");
  const [shake, setShake] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const bioEnrolled = isBiometricEnrolled() && isBiometricSupported();
  const autoTriedRef = useRef(false);

  const doUnlock = () => {
    setUnlocked(true);
    haptic(30);
    try {
      recognitionRef.current?.stop();
    } catch {
      /* noop */
    }
    setTimeout(() => onUnlock(), 750);
  };

  const tryBiometric = async () => {
    if (!bioEnrolled || bioBusy || unlocked) return;
    setBioBusy(true);
    try {
      const ok = await verifyBiometric();
      if (ok) {
        toast.success("Face ID validé");
        persistUnlock();
        doUnlock();
      }
    } catch (e: any) {
      toast.error(e?.message || "Échec Face ID");
    } finally {
      setBioBusy(false);
    }
  };

  // Auto-prompt Face ID au montage si enrôlé (nécessite geste utilisateur sur iOS — sinon bouton)
  useEffect(() => {
    if (!bioEnrolled || autoTriedRef.current) return;
    autoTriedRef.current = true;
    const onGesture = () => {
      window.removeEventListener("pointerdown", onGesture);
      void tryBiometric();
    };
    window.addEventListener("pointerdown", onGesture, { once: true });
    return () => window.removeEventListener("pointerdown", onGesture);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bioEnrolled]);

  // Silent voice unlock: listens in background for « bébé » (never shown in UI)
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec: SpeechRecognitionLike = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "fr-FR";

    rec.onresult = (e: SpeechRecognitionEvent) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = String(e.results[i][0].transcript || "")
          .toLowerCase()
          .trim();
        const matches =
          transcript.includes("bébé") ||
          transcript.includes("bebe") ||
          transcript.includes("baby") ||
          transcript.includes("magic ouvre") ||
          transcript.includes("ouvre magic") ||
          /\bbé\s*bé\b/.test(transcript);
        if (matches) {
          persistUnlock();
          doUnlock();
          return;
        }
      }
    };
    rec.onerror = () => {
      /* silent */
    };
    rec.onend = () => {
      try {
        rec.start();
      } catch {
        /* noop */
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      /* noop — will retry on user gesture */
    }

    // Best-effort re-arm on first user gesture (iOS Safari)
    const rearm = () => {
      try {
        rec.start();
      } catch {
        /* already started */
      }
    };
    window.addEventListener("pointerdown", rearm, { once: true });
    window.addEventListener("touchstart", rearm, { once: true });

    return () => {
      window.removeEventListener("pointerdown", rearm);
      window.removeEventListener("touchstart", rearm);
      try {
        rec.onend = null;
        rec.stop();
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tryCode = (value: string) => {
    const v = value.trim().toLowerCase();
    if (UNLOCK_CODES.includes(v)) {
      toast.success("Accès autorisé");
      persistUnlock();
      doUnlock();
    } else {
      setShake(true);
      haptic(80);
      toast.error("Code incorrect");
      setTimeout(() => setShake(false), 500);
      setCode("");
    }
  };

  const pressKey = (k: string) => {
    haptic(8);
    setActiveKey(k);
    setCode((c) => (c.length >= 12 ? c : c + k));
    setTimeout(() => setActiveKey(null), 150);
  };
  const backspace = () => {
    haptic(8);
    setActiveKey("⌫");
    setCode((c) => c.slice(0, -1));
    setTimeout(() => setActiveKey(null), 150);
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "c", "0", "⌫"];

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden select-none bg-background bg-aurora"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 1.25rem)",
        paddingBottom: "max(env(safe-area-inset-bottom), 1rem)",
        paddingLeft: "max(env(safe-area-inset-left), 1rem)",
        paddingRight: "max(env(safe-area-inset-right), 1rem)",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        WebkitUserSelect: "none",
      }}
    >
      {/* High-Tech Background */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,hsl(var(--primary)/0.15),transparent_60%)]" />
        <svg className="absolute inset-0 w-full h-full opacity-20" aria-hidden="true">
           <defs>
             <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
               <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary/30" />
             </pattern>
           </defs>
           <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        {/* Scanning horizontal line for full screen */}
        <motion.div
           animate={{ y: ["-10%", "110%"] }}
           transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
           className="w-full h-px bg-primary/20 blur-[2px]"
        />
      </div>

      {/* Title */}
      <div className="relative z-10 flex flex-col items-center pt-2">
        <motion.p 
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="text-[10px] uppercase font-bold tracking-[0.4em] text-primary"
        >
          Encryption Active
        </motion.p>
        <h1 className="mt-1 text-xl font-display font-black uppercase tracking-[0.3em] overflow-hidden whitespace-nowrap">
          <span className="holo-text drop-shadow-[0_0_10px_oklch(from_var(--primary)_l_c_h/0.5)]">Magic Security</span>
        </h1>
      </div>

      {/* Padlock — occupies available space */}
      <div className="relative z-10 flex-1 flex items-center justify-center py-2">
        <motion.div
          animate={
            shake
              ? { x: [-10, 10, -8, 8, -4, 4, 0], scale: [1, 1.02, 1] }
              : unlocked
                ? { scale: [1, 1.15, 0], opacity: [1, 1, 0], rotate: [0, -5, 0] }
                : { y: [0, -8, 0] }
          }
          transition={
            shake
              ? { duration: 0.5 }
              : unlocked
                ? { duration: 0.8, ease: "backIn" }
                : { duration: 5, repeat: Infinity, ease: "easeInOut" }
          }
          className="w-[min(78svw,340px)] max-[390px]:w-[min(72svw,280px)] aspect-[240/280]"
        >
          <RealisticPadlock open={unlocked} scanning={!unlocked} />
        </motion.div>
      </div>

      {/* Code dots */}
      <div className="relative z-10 flex justify-center gap-3.5 mb-4">
        {Array.from({ length: Math.max(6, code.length) }).map((_, i) => {
          const filled = i < code.length;
          return (
            <motion.div
              key={i}
              animate={filled ? { scale: [1, 1.3, 1], boxShadow: ["0 0 0px hsl(var(--primary))", "0 0 20px hsl(var(--primary))", "0 0 8px hsl(var(--primary))"] } : {}}
              className="w-3 h-3 rounded-sm rotate-45 border border-primary/30"
              style={{
                background: filled ? "hsl(var(--primary))" : "transparent",
                boxShadow: filled ? "0 0 15px hsl(var(--primary) / 0.8)" : "none",
              }}
            />
          );
        })}
      </div>

      {/* Hidden input */}
      <input
        aria-label="Code"
        type="password"
        value={code}
        onChange={(e) => setCode(e.target.value.slice(0, 12))}
        onKeyDown={(e) => {
          if (e.key === "Enter") tryCode(code);
        }}
        className="sr-only"
      />

      {/* Keypad */}
      <div className="relative z-10 mx-auto w-full max-w-[320px] grid grid-cols-3 gap-2.5 px-2">
        {keys.map((k) => {
          if (k === "⌫") {
            return (
              <button
                key={k}
                type="button"
                onClick={backspace}
                className="h-14 rounded-2xl bg-card/50 border border-border/60 flex items-center justify-center text-muted-foreground active:scale-95 active:bg-card/80 transition"
                style={{ WebkitTapHighlightColor: "transparent" }}
                aria-label="Effacer"
              >
                <Delete className="w-5 h-5" />
              </button>
            );
          }
          if (k === "c") {
            return (
              <button
                key={k}
                type="button"
                onClick={() => pressKey("code")}
                className="h-14 rounded-2xl bg-card/50 border border-border/60 flex items-center justify-center text-sm font-semibold uppercase tracking-[0.2em] text-primary active:scale-95 active:bg-card/80 transition"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                code
              </button>
            );
          }
          return (
            <button
              key={k}
              type="button"
              onClick={() => pressKey(k)}
              className="h-14 rounded-2xl bg-card/60 border border-border/60 flex items-center justify-center text-2xl font-semibold text-foreground active:scale-95 active:bg-card/90 transition"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {k}
            </button>
          );
        })}
      </div>

      {/* Validate + Face ID */}
      <div className="relative z-10 mx-auto w-full max-w-[340px] px-2 mt-4 space-y-3">
        {bioEnrolled && (
          <button
            type="button"
            onClick={tryBiometric}
            disabled={bioBusy || unlocked}
            className="w-full h-12 rounded-xl border border-primary/40 bg-primary/5 text-primary font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-40 transition-all hover:bg-primary/10"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <ScanFace className="w-4 h-4 animate-pulse" />
            {bioBusy ? "Autorisation…" : "Sync Face ID"}
          </button>
        )}
        <button
          type="button"
          onClick={() => tryCode(code)}
          disabled={code.length === 0 || unlocked}
          className="w-full h-13 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-[0.4em] text-[11px] active:scale-[0.97] disabled:opacity-30 transition-all shadow-[0_0_20px_hsl(var(--primary)/0.3)] hover:brightness-110"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          Déverrouiller
        </button>
      </div>

      <AnimatePresence>
        {unlocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.35), transparent 60%)",
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
