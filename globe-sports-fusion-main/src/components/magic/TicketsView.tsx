import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket as TicketIcon,
  Trash2,
  Clock,
  Trophy,
  X,
  Upload,
  Radio,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";
import type { HistoryItem } from "@/types/magic";
import { HoloCard } from "./HoloCard";
import { HoloLogo } from "./HoloLogo";
import { ImportTicketDialog } from "./ImportTicketDialog";
import { SmartTrash } from "./SmartTrash";
import { WinamaxTicketCard } from "./WinamaxTicketCard";

interface TicketsViewProps {
  tickets: HistoryItem[];
  onValidate: (id: string) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onSetPickResult?: (
    ticketId: string,
    pickIndex: number,
    result: "won" | "lost" | "pending",
  ) => void;
  onImport?: (ticket: HistoryItem) => void;
}

type GlobalStatus = "won" | "lost" | "live" | "draft";

const computeGlobalStatus = (t: HistoryItem): GlobalStatus => {
  if (t.status !== "validated") return "draft";
  const picks = t.picks ?? [];
  if (picks.length === 0) return "live";
  if (picks.some((p) => p.result === "lost")) return "lost";
  if (picks.every((p) => p.result === "won")) return "won";
  return "live";
};

const formatPickDate = (d?: string) => {
  if (!d) return "";
  try {
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return d;
    return parsed.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  } catch {
    return d;
  }
};

type FilterKey = "all" | "live" | "won" | "lost" | "draft";

const FILTERS: Array<{ key: FilterKey; label: string; icon: typeof Radio }> = [
  { key: "all", label: "Tous", icon: TicketIcon },
  { key: "live", label: "En cours", icon: Radio },
  { key: "won", label: "Gagnés", icon: Trophy },
  { key: "lost", label: "Perdus", icon: XCircle },
  { key: "draft", label: "Brouillons", icon: Sparkles },
];

export const TicketsView = ({
  tickets,
  onValidate,
  onDelete,
  onClearAll,
  onImport,
  onSetPickResult,
}: TicketsViewProps) => {
  const [importOpen, setImportOpen] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  useEffect(() => {
    const onOpen = () => setImportOpen(true);
    window.addEventListener("magic:open-ticket-import", onOpen);
    return () => window.removeEventListener("magic:open-ticket-import", onOpen);
  }, []);

  const counts = useMemo(() => {
    const acc = { all: tickets.length, live: 0, won: 0, lost: 0, draft: 0 };
    for (const t of tickets) {
      const s = computeGlobalStatus(t);
      acc[s] += 1;
    }
    return acc;
  }, [tickets]);

  const visible = useMemo(() => {
    const sorted = [...tickets].sort((a, b) => {
      const sa = computeGlobalStatus(a);
      const sb = computeGlobalStatus(b);
      // Ordre : live → draft → won → lost
      const order: Record<GlobalStatus, number> = { live: 0, draft: 1, won: 2, lost: 3 };
      if (order[sa] !== order[sb]) return order[sa] - order[sb];
      return (b.validatedAt || b.date || "").localeCompare(a.validatedAt || a.date || "");
    });
    if (filter === "all") return sorted;
    return sorted.filter((t) => computeGlobalStatus(t) === filter);
  }, [tickets, filter]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <HoloLogo icon={TicketIcon} size={40} />
          <div>
            <h2 className="text-sm font-display font-black uppercase tracking-[0.18em] holo-text">
              Mes Paris
            </h2>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
              {tickets.length} ticket{tickets.length > 1 ? "s" : ""} · suivi auto
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onImport && (
            <button
              onClick={() => setImportOpen(true)}
              className="tap px-2.5 py-1.5 rounded-lg bg-gradient-holo text-primary-foreground flex items-center gap-1 text-[9px] font-black uppercase tracking-widest shadow-holo"
              aria-label="Importer"
            >
              <Upload size={11} />
              Importer
            </button>
          )}
          {tickets.length > 0 && (
            <SmartTrash onClick={onClearAll} label="Effacer" size={12} />
          )}
        </div>
      </div>

      {/* Filtres classement dynamique */}
      {tickets.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const n = counts[f.key];
            const Icon = f.icon;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`tap shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[9.5px] font-black uppercase tracking-widest border transition-all ${
                  active
                    ? "bg-gradient-holo text-primary-foreground border-transparent shadow-holo"
                    : "bg-muted/20 text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                <Icon size={10} />
                {f.label}
                <span
                  className={`px-1.5 rounded-full text-[8.5px] ${
                    active ? "bg-background/25" : "bg-muted/40"
                  }`}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {tickets.length === 0 ? (
        <HoloCard variant="violet">
          <div className="p-8 text-center">
            <p className="text-xs text-muted-foreground">
              Aucun ticket pour le moment.
              <br />
              Importe une photo ou un PDF de ton ticket — Gemini lit tout tout seul.
            </p>
          </div>
        </HoloCard>
      ) : visible.length === 0 ? (
        <div className="p-6 text-center text-[11px] text-muted-foreground">
          Aucun ticket dans cette catégorie.
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {visible.map((t) => {
            const status = computeGlobalStatus(t);
            const isValidated = t.status === "validated";
            const picks = t.picks ?? [];
            const wonCount = picks.filter((p) => p.result === "won").length;
            const lostCount = picks.filter((p) => p.result === "lost").length;
            const settled = wonCount + lostCount;
            const progressPct = picks.length ? (wonCount / picks.length) * 100 : 0;

            const badge =
              status === "won"
                ? { label: "Gagné", cls: "bg-success text-success-foreground shadow-[0_0_10px_rgba(34,197,94,0.3)]", Icon: Trophy }
                : status === "lost"
                  ? {
                      label: "Perdu",
                      cls: "bg-destructive text-destructive-foreground",
                      Icon: XCircle,
                    }
                  : status === "live"
                    ? {
                        label: "A Venir",
                        cls: "bg-muted/30 text-white/70 border border-white/10",
                        Icon: Clock,
                      }
                    : { label: "Brouillon", cls: "bg-muted text-muted-foreground", Icon: Sparkles };

            const cardVariant: "cyan" | "violet" | "gold" =
              status === "won" ? "gold" : status === "lost" ? "violet" : "cyan";

            const BadgeIcon = badge.Icon;

            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: "spring", damping: 24, stiffness: 260 }}
                className="relative group"
              >
                {/* Orbital Glow for winners */}
                {status === "won" && (
                  <div className="absolute -inset-2 bg-gradient-to-r from-success/20 via-gold/10 to-success/20 blur-2xl opacity-40 animate-pulse-slow pointer-events-none" />
                )}

                <WinamaxTicketCard 
                  ticket={t} 
                  status={status} 
                  onDelete={() => onDelete(t.id)} 
                  onValidate={() => onValidate(t.id)}
                  onSetPickResult={onSetPickResult ? (index, result) => onSetPickResult(t.id, index, result) : undefined}
                />
              </motion.div>
            );

          })}
        </AnimatePresence>
      )}
      {onImport && (
        <ImportTicketDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onImport={onImport}
        />
      )}
    </div>
  );
};
