/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import { supabase } from "@/lib/supabase";

export interface ChapitreHistoryEntry {
  id: string;
  title: string;
  saved_at: string;
}

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

      // Liste légère (sans contenu) : le contenu n'est chargé que pour la version consultée.
      async fetchChapitreHistory(chapitreId: string) {
        const { data, error } = await supabase
          .from("chapitres_history")
          .select("id, title, saved_at")
          .eq("chapitre_id", chapitreId)
          .order("saved_at", { ascending: false });
        if (error) throw error;
        return (data ?? []) as ChapitreHistoryEntry[];
      },

      async fetchChapitreHistoryContent(historyId: string) {
        const { data, error } = await supabase
          .from("chapitres_history")
          .select("content")
          .eq("id", historyId)
          .single();
        if (error) throw error;
        return (data?.content ?? []) as any[];
      },

      async restoreChapitreVersion(historyId: string) {
        const { error } = await supabase.rpc("restore_chapitre_version", { p_history_id: historyId });
        if (error) throw error;
      },
    }),
    [],
  );
}
