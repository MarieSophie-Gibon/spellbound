// Géométrie du quadrillage. Les positions sur la map sont en % : x en % de la
// largeur de l'image, y en % de sa hauteur. La grille, elle, est exprimée en %
// de la largeur dans les deux sens (cases carrées) : `aspect` (hauteur / largeur)
// fait la conversion.

import { GRID_CELL_MAX, GRID_CELL_MIN, type BattleMapGrid, type DiagonalRule } from "./types";

export interface GridCell {
  col: number;
  row: number;
}

/** Case qui contient un point de la map. */
export function cellAt(point: MapPoint, grid: BattleMapGrid, aspect: number): GridCell {
  return {
    col: Math.floor((point.x - grid.offsetX) / grid.cellSize),
    row: Math.floor((point.y * aspect - grid.offsetY) / grid.cellSize),
  };
}

/** Centre d'une case, en coordonnées de map (% largeur, % hauteur). */
export function cellCenter(cell: GridCell, grid: BattleMapGrid, aspect: number): MapPoint {
  return {
    x: grid.offsetX + (cell.col + 0.5) * grid.cellSize,
    y: (grid.offsetY + (cell.row + 0.5) * grid.cellSize) / aspect,
  };
}

/** Aimante un point au centre de sa case, sans sortir de l'image (cases partielles des bords). */
export function snapToCell(point: MapPoint, grid: BattleMapGrid, aspect: number): MapPoint {
  const center = cellCenter(cellAt(point, grid, aspect), grid, aspect);
  return { x: Math.max(0, Math.min(100, center.x)), y: Math.max(0, Math.min(100, center.y)) };
}

/**
 * Nombre de cases parcourues entre deux cases, selon la règle des diagonales :
 * - one : une diagonale compte 1 case (D&D 5e) ;
 * - alternate : une diagonale sur deux compte double (1-2-1) ;
 * - euclidean : distance réelle, arrondie au dixième.
 */
export function gridDistance(a: GridCell, b: GridCell, rule: DiagonalRule): number {
  const dx = Math.abs(b.col - a.col);
  const dy = Math.abs(b.row - a.row);
  const diagonals = Math.min(dx, dy);
  const straight = Math.max(dx, dy) - diagonals;
  switch (rule) {
    case "alternate":
      return straight + diagonals + Math.floor(diagonals / 2);
    case "euclidean":
      return Math.round(Math.hypot(dx, dy) * 10) / 10;
    default:
      return Math.max(dx, dy);
  }
}

const numberFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/** « 4 cases · 6 m » */
export function formatGridDistance(cells: number, metersPerCell: number): string {
  const cellLabel = `${numberFormat.format(cells)} case${cells >= 2 ? "s" : ""}`;
  return `${cellLabel} · ${numberFormat.format(cells * metersPerCell)} m`;
}

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
