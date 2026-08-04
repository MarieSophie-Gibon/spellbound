/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import { supabase } from "@/lib/supabase";

export function usePersonnageCreationData() {
  return useMemo(
    () => ({
      async getCurrentUserId() {
        const { data } = await supabase.auth.getUser();
        return data.user?.id ?? null;
      },

      async fetchPlayers() {
        const { data } = await supabase
          .from("utilisateurs")
          .select("id, pseudo, role")
          .order("pseudo");
        return data ?? [];
      },

      async fetchPeuplesWithVoie() {
        const { data } = await supabase
          .from("peuples")
          .select("id, nom, description, data, multi, image_url, voie:voies!peuple_id(id, nom, capacites)")
          .order("nom");
        return data ?? [];
      },

      async fetchProfilsWithVoies(campaignId: string) {
        const { data, error } = await supabase
          .from("profils")
          .select("id, nom, description, equipement_base, maitrise_equipement, image_url, data, famille:familles(nom, pv_niveau, de_recuperation, bonus_chance), voies(id, nom, capacites)")
          .or(`campaign_id.eq.${campaignId},campaign_id.is.null`)
          .order("nom");
        return { data: data ?? [], error };
      },

      async fetchProfilsWithVoiesForPnj(campaignId: string, campaignIsUuid: boolean) {
        const profilsQuery = supabase
          .from("profils")
          .select("id, nom, description, equipement_base, maitrise_equipement, image_url, data, famille:familles(nom, pv_niveau, de_recuperation, bonus_chance), voies(id, nom, capacites)")
          .order("nom");
        if (campaignIsUuid) {
          const { data } = await profilsQuery.or(`campaign_id.eq.${campaignId},campaign_id.is.null`);
          return data ?? [];
        }
        const { data } = await profilsQuery.is("campaign_id", null);
        return data ?? [];
      },

      async fetchEquipementsRef() {
        const [r1, r2, r3] = await Promise.all([
          supabase.from("armes_contact").select("id, nom, dm, type_de_dm").order("nom"),
          supabase.from("armes_distance").select("id, nom, dm, portee").order("nom"),
          supabase.from("armures").select("id, nom, bonus_def").order("nom"),
        ]);
        return {
          armesContact: r1.data ?? [],
          armesDistance: r2.data ?? [],
          armures: r3.data ?? [],
        };
      },

      async fetchOldPjs(campaignId: string, currentUserId?: string | null) {
        let query = supabase
          .from("pj")
          .select("id, name, image_url, stats, pathways, inventory, peuple_id, profils_id, user_id, campaign_id")
          .neq("campaign_id", campaignId)
          .order("name");

        if (currentUserId) {
          query = query.eq("user_id", currentUserId);
        }

        const { data: pjData, error } = await query;
        if (error) throw error;

        const uniqueCampaignIds = [...new Set((pjData || []).map((p: any) => p.campaign_id))];
        let campaignNames: Record<string, string> = {};
        if (uniqueCampaignIds.length > 0) {
          const { data: campData } = await supabase
            .from("campagnes")
            .select("id, nom")
            .in("id", uniqueCampaignIds);
          if (campData) {
            campaignNames = Object.fromEntries(campData.map((c: any) => [c.id, c.nom]));
          }
        }

        return (pjData || []).map((pj: any) => ({
          ...pj,
          campaign_nom: campaignNames[pj.campaign_id] ?? "Campagne inconnue",
        }));
      },

      async fetchOldPnjs(campaignId: string) {
        const { data: pnjData, error } = await supabase
          .from("pnj")
          .select("id, name, image_url, stats, pathways, inventory, peuple_id, profils_id, campaign_id")
          .neq("campaign_id", campaignId)
          .order("name");
        if (error) throw error;

        const uniqueCampaignIds = [...new Set((pnjData || []).map((p: any) => p.campaign_id))];
        let campaignNames: Record<string, string> = {};
        if (uniqueCampaignIds.length > 0) {
          const { data: campData } = await supabase
            .from("campagnes")
            .select("id, nom")
            .in("id", uniqueCampaignIds);
          if (campData) {
            campaignNames = Object.fromEntries(campData.map((c: any) => [c.id, c.nom]));
          }
        }

        return (pnjData || []).map((pnj: any) => ({
          ...pnj,
          campaign_nom: campaignNames[pnj.campaign_id] ?? "Campagne inconnue",
        }));
      },

      async clonePjWithInventory(payload: {
        campaignId: string;
        finalUserId: string | null;
        finalName: string;
        source: any;
      }) {
        const { data: newPJData, error } = await supabase
          .from("pj")
          .insert({
            campaign_id: payload.campaignId,
            user_id: payload.finalUserId,
            name: payload.finalName,
            image_url: payload.source.image_url,
            peuple_id: payload.source.peuple_id,
            profils_id: payload.source.profils_id,
            stats: payload.source.stats,
            pathways: payload.source.pathways,
            inventory: payload.source.inventory,
          })
          .select();
        if (error) throw error;

        const newPJId = newPJData?.[0]?.id;
        if (newPJId) {
          const { data: oldItems } = await supabase
            .from("pj_inventaire")
            .select("item_type, item_id, nom_custom, description_custom, qte, is_equipped")
            .eq("pj_id", payload.source.id);
          if (oldItems && oldItems.length > 0) {
            await supabase.from("pj_inventaire").insert(
              oldItems.map((item) => ({ ...item, pj_id: newPJId }))
            );
          }
        }

        return newPJData ?? [];
      },

      async clonePnjWithInventory(payload: {
        campaignId: string;
        finalName: string;
        source: any;
      }) {
        const { data: newPNJData, error } = await supabase
          .from("pnj")
          .insert({
            campaign_id: payload.campaignId,
            name: payload.finalName,
            image_url: payload.source.image_url,
            peuple_id: payload.source.peuple_id,
            profils_id: payload.source.profils_id,
            stats: payload.source.stats,
            pathways: payload.source.pathways,
            inventory: payload.source.inventory,
          })
          .select();
        if (error) throw error;

        const newPNJId = newPNJData?.[0]?.id;
        if (newPNJId) {
          const { data: oldItems } = await supabase
            .from("pj_inventaire")
            .select("item_type, item_id, nom_custom, description_custom, qte, is_equipped")
            .eq("pnj_id", payload.source.id);
          if (oldItems && oldItems.length > 0) {
            await supabase.from("pj_inventaire").insert(
              oldItems.map((item) => ({ ...item, pj_id: null, pnj_id: newPNJId }))
            );
          }
        }

        return newPNJData ?? [];
      },

      async uploadCompendiumImage(pathPrefix: string, file: File) {
        const ext = file.name.split(".").pop();
        const path = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
        const { error } = await supabase.storage.from("compendium").upload(path, file, { upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from("compendium").getPublicUrl(path);
        return data.publicUrl;
      },

      async createPj(payload: Record<string, unknown>) {
        const { data, error } = await supabase.from("pj").insert(payload).select();
        if (error) throw error;
        return data ?? [];
      },

      async createPnj(payload: Record<string, unknown>) {
        const { data, error } = await supabase.from("pnj").insert(payload).select();
        if (error) throw error;
        return data ?? [];
      },

      async insertInventaireRows(rows: any[]) {
        if (!rows.length) return;
        const { error } = await supabase.from("pj_inventaire").insert(rows);
        if (error) throw error;
      },

      async fetchFamiliers(ownerType: "pj" | "pnj", ownerId: string) {
        const col = ownerType === "pj" ? "pj_id" : "pnj_id";
        const { data } = await supabase.from("pj_familiers").select("*").eq(col, ownerId).order("created_at");
        return data ?? [];
      },

      async fetchBestiaireFamilier(monsterId: string) {
        const { data } = await supabase
          .from("bestiaire")
          .select("nom, nc, type_creature, taille, description, stats, combat, attaques, capacites")
          .eq("id", monsterId)
          .single();
        return data;
      },

      async updateFamilier(id: string, patch: Record<string, unknown>) {
        const { error } = await supabase.from("pj_familiers").update(patch).eq("id", id);
        if (error) throw error;
      },

      async insertFamilier(ownerType: "pj" | "pnj", ownerId: string, payload: Record<string, unknown>) {
        const col = ownerType === "pj" ? "pj_id" : "pnj_id";
        const { error } = await supabase.from("pj_familiers").insert({ [col]: ownerId, ...payload });
        if (error) throw error;
      },

      async deleteFamilier(id: string) {
        const { error } = await supabase.from("pj_familiers").delete().eq("id", id);
        if (error) throw error;
      },

      async searchBestiaireForFamilier(campaignId: string, searchTerm: string) {
        let query = supabase
          .from("bestiaire")
          .select("id, nom, image_url, combat, stats, attaques, capacites, nc, type_creature, taille, description")
          .or(`campaign_id.eq.${campaignId},campaign_id.is.null`)
          .order("nom")
          .limit(50);
        if (searchTerm.trim()) {
          query = query.ilike("nom", `%${searchTerm}%`);
        }
        const { data } = await query;
        return data ?? [];
      },

      async searchPnjForFamilier(campaignId: string, searchTerm: string) {
        let query = supabase
          .from("pnj")
          .select("id, name, image_url, stats")
          .eq("campaign_id", campaignId)
          .order("name")
          .limit(50);
        if (searchTerm.trim()) {
          query = query.ilike("name", `%${searchTerm}%`);
        }
        const { data } = await query;
        return data ?? [];
      },

      async fetchProfileFamilyMeta() {
        const { data } = await supabase
          .from("profils")
          .select("id, nom, famille_id, familles(nom)");
        return data ?? [];
      },

      async saveCharacterPathways(type: "pj" | "pnj", id: string, pathways: any[]) {
        const table = type === "pnj" ? "pnj" : "pj";
        const { error } = await supabase.from(table).update({ pathways }).eq("id", id);
        if (error) throw error;
      },
    }),
    [],
  );
}
