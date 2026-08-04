import { useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface PersonnageListItem {
  id: string;
  name: string;
  image_url: string | null;
  user_id?: string | null;
  profil_id?: string | null;
  profils_id?: string | null;
  stats: Record<string, unknown>;
  pathways: Record<string, unknown>;
  inventory: Record<string, unknown>;
}

export type PersonnageType = "pj" | "pnj";

export function usePersonnagesData() {
  const fetchPersonnages = useCallback(async (campaignId: string): Promise<{ pjs: PersonnageListItem[]; pnjs: PersonnageListItem[] }> => {
    const [pjRes, pnjRes] = await Promise.all([
      supabase
        .from("pj")
        .select("id, name, image_url, user_id, profils_id, stats, pathways, inventory")
        .eq("campaign_id", campaignId)
        .order("name"),
      supabase
        .from("pnj")
        .select("id, name, image_url, stats, pathways, inventory")
        .eq("campaign_id", campaignId)
        .order("name"),
    ]);

    return {
      pjs: pjRes.error || !pjRes.data ? [] : (pjRes.data as PersonnageListItem[]),
      pnjs: pnjRes.error || !pnjRes.data ? [] : (pnjRes.data as PersonnageListItem[]),
    };
  }, []);

  const deletePersonnage = useCallback(async (type: PersonnageType, id: string): Promise<void> => {
    const table = type === "pj" ? "pj" : "pnj";
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      throw error;
    }
  }, []);

  return {
    fetchPersonnages,
    deletePersonnage,
  };
}
