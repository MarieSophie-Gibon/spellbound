// Validation des messages reçus sur la session de combat partagée.
// Un message invalide (forme inattendue, valeurs hors bornes, URL douteuse) est ignoré
// plutôt qu'appliqué à l'état du dashboard.

import type { CombatSessionEvent, CombatSlice, CombatSnapshot } from "./useCombatSession";

export type Sanitized<T = unknown> = { ok: true; value: T } | { ok: false };

const INVALID = { ok: false } as const;
const valid = <T>(value: T): Sanitized<T> => ({ ok: true, value });

const MAX_COMBATANTS = 500;
const MAX_TOKENS = 500;
const MAX_FOG_STAMPS = 50_000;
const MAX_TRIGGERS = 200;
const MAX_ENCOUNTERS = 1_000;
const MAX_TEXT = 20_000;
const MAX_ID = 200;
const MAX_URL = 4_096;

const COMBATANT_TYPES = new Set(["pj", "monster", "npc", "familier"]);
const CONDITION_KEYS = new Set(["ko", "poisoned", "prone", "stunned", "invisible", "restrained", "frightened", "burning"]);

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isId = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= MAX_ID;
const isText = (v: unknown, max = MAX_TEXT): v is string => typeof v === "string" && v.length <= max;
// Champs optionnels : absents, null ou vides sont acceptés.
const isOptionalId = (v: unknown) => v === undefined || v === null || v === "" || isId(v);
const isOptionalImage = (v: unknown) => v === undefined || v === null || v === "" || isSafeImageUrl(v);
const isPercent = (v: unknown): v is number => isFiniteNumber(v) && v >= -10 && v <= 110;

// Images affichées via <img src> : uniquement http(s), data:image ou chemin du site ("/…").
export function isSafeImageUrl(v: unknown): v is string {
  if (typeof v !== "string" || v.length > MAX_URL) return false;
  return /^https?:\/\//i.test(v) || /^data:image\//i.test(v) || /^\/(?!\/)/.test(v);
}

function isCombatant(v: unknown): boolean {
  if (!isObject(v)) return false;
  if (!isId(v.id) || !isText(v.name, 300) || !COMBATANT_TYPES.has(v.type as string)) return false;
  if (!isFiniteNumber(v.initiative) || !isFiniteNumber(v.pv) || !isFiniteNumber(v.pvMax)) return false;
  if (!Array.isArray(v.conditions) || !v.conditions.every((c) => CONDITION_KEYS.has(c as string))) return false;
  if (!isOptionalId(v.entityId) || !isOptionalImage(v.imageUrl)) return false;
  if (v.defense !== undefined && v.defense !== null && !isFiniteNumber(v.defense)) return false;
  if (v.hidden !== undefined && typeof v.hidden !== "boolean") return false;
  for (const key of ["tactics", "notes"] as const) {
    if (v[key] !== undefined && !isText(v[key])) return false;
  }
  for (const key of ["details", "pjStats"] as const) {
    if (v[key] !== undefined && v[key] !== null && !isObject(v[key])) return false;
  }
  for (const key of ["voies", "familiers"] as const) {
    if (v[key] !== undefined && !Array.isArray(v[key])) return false;
  }
  return true;
}

const isCombatantList = (v: unknown, max = MAX_COMBATANTS) =>
  Array.isArray(v) && v.length <= max && v.every(isCombatant);

const isPosition = (v: unknown) => isObject(v) && isPercent(v.x) && isPercent(v.y);

const isMapToken = (v: unknown) => isObject(v) && isId(v.combatantId) && isPercent(v.x) && isPercent(v.y);

const isFogStamp = (v: unknown) =>
  isObject(v) && isPercent(v.x) && isPercent(v.y) && isFiniteNumber(v.r) && v.r >= 0 && v.r <= 100 &&
  (v.strokeId === undefined || isFiniteNumber(v.strokeId));

const isTrigger = (v: unknown) =>
  isObject(v) && isId(v.id) && isText(v.label, 1_000) && isFiniteNumber(v.roundsLeft) && isFiniteNumber(v.createdAt) &&
  (v.hasFired === undefined || typeof v.hasFired === "boolean");

const isEncounter = (v: unknown) =>
  isObject(v) && isText(v.key, 500) && isText(v.name, 300) && COMBATANT_TYPES.has(v.type as string) &&
  isFiniteNumber(v.firstSeenAt) && isOptionalId(v.entityId) && isOptionalImage(v.imageUrl);

export function sanitizeSlice(slice: CombatSlice, value: unknown): Sanitized {
  switch (slice) {
    case "combatants":
      return isCombatantList(value) ? valid(value) : INVALID;
    case "activeCombatantId":
      return value === null || isId(value) ? valid(value) : INVALID;
    case "round":
      return isFiniteNumber(value) && Number.isInteger(value) && value >= 1 && value <= 10_000 ? valid(value) : INVALID;
    case "mapTokens":
      return Array.isArray(value) && value.length <= MAX_TOKENS && value.every(isMapToken) ? valid(value) : INVALID;
    case "encounters":
      return Array.isArray(value) && value.length <= MAX_ENCOUNTERS && value.every(isEncounter) ? valid(value) : INVALID;
    case "fogEnabled":
      return typeof value === "boolean" ? valid(value) : INVALID;
    case "fogReveals":
      return Array.isArray(value) && value.length <= MAX_FOG_STAMPS && value.every(isFogStamp) ? valid(value) : INVALID;
    case "combatNote":
      return isText(value) ? valid(value) : INVALID;
    case "roundTriggers":
      return Array.isArray(value) && value.length <= MAX_TRIGGERS && value.every(isTrigger) ? valid(value) : INVALID;
    case "battlemapUrl":
      return value === null || isSafeImageUrl(value) ? valid(value) : INVALID;
    default:
      return INVALID;
  }
}

const SLICES: readonly CombatSlice[] = [
  "combatants", "activeCombatantId", "round", "mapTokens", "encounters",
  "fogEnabled", "fogReveals", "combatNote", "roundTriggers", "battlemapUrl",
];

export function isCombatSlice(v: unknown): v is CombatSlice {
  return SLICES.includes(v as CombatSlice);
}

// Garde uniquement les tranches connues et valides d'un état complet.
export function sanitizeSnapshot(snapshot: unknown): CombatSnapshot {
  if (!isObject(snapshot)) return {};
  const result: CombatSnapshot = {};
  for (const slice of SLICES) {
    if (!(slice in snapshot)) continue;
    const checked = sanitizeSlice(slice, snapshot[slice]);
    if (checked.ok) result[slice] = checked.value;
  }
  return result;
}

export function sanitizeEvent(event: CombatSessionEvent, data: unknown): Sanitized {
  if (event === "combatants-patch") {
    if (!isObject(data)) return INVALID;
    const upserts = data.upserts ?? [];
    const removed = data.removed ?? [];
    if (!isCombatantList(upserts)) return INVALID;
    if (!Array.isArray(removed) || removed.length > MAX_COMBATANTS || !removed.every(isId)) return INVALID;
    return valid({ upserts, removed });
  }
  if (event === "drag-preview") {
    if (data === null) return valid(null);
    if (!isObject(data)) return INVALID;
    const entries = Object.entries(data);
    if (entries.length > MAX_TOKENS || !entries.every(([id, pos]) => isId(id) && isPosition(pos))) return INVALID;
    return valid(data);
  }
  if (event === "ping") {
    if (!isObject(data) || !isFiniteNumber(data.id) || !isPosition(data)) return INVALID;
    return valid({ id: data.id, x: data.x, y: data.y });
  }
  return INVALID;
}
