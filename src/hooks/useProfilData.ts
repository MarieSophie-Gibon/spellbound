import { useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";

interface EquipRef {
  arme_contact?: string[];
  arme_distance?: string[];
  armure?: string[];
}

export function useProfilData() {
  const fetchEquipementOptions = useCallback(async (): Promise<{
    armesContact: Array<{ id: string; nom: string }>;
    armesDistance: Array<{ id: string; nom: string }>;
    armures: Array<{ id: string; nom: string }>;
  }> => {
    const [r1, r2, r3] = await Promise.all([
      supabase.from("armes_contact").select("id, nom").order("nom"),
      supabase.from("armes_distance").select("id, nom").order("nom"),
      supabase.from("armures").select("id, nom").order("nom"),
    ]);

    return {
      armesContact: (r1.data ?? []) as Array<{ id: string; nom: string }>,
      armesDistance: (r2.data ?? []) as Array<{ id: string; nom: string }>,
      armures: (r3.data ?? []) as Array<{ id: string; nom: string }>,
    };
  }, []);

  const fetchEquipementNames = useCallback(async (equipAssoc?: EquipRef): Promise<{ arme_contact: string[]; arme_distance: string[]; armure: string[] }> => {
    const result = { arme_contact: [] as string[], arme_distance: [] as string[], armure: [] as string[] };
    if (!equipAssoc) return result;

    if (equipAssoc.arme_contact?.length) {
      const { data } = await supabase.from("armes_contact").select("nom").in("id", equipAssoc.arme_contact).order("nom");
      if (data) result.arme_contact = data.map((row) => row.nom as string);
    }

    if (equipAssoc.arme_distance?.length) {
      const { data } = await supabase.from("armes_distance").select("nom").in("id", equipAssoc.arme_distance).order("nom");
      if (data) result.arme_distance = data.map((row) => row.nom as string);
    }

    if (equipAssoc.armure?.length) {
      const { data } = await supabase.from("armures").select("nom").in("id", equipAssoc.armure).order("nom");
      if (data) result.armure = data.map((row) => row.nom as string);
    }

    return result;
  }, []);

  const uploadProfilImage = useCallback(async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `profils/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("compendium").upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("compendium").getPublicUrl(path);
    return data.publicUrl;
  }, []);

  const updateProfil = useCallback(async (profilId: string, payload: Record<string, unknown>): Promise<void> => {
    const { error } = await supabase.from("profils").update(payload).eq("id", profilId);
    if (error) throw error;
  }, []);

  const createProfil = useCallback(async (payload: Record<string, unknown>): Promise<{ id: string }> => {
    const { data, error } = await supabase.from("profils").insert(payload).select("id").single();
    if (error) throw error;
    return data as { id: string };
  }, []);

  const deleteVoiesByIds = useCallback(async (ids: string[]): Promise<void> => {
    if (!ids.length) return;
    const { error } = await supabase.from("voies").delete().in("id", ids);
    if (error) throw error;
  }, []);

  const updateVoie = useCallback(async (voieId: string, payload: Record<string, unknown>): Promise<void> => {
    const { error } = await supabase.from("voies").update(payload).eq("id", voieId);
    if (error) throw error;
  }, []);

  const insertVoie = useCallback(async (payload: Record<string, unknown>): Promise<void> => {
    const { error } = await supabase.from("voies").insert(payload);
    if (error) throw error;
  }, []);

  return useMemo(
    () => ({
      fetchEquipementOptions,
      fetchEquipementNames,
      uploadProfilImage,
      updateProfil,
      createProfil,
      deleteVoiesByIds,
      updateVoie,
      insertVoie,
    }),
    [fetchEquipementOptions, fetchEquipementNames, uploadProfilImage, updateProfil, createProfil, deleteVoiesByIds, updateVoie, insertVoie]
  );
}
