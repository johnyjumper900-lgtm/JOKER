import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, ChevronDown, ChevronUp, Activity } from "lucide-react";
import { runSystemDiagnostic, type ProviderCheck, type ProviderStatus } from "@/lib/system-status";
import { onKeysUpdated } from "@/lib/keys-events";

const STATUS_DOT: Record<ProviderStatus, string> = {
  ok: "bg-success",
  missing: "bg-muted-foreground/40",
  quota: "bg-amber-400",
  invalid: "bg-destructive",
  error: "bg-destructive",
};

const STATUS_LABEL: Record<ProviderStatus, string> = {
  ok: "OK",
  missing: "—",
  quota: "Quota",
  invalid: "Invalide",
  error: "Erreur",
};

export const SystemStatusBar = () => {
  const [checks, setChecks] = useState<ProviderCheck[]>([]);
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const run = useCallback(async () => {
    setRunning(true);
    try {
      const r = await runSystemDiagnostic();
      setChecks(r);
      setLastRun(new Date());
    } finally {
      setRunning(false);
    }
  }, []);

  // Auto-run au démarrage
  useEffect(() => {
    run();
  }, [run]);

  // Re-run quand l'utilisateur change une clé API
  useEffect(() => {
    return onKeysUpdated(() => {
      run();
    });
  }, [run]);

  const okCount = checks.filter((c) => c.status === "ok").length;
  const totalConfigured = checks.filter((c) => c.status !== "missing").length;
  const hasIssue = checks.some(
    (c) => c.status === "invalid" || c.status === "error" || c.status === "quota",
  );

  const summaryColor = !checks.length
    ? "text-muted-foreground"
    : hasIssue
      ? "text-amber-400"
      : okCount > 0
        ? "text-success"
        : "text-muted-foreground";

  return (
    <div className="max-w-md mx-auto px-4 mb-2">
      <div className="rounded-xl glass border border-border overflow-hidden">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen((o) => !o);
            }
          }}
          className="w-full flex items-center gap-2 px-3 py-2 tap"
          aria-label="Statut système"
        >
          <Activity size={14} className={summaryColor} />
          <div className="flex-1 text-left min-w-0">
            <p
              className={`text-[10px] font-black uppercase tracking-widest ${summaryColor} truncate`}
            >
              Système · {okCount}/{totalConfigured || 0} API actives
              {running ? " · vérification…" : ""}
            </p>
            {lastRun && (
              <p className="text-[8.5px] text-muted-foreground truncate">
                Dernier check :{" "}
                {lastRun.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              run();
            }}
            disabled={running}
            className="tap p-1.5 text-muted-foreground hover:text-primary disabled:opacity-40"
            aria-label="Refresh diagnostic"
          >
            <RefreshCw size={13} className={running ? "animate-spin" : ""} />
          </button>
          {open ? (
            <ChevronUp size={14} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={14} className="text-muted-foreground" />
          )}
        </div>

        <AnimatePresence>
          {open && checks.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border"
            >
              <div className="px-3 py-2 space-y-1.5">
                {checks.filter(c => c.status !== "missing").map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${STATUS_DOT[c.status]} shrink-0`} />
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-foreground flex-1 min-w-0 truncate">
                      {c.label}
                    </span>
                    <span className="text-[9.5px] text-muted-foreground truncate">{c.message}</span>
                    <span
                      className={`text-[9px] font-black uppercase tracking-widest ${
                        c.status === "ok"
                          ? "text-success"
                          : c.status === "quota"
                            ? "text-amber-400"
                            : c.status === "missing"
                              ? "text-muted-foreground/60"
                              : "text-destructive"
                      }`}
                    >
                      {STATUS_LABEL[c.status]}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
