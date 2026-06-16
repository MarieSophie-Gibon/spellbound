export type CombatantType = "pj" | "monster" | "npc";

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
  capacites: Record<string, VoieCapacite>; // rang1…rang5
  rangsAcquis: number[];
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
}

export interface ChapitreBlock {
  id: string;
  type: string;
  data?: {
    combatEngaged?: boolean;
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

export interface PersistedCombatState {
  combatants: Combatant[];
  activeCombatantId: string | null;
  round: number;
  battlemapUrl?: string | null;
  mapTokens?: MapToken[];
  encounters?: EncounterEntry[];
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
  npc: "rgba(185, 75, 84, 0.9)",
} satisfies Record<CombatantType, string>;

export function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function makeCombatantId(): string {
  return crypto.randomUUID();
}
