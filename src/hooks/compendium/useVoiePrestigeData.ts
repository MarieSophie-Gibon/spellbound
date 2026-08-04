import { useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { cleanupRangsForSave } from "@/lib/voieRanks";
import type { RangsState } from "@/types/compendium";

interface SaveVoiePrestigeParams {
  voieId?: string;
  nom: string;
  familleId: string | null;
  notes: string;
  rangs: RangsState;
  campaignId?: string;
  isPrivate: boolean;
}

export function useVoiePrestigeData() {
  const saveVoiePrestige = useCallback(async ({
    voieId,
    nom,
    familleId,
    notes,
    rangs,
    campaignId,
    isPrivate,
  }: SaveVoiePrestigeParams): Promise<void> => {
    const publicMode = campaignId && !isPrivate;
    const payload = {
      nom: nom.trim(),
      type: "prestige",
      famille_id: familleId || null,
      notes: notes.trim() || null,
      peuple_id: null,
      campaign_id: publicMode ? null : campaignId || null,
      is_custom: !!(campaignId && isPrivate),
      capacites: cleanupRangsForSave(rangs),
    };

    if (voieId) {
      const { error } = await supabase.from("voies").update(payload).eq("id", voieId);
      if (error) throw error;
      return;
    }

    const { error } = await supabase.from("voies").insert(payload);
    if (error) throw error;
  }, []);

  return useMemo(
    () => ({
      saveVoiePrestige,
    }),
    [saveVoiePrestige]
  );
}
