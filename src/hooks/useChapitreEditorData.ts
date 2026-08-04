/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import { supabase } from "@/lib/supabase";

export function useChapitreEditorData() {
  return useMemo(
    () => ({
      async fetchChapitre(chapitreId: string) {
        const { data, error } = await supabase
          .from("chapitres")
          .select("*")
          .eq("id", chapitreId)
          .single();
        if (error) throw error;
        return data;
      },

      async saveChapitrePayload(
        chapitreId: string,
        payload: { content: any[]; combat_state?: any },
      ) {
        const { error } = await supabase
          .from("chapitres")
          .update(payload)
          .eq("id", chapitreId);
        if (error) throw error;
      },

      async uploadChapitreImage(file: File) {
        const ext = file.name.split(".").pop();
        const path = `scenarios/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
        const { error } = await supabase.storage.from("compendium").upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from("compendium").getPublicUrl(path);
        return data.publicUrl;
      },
    }),
    [],
  );
}
