// Vision des PJ dans le brouillard : cônes, cases vues et rendu sur le canvas.
// Repères (voir gridMath) : positions en % (x de la largeur, y de la hauteur),
// grille et portées en % de la largeur ; `aspect` = hauteur / largeur.

import type { MapPoint } from "./gridMath";
import type { BattleMapGrid, TokenVision } from "./types";

/**
 * Le PJ voit toujours sa propre case et ses 8 voisines, quelle que soit
 * l'orientation : rayon (× √2) un peu au-delà du centre des voisines en diagonale.
 */
const SELF_RADIUS_CELLS = 1.05;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Écart entre deux angles, en degrés, dans [0, 180]. */
export function angleDiff(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return d > 180 ? 360 - d : d;
}

/** Orientation (degrés) d'un déplacement ; null s'il est trop court pour être significatif. */
export function directionFromMove(from: MapPoint, to: MapPoint, aspect: number): number | null {
  const dx = to.x - from.x;
  const dy = (to.y - from.y) * aspect;
  if (Math.hypot(dx, dy) < 0.5) return null;
  return Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
}

/** Orientation (degrés) d'un point vu depuis le jeton : poignée de rotation du cône. */
export function directionTowards(from: MapPoint, to: MapPoint, aspect: number): number {
  return Math.round((Math.atan2((to.y - from.y) * aspect, to.x - from.x) * 180) / Math.PI);
}

/** Bout du cône (dans l'axe), en coordonnées de map : position de la poignée. */
export function coneTip(origin: MapPoint, vision: TokenVision, grid: BattleMapGrid, aspect: number): MapPoint {
  const r = vision.range * grid.cellSize;
  const a = toRad(vision.direction);
  return { x: origin.x + Math.cos(a) * r, y: origin.y + (Math.sin(a) * r) / aspect };
}

/** Contour du cône pour un <polygon> SVG en viewBox 0 0 100 100 (coordonnées de map). */
export function conePolygonPoints(origin: MapPoint, vision: TokenVision, grid: BattleMapGrid, aspect: number, steps = 36): string {
  const r = vision.range * grid.cellSize;
  const full = vision.angle >= 360;
  const start = full ? 0 : vision.direction - vision.angle / 2;
  const span = full ? 360 : vision.angle;
  const points: string[] = full ? [] : [`${origin.x},${origin.y}`];
  for (let i = 0; i <= steps; i++) {
    const a = toRad(start + (span * i) / steps);
    points.push(`${(origin.x + Math.cos(a) * r).toFixed(3)},${(origin.y + (Math.sin(a) * r) / aspect).toFixed(3)}`);
  }
  return points.join(" ");
}

/**
 * Cases (« col,row ») dont le centre est dans le champ de vision : à portée et
 * dans l'ouverture du cône, plus la case du PJ et ses voisines immédiates.
 */
export function visibleCellKeys(origin: MapPoint, vision: TokenVision, grid: BattleMapGrid, aspect: number): string[] {
  const { cellSize, offsetX, offsetY } = grid;
  const ox = origin.x;
  const oy = origin.y * aspect;
  const radius = vision.range * cellSize;
  const height = 100 * aspect;
  const keys: string[] = [];
  const minCol = Math.floor((Math.max(0, ox - radius) - offsetX) / cellSize);
  const maxCol = Math.floor((Math.min(100, ox + radius) - offsetX) / cellSize);
  const minRow = Math.floor((Math.max(0, oy - radius) - offsetY) / cellSize);
  const maxRow = Math.floor((Math.min(height, oy + radius) - offsetY) / cellSize);
  for (let col = minCol; col <= maxCol; col++) {
    for (let row = minRow; row <= maxRow; row++) {
      const cx = offsetX + (col + 0.5) * cellSize;
      const cy = offsetY + (row + 0.5) * cellSize;
      const dx = cx - ox;
      const dy = cy - oy;
      const dist = Math.hypot(dx, dy);
      const inSelf = dist <= SELF_RADIUS_CELLS * cellSize * Math.SQRT2;
      const inCone =
        dist <= radius &&
        (vision.angle >= 360 || angleDiff((Math.atan2(dy, dx) * 180) / Math.PI, vision.direction) <= vision.angle / 2);
      if (inSelf || inCone) keys.push(`${col},${row}`);
    }
  }
  return keys;
}

/** Lit une portée de vision dans les traits d'un peuple (« Vision dans le noir à 20m »). */
export function parseVisionMeters(text: string | null | undefined): number | null {
  if (!text) return null;
  const match = /vision[^.;\n]*?(\d+(?:[.,]\d+)?)\s*m\b/i.exec(text);
  if (!match) return null;
  const meters = Number(match[1].replace(",", "."));
  return Number.isFinite(meters) && meters > 0 ? meters : null;
}

export interface VisionFogInput {
  grid: BattleMapGrid;
  /** Cases déjà vues : révélées partiellement (assombries). */
  explored: string[];
  /** Cônes des PJ : position du jeton et réglages. */
  cones: Array<{ origin: MapPoint; vision: TokenVision }>;
}

/** Opacité du brouillard restant sur les zones déjà vues. */
const EXPLORED_FOG_ALPHA = 0.55;

/**
 * Perce le brouillard (canvas déjà rempli de noir) : zones vues assombries, cônes
 * actuels nets. À appeler après les révélations du pinceau ; mode destination-out.
 */
export function drawVisionReveal(ctx: CanvasRenderingContext2D, width: number, height: number, input: VisionFogInput) {
  const { grid, explored, cones } = input;
  const unit = width / 100; // px pour 1 % de largeur
  const cell = grid.cellSize * unit;
  const blur = Math.max(1, Math.round(cell * 0.15));

  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.filter = `blur(${blur}px)`;

  // Zones déjà vues : le brouillard s'éclaircit sans disparaître.
  if (explored.length) {
    ctx.globalAlpha = 1 - EXPLORED_FOG_ALPHA;
    ctx.beginPath();
    for (const key of explored) {
      const [col, row] = key.split(",").map(Number);
      ctx.rect((grid.offsetX + col * grid.cellSize) * unit, (grid.offsetY + row * grid.cellSize) * unit, cell + 0.5, cell + 0.5);
    }
    ctx.fill();
  }

  // Champ de vision actuel : entièrement dégagé.
  ctx.globalAlpha = 1;
  for (const { origin, vision } of cones) {
    const cx = (origin.x / 100) * width;
    const cy = (origin.y / 100) * height;
    const radius = vision.range * cell;
    ctx.beginPath();
    if (vision.angle >= 360) {
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    } else {
      const a = toRad(vision.direction);
      const half = toRad(vision.angle / 2);
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, a - half, a + half);
      ctx.closePath();
    }
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, SELF_RADIUS_CELLS * cell * Math.SQRT2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
