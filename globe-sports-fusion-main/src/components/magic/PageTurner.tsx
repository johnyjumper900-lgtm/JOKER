import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useAnimation } from "framer-motion";
import type { TabKey } from "./TabBar";

interface PageTurnerProps {
  /** Onglet actif. */
  active: TabKey;
  /** Liste ORDONNÉE des onglets (doit matcher TabBar). */
  order: TabKey[];
  /** Bascule vers un nouvel onglet. */
  onChange: (k: TabKey) => void;
  /** Contenu de la page courante. */
  children: ReactNode;
}

/**
 * PageTurner — enveloppe le contenu d'un onglet avec :
 *   • Swipe gauche/droite (souris + tactile) pour passer d'un module à l'autre
 *   • Animation "tournage de page" 3D (rotation Y + perspective)
 *   • Touches ← / → pour basculer au clavier
 *
 * Le composant ne gère que la NAVIGATION ; le contenu est passé en children
 * et re-rendu à chaque changement d'onglet via la key="active".
 */
export const PageTurner = ({ active, order, onChange, children }: PageTurnerProps) => {
  const controls = useAnimation();
  const prevActive = useRef<TabKey>(active);
  const direction = useRef<1 | -1>(1);

  // Détermine la direction du tournage : 1 = on avance (page va vers la gauche),
  // -1 = on recule (page va vers la droite).
  useMemo(() => {
    const prevIdx = order.indexOf(prevActive.current);
    const nextIdx = order.indexOf(active);
    if (prevIdx !== -1 && nextIdx !== -1 && nextIdx !== prevIdx) {
      direction.current = nextIdx > prevIdx ? 1 : -1;
    }
    prevActive.current = active;
  }, [active, order]);

  const goRelative = (delta: number) => {
    const idx = order.indexOf(active);
    if (idx === -1) return;
    const next = idx + delta;
    if (next < 0 || next >= order.length) return;
    onChange(order[next]);
  };

  // Navigation clavier
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore si l'utilisateur tape dans un input/textarea
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goRelative(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goRelative(1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const dir = direction.current;
  const variants = {
    enter: (d: 1 | -1) => ({
      opacity: 0,
      rotateY: d === 1 ? 65 : -65,
      x: d === 1 ? "55%" : "-55%",
      filter: "brightness(0.7)",
    }),
    center: {
      opacity: 1,
      rotateY: 0,
      x: 0,
      filter: "brightness(1)",
    },
    exit: (d: 1 | -1) => ({
      opacity: 0,
      rotateY: d === 1 ? -65 : 65,
      x: d === 1 ? "-55%" : "55%",
      filter: "brightness(0.7)",
    }),
  };

  return (
    <div style={{ perspective: 1400 }} className="relative w-full">
      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.div
          key={active}
          custom={dir}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            type: "spring",
            stiffness: 220,
            damping: 28,
            mass: 0.9,
          }}
          drag="x"
          dragElastic={0.15}
          dragMomentum={false}
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={(_e: unknown, info: { offset: { x: number; y: number }; velocity: { x: number } }) => {
            const threshold = 70;
            const velocityHit = Math.abs(info.velocity.x) > 450;
            const horizontal = Math.abs(info.offset.x) > Math.abs(info.offset.y);
            const offsetHit = Math.abs(info.offset.x) > threshold;
            if (!horizontal || (!offsetHit && !velocityHit)) {
              controls.start({ x: 0 });
              return;
            }
            if (info.offset.x < 0) {
              goRelative(1); // swipe gauche → page suivante
            } else {
              goRelative(-1); // swipe droite → page précédente
            }
          }}
          style={{
            transformStyle: "preserve-3d",
            backfaceVisibility: "hidden",
            willChange: "transform, opacity",
            WebkitTapHighlightColor: "transparent",
          }}
          className="touch-pan-y select-none"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
