import { useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";

export type EquipementSourceTable = "arme_contact" | "arme_distance" | "armure" | "equipement";

const tableMap: Record<EquipementSourceTable, string> = {
  arme_contact: "armes_contact",
  arme_distance: "armes_distance",
  armure: "armures",
  equipement: "equipements",
};

export function useEquipementWizardData() {
  const uploadEquipementImage = useCallback(async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `equipements/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("compendium")
      .upload(path, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("compendium").getPublicUrl(path);
    return data.publicUrl;
  }, []);

  const saveEquipement = useCallback(
    async ({
      source,
      payload,
      equipementId,
    }: {
      source: EquipementSourceTable;
      payload: Record<string, unknown>;
      equipementId?: string;
    }): Promise<Record<string, unknown> | null> => {
      const table = tableMap[source];

      if (equipementId) {
        const { error } = await supabase.from(table).update(payload).eq("id", equipementId);
        if (error) throw error;
        return null;
      }

      const { data, error } = await supabase.from(table).insert(payload).select().single();
      if (error) throw error;
      return (data as Record<string, unknown>) ?? null;
    },
    []
  );

  return useMemo(
    () => ({
      uploadEquipementImage,
      saveEquipement,
    }),
    [uploadEquipementImage, saveEquipement]
  );
}
