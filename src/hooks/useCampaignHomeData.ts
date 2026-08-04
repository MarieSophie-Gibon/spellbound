import { useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface CampaignMember {
  id: string;
  pseudo: string;
}

export interface CampaignVoieRef {
  id: string;
  nom: string;
}

export function useCampaignHomeData() {
  const fetchCampaignMembers = useCallback(async (campaignId: string): Promise<CampaignMember[]> => {
    const { data: rows, error: rowsError } = await supabase
      .from("campaign_members")
      .select("user_id")
      .eq("campaign_id", campaignId);

    if (rowsError || !rows?.length) {
      return [];
    }

    const ids = rows.map((r) => r.user_id).filter(Boolean);
    if (!ids.length) {
      return [];
    }

    const { data: users, error: usersError } = await supabase
      .from("utilisateurs")
      .select("id, pseudo")
      .in("id", ids);

    if (usersError || !users) {
      return [];
    }

    return users.map((u: { id: string; pseudo: string }) => ({
      id: u.id,
      pseudo: u.pseudo,
    }));
  }, []);

  const fetchVoiesByIds = useCallback(async (voieIds: string[]): Promise<CampaignVoieRef[]> => {
    if (!voieIds.length) {
      return [];
    }

    const { data, error } = await supabase
      .from("voies")
      .select("id, nom")
      .in("id", voieIds);

    if (error || !data) {
      return [];
    }

    return data as CampaignVoieRef[];
  }, []);

  return {
    fetchCampaignMembers,
    fetchVoiesByIds,
  };
}
