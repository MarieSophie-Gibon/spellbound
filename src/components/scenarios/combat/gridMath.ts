// Géométrie du quadrillage. Les positions sur la map sont en % : x en % de la
// largeur de l'image, y en % de sa hauteur. La grille, elle, est exprimée en %
// de la largeur dans les deux sens (cases carrées) : `aspect` (hauteur / largeur)
// fait la conversion.

import { GRID_CELL_MAX, GRID_CELL_MIN } from "./types";

export interface MapPoint {
  x: number;
  y: number;
}

/**
 * Outil « Caler sur la carte » : le MJ trace un rectangle couvrant `cols` × `rows`
 * cases de la grille dessinée sur l'image. On en déduit la taille d'une case
 * (moyenne des deux sens, pour lisser l'imprécision du tracé) et le décalage.
 * Renvoie null si le tracé est trop petit pour être exploitable.
 */
export function gridFromCalibration(
  a: MapPoint,
  b: MapPoint,
  aspect: number,
  cols: number,
  rows: number,
): { cellSize: number; offsetX: number; offsetY: number } | null {
  if (!(aspect > 0) || cols < 1 || rows < 1) return null;
  const left = Math.min(a.x, b.x);
  const top = Math.min(a.y, b.y) * aspect;
  const width = Math.abs(b.x - a.x);
  const height = Math.abs(b.y - a.y) * aspect;
  if (width < 0.2 || height < 0.2) return null;

  const cellSize = Math.min(GRID_CELL_MAX, Math.max(GRID_CELL_MIN, (width / cols + height / rows) / 2));
  const wrap = (v: number) => ((v % cellSize) + cellSize) % cellSize;
  return { cellSize, offsetX: wrap(left), offsetY: wrap(top) };
}
