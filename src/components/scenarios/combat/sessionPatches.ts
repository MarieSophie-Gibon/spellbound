// Différences et fusions pour la session de combat partagée : seuls les jetons et les coups de
// pinceau du brouillard modifiés voyagent sur le réseau, jamais les listes complètes.

import type { FogRevealStamp, MapToken } from "./types";

// ── Jetons ───────────────────────────────────────────────────────────────────

export interface TokensPatch {
  upserts: MapToken[];
  removed: string[];
}

export function diffTokens(prev: MapToken[], next: MapToken[]): TokensPatch {
  const prevById = new Map(prev.map((t) => [t.combatantId, t]));
  const nextIds = new Set(next.map((t) => t.combatantId));
  return {
    upserts: next.filter((t) => {
      const before = prevById.get(t.combatantId);
      return !before || before.x !== t.x || before.y !== t.y;
    }),
    removed: prev.filter((t) => !nextIds.has(t.combatantId)).map((t) => t.combatantId),
  };
}

export function applyTokensPatch(tokens: MapToken[], patch: TokensPatch): MapToken[] {
  const removed = new Set(patch.removed);
  const upsertById = new Map(patch.upserts.map((t) => [t.combatantId, t]));
  const next = tokens
    .filter((t) => !removed.has(t.combatantId))
    .map((t) => upsertById.get(t.combatantId) ?? t);
  const known = new Set(tokens.map((t) => t.combatantId));
  for (const t of patch.upserts) if (!known.has(t.combatantId) && !removed.has(t.combatantId)) next.push(t);
  return next;
}

export const tokenSig = (t: MapToken) => `${t.x},${t.y}`;

// ── Brouillard ───────────────────────────────────────────────────────────────

export interface FogStroke {
  id: number;
  r: number;
  points: Array<{ x: number; y: number }>;
}

export interface FogPatch {
  // Vrai : tout le brouillard est effacé avant d'appliquer les coups envoyés.
  reset: boolean;
  upserts: FogStroke[];
  removed: number[];
}

// Regroupe les points par coup de pinceau, dans l'ordre (même logique que BattleMap).
export function stampsToStrokes(stamps: FogRevealStamp[]): FogStroke[] {
  const byId = new Map<number, FogStroke>();
  const ordered: FogStroke[] = [];
  let fallbackId = 1;
  for (const stamp of stamps) {
    const id = Number.isFinite(stamp.strokeId) ? Number(stamp.strokeId) : fallbackId++;
    let stroke = byId.get(id);
    if (!stroke) {
      stroke = { id, r: stamp.r, points: [] };
      byId.set(id, stroke);
      ordered.push(stroke);
    }
    stroke.r = stamp.r;
    stroke.points.push({ x: stamp.x, y: stamp.y });
  }
  return ordered;
}

export function strokesToStamps(strokes: FogStroke[]): FogRevealStamp[] {
  return strokes.flatMap((stroke) => stroke.points.map((p) => ({ x: p.x, y: p.y, r: stroke.r, strokeId: stroke.id })));
}

// Signature légère d'un coup : suffit à détecter un coup prolongé ou modifié.
export function strokeSig(stroke: FogStroke): string {
  const last = stroke.points[stroke.points.length - 1];
  return `${stroke.r}|${stroke.points.length}|${last ? `${last.x},${last.y}` : ""}`;
}

export function diffFogStrokes(prev: FogStroke[], next: FogStroke[]): FogPatch {
  const prevSigs = new Map(prev.map((s) => [s.id, strokeSig(s)]));
  const nextIds = new Set(next.map((s) => s.id));
  return {
    reset: false,
    upserts: next.filter((s) => prevSigs.get(s.id) !== strokeSig(s)),
    removed: prev.filter((s) => !nextIds.has(s.id)).map((s) => s.id),
  };
}

export function applyFogPatch(stamps: FogRevealStamp[], patch: FogPatch): FogRevealStamp[] {
  const removed = new Set(patch.removed);
  const upsertById = new Map(patch.upserts.map((s) => [s.id, s]));
  const strokes = (patch.reset ? [] : stampsToStrokes(stamps))
    .filter((s) => !removed.has(s.id))
    .map((s) => upsertById.get(s.id) ?? s);
  const known = new Set(strokes.map((s) => s.id));
  for (const s of patch.upserts) if (!known.has(s.id) && !removed.has(s.id)) strokes.push(s);
  return strokesToStamps(strokes);
}

// Coordonnées arrondies au centième de pourcent : invisible à l'écran, messages bien plus légers.
const round2 = (n: number) => Math.round(n * 100) / 100;
export function compactStroke(stroke: FogStroke): FogStroke {
  return { id: stroke.id, r: round2(stroke.r), points: stroke.points.map((p) => ({ x: round2(p.x), y: round2(p.y) })) };
}

// Découpe tout le brouillard en messages de taille raisonnable (le premier efface l'existant).
export function chunkFogForTransfer(strokes: FogStroke[], maxPointsPerChunk = 2000): FogPatch[] {
  const chunks: FogPatch[] = [];
  let current: FogStroke[] = [];
  let count = 0;
  for (const stroke of strokes.map(compactStroke)) {
    if (count > 0 && count + stroke.points.length > maxPointsPerChunk) {
      chunks.push({ reset: chunks.length === 0, upserts: current, removed: [] });
      current = [];
      count = 0;
    }
    current.push(stroke);
    count += stroke.points.length;
  }
  chunks.push({ reset: chunks.length === 0, upserts: current, removed: [] });
  return chunks;
}
