/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface LoreData {
  sexe: string;
  age: string;
  ideal: string;
  travers: string;
  historique: string;
  [key: string]: string;
}

export interface UseLoreOptions {
  characterId?: string;
  type?: "pj" | "pnj";
  stats?: any;
  onSaved?: () => void;
}

export function useLore({ characterId, type = "pj", stats, onSaved }: UseLoreOptions = {}) {
  const [lore, setLore] = useState<LoreData>({
    sexe: stats?.sexe ?? "Masculin",
    age: stats?.age ?? "",
    ideal: stats?.ideal ?? "",
    travers: stats?.travers ?? "",
    historique: stats?.historique ?? "",
  });

  const [isSaving, setIsSaving] = useState(false);

  // Synchro avec la prop stats
  useEffect(() => {
    setLore({
      sexe: stats?.sexe ?? "Masculin",
      age: stats?.age ?? "",
      ideal: stats?.ideal ?? "",
      travers: stats?.travers ?? "",
      historique: stats?.historique ?? "",
    });
  }, [stats?.sexe, stats?.age, stats?.ideal, stats?.travers, stats?.historique]);

  const updateField = (field: keyof LoreData, value: string) => {
    setLore((prev) => ({ ...prev, [field]: value }));
  };

  // Sauvegarde un champ spécifique (utilisé par Mobile)
  const saveField = async (fieldKey: string, value: string) => {
    if (!characterId) return;
    setIsSaving(true);
    try {
      const table = type === "pnj" ? "pnj" : "pj";
      const { error } = await supabase
        .from(table)
        .update({ stats: { ...(stats ?? {}), [fieldKey]: value } })
        .eq("id", characterId);

      if (error) throw error;
      setLore((prev) => ({ ...prev, [fieldKey]: value }));
      onSaved?.();
    } catch (e: any) {
      console.error("Erreur lors de la sauvegarde du lore:", e.message);
      throw e;
    } finally {
      setIsSaving(false);
    }
  };

  // Sauvegarde globale de tout le lore (utilisé par Desktop)
  const saveAllLore = async (customLoreData?: Partial<LoreData>) => {
    if (!characterId) return;
    setIsSaving(true);
    try {
      const payload = { ...lore, ...customLoreData };
      const table = type === "pnj" ? "pnj" : "pj";
      const { error } = await supabase
        .from(table)
        .update({
          stats: {
            ...(stats ?? {}),
            sexe: payload.sexe,
            age: payload.age,
            ideal: payload.ideal,
            travers: payload.travers,
            historique: payload.historique,
          },
        })
        .eq("id", characterId);

      if (error) throw error;
      onSaved?.();
    } catch (e: any) {
      console.error("Erreur lors de la sauvegarde complète du lore:", e.message);
      throw e;
    } finally {
      setIsSaving(false);
    }
  };

  const isEmpty =
    !lore.sexe &&
    !lore.age &&
    !lore.ideal &&
    !lore.travers &&
    !lore.historique;

  return {
    lore,
    setLore,
    updateField,
    saveField,
    saveAllLore,
    isSaving,
    isEmpty,
  };
}