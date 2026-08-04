import { useMemo } from "react";
import { supabase } from "@/lib/supabase";

type DeleteTargetType = "scenario" | "chapitre";

export function useScenariosData() {
  return useMemo(
    () => ({
      async fetchScenarios(campaignId: string) {
        const { data, error } = await supabase
          .from("scenarios")
          .select("*")
          .eq("campaign_id", campaignId)
          .order("ordre", { ascending: true });
        if (error) throw error;
        return data ?? [];
      },

      async fetchChapitresByScenarioIds(scenarioIds: string[]) {
        if (!scenarioIds.length) return [];
        const { data, error } = await supabase
          .from("chapitres")
          .select("id, scenario_id, title, ordre, completed")
          .in("scenario_id", scenarioIds)
          .order("ordre", { ascending: true });
        if (error) throw error;
        return data ?? [];
      },

      async updateChapitreCompleted(chapitreId: string, completed: boolean) {
        const { error } = await supabase
          .from("chapitres")
          .update({ completed })
          .eq("id", chapitreId);
        if (error) throw error;
      },

      async fetchChapitreContent(chapitreId: string) {
        const { data, error } = await supabase
          .from("chapitres")
          .select("content")
          .eq("id", chapitreId)
          .single();
        if (error) throw error;
        return data?.content ?? [];
      },

      async fetchAlreadyRevealedPnjs(campaignId: string, npcIds: string[]) {
        if (!npcIds.length) return [];
        const { data, error } = await supabase
          .from("campaign_revealed_pnjs")
          .select("pnj_id")
          .eq("campaign_id", campaignId)
          .in("pnj_id", npcIds);
        if (error) throw error;
        return data ?? [];
      },

      async insertRevealedPnjs(campaignId: string, npcIds: string[]) {
        if (!npcIds.length) return;
        const { error } = await supabase
          .from("campaign_revealed_pnjs")
          .insert(npcIds.map((pnj_id) => ({ campaign_id: campaignId, pnj_id })));
        if (error) throw error;
      },

      async updateChapitresOrder(orderUpdates: Array<{ id: string; ordre: number }>) {
        if (!orderUpdates.length) return;
        const updates = orderUpdates.map((item) =>
          supabase.from("chapitres").update({ ordre: item.ordre }).eq("id", item.id),
        );
        const results = await Promise.all(updates);
        const firstError = results.find((r) => r.error)?.error;
        if (firstError) throw firstError;
      },

      async deleteNode(type: DeleteTargetType, id: string) {
        const table = type === "scenario" ? "scenarios" : "chapitres";
        const { error } = await supabase.from(table).delete().eq("id", id);
        if (error) throw error;
      },

      async saveScenario(input: {
        campaignId: string;
        id?: string;
        title: string;
        description: string | null;
      }) {
        if (input.id) {
          const { error } = await supabase
            .from("scenarios")
            .update({ title: input.title, description: input.description })
            .eq("id", input.id);
          if (error) throw error;
          return input.id;
        }

        const { count, error: countError } = await supabase
          .from("scenarios")
          .select("*", { count: "exact", head: true })
          .eq("campaign_id", input.campaignId);
        if (countError) throw countError;

        const { data, error } = await supabase
          .from("scenarios")
          .insert({
            campaign_id: input.campaignId,
            title: input.title,
            description: input.description,
            ordre: count || 0,
          })
          .select("id")
          .single();
        if (error) throw error;
        return data?.id as string | undefined;
      },

      async saveChapitre(input: { scenarioId: string; id?: string; title: string }) {
        if (input.id) {
          const { error } = await supabase
            .from("chapitres")
            .update({ title: input.title })
            .eq("id", input.id);
          if (error) throw error;
          return input.id;
        }

        const { count, error: countError } = await supabase
          .from("chapitres")
          .select("*", { count: "exact", head: true })
          .eq("scenario_id", input.scenarioId);
        if (countError) throw countError;

        const { data, error } = await supabase
          .from("chapitres")
          .insert({ scenario_id: input.scenarioId, title: input.title, ordre: count || 0 })
          .select("id")
          .single();
        if (error) throw error;
        return data?.id as string | undefined;
      },
    }),
    [],
  );
}
