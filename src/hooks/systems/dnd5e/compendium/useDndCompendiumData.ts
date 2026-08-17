import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type {
  DndClassDetail,
  DndClassSummary,
  DndSubclassDraft,
  DndSubclassFeature,
} from "@/types/dnd/compendium";

interface SaveDndClassArgs {
  campaignId?: string;
  classId?: string;
  detail: DndClassDetail;
}

// --- Interfaces typant strictement les retours de Supabase ---
interface DbClassRow {
  id: string;
  name: string | null;
  summary: string | null;
  description: string | null;
  source_book: string | null;
  version_tag: string | null;
  primary_ability: string | null;
  hit_die: string | null;
  saving_throw_proficiencies: string[] | null;
  skill_choices_count: number | null;
  weapon_proficiencies: string[] | null;
  armor_training: string[] | null;
  tool_proficiencies: string[] | null;
  spellcasting_ability: string | null;
  multiclass_requirements: Record<string, unknown> | null;
  starting_equipment_options: Array<{ key: string; label: string; details: string }> | null;
  campaign_id: string | null;
  is_custom: boolean;
}

interface DbProgressionRow {
  id: string;
  class_id: string;
  level: number;
  proficiency_bonus: number | null;
  class_features_summary: string | null;
  class_resource_die: string | null;
  cantrips_known: number | null;
  spells_prepared: number | null;
  spell_slots: number[] | null;
}

interface DbFeatureRow {
  id: string;
  level: number;
  name: string | null;
  description: string | null;
  sort_order: number | null;
  metadata: Record<string, unknown> | null;
}

interface DbSubclassFeatureRow extends DbFeatureRow {
  subclass_id: string;
}

interface DbSubclassRow {
  id: string;
  class_id: string;
  name: string | null;
  entry_level: number | null;
  description: string | null;
  sort_order: number | null;
}

const EMPTY_SLOTS = [0, 0, 0, 0, 0, 0, 0, 0, 0];

function normalizeSlots(slots: number[] | null | undefined): number[] {
  if (!Array.isArray(slots)) return [...EMPTY_SLOTS];
  const padded = [...slots.slice(0, 9)];
  while (padded.length < 9) padded.push(0);
  return padded.map((v) => (Number.isFinite(Number(v)) ? Number(v) : 0));
}

function toSubclassDraft(row: DbSubclassRow, features: DndSubclassFeature[]): DndSubclassDraft {
  return {
    client_key: row.id,
    name: row.name ?? "",
    entry_level: Number(row.entry_level ?? 3),
    description: row.description ?? "",
    sort_order: Number(row.sort_order ?? 0),
    features,
  };
}

export function useDndCompendiumData() {
  const fetchClasses = useCallback(async (campaignId?: string): Promise<DndClassSummary[]> => {
    const query = supabase
      .from("dnd_classes")
      .select("id,name,source_book,version_tag,primary_ability,hit_die,campaign_id,is_custom,updated_at")
      .order("name", { ascending: true });

    const filtered = campaignId
      ? query.or(`campaign_id.eq.${campaignId},campaign_id.is.null`)
      : query.is("campaign_id", null);

    const { data, error } = await filtered;
    if (error) throw error;
    
    return (data as unknown as DndClassSummary[]) ?? [];
  }, []);

  const fetchClassDetail = useCallback(async (classId: string): Promise<DndClassDetail | null> => {
    const [
      { data: classData, error: classError },
      { data: progressionData, error: progressionError },
      { data: classFeatureData, error: classFeatureError },
      { data: subclassData, error: subclassError }
    ] = await Promise.all([
      supabase.from("dnd_classes").select("*").eq("id", classId).single(),
      supabase.from("dnd_class_progression").select("*").eq("class_id", classId).order("level", { ascending: true }),
      supabase.from("dnd_class_features").select("*").eq("class_id", classId).order("level", { ascending: true }).order("sort_order", { ascending: true }),
      supabase.from("dnd_subclasses").select("*").eq("class_id", classId).order("sort_order", { ascending: true }),
    ]);

    if (classError) throw classError;
    if (progressionError) throw progressionError;
    if (classFeatureError) throw classFeatureError;
    if (subclassError) throw subclassError;
    if (!classData) return null;

    const classRow = classData as unknown as DbClassRow;
    const progressionRows = (progressionData ?? []) as unknown as DbProgressionRow[];
    const classFeatureRows = (classFeatureData ?? []) as unknown as DbFeatureRow[];
    const subclassRows = (subclassData ?? []) as unknown as DbSubclassRow[];

    const subclassIds = subclassRows.map((row) => row.id);
    let subclassFeaturesRows: DbSubclassFeatureRow[] = [];

    if (subclassIds.length > 0) {
      const { data: sfData, error: sfError } = await supabase
        .from("dnd_subclass_features")
        .select("*")
        .in("subclass_id", subclassIds)
        .order("level", { ascending: true })
        .order("sort_order", { ascending: true });
        
      if (sfError) throw sfError;
      subclassFeaturesRows = (sfData ?? []) as unknown as DbSubclassFeatureRow[];
    }

    const featuresBySubclass = new Map<string, DndSubclassFeature[]>();
    for (const row of subclassFeaturesRows) {
      const list = featuresBySubclass.get(row.subclass_id) ?? [];
      list.push({
        level: Number(row.level),
        name: row.name ?? "",
        description: row.description ?? "",
        sort_order: Number(row.sort_order ?? 0),
      });
      featuresBySubclass.set(row.subclass_id, list);
    }

    return {
      id: classRow.id,
      name: classRow.name ?? "",
      summary: classRow.summary ?? "",
      description: classRow.description ?? "",
      source_book: classRow.source_book ?? "",
      version_tag: classRow.version_tag ?? "2024",
      primary_ability: (classRow.primary_ability ?? "CHA") as DndClassDetail["primary_ability"],
      hit_die: classRow.hit_die ?? "d8",
      saving_throw_proficiencies: (classRow.saving_throw_proficiencies ?? []) as DndClassDetail["saving_throw_proficiencies"],
      skill_choices_count: Number(classRow.skill_choices_count ?? 0),
      weapon_proficiencies: classRow.weapon_proficiencies ?? [],
      armor_training: classRow.armor_training ?? [],
      tool_proficiencies: classRow.tool_proficiencies ?? [],
      // C'est ici qu'on satisfait TypeScript en lui garantissant que c'est bien une Ability ou null
      spellcasting_ability: (classRow.spellcasting_ability ?? null) as DndClassDetail["spellcasting_ability"],
      multiclass_requirements: classRow.multiclass_requirements ?? {},
      starting_equipment_options: classRow.starting_equipment_options ?? [],
      progression: progressionRows.map((row) => ({
        level: Number(row.level),
        proficiency_bonus: Number(row.proficiency_bonus ?? 2),
        class_features_summary: row.class_features_summary ?? null,
        class_resource_die: row.class_resource_die ?? null,
        cantrips_known: row.cantrips_known ?? null,
        spells_prepared: row.spells_prepared ?? null,
        spell_slots: normalizeSlots(row.spell_slots),
      })),
      class_features: classFeatureRows.map((row) => ({
        level: Number(row.level),
        name: row.name ?? "",
        description: row.description ?? "",
        sort_order: Number(row.sort_order ?? 0),
      })),
      subclasses: subclassRows.map((row) =>
        toSubclassDraft(row, featuresBySubclass.get(row.id) ?? []),
      ),
    };
  }, []);

  const saveClass = useCallback(async ({ campaignId, classId, detail }: SaveDndClassArgs): Promise<string> => {
    const payload = {
      name: detail.name.trim(),
      summary: detail.summary.trim() || null,
      description: detail.description?.trim() || null,
      source_book: detail.source_book?.trim() || null,
      version_tag: detail.version_tag?.trim() || "2024",
      primary_ability: detail.primary_ability,
      hit_die: detail.hit_die,
      saving_throw_proficiencies: detail.saving_throw_proficiencies,
      skill_choices_count: detail.skill_choices_count ?? 0,
      weapon_proficiencies: detail.weapon_proficiencies,
      armor_training: detail.armor_training,
      tool_proficiencies: detail.tool_proficiencies,
      spellcasting_ability: detail.spellcasting_ability,
      multiclass_requirements: detail.multiclass_requirements,
      starting_equipment_options: detail.starting_equipment_options,
      campaign_id: campaignId ?? null,
      is_custom: !!campaignId,
    };

    let resolvedClassId = classId;

    if (resolvedClassId) {
      const { error } = await supabase.from("dnd_classes").update(payload).eq("id", resolvedClassId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from("dnd_classes").insert(payload).select("id").single();
      if (error) throw error;
      resolvedClassId = data.id as string;
    }

    if (!resolvedClassId) {
      throw new Error("Unable to resolve class id during save.");
    }

    const [
      { error: deleteSubclassError },
      { error: deleteProgressionError },
      { error: deleteFeaturesError }
    ] = await Promise.all([
      supabase.from("dnd_subclasses").delete().eq("class_id", resolvedClassId),
      supabase.from("dnd_class_progression").delete().eq("class_id", resolvedClassId),
      supabase.from("dnd_class_features").delete().eq("class_id", resolvedClassId),
    ]);

    if (deleteSubclassError) throw deleteSubclassError;
    if (deleteProgressionError) throw deleteProgressionError;
    if (deleteFeaturesError) throw deleteFeaturesError;

    if (detail.progression.length > 0) {
      const rows = detail.progression.map((row) => ({
        class_id: resolvedClassId as string,
        level: row.level,
        proficiency_bonus: row.proficiency_bonus,
        class_features_summary: row.class_features_summary,
        class_resource_die: row.class_resource_die,
        cantrips_known: row.cantrips_known,
        spells_prepared: row.spells_prepared,
        spell_slots: normalizeSlots(row.spell_slots),
      }));
      const { error } = await supabase.from("dnd_class_progression").insert(rows);
      if (error) throw error;
    }

    if (detail.class_features.length > 0) {
      const rows = detail.class_features.map((feature) => ({
        class_id: resolvedClassId as string,
        level: feature.level,
        name: feature.name,
        description: feature.description,
        sort_order: feature.sort_order,
        metadata: {},
      }));
      const { error } = await supabase.from("dnd_class_features").insert(rows);
      if (error) throw error;
    }

    for (const subclass of detail.subclasses) {
      const { data: subclassData, error: subclassInsertError } = await supabase
        .from("dnd_subclasses")
        .insert({
          class_id: resolvedClassId,
          name: subclass.name,
          entry_level: subclass.entry_level,
          description: subclass.description,
          sort_order: subclass.sort_order,
        })
        .select("id")
        .single();

      if (subclassInsertError) throw subclassInsertError;
      
      const newSubclassId = subclassData.id as string;

      if (subclass.features.length > 0) {
        const featuresRows = subclass.features.map((feature) => ({
          subclass_id: newSubclassId,
          level: feature.level,
          name: feature.name,
          description: feature.description,
          sort_order: feature.sort_order,
          metadata: {},
        }));
        const { error } = await supabase.from("dnd_subclass_features").insert(featuresRows);
        if (error) throw error;
      }
    }

    return resolvedClassId;
  }, []);

  return {
    fetchClasses,
    fetchClassDetail,
    saveClass,
  };
}