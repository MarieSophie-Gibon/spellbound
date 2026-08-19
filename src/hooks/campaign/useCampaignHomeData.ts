import { useCallback } from "react";
import { supabase } from "@/lib/supabase";

function isMissingTableError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "42P01";
}

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

    const memberIds = new Set<string>();

    if (rowsError) {
      if (!isMissingTableError(rowsError)) {
        return [];
      }
    } else {
      for (const row of rows ?? []) {
        if (row?.user_id) {
          memberIds.add(row.user_id);
        }
      }
    }

    // Compat legacy: some campaign players are only linked through pj rows.
    const { data: pjRows, error: pjError } = await supabase
      .from("pj")
      .select("user_id, player_id")
      .eq("campaign_id", campaignId);

    if (pjError && !isMissingTableError(pjError)) {
      return [];
    }

    for (const row of pjRows ?? []) {
      const linkedId = row?.user_id ?? row?.player_id;
      if (linkedId) {
        memberIds.add(linkedId);
      }
    }

    const ids = Array.from(memberIds);
    if (!ids.length) {
      return [];
    }

    const { data: users, error: usersError } = await supabase
      .from("utilisateurs")
      .select("id, pseudo")
      .in("id", ids);

    if (usersError || !users) {
      return ids.map((id) => ({ id, pseudo: id.slice(0, 8) }));
    }

    const byId = new Map((users as Array<{ id: string; pseudo: string | null }>).map((u) => [u.id, u.pseudo]));
    return ids.map((id) => ({
      id,
      pseudo: byId.get(id) ?? id.slice(0, 8),
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
