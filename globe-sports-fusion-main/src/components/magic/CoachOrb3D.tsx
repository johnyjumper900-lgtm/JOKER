import ballImg from "@/assets/ball.png";

interface CoachOrb3DProps {
  listening: boolean;
  streaming: boolean;
}

/**
 * Coach Magic Ball : un vrai ballon photo-réaliste qui tourne,
 * sans fond ni décor.
 */
export const CoachOrb3D = ({ listening, streaming }: CoachOrb3DProps) => {
  const glow = streaming
    ? "0 0 90px hsl(45 100% 60% / 0.85)"
    : listening
      ? "0 0 90px hsl(48 100% 70% / 0.85)"
      : "0 0 50px hsl(45 100% 55% / 0.6)";

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div
        className="relative"
        style={{
          width: "70%",
          aspectRatio: "1 / 1",
          filter: `drop-shadow(${glow})`,
        }}
      >
        <img
          src={ballImg}
          alt="Ballon de football or"
          className="w-full h-full object-contain animate-[spin_6s_linear_infinite]"
          style={{
            transformOrigin: "50% 50%",
            filter:
              "sepia(1) saturate(6) hue-rotate(0deg) brightness(1.15) contrast(1.05) drop-shadow(0 0 12px hsl(45 100% 60% / 0.6))",
          }}
        />
      </div>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-background/60 backdrop-blur-sm border border-border text-xs text-foreground">
        {streaming ? "Magic parle…" : listening ? "À l'écoute…" : "Prêt"}
      </div>
    </div>
  );
};

export default CoachOrb3D;
