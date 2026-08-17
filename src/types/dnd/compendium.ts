export type DndAbility = "FOR" | "DEX" | "CON" | "INT" | "SAG" | "CHA";

export interface DndClassSummary {
  id: string;
  name: string;
  source_book: string | null;
  version_tag: string | null;
  primary_ability: DndAbility | null;
  hit_die: string | null;
  campaign_id: string | null;
  is_custom: boolean;
  updated_at: string;
}

export interface DndClassProgressionRow {
  level: number;
  proficiency_bonus: number;
  class_features_summary: string | null;
  class_resource_die: string | null;
  cantrips_known: number | null;
  spells_prepared: number | null;
  spell_slots: number[];
}

export interface DndClassFeature {
  id?: string;
  level: number;
  name: string;
  description: string;
  sort_order: number;
  metadata?: Record<string, unknown>;
}

export interface DndSubclassFeature {
  id?: string;
  level: number;
  name: string;
  description: string;
  sort_order: number;
  metadata?: Record<string, unknown>;
}

export interface DndSubclassDraft {
  id?: string;
  client_key: string;
  name: string;
  entry_level: number;
  description: string;
  sort_order: number;
  features: DndSubclassFeature[];
}

export interface DndClassDetail {
  id?: string;
  name: string;
  summary: string;
  description: string;
  source_book: string;
  version_tag: string;
  primary_ability: DndAbility;
  hit_die: string;
  saving_throw_proficiencies: DndAbility[];
  skill_choices_count: number;
  weapon_proficiencies: string[];
  armor_training: string[];
  tool_proficiencies: string[];
  spellcasting_ability: DndAbility | null;
  multiclass_requirements: Record<string, unknown>;
  starting_equipment_options: Array<{ key: string; label: string; details: string }>;
  progression: DndClassProgressionRow[];
  class_features: DndClassFeature[];
  subclasses: DndSubclassDraft[];
}

const LEVELS = Array.from({ length: 20 }, (_, i) => i + 1);

export function getDefaultProficiencyBonus(level: number): number {
  if (level <= 4) return 2;
  if (level <= 8) return 3;
  if (level <= 12) return 4;
  if (level <= 16) return 5;
  return 6;
}

export function createDefaultProgression(): DndClassProgressionRow[] {
  return LEVELS.map((level) => ({
    level,
    proficiency_bonus: getDefaultProficiencyBonus(level),
    class_features_summary: null,
    class_resource_die: null,
    cantrips_known: null,
    spells_prepared: null,
    spell_slots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
  }));
}

export function createEmptyDndClassDetail(): DndClassDetail {
  return {
    name: "",
    summary: "",
    description: "",
    source_book: "PHB 2024",
    version_tag: "2024",
    primary_ability: "CHA",
    hit_die: "d8",
    saving_throw_proficiencies: ["DEX", "CHA"],
    skill_choices_count: 2,
    weapon_proficiencies: [],
    armor_training: [],
    tool_proficiencies: [],
    spellcasting_ability: "CHA",
    multiclass_requirements: {},
    starting_equipment_options: [],
    progression: createDefaultProgression(),
    class_features: [],
    subclasses: [],
  };
}
