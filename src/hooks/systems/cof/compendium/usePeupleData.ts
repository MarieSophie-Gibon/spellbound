import { useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";

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

  return useMemo(
    () => ({
      uploadPeupleImage,
      updatePeuple,
      createPeuple,
      updateVoie,
      createVoie,
    }),
    [uploadPeupleImage, updatePeuple, createPeuple, updateVoie, createVoie]
  );
}
