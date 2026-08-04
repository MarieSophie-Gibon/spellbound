import { useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { Peuple } from "@/types/compendium";

export interface CampaignProfilRef {
  id: string;
  nom: string;
}

export interface CampaignPlayerRef {
  id: string;
  pseudo: string;
}

export function useCampaignPjListData() {
  const fetchPeuples = useCallback(async (): Promise<Peuple[]> => {
    const { data, error } = await supabase
      .from("peuples")
      .select("id, nom, image_url, description, data");

    if (error || !data) {
      return [];
    }

    return data as Peuple[];
  }, []);

  const fetchProfils = useCallback(async (): Promise<CampaignProfilRef[]> => {
    const { data, error } = await supabase
      .from("profils")
      .select("id, nom");

    if (error || !data) {
      return [];
    }

    return data as CampaignProfilRef[];
  }, []);

  const fetchPlayers = useCallback(async (): Promise<CampaignPlayerRef[]> => {
    const { data, error } = await supabase
      .from("utilisateurs")
      .select("id, pseudo");

    if (error || !data) {
      return [];
    }

    return data as CampaignPlayerRef[];
  }, []);

  return useMemo(
    () => ({
      fetchPeuples,
      fetchProfils,
      fetchPlayers,
    }),
    [fetchPeuples, fetchProfils, fetchPlayers]
  );
}
