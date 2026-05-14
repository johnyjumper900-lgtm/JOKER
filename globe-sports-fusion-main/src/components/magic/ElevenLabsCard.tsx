import { useState } from "react";
import {
  Mic,
  Plus,
  Trash2,
  Power,
  PowerOff,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { HoloCard } from "./HoloCard";
import type { ExtraApiKey } from "@/lib/extra-api-keys";

interface Props {
  existing?: ExtraApiKey;
  onAdd: (key: string) => void | Promise<void>;
  onToggle: (entry: ExtraApiKey) => void;
  onRemove: (id: string) => void;
  verifying: boolean;
}

export const ElevenLabsCard = ({ existing, onAdd, onToggle, onRemove, verifying }: Props) => {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const enabled = existing?.enabled ?? true;

  return (
    <HoloCard variant="violet">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <Mic size={16} className="text-secondary shrink-0" />
          <h3 className="text-xs font-display font-black uppercase tracking-[0.2em] text-foreground truncate">
            ElevenLabs · Voix IA
          </h3>
          {existing && (
            <span
              className={`ml-auto text-[8.5px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest ${
                enabled ? "bg-success/20 text-success" : "bg-muted/40 text-muted-foreground"
              }`}
            >
              {enabled ? "Activé" : "Désactivé"}
            </span>
          )}
        </div>
        <p className="text-[9.5px] text-muted-foreground mb-3 leading-snug">
          Clé personnelle pour la voix premium du Coach IA.{" "}
          <strong className="text-secondary">Active/désactive</strong> à volonté — la clé reste
          mémorisée même quand elle est éteinte.
        </p>

        {!existing ? (
          <>
            <div className="relative mb-2">
              <input
                type={show ? "text" : "password"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="sk_..."
                className="w-full pr-10 px-3 py-2.5 rounded-xl bg-background/60 border border-border text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:border-secondary focus:outline-none"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 tap p-1.5 text-muted-foreground"
                aria-label="Voir/masquer"
              >
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <a
              href="https://elevenlabs.io/app/settings/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] uppercase tracking-widest text-muted-foreground hover:text-secondary transition mb-2 inline-block"
            >
              Obtenir ma clé →
            </a>
            <button
              onClick={async () => {
                if (!value.trim()) return;
                await onAdd(value.trim());
                setValue("");
              }}
              disabled={verifying || !value.trim()}
              className="tap w-full py-2.5 rounded-xl bg-gradient-holo text-primary-foreground font-display font-black uppercase tracking-widest text-[10.5px] flex items-center justify-center gap-2 shadow-holo disabled:opacity-50"
            >
              {verifying ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Vérification…
                </>
              ) : (
                <>
                  <Plus size={14} /> Ajouter & vérifier
                </>
              )}
            </button>
          </>
        ) : (
          <div
            className={`flex items-center gap-2 p-2.5 rounded-xl bg-background/40 border border-secondary/30 ${
              enabled ? "" : "opacity-60"
            }`}
          >
            {existing.valid ? (
              <CheckCircle2 size={14} className="text-success shrink-0" />
            ) : (
              <XCircle size={14} className="text-destructive shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black uppercase tracking-widest text-foreground truncate">
                {existing.key.slice(0, 6)}…{existing.key.slice(-4)}
              </p>
              <p className="text-[9px] text-muted-foreground truncate">
                {existing.valid ? "Clé validée" : existing.message || "Non vérifiée"}
              </p>
            </div>
            <button
              onClick={() => onToggle(existing)}
              className={`tap px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border flex items-center gap-1 ${
                enabled
                  ? "bg-success/15 text-success border-success/30"
                  : "bg-muted/20 text-muted-foreground border-border"
              }`}
            >
              {enabled ? <Power size={11} /> : <PowerOff size={11} />}
              {enabled ? "ON" : "OFF"}
            </button>
            <button
              onClick={() => onRemove(existing.id)}
              className="tap p-1.5 text-destructive"
              aria-label="Supprimer"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
    </HoloCard>
  );
};
