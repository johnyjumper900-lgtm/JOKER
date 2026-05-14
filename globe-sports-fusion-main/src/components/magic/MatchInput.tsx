import { ListPlus } from "lucide-react";
import type { Match } from "@/types/magic";
import { HoloCard } from "./HoloCard";
import { HoloLogo } from "./HoloLogo";
import { motion, AnimatePresence } from "framer-motion";
import { SmartTrash } from "./SmartTrash";

interface MatchInputProps {
  matches: Match[];
  onAddMatch?: (a: string, b: string) => void;
  onRemoveMatch: (id: string) => void;
  onClearAll?: () => void;
}

export const MatchInput = ({
  matches,
  onRemoveMatch,
  onClearAll,
}: MatchInputProps) => {
  return (
    <HoloCard variant="cyan">
      <div className="p-3.5 sm:p-5 flex flex-col gap-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <HoloLogo icon={ListPlus} size={40} />
            <div>
              <h2 className="text-sm font-display font-black uppercase tracking-[0.18em] text-foreground">
                Tes matchs
              </h2>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
                {matches.length}/20 sélectionnés
              </p>
            </div>
          </div>
          {matches.length > 0 && onClearAll && (
            <SmartTrash
              onClick={onClearAll}
              size={14}
              className="bg-destructive/5 border border-destructive/20"
            />
          )}
        </div>

        {matches.length > 0 && (
          <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto scrollbar-none">
            <AnimatePresence>
              {matches.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/60"
                >
                  <span className="text-[11px] font-bold text-foreground uppercase tracking-wider truncate">
                    {m.teamA}{" "}
                    <span className="text-muted-foreground italic">vs</span>{" "}
                    {m.teamB}
                  </span>
                  <SmartTrash
                    onClick={() => onRemoveMatch(m.id)}
                    size={13}
                    className="p-1 px-1.5"
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </HoloCard>
  );
};
