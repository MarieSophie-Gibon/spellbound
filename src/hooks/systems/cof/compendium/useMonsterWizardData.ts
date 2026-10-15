import { useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { MonstreAttaque, MonstreCapacite, MonstreCombat, MonstreStats } from "@/types/compendium";
import { fetchOwnedCampaigns } from "./ownedCampaigns";

export type { ImportCampaign } from "./ownedCampaigns";

export interface ImportMonstre {
  id: string;
  nom: string;
  nc: string;
  type_creature: string;
  taille: string;
  description: string | null;
  stats: MonstreStats;
  combat: MonstreCombat;
  attaques: MonstreAttaque[];
  capacites: MonstreCapacite[];
  image_url?: string | null;
}

export function useMonsterWizardData() {
  const fetchMonstresForCampaign = useCallback(async (campaignId: string): Promise<ImportMonstre[]> => {
    const { data, error } = await supabase
      .from("bestiaire")
      .select("*")
      .or(`campaign_id.eq.${campaignId},campaign_id.is.null`)
      .order("nom");

    if (error) {
      throw error;
    }

    return (data ?? []) as ImportMonstre[];
  }, []);

  const uploadMonsterImage = useCallback(async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `bestiaire/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("compendium").upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("compendium").getPublicUrl(path);
    return data.publicUrl;
  }, []);

  const saveMonster = useCallback(
    async ({ monsterId, payload }: { monsterId?: string; payload: Record<string, unknown> }): Promise<{ id: string; nom: string; image_url?: string | null } | null> => {
      if (monsterId) {
        const { error } = await supabase.from("bestiaire").update(payload).eq("id", monsterId);
        if (error) throw error;
        return null;
      }

      const { data, error } = await supabase
        .from("bestiaire")
        .insert(payload)
        .select("id, nom, image_url")
        .single();

      if (error) throw error;
      return data as { id: string; nom: string; image_url?: string | null };
    },
    []
  );

  return useMemo(
    () => ({
      fetchOwnedCampaigns,
      fetchMonstresForCampaign,
      uploadMonsterImage,
      saveMonster,
    }),
    [fetchMonstresForCampaign, uploadMonsterImage, saveMonster]
  );
}
