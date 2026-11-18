import { memo, useMemo } from "react";
import type { BattleMapGrid } from "./types";

interface GridOverlayProps {
  grid: BattleMapGrid;
  /** Hauteur / largeur de l'image : les cases restent carrées. */
  aspect: number;
  className?: string;
}

/**
 * Quadrillage dessiné par-dessus l'image, dans le même repère qu'elle (il suit
 * zoom et déplacement). Le SVG mesure 100 unités de large, soit une unité = 1 %
 * de la largeur de l'image, comme les réglages de la grille.
 */
export const GridOverlay = memo(function GridOverlay({ grid, aspect, className = "" }: GridOverlayProps) {
  const height = 100 * aspect;

  const path = useMemo(() => {
    const { cellSize, offsetX, offsetY } = grid;
    if (!(cellSize > 0) || !(height > 0)) return "";
    const segments: string[] = [];
    for (let x = offsetX % cellSize; x <= 100; x += cellSize) segments.push(`M${x.toFixed(3)} 0V${height.toFixed(3)}`);
    for (let y = offsetY % cellSize; y <= height; y += cellSize) segments.push(`M0 ${y.toFixed(3)}H100`);
    return segments.join("");
  }, [grid, height]);

  if (!path) return null;
  const stroke = grid.color === "dark" ? "#000" : "#fff";

  return (
    <svg
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={path} fill="none" stroke={stroke} strokeOpacity={grid.opacity} strokeWidth={1} vectorEffect="non-scaling-stroke" />
    </svg>
  );
});
