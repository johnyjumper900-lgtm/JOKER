import { useState } from "react";
import { motion } from "framer-motion";
import { Mic, Check, Trash2, ShieldCheck, ShieldOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  captureVoicePrintSample,
  clearVoicePrint,
  enrollVoicePrint,
  isVoiceLockEnabled,
  loadVoicePrint,
  setVoiceLockEnabled,
} from "@/lib/voice-print";

const PASSPHRASE = "Magic, c'est moi, ouvre l'analyse.";
const SAMPLE_COUNT = 3;

/**
 * Module d'enrôlement vocal — capture 3 échantillons de la même phrase
 * et stocke l'empreinte localement. Active ensuite le verrou "ma voix uniquement".
 */
export const VoiceEnroll = () => {
  const [samples, setSamples] = useState<number[][]>([]);
  const [busy, setBusy] = useState(false);
  const [enrolled, setEnrolled] = useState(() => Boolean(loadVoicePrint()));
  const [enabled, setEnabled] = useState(() => isVoiceLockEnabled());

  const captureOne = async () => {
    if (busy) return;
    setBusy(true);
    try {
      toast.info(`Échantillon ${samples.length + 1}/${SAMPLE_COUNT} — parle maintenant`);
      const sample = await captureVoicePrintSample(1500);
      const next = [...samples, sample];
      setSamples(next);
      if (next.length >= SAMPLE_COUNT) {
        await enrollVoicePrint(next);
        setEnrolled(true);
        setEnabled(true);
        setSamples([]);
        toast.success("Empreinte vocale enregistrée — Magic ne répondra qu'à toi");
      } else {
        toast.success(`OK — encore ${SAMPLE_COUNT - next.length} échantillon(s)`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur micro");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    clearVoicePrint();
    setVoiceLockEnabled(false);
    setEnrolled(false);
    setEnabled(false);
    setSamples([]);
    toast.info("Empreinte vocale supprimée");
  };

  const toggle = () => {
    if (!enrolled) {
      toast.error("Enrôle d'abord ta voix");
      return;
    }
    const v = !enabled;
    setVoiceLockEnabled(v);
    setEnabled(v);
    toast.success(v ? "Verrou voix activé" : "Verrou voix désactivé");
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 p-4 space-y-3">
      <div className="flex items-center gap-2">
        {enabled ? (
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
        ) : (
          <ShieldOff className="w-5 h-5 text-muted-foreground" />
        )}
        <h3 className="font-semibold">Verrou biométrique vocal</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Magic n'obéira qu'à ta voix. Prononce 3 fois la phrase ci-dessous, clairement,
        à 30 cm du micro.
      </p>
      <div className="rounded-xl bg-background/60 px-3 py-2 text-sm font-mono text-primary">
        « {PASSPHRASE} »
      </div>

      <div className="flex flex-wrap gap-2">
        {!enrolled && (
          <button
            onClick={captureOne}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-primary-foreground text-sm font-semibold disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
            Enrôler ({samples.length}/{SAMPLE_COUNT})
          </button>
        )}
        {enrolled && (
          <>
            <button
              onClick={toggle}
              className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold"
            >
              {enabled ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
              {enabled ? "Désactiver" : "Activer"}
            </button>
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-xl bg-destructive/80 px-4 py-2 text-destructive-foreground text-sm font-semibold"
            >
              <Trash2 className="w-4 h-4" />
              Réinitialiser
            </button>
          </>
        )}
      </div>

      {enrolled && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-xs text-emerald-400"
        >
          <Check className="w-4 h-4" /> Empreinte vocale active.
        </motion.div>
      )}
    </div>
  );
};

export default VoiceEnroll;