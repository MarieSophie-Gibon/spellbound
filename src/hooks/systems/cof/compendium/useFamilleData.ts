import { useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";

export function useFamilleData() {
  const saveFamille = useCallback(
    async ({ familleId, payload }: { familleId?: string; payload: Record<string, unknown> }): Promise<void> => {
      if (familleId) {
        const { error } = await supabase.from("familles").update(payload).eq("id", familleId);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("familles").insert(payload);
      if (error) throw error;
    },
    []
  );

  return useMemo(() => ({ saveFamille }), [saveFamille]);
}
