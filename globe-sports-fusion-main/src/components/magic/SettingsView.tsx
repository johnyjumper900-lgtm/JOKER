import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
  Trash2,
  Info,
  Sliders,
  Globe,
  Bell,
  BellOff,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Lock,
  Mic,
  Power,
  PowerOff,
  Zap,
  ScanFace,
} from "lucide-react";
import { toast } from "sonner";
import { HoloCard } from "./HoloCard";
import { ElevenLabsCard } from "./ElevenLabsCard";
import { CreatorIdentity } from "./CreatorIdentity";
import { VoiceEnroll } from "./VoiceEnroll";
import { VoiceIdCard } from "./VoiceIdCard";

import { getUserApiKeys, setUserApiKey, type UserApiKeys } from "@/lib/user-api-keys";
import { syncGeminiKeys } from "@/lib/gemini-core";

import {
  getExtraKeys,
  addExtraKey,
  removeExtraKey,
  setExtraKeyEnabled,
  resolveAndVerify,
  verifyKey,
  EXTRA_PROVIDERS,
  type ExtraApiKey,
  type ExtraProvider,
} from "@/lib/extra-api-keys";
import { emitKeysUpdated } from "@/lib/keys-events";
import {
  isPushSupported,
  isPushEnabled,
  requestPushPermission,
  disablePush,
  pushNotify,
} from "@/lib/push-notifications";
import {
  isBiometricSupported,
  isPlatformAuthenticatorAvailable,
  isBiometricEnrolled,
  enrollBiometric,
  clearBiometric,
  verifyBiometric,
} from "@/lib/biometric";

interface SettingsViewProps {
  onBack: () => void;
  defaultStake: number;
  onDefaultStakeChange: (n: number) => void;
  onResetHistory: () => void;
}

const KEY_FIELDS: Array<{
  field: keyof UserApiKeys;
  label: string;
  hint: string;
  placeholder: string;
  url: string;
  highlight?: boolean;
}> = [
  {
    field: "gemini",
    label: "Google Gemini API (Global)",
    hint: "Clé Google AI Studio unique partagée par TOUS les modules. Coach utilise gemini-3.1-pro-preview, autres modules gemini-2.5-flash.",
    placeholder: "AIza...",
    url: "https://aistudio.google.com/apikey",
    highlight: true,
  },
];

export const SettingsView = ({
  onBack,
  defaultStake,
  onDefaultStakeChange,
  onResetHistory,
}: SettingsViewProps) => {
  const [keys, setKeys] = useState<UserApiKeys>(getUserApiKeys());
  const [show, setShow] = useState<Record<keyof UserApiKeys, boolean>>({
    rapidApi: false,
    footballData: false,
    odds: false,
    apiSports: false,
    sportmonks: false,
    gemini: false,
  });
  const [pushOn, setPushOn] = useState<boolean>(() => isPushEnabled());
  const pushSupported = isPushSupported();

  const [extras, setExtras] = useState<ExtraApiKey[]>(() => getExtraKeys());
  const [newKey, setNewKey] = useState("");
  const [newProvider, setNewProvider] = useState<ExtraProvider | "auto">("auto");
  const [verifying, setVerifying] = useState(false);
  const [bioSupported, setBioSupported] = useState(false);
  const [bioEnrolled, setBioEnrolled] = useState(isBiometricEnrolled());
  const [bioBusy, setBioBusy] = useState(false);

  useEffect(() => {
    if (!isBiometricSupported()) return;
    isPlatformAuthenticatorAvailable().then(setBioSupported);
  }, []);

  const handleEnrollBio = async () => {
    setBioBusy(true);
    try {
      await enrollBiometric();
      setBioEnrolled(true);
      toast.success("Face ID enregistré ✓");
    } catch (e: any) {
      toast.error(e?.message || "Échec de l'enregistrement");
    } finally {
      setBioBusy(false);
    }
  };

  const handleTestBio = async () => {
    setBioBusy(true);
    try {
      const ok = await verifyBiometric();
      if (ok) toast.success("Face ID fonctionne ✓");
    } catch (e: any) {
      toast.error(e?.message || "Échec du test");
    } finally {
      setBioBusy(false);
    }
  };

  const handleClearBio = () => {
    clearBiometric();
    setBioEnrolled(false);
    toast.success("Face ID supprimé");
  };

  useEffect(() => {
    setKeys(getUserApiKeys());
    setPushOn(isPushEnabled());
    setExtras(getExtraKeys());
  }, []);

  const togglePush = async () => {
    if (pushOn) {
      disablePush();
      setPushOn(false);
      toast.success("Notifications push désactivées");
      return;
    }
    const ok = await requestPushPermission();
    setPushOn(ok);
    if (ok) {
      toast.success("Notifications push activées");
      pushNotify("Magic activé 🔮", {
        body: "Tu recevras les alertes de tes tickets en direct.",
      });
    } else {
      toast.error("Permission refusée par le navigateur");
    }
  };

  const update = (f: keyof UserApiKeys, v: string) => {
    setKeys((p) => ({ ...p, [f]: v }));
    setUserApiKey(f, v);
  };

  const saveAll = () => {
    (Object.keys(keys) as Array<keyof UserApiKeys>).forEach((k) =>
      setUserApiKey(k, keys[k].trim()),
    );
    // Propage la clé Gemini vers le moteur cotes-engine local
    syncGeminiKeys();
    toast.success("Clés enregistrées — actualisation des matchs…");
    emitKeysUpdated({ action: "save-all" });
  };

  const clearOne = (f: keyof UserApiKeys) => {
    setUserApiKey(f, "");
    setKeys((p) => ({ ...p, [f]: "" }));
    toast.success("Clé effacée");
    emitKeysUpdated({ provider: f, action: "remove" });
  };

  const handleAddExtra = async () => {
    const raw = newKey.trim();
    if (!raw) {
      toast.error("Saisis une clé API");
      return;
    }
    setVerifying(true);
    try {
      let provider: ExtraProvider;
      let result: { valid: boolean; message: string };

      if (newProvider === "auto") {
        // Résolution intelligente : départage les clés ambiguës (32-hex)
        // en interrogeant chaque endpoint candidat.
        const resolved = await resolveAndVerify(raw);
        provider = resolved.provider;
        result = resolved.result;
        if (resolved.triedProviders.length > 1 && result.valid) {
          toast.info(
            `Clé identifiée comme ${EXTRA_PROVIDERS[provider].label} (sur ${resolved.triedProviders.length} candidats testés)`,
          );
        }
      } else {
        provider = newProvider;
        result = await verifyKey(provider, raw);
      }

      const entry: ExtraApiKey = {
        id: crypto.randomUUID(),
        provider,
        key: raw,
        label: EXTRA_PROVIDERS[provider].label,
        addedAt: Date.now(),
        valid: result.valid,
        message: result.message,
        // ElevenLabs : activée par défaut à l'ajout
        enabled: provider === "elevenlabs" ? true : undefined,
      };
      const next = addExtraKey(entry);
      setExtras(next);
      setNewKey("");
      setNewProvider("auto");
      if (result.valid) {
        toast.success(`Clé ${entry.label} vérifiée ✓ — mémorisée`);
      } else {
        toast.warning(`Clé ajoutée mais non vérifiée : ${result.message}`);
      }
      emitKeysUpdated({ provider: entry.provider, action: "add" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec vérification");
    } finally {
      setVerifying(false);
    }
  };

  const handleToggleEnabled = (entry: ExtraApiKey) => {
    const next = setExtraKeyEnabled(entry.id, !(entry.enabled ?? true));
    setExtras(next);
    toast.success((entry.enabled ?? true) ? `${entry.label} désactivée` : `${entry.label} activée`);
    emitKeysUpdated({ provider: entry.provider, action: "update" });
  };

  const handleRemoveExtra = (id: string) => {
    setExtras(removeExtraKey(id));
    toast.success("Clé supprimée");
    emitKeysUpdated({ action: "remove" });
  };

  const handleReverify = async (entry: ExtraApiKey) => {
    setVerifying(true);
    try {
      const result = await verifyKey(entry.provider, entry.key);
      const next = extras.map((e) =>
        e.id === entry.id ? { ...e, valid: result.valid, message: result.message } : e,
      );
      setExtras(next);
      localStorage.setItem("magic.extraApiKeys", JSON.stringify(next));
      toast[result.valid ? "success" : "warning"](
        result.valid ? "Clé toujours valide ✓" : `Invalide : ${result.message}`,
      );
      emitKeysUpdated({ provider: entry.provider, action: "verify" });
    } finally {
      setVerifying(false);
    }
  };

  const [page, setPage] = useState<0 | 1>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 60;
    const v = info.velocity.x;
    const o = info.offset.x;
    if ((o < -threshold || v < -400) && page === 0) setPage(1);
    else if ((o > threshold || v > 400) && page === 1) setPage(0);
  };

  // ===== PAGE 1 : Clés API & Sécurité =====
  const Page1 = (
    <div className="flex flex-col gap-4">
      <HoloCard variant="cyan">
        <div className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <Globe size={16} className="text-primary shrink-0" />
            <h3 className="text-xs font-display font-black uppercase tracking-[0.2em] text-foreground truncate">
              Clés API · Global
            </h3>
          </div>
          <p className="text-[9.5px] text-muted-foreground mb-4 leading-snug">
            <strong className="text-primary">Une seule config pour toute l'app</strong> :
            calendrier, cotes, scores temps réel, coach IA — tous les modules réutilisent ces clés.
            Stockées localement, envoyées comme en-têtes sécurisés.
          </p>

          {KEY_FIELDS.map(({ field, label, hint, placeholder, url, highlight }) => {
            const rawVal = keys[field] ?? "";
            const isGemini = field === "gemini";
            const formatOk = isGemini
              ? /^AIza[0-9A-Za-z_-]{30,}$/.test(rawVal.trim())
              : rawVal.trim().length > 5;
            const detected = isGemini && !!rawVal.trim();
            return (
            <div
              key={field}
              className={`space-y-1.5 mb-4 ${
                highlight
                  ? "p-3 -mx-2 rounded-xl bg-gradient-holo-soft border border-primary/30"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <label
                  className={`text-[9.5px] font-bold uppercase tracking-widest truncate flex items-center gap-1.5 ${
                    highlight ? "text-primary text-glow-cyan" : "text-primary"
                  }`}
                >
                  {highlight && "★ "}
                  {label}
                  {isGemini && detected && (
                    <span
                      className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest border ${
                        formatOk
                          ? "bg-success/15 text-success border-success/40"
                          : "bg-destructive/15 text-destructive border-destructive/40"
                      }`}
                    >
                      {formatOk ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
                      {formatOk ? "ACTIVE" : "FORMAT KO"}
                    </span>
                  )}
                  {isGemini && !detected && (
                    <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest border bg-muted/30 text-muted-foreground border-border">
                      ABSENTE
                    </span>
                  )}
                </label>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[8.5px] uppercase tracking-widest text-muted-foreground hover:text-primary transition shrink-0"
                >
                  Obtenir
                </a>
              </div>
              <div className="relative">
                <input
                  type={show[field] ? "text" : "password"}
                  value={keys[field]}
                  onChange={(e) => update(field, e.target.value)}
                  placeholder={placeholder}
                  className="w-full pr-20 px-3 py-2.5 rounded-xl bg-background/60 border border-border text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button
                    type="button"
                    onClick={() => setShow((s) => ({ ...s, [field]: !s[field] }))}
                    className="tap p-1.5 text-muted-foreground"
                    aria-label="Voir/masquer"
                  >
                    {show[field] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  {keys[field] && (
                    <button
                      type="button"
                      onClick={() => clearOne(field)}
                      className="tap p-1.5 text-destructive"
                      aria-label="Effacer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[9.5px] text-muted-foreground leading-snug">{hint}</p>
            </div>
            );
          })}

          <button
            onClick={saveAll}
            className="tap w-full py-3 rounded-xl bg-gradient-holo text-primary-foreground font-display font-black uppercase tracking-widest text-[10.5px] flex items-center justify-center gap-2 shadow-holo"
          >
            <Check size={14} /> Enregistrer
          </button>
        </div>
      </HoloCard>


      <HoloCard variant="violet">
        <div className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <Plus size={16} className="text-secondary shrink-0" />
            <h3 className="text-xs font-display font-black uppercase tracking-[0.2em] text-foreground truncate">
              Clés API Foot · À volonté
            </h3>
          </div>
          <p className="text-[9.5px] text-muted-foreground mb-4 leading-snug">
            Ajoute autant de clés que tu veux. Provider{" "}
            <strong className="text-secondary">détecté automatiquement</strong> et{" "}
            <strong className="text-secondary">vérifié en direct</strong>.
          </p>

          <div className="flex gap-2 mb-2">
            <select
              value={newProvider}
              onChange={(e) => setNewProvider(e.target.value as ExtraProvider | "auto")}
              className="px-2 py-2 rounded-xl bg-background/60 border border-border text-[11px] text-foreground focus:border-secondary focus:outline-none"
            >
              <option value="auto">Auto-détection</option>
              {(Object.keys(EXTRA_PROVIDERS) as ExtraProvider[])
                .filter((p) => p === "gemini" || p === "elevenlabs")
                .map((p) => (
                  <option key={p} value={p}>
                    {EXTRA_PROVIDERS[p].label}
                  </option>
                ))}
            </select>
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Colle ta clé API..."
              className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-background/60 border border-border text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:border-secondary focus:outline-none"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <button
            onClick={handleAddExtra}
            disabled={verifying || !newKey.trim()}
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

          {extras.length > 0 && (
            <div className="mt-4 space-y-2">
              {extras.map((e) => {
                const isEleven = e.provider === "elevenlabs";
                const enabled = e.enabled ?? true;
                return (
                  <div
                    key={e.id}
                    className={`flex items-center gap-2 p-2.5 rounded-xl bg-background/40 border ${
                      isEleven ? "border-primary/40" : "border-border"
                    } ${isEleven && !enabled ? "opacity-50" : ""}`}
                  >
                    {e.valid ? (
                      <CheckCircle2 size={14} className="text-success shrink-0" />
                    ) : (
                      <XCircle size={14} className="text-destructive shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-widest text-foreground truncate flex items-center gap-1.5">
                        {isEleven && <Mic size={10} className="text-primary" />}
                        {e.label}
                        {isEleven && (
                          <span
                            className={`text-[8px] px-1.5 py-0.5 rounded ${
                              enabled
                                ? "bg-success/20 text-success"
                                : "bg-muted/40 text-muted-foreground"
                            }`}
                          >
                            {enabled ? "ON" : "OFF"}
                          </span>
                        )}
                      </p>
                      <p className="text-[9px] text-muted-foreground truncate">
                        {e.key.slice(0, 6)}…{e.key.slice(-4)} ·{" "}
                        {e.valid ? "Validée" : e.message || "Non vérifiée"}
                      </p>
                    </div>
                    {isEleven && (
                      <button
                        onClick={() => handleToggleEnabled(e)}
                        className={`tap p-1.5 ${
                          enabled ? "text-success" : "text-muted-foreground"
                        }`}
                        aria-label={enabled ? "Désactiver" : "Activer"}
                      >
                        {enabled ? <Power size={13} /> : <PowerOff size={13} />}
                      </button>
                    )}
                    <button
                      onClick={() => handleReverify(e)}
                      disabled={verifying}
                      className="tap p-1.5 text-muted-foreground hover:text-secondary"
                      aria-label="Re-vérifier"
                    >
                      <Check size={13} />
                    </button>
                    <button
                      onClick={() => handleRemoveExtra(e.id)}
                      className="tap p-1.5 text-destructive"
                      aria-label="Supprimer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </HoloCard>

      

      <ElevenLabsCard
        existing={extras.find((e) => e.provider === "elevenlabs")}
        onAdd={async (rawKey) => {
          setVerifying(true);
          try {
            const result = await verifyKey("elevenlabs", rawKey);
            const entry: ExtraApiKey = {
              id: crypto.randomUUID(),
              provider: "elevenlabs",
              key: rawKey,
              label: EXTRA_PROVIDERS.elevenlabs.label,
              addedAt: Date.now(),
              valid: result.valid,
              message: result.message,
              enabled: true,
            };
            setExtras(addExtraKey(entry));
            toast[result.valid ? "success" : "warning"](
              result.valid ? "Clé ElevenLabs vérifiée ✓" : `Non vérifiée : ${result.message}`,
            );
            emitKeysUpdated({ provider: "elevenlabs", action: "add" });
          } finally {
            setVerifying(false);
          }
        }}
        onToggle={handleToggleEnabled}
        onRemove={handleRemoveExtra}
        verifying={verifying}
      />

      <VoiceIdCard />


      <HoloCard variant="cyan">
        <div className="p-5">
          <h3 className="text-xs font-display font-black uppercase tracking-[0.2em] text-primary mb-1 flex items-center gap-2">
            <ScanFace size={14} /> Face ID / Touch ID
          </h3>
          <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
            Déverrouille Magic avec la biométrie native de ton iPhone (Face ID). Le code 187 reste
            disponible en secours.
          </p>

          {!isBiometricSupported() ? (
            <div className="text-[10px] text-destructive font-bold uppercase tracking-widest">
              Non supporté sur ce navigateur
            </div>
          ) : !bioSupported ? (
            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              Aucun authentificateur détecté. Ajoute Magic à l'écran d'accueil.
            </div>
          ) : !bioEnrolled ? (
            <button
              onClick={handleEnrollBio}
              disabled={bioBusy}
              className="tap w-full py-2.5 rounded-xl border border-primary/40 bg-primary/10 text-primary font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ScanFace size={12} />
              {bioBusy ? "En cours…" : "Activer Face ID"}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary">
                <CheckCircle2 size={12} /> Face ID activé
              </div>
              <button
                onClick={handleTestBio}
                disabled={bioBusy}
                className="tap w-full py-2.5 rounded-xl border border-primary/40 bg-primary/10 text-primary font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ScanFace size={12} />
                {bioBusy ? "Vérification…" : "Tester Face ID"}
              </button>
              <button
                onClick={handleClearBio}
                className="tap w-full py-2.5 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
              >
                <Trash2 size={12} /> Supprimer Face ID
              </button>
            </div>
          )}
        </div>
      </HoloCard>

      <VoiceEnroll />
    </div>
  );

  // ===== PAGE 2 : App, Notifications & Préférences =====
  const Page2 = (
    <div className="flex flex-col gap-4">
      <CreatorIdentity />

      <HoloCard variant="cyan">
        <div className="p-5">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              {pushOn ? (
                <Bell size={16} className="text-primary shrink-0" />
              ) : (
                <BellOff size={16} className="text-muted-foreground shrink-0" />
              )}
              <h3 className="text-xs font-display font-black uppercase tracking-[0.2em] text-foreground truncate">
                Notifications push
              </h3>
            </div>
            <button
              onClick={togglePush}
              disabled={!pushSupported}
              className={`tap shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                pushOn
                  ? "bg-gradient-prism text-primary-foreground border-transparent shadow-holo"
                  : "bg-card/40 text-muted-foreground border-border"
              } ${!pushSupported ? "opacity-40" : ""}`}
            >
              {pushOn ? "Activées" : "Activer"}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground leading-snug">
            {pushSupported
              ? "Reçois coups d'envoi, scores et résultats finaux directement — même en arrière-plan."
              : "Ton navigateur ne supporte pas les notifications push."}
          </p>
        </div>
      </HoloCard>

      <HoloCard variant="violet">
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sliders size={16} className="text-secondary shrink-0" />
            <h3 className="text-xs font-display font-black uppercase tracking-[0.2em] text-foreground truncate">
              Mise par défaut
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              inputMode="decimal"
              min={1}
              value={defaultStake}
              onChange={(e) => onDefaultStakeChange(Number(e.target.value) || 0)}
              className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-background/60 border border-border text-foreground text-sm focus:border-primary focus:outline-none"
            />
            <span className="text-2xl font-display font-black holo-text shrink-0">€</span>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {[5, 10, 25, 50].map((v) => (
              <button
                key={v}
                onClick={() => onDefaultStakeChange(v)}
                className={`tap py-2 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                  defaultStake === v
                    ? "bg-gradient-prism text-primary-foreground shadow-holo"
                    : "bg-card/40 border border-border text-muted-foreground"
                }`}
              >
                {v}€
              </button>
            ))}
          </div>
        </div>
      </HoloCard>

      <HoloCard variant="magenta">
        <div className="p-5">
          <h3 className="text-xs font-display font-black uppercase tracking-[0.2em] text-destructive mb-3 truncate">
            Zone dangereuse
          </h3>
          <button
            onClick={() => {
              try {
                localStorage.removeItem("magic.unlock.until");
              } catch {
                /* noop */
              }
              toast.success("Magic verrouillé");
              setTimeout(() => window.location.reload(), 300);
            }}
            className="tap w-full py-2.5 mb-2 rounded-xl border border-primary/40 bg-primary/10 text-primary font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
          >
            <Lock size={12} /> Verrouiller maintenant
          </button>
          <button
            onClick={() => {
              onResetHistory();
              toast.success("Historique réinitialisé");
            }}
            className="tap w-full py-2.5 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
          >
            <Trash2 size={12} /> Réinitialiser l'historique
          </button>
        </div>
      </HoloCard>

      <div className="flex items-center justify-center gap-2 text-muted-foreground py-2">
        <Info size={12} />
        <span className="text-[9px] font-bold uppercase tracking-widest">
          Magic · iPhone Edition
        </span>
      </div>
    </div>
  );

  const pageTitle = page === 0 ? "Clés API · Sécurité" : "App · Notifications";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4"
    >
      <div className="flex items-center gap-3 px-1">
        <button
          onClick={onBack}
          className="tap w-11 h-11 rounded-xl glass flex items-center justify-center shrink-0"
          aria-label="Retour"
        >
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-display font-black uppercase tracking-[0.2em] holo-text truncate">
            Paramètres
          </h2>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5 truncate">
            {pageTitle}
          </p>
        </div>
      </div>

      {/* Pager tabs 50/50 */}
      <div className="grid grid-cols-2 gap-2 px-1">
        {(["Clés & Sécurité", "App & Notif."] as const).map((label, i) => {
          const active = page === i;
          return (
            <button
              key={label}
              onClick={() => setPage(i as 0 | 1)}
              className={`tap py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${
                active
                  ? "bg-gradient-holo text-primary-foreground shadow-holo"
                  : "bg-card/40 border border-border text-muted-foreground"
              }`}
            >
              {i + 1}/2 · {label}
            </button>
          );
        })}
      </div>

      {/* Swipeable area */}
      <div ref={containerRef} className="relative overflow-hidden touch-pan-y">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={page}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, x: page === 0 ? -40 : 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: page === 0 ? 40 : -40 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            {page === 0 ? Page1 : Page2}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots indicator */}
      <div className="flex items-center justify-center gap-2 pt-1 pb-2">
        {[0, 1].map((i) => (
          <button
            key={i}
            onClick={() => setPage(i as 0 | 1)}
            aria-label={`Page ${i + 1}`}
            className={`tap h-1.5 rounded-full transition-all ${
              page === i ? "w-6 bg-primary shadow-holo" : "w-1.5 bg-muted-foreground/40"
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
};
