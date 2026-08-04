/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import { supabase } from "@/lib/supabase";

export function useCombatDashboardData() {
  return useMemo(
    () => ({
      async fetchChapitreCombatAndContent(chapitreId: string) {
        const { data, error } = await supabase
          .from("chapitres")
          .select("combat_state, content")
          .eq("id", chapitreId)
          .single();
        if (error) throw error;
        return data;
      },

      async updateChapitreCombatState(chapitreId: string, payload: any) {
        const { error } = await supabase
          .from("chapitres")
          .update({ combat_state: payload })
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

      async updateChapitreContent(chapitreId: string, content: any[]) {
        const { error } = await supabase
          .from("chapitres")
          .update({ content })
          .eq("id", chapitreId);
        if (error) throw error;
      },

      async searchMonsters(campaignId: string, searchTerm: string) {
        let query = supabase
          .from("bestiaire")
          .select("id, nom, image_url, combat, stats, attaques, capacites")
          .or(`campaign_id.eq.${campaignId},campaign_id.is.null`)
          .order("nom")
          .limit(100);
        if (searchTerm.trim()) query = query.ilike("nom", `%${searchTerm}%`);
        const { data, error } = await query;
        if (error) throw error;
        return data ?? [];
      },

      async searchNpcs(campaignId: string, searchTerm: string) {
        let query = supabase
          .from("pnj")
          .select("id, name, image_url, stats, pathways")
          .eq("campaign_id", campaignId)
          .order("name")
          .limit(20);
        if (searchTerm.trim()) query = query.ilike("name", `%${searchTerm}%`);
        const { data, error } = await query;
        if (error) throw error;
        return data ?? [];
      },

      async fetchPjRows(ids: string[]) {
        if (!ids.length) return [];
        const { data, error } = await supabase
          .from("pj")
          .select("id, stats, pathways")
          .in("id", ids);
        if (error) throw error;
        return data ?? [];
      },

      async fetchPjFamiliers(ids: string[]) {
        if (!ids.length) return [];
        const { data, error } = await supabase.from("pj_familiers").select("*").in("pj_id", ids);
        if (error) throw error;
        return data ?? [];
      },

      async fetchPnjRows(ids: string[]) {
        if (!ids.length) return [];
        const { data, error } = await supabase
          .from("pnj")
          .select("id, stats, pathways")
          .in("id", ids);
        if (error) throw error;
        return data ?? [];
      },

      async fetchPnjFamiliers(ids: string[]) {
        if (!ids.length) return [];
        const { data, error } = await supabase.from("pj_familiers").select("*").in("pnj_id", ids);
        if (error) throw error;
        return data ?? [];
      },

      async fetchVoiesByIds(ids: string[]) {
        if (!ids.length) return [];
        const { data, error } = await supabase
          .from("voies")
          .select("id, nom, type, capacites")
          .in("id", ids);
        if (error) throw error;
        return data ?? [];
      },

      async fetchBestiaireByIds(ids: string[]) {
        if (!ids.length) return [];
        const { data, error } = await supabase
          .from("bestiaire")
          .select("id, nom, image_url, combat, stats, attaques, capacites")
          .in("id", ids);
        if (error) throw error;
        return data ?? [];
      },

      async fetchNpcsByIds(ids: string[]) {
        if (!ids.length) return [];
        const { data, error } = await supabase
          .from("pnj")
          .select("id, name, image_url, stats, pathways")
          .in("id", ids);
        if (error) throw error;
        return data ?? [];
      },

      async fetchCampaignPjs(campaignId: string) {
        const { data, error } = await supabase
          .from("pj")
          .select("id, name, image_url, stats, pathways")
          .eq("campaign_id", campaignId)
          .order("name");
        if (error) throw error;
        return data ?? [];
      },

      async fetchCampaignPjsNames(campaignId: string) {
        const { data, error } = await supabase
          .from("pj")
          .select("id, name")
          .eq("campaign_id", campaignId);
        if (error) throw error;
        return data ?? [];
      },

      async fetchCampaignPnjsNames(campaignId: string) {
        const { data, error } = await supabase
          .from("pnj")
          .select("id, name")
          .eq("campaign_id", campaignId);
        if (error) throw error;
        return data ?? [];
      },

      async fetchFamiliersByPjIds(pjIds: string[]) {
        if (!pjIds.length) return [];
        const { data, error } = await supabase.from("pj_familiers").select("*").in("pj_id", pjIds);
        if (error) throw error;
        return data ?? [];
      },

      async fetchFamiliersByPnjIds(pnjIds: string[]) {
        if (!pnjIds.length) return [];
        const { data, error } = await supabase.from("pj_familiers").select("*").in("pnj_id", pnjIds);
        if (error) throw error;
        return data ?? [];
      },

      async updatePjStats(pjId: string, stats: Record<string, any>) {
        const { error } = await supabase
          .from("pj")
          .update({ stats })
          .eq("id", pjId);
        if (error) throw error;
      },
    }),
    [],
  );
}
