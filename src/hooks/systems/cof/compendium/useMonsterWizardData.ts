import { useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { MonstreAttaque, MonstreCapacite, MonstreCombat, MonstreStats } from "@/types/compendium";

export interface ImportCampaign {
  id: string;
  nom: string;
}

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
  const fetchOwnedCampaigns = useCallback(async (excludeCampaignId?: string): Promise<ImportCampaign[]> => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return [];

    const { data: campaigns, error } = await supabase
      .from("campagnes")
      .select("id, nom")
      .eq("owner_id", authData.user.id)
      .order("nom");

    if (error || !campaigns) return [];
    return (campaigns as ImportCampaign[]).filter((campaign) => campaign.id !== excludeCampaignId);
  }, []);

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
    [fetchOwnedCampaigns, fetchMonstresForCampaign, uploadMonsterImage, saveMonster]
  );
}
