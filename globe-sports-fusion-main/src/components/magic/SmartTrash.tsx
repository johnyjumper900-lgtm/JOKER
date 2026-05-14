import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";

interface SmartTrashProps {
  onClick: () => void;
  size?: number;
  className?: string;
  label?: string;
}

export const SmartTrash = ({ onClick, size = 14, className = "", label }: SmartTrashProps) => {
  return (
    <motion.button
      whileHover="hover"
      whileTap="tap"
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        onClick();
      }}
      className={`relative group/trash flex items-center gap-1.5 px-2 py-1.5 rounded-lg overflow-hidden transition-all duration-300 ${className}`}
      aria-label={label || "Supprimer"}
    >
      {/* Background realistic glow */}
      <div className="absolute inset-0 bg-destructive/5 group-hover/trash:bg-destructive/15 transition-colors" />
      <motion.div
        variants={{
          hover: { opacity: 0.15, scale: 1.2 },
          tap: { opacity: 0.25, scale: 0.9 },
        }}
        className="absolute inset-0 bg-destructive blur-xl opacity-0"
      />
      
      {/* Icon layer with subtle movement */}
      <div className="relative pointer-events-none">
        <motion.div
          variants={{
            hover: { y: -1, rotate: [-2, 2, -2] },
            tap: { scale: 0.8 },
          }}
          transition={{ duration: 0.2 }}
        >
          <Trash2 
            size={size} 
            className="text-destructive group-hover/trash:text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)] transition-colors" 
          />
        </motion.div>
      </div>

      {label && (
        <span className="relative text-[9px] font-black uppercase tracking-widest text-destructive group-hover/trash:text-red-500 transition-colors pointer-events-none">
          {label}
        </span>
      )}

      {/* Realistic heat wave effect on hover */}
      <motion.div
        variants={{
          hover: { x: ["-100%", "200%"], opacity: [0, 0.5, 0] },
        }}
        transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-red-400/20 to-transparent skew-x-12 pointer-events-none"
      />
    </motion.button>
  );
};
