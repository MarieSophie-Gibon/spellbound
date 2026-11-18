export type CombatantType = "pj" | "monster" | "npc" | "familier";

export type ConditionKey =
  | "ko"
  | "poisoned"
  | "prone"
  | "stunned"
  | "invisible"
  | "restrained"
  | "frightened"
  | "burning";

export interface MonsterStatsMap {
  [key: string]: { mod?: number; sup?: boolean } | undefined;
}

export interface MonsterDetails {
  stats?: MonsterStatsMap | null;
  combat?: {
    pv?: number;
    pv_max?: number;
    defense?: number;
    initiative?: number;
  } | null;
  attaques?: Array<{ attaque_base?: string; dm?: string }> | null;
  capacites?: Array<{ nom?: string; type?: string; description?: string }> | null;
}

export interface PJStats {
  caracteristiques?: Record<string, number>;
  initiative?: number;
  att_contact?: number;
  att_distance?: number;
  att_magie?: number;
  pm?: number;
  pm_max?: number;
  pc?: number;
  dr_qty?: number;
  dr_de?: string;
  niveau?: number;
  is_combatant?: boolean;
  combat_stats_mode?: "simple" | "extended";
  attaques?: Array<{ nom?: string; bonus?: string; degats?: string; description?: string }>;
  capacites_speciales?: Array<{ nom?: string; description?: string }>;
}

export interface VoieCapacite {
  nom: string;
  type?: string;
  description: string;
}

export interface VoieEntry {
  id: string;
  nom: string;
  type?: string;
  capacites: Record<string, unknown>; // rang1…rang5
  rangsAcquis: number[];
}

export interface CombatFamilier {
  id: string;
  name: string;
  image_url: string | null;
  pv: number;
  pv_max: number;
  data: Record<string, unknown> | null;
  // Fiche source du familier : id bestiaire, ou id PNJ si data.type_creature === "PNJ"
  monster_id?: string | null;
}

export interface Combatant {
  id: string;
  entityId?: string;
  type: CombatantType;
  name: string;
  imageUrl?: string;
  initiative: number;
  pv: number;
  pvMax: number;
  defense?: number;
  conditions: ConditionKey[];
  hidden?: boolean;
  tactics?: string;
  notes?: string;
  details?: MonsterDetails;
  pjStats?: PJStats;
  voies?: VoieEntry[];
  familiers?: CombatFamilier[];
  // Familier : id de sa fiche source (bestiaire ou PNJ), pour suivre son apparence
  sourceEntityId?: string;
  tokenFaceZoom?: number;
  tokenFaceOffsetX?: number;
  tokenFaceOffsetY?: number;
}

export interface TokenFaceConfig {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

const TOKEN_FACE_MIN_ZOOM = 0.25;
const TOKEN_FACE_MAX_ZOOM = 6;
const TOKEN_FACE_OFFSET_LIMIT = 150;

export const DEFAULT_TOKEN_FACE: TokenFaceConfig = {
  zoom: 1,
  offsetX: 0,
  // Slightly shift image down by default so portraits with faces near the top stay visible in round tokens.
  offsetY: 18,
};

export function clampTokenFace(config: Partial<TokenFaceConfig> | null | undefined): TokenFaceConfig {
  const zoom = Number(config?.zoom);
  const offsetX = Number(config?.offsetX);
  const offsetY = Number(config?.offsetY);

  return {
    zoom: Number.isFinite(zoom) ? Math.max(TOKEN_FACE_MIN_ZOOM, Math.min(TOKEN_FACE_MAX_ZOOM, zoom)) : DEFAULT_TOKEN_FACE.zoom,
    offsetX: Number.isFinite(offsetX) ? Math.max(-TOKEN_FACE_OFFSET_LIMIT, Math.min(TOKEN_FACE_OFFSET_LIMIT, offsetX)) : DEFAULT_TOKEN_FACE.offsetX,
    offsetY: Number.isFinite(offsetY) ? Math.max(-TOKEN_FACE_OFFSET_LIMIT, Math.min(TOKEN_FACE_OFFSET_LIMIT, offsetY)) : DEFAULT_TOKEN_FACE.offsetY,
  };
}

export function readTokenFaceFromCombatant(combatant: Combatant): TokenFaceConfig {
  return clampTokenFace({
    zoom: combatant.tokenFaceZoom,
    offsetX: combatant.tokenFaceOffsetX,
    offsetY: combatant.tokenFaceOffsetY,
  });
}

export interface ChapitreBlock {
  id: string;
  type: string;
  data?: {
    combatEngaged?: boolean;
    combatPrep?: PersistedCombatState;
    entityId?: string;
    entityType?: "monster" | "npc";
    nom?: string;
    imageUrl?: string;
    comportement?: string;
    notes?: string;
  };
}

export interface SearchResult {
  id: string;
  name: string;
  image_url: string | null;
  type: CombatantType;
  combat?: {
    pv?: number;
    pv_max?: number;
    defense?: number;
    initiative?: number;
  } | null;
  stats?: Record<string, unknown> | null;
  attaques?: Array<{ attaque_base?: string; dm?: string }> | null;
  capacites?: Array<{ nom?: string; type?: string; description?: string }> | null;
  pathways?: Array<{ voie_id: string; rangs_acquis?: number[] }> | null;
}

export interface MapToken {
  combatantId: string;
  x: number; // 0–100 %
  y: number; // 0–100 %
}

export interface EncounterEntry {
  key: string;
  entityId?: string;
  type: CombatantType;
  name: string;
  imageUrl?: string;
  firstSeenAt: number;
}

export interface FogRevealStamp {
  x: number;
  y: number;
  r: number;
  strokeId?: number;
}

export interface RoundTriggerEvent {
  id: string;
  label: string;
  roundsLeft: number;
  createdAt: number;
  hasFired?: boolean;
}

/**
 * Quadrillage de la battlemap. Cases carrées : taille et décalages sont exprimés
 * en % de la LARGEUR de l'image (y compris le décalage vertical), pour rester
 * indépendants de la résolution d'affichage.
 */
export interface BattleMapGrid {
  enabled: boolean;
  cellSize: number;
  offsetX: number;
  offsetY: number;
  opacity: number;
  color: "light" | "dark";
  showToPlayers: boolean;
  /** Les jetons se placent au centre des cases. */
  snapTokens: boolean;
  /** Échelle pour le décompte des déplacements. */
  metersPerCell: number;
  diagonalRule: DiagonalRule;
}

/** one : 1 case par diagonale ; alternate : 1-2-1 ; euclidean : distance réelle. */
export type DiagonalRule = "one" | "alternate" | "euclidean";
export const DIAGONAL_RULES: readonly DiagonalRule[] = ["one", "alternate", "euclidean"];

export const GRID_CELL_MIN = 0.5;
export const GRID_CELL_MAX = 25;

export const DEFAULT_GRID: BattleMapGrid = {
  enabled: false,
  cellSize: 5,
  offsetX: 0,
  offsetY: 0,
  opacity: 0.35,
  color: "light",
  showToPlayers: true,
  snapTokens: true,
  metersPerCell: 1.5,
  diagonalRule: "one",
};

/**
 * « Supprimer le quadrillage » : grille désactivée, taille et décalage remis à
 * zéro ; les préférences (apparence, visibilité, règles de déplacement) sont gardées.
 */
export function resetGrid(grid: BattleMapGrid): BattleMapGrid {
  return {
    ...DEFAULT_GRID,
    opacity: grid.opacity,
    color: grid.color,
    showToPlayers: grid.showToPlayers,
    snapTokens: grid.snapTokens,
    metersPerCell: grid.metersPerCell,
    diagonalRule: grid.diagonalRule,
  };
}

const clampNumber = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

/** Valeurs bornées et complétées : utilisé au chargement et à la réception d'un co-MJ. */
export function normalizeGrid(raw: unknown): BattleMapGrid {
  const g = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof BattleMapGrid, unknown>>;
  const cellSize = clampNumber(g.cellSize, GRID_CELL_MIN, GRID_CELL_MAX, DEFAULT_GRID.cellSize);
  // Le décalage est ramené dans [0, taille de case[ : décaler d'une case entière ne change rien.
  const wrap = (v: unknown) => {
    const n = clampNumber(v, -1000, 1000, 0);
    return ((n % cellSize) + cellSize) % cellSize;
  };
  return {
    enabled: typeof g.enabled === "boolean" ? g.enabled : DEFAULT_GRID.enabled,
    cellSize,
    offsetX: wrap(g.offsetX),
    offsetY: wrap(g.offsetY),
    opacity: clampNumber(g.opacity, 0.05, 1, DEFAULT_GRID.opacity),
    color: g.color === "dark" ? "dark" : "light",
    showToPlayers: typeof g.showToPlayers === "boolean" ? g.showToPlayers : DEFAULT_GRID.showToPlayers,
    snapTokens: typeof g.snapTokens === "boolean" ? g.snapTokens : DEFAULT_GRID.snapTokens,
    metersPerCell: clampNumber(g.metersPerCell, 0.1, 100, DEFAULT_GRID.metersPerCell),
    diagonalRule: DIAGONAL_RULES.includes(g.diagonalRule as DiagonalRule) ? (g.diagonalRule as DiagonalRule) : DEFAULT_GRID.diagonalRule,
  };
}

/** Cône de vision d'un PJ, en cases (unité du quadrillage, même masqué). */
export interface TokenVision {
  /** Portée, en cases. */
  range: number;
  /** Ouverture du cône, en degrés (360 : vision tout autour). */
  angle: number;
  /** Orientation, en degrés : 0 = vers la droite, 90 = vers le bas. */
  direction: number;
}

/**
 * Vision dynamique des PJ dans le brouillard : ce que voient les PJ est net,
 * ce qu'ils ont déjà vu (`explored`, cases « col,row ») reste visible mais sombre.
 */
export interface VisionState {
  enabled: boolean;
  tokens: Record<string, TokenVision>;
  explored: string[];
  /** Horodatage du dernier « oubli » des zones vues : départage les fusions entre MJ. */
  exploredResetAt: number;
}

export const VISION_ANGLES = [60, 90, 120, 180, 360] as const;
export const VISION_RANGE_MAX = 60;
export const MAX_EXPLORED_CELLS = 40_000;

export const DEFAULT_VISION: VisionState = { enabled: false, tokens: {}, explored: [], exploredResetAt: 0 };

export function defaultTokenVision(range: number | null | undefined): TokenVision {
  return { range: range && range > 0 ? Math.min(VISION_RANGE_MAX, Math.round(range)) : 8, angle: 120, direction: -90 };
}

const isCellKey = (v: unknown): v is string => typeof v === "string" && /^-?\d{1,5},-?\d{1,5}$/.test(v);

/** Valeurs bornées et complétées : utilisé au chargement et à la réception d'un co-MJ. */
export function normalizeVision(raw: unknown): VisionState {
  const v = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof VisionState, unknown>>;
  const tokens: Record<string, TokenVision> = {};
  if (v.tokens && typeof v.tokens === "object") {
    for (const [id, t] of Object.entries(v.tokens as Record<string, unknown>)) {
      if (!t || typeof t !== "object" || id.length > 200) continue;
      const tv = t as Partial<Record<keyof TokenVision, unknown>>;
      const direction = clampNumber(tv.direction, -100_000, 100_000, -90);
      tokens[id] = {
        range: clampNumber(tv.range, 0.5, VISION_RANGE_MAX, 8),
        angle: clampNumber(tv.angle, 10, 360, 120),
        direction: ((((direction + 180) % 360) + 360) % 360) - 180,
      };
    }
  }
  const explored = Array.isArray(v.explored) ? [...new Set(v.explored.filter(isCellKey))].slice(0, MAX_EXPLORED_CELLS) : [];
  return {
    enabled: typeof v.enabled === "boolean" ? v.enabled : false,
    tokens,
    explored,
    exploredResetAt: clampNumber(v.exploredResetAt, 0, Number.MAX_SAFE_INTEGER, 0),
  };
}

/**
 * Fusion avec l'état d'un autre MJ : les cases vues s'additionnent, sauf si l'un
 * des deux a « oublié » les zones vues plus récemment (son état fait alors foi).
 */
export function mergeVision(local: VisionState, remote: VisionState): VisionState {
  if (remote.exploredResetAt > local.exploredResetAt) return remote;
  if (remote.exploredResetAt < local.exploredResetAt) return { ...remote, explored: local.explored, exploredResetAt: local.exploredResetAt };
  const explored = [...new Set([...local.explored, ...remote.explored])].slice(0, MAX_EXPLORED_CELLS);
  return { ...remote, explored };
}

export interface PersistedCombatState {
  combatants: Combatant[];
  activeCombatantId: string | null;
  round: number;
  battlemapUrl?: string | null;
  mapTokens?: MapToken[];
  encounters?: EncounterEntry[];
  fogEnabled?: boolean;
  fogReveals?: FogRevealStamp[];
  combatNote?: string;
  combatNotePosition?: { x: number; y: number };
  roundTriggers?: RoundTriggerEvent[];
  grid?: BattleMapGrid;
  vision?: VisionState;
}

export const CONDITION_OPTIONS: Array<{ key: ConditionKey; label: string; bg: string; icon: string }> = [
  { key: "ko",         label: "KO",         bg: "bg-gray-600",   icon: "\u{1F480}" },
  { key: "poisoned",   label: "Empoisonné", bg: "bg-green-500",  icon: "🟣" },
  { key: "prone",      label: "À terre",    bg: "bg-orange-500", icon: "⏬" },
  { key: "stunned",    label: "Étourdi",    bg: "bg-red-500",    icon: "✋" },
  { key: "invisible",  label: "Invisible",  bg: "bg-sky-500",    icon: "👁️" },
  { key: "restrained", label: "Entravé",    bg: "bg-amber-600",  icon: "⛓️" },
  { key: "frightened", label: "Effrayé",    bg: "bg-purple-500", icon: "😱" },
  { key: "burning",    label: "En feu",     bg: "bg-red-600",    icon: "🔥" },
];

export const STAT_ORDER = ["AGI", "CON", "FOR", "PER", "CHA", "INT", "VOL"] as const;

export const FANION_BG = {
  pj: "linear-gradient(to right, rgba(18, 24, 62, 0.9), rgba(87, 105, 214, 0.9))",
  monster: "rgba(185, 75, 84, 0.9)",
  npc: "linear-gradient(to right, rgba(45, 15, 70, 0.9), rgba(130, 60, 200, 0.9))",
  familier: "rgba(16, 130, 80, 0.9)",
} satisfies Record<CombatantType, string>;

export function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function makeCombatantId(): string {
  return crypto.randomUUID();
}
