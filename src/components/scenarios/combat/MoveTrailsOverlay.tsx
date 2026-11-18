import { memo } from "react";
import { formatGridDistance, type MoveTrail } from "./gridMath";

interface MoveTrailsOverlayProps {
  trails: MoveTrail[];
  metersPerCell: number;
  /** Taille des jetons en px : l'étiquette se place juste au-dessus. */
  tokenSize: number;
}

/**
 * Trajets du tour sur la battlemap (MJ et écran streaming) : point de départ,
 * ligne pointillée et décompte « N cases · X m » au-dessus du jeton.
 * À placer dans le conteneur aligné sur l'image (coordonnées en %).
 */
export const MoveTrailsOverlay = memo(function MoveTrailsOverlay({ trails, metersPerCell, tokenSize }: MoveTrailsOverlayProps) {
  if (trails.length === 0) return null;
  return (
    <>
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-15" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {trails.map((trail) => (
          <line
            key={trail.id}
            x1={trail.origin.x}
            y1={trail.origin.y}
            x2={trail.position.x}
            y2={trail.position.y}
            stroke={trail.isDragged ? "#fcd34d" : "rgba(253, 230, 138, 0.6)"}
            strokeWidth={trail.isDragged ? 3 : 2}
            strokeDasharray="7 5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      {trails.map((trail) => (
        <div key={trail.id}>
          <div
            className="absolute z-15 w-3 h-3 rounded-full border-2 border-amber-300/80 bg-black/40 pointer-events-none"
            style={{ left: `${trail.origin.x}%`, top: `${trail.origin.y}%`, transform: "translate(-50%, -50%)" }}
          />
          <div
            className={`absolute z-30 pointer-events-none px-2 py-0.5 rounded-full whitespace-nowrap font-semibold border shadow-lg ${
              trail.isDragged
                ? "bg-amber-400 text-black border-amber-200 text-[12px]"
                : "bg-black/75 text-amber-200 border-amber-300/40 text-[10px]"
            }`}
            style={{
              left: `${trail.position.x}%`,
              top: `${trail.position.y}%`,
              transform: `translate(-50%, calc(-100% - ${tokenSize / 2 + 6}px))`,
            }}
          >
            {formatGridDistance(trail.cells, metersPerCell)}
          </div>
        </div>
      ))}
    </>
  );
});
