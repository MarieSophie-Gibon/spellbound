import { useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { fetchOwnedCampaigns } from "./ownedCampaigns";

export type { ImportCampaign } from "./ownedCampaigns";

export interface ImportPeuple {
  id: string;
  nom: string;
  description: string | null;
  lore: string | null;
  image_url: string | null;
  multi: boolean | null;
  data: Record<string, unknown> | null;
  voie: { id: string; nom: string; capacites: Record<string, unknown> } | null;
}

export function usePeupleData() {
  const uploadPeupleImage = useCallback(async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `peuples/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;

    const { error } = await supabase.storage.from("compendium").upload(path, file);
    if (error) throw error;

    const { data } = supabase.storage.from("compendium").getPublicUrl(path);
    return data.publicUrl;
  }, []);

  const updatePeuple = useCallback(async (peupleId: string, payload: Record<string, unknown>): Promise<void> => {
    const { error } = await supabase.from("peuples").update(payload).eq("id", peupleId);
    if (error) throw error;
  }, []);

  const createPeuple = useCallback(async (payload: Record<string, unknown>): Promise<{ id: string }> => {
    const { data, error } = await supabase.from("peuples").insert(payload).select("id").single();
    if (error) throw error;
    return data as { id: string };
  }, []);

  const updateVoie = useCallback(async (voieId: string, payload: Record<string, unknown>): Promise<void> => {
    const { error } = await supabase.from("voies").update(payload).eq("id", voieId);
    if (error) throw error;
  }, []);

  const createVoie = useCallback(async (payload: Record<string, unknown>): Promise<void> => {
    const { error } = await supabase.from("voies").insert(payload);
    if (error) throw error;
  }, []);

  /** Peuples privés d'une campagne (les peuples globaux sont déjà visibles partout), avec leur voie. */
  const fetchPeuplesForCampaign = useCallback(async (campaignId: string): Promise<ImportPeuple[]> => {
    const { data, error } = await supabase
      .from("peuples")
      .select("id, nom, description, lore, image_url, multi, data, voie:voies!peuple_id(id, nom, capacites)")
      .eq("campaign_id", campaignId)
      .order("nom");

    if (error) throw error;

    return (data ?? []).map((peuple) => {
      const voie = Array.isArray(peuple.voie) ? peuple.voie[0] : peuple.voie;
      return { ...peuple, voie: voie ?? null } as ImportPeuple;
    });
  }, []);

  return useMemo(
    () => ({
      fetchOwnedCampaigns,
      fetchPeuplesForCampaign,
      uploadPeupleImage,
      updatePeuple,
      createPeuple,
      updateVoie,
      createVoie,
    }),
    [fetchPeuplesForCampaign, uploadPeupleImage, updatePeuple, createPeuple, updateVoie, createVoie]
  );
}
