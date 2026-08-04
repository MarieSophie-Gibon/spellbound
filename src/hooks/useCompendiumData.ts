import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Equipement, Famille, FamilleArchetype, FamilleVoie, Monstre, Peuple, Voie } from "@/types/compendium";

type EquipementSourceTable = "arme_contact" | "arme_distance" | "armure" | "equipement";

function applyCampaignFilter<T extends { or: (filter: string) => T; is: (column: string, value: null) => T }>(query: T, campaignId?: string): T {
  if (campaignId) {
    return query.or(`campaign_id.eq.${campaignId},campaign_id.is.null`);
  }
  return query.is("campaign_id", null);
}

export function useCompendiumData() {
  const fetchPeuples = useCallback(async (campaignId?: string): Promise<Peuple[]> => {
    const query = applyCampaignFilter(
      supabase.from("peuples").select("*").order("nom"),
      campaignId,
    );
    const { data } = await query;
    return (data as Peuple[]) ?? [];
  }, []);

  const fetchFamillesArchetypes = useCallback(async (campaignId?: string): Promise<FamilleArchetype[]> => {
    const query = applyCampaignFilter(
      supabase.from("familles").select("*").order("nom"),
      campaignId,
    );
    const { data } = await query;
    return (data as FamilleArchetype[]) ?? [];
  }, []);

  const fetchProfils = useCallback(async (campaignId?: string): Promise<Famille[]> => {
    const query = applyCampaignFilter(
      supabase.from("profils").select("*, familles(nom)").order("nom"),
      campaignId,
    );
    const { data } = await query;
    if (!data) {
      return [];
    }

    return data.map((profil: Famille & { familles?: { nom: string } | null }) => ({
      ...profil,
      famille_nom: profil.familles?.nom ?? null,
    })) as Famille[];
  }, []);

  const fetchMonstres = useCallback(async (campaignId?: string): Promise<Monstre[]> => {
    const query = applyCampaignFilter(
      supabase.from("bestiaire").select("*").order("nom"),
      campaignId,
    );
    const { data } = await query;
    return (data as Monstre[]) ?? [];
  }, []);

  const fetchEquipements = useCallback(async (campaignId?: string): Promise<Equipement[]> => {
    const [r1, r2, r3, r4] = await Promise.all([
      applyCampaignFilter(supabase.from("armes_contact").select("*").order("nom"), campaignId),
      applyCampaignFilter(supabase.from("armes_distance").select("*").order("nom"), campaignId),
      applyCampaignFilter(supabase.from("armures").select("*").order("nom"), campaignId),
      applyCampaignFilter(supabase.from("equipements").select("*").order("nom"), campaignId),
    ]);

    const all: Equipement[] = [
      ...(r1.data ?? []).map((item: Record<string, unknown>) => ({
        ...item,
        table_source: "arme_contact" as const,
        categorie: (item.categorie as string) || "Arme contact",
        data: {},
      })),
      ...(r2.data ?? []).map((item: Record<string, unknown>) => ({
        ...item,
        table_source: "arme_distance" as const,
        categorie: (item.categorie as string) || "Arme distance",
        data: {},
      })),
      ...(r3.data ?? []).map((item: Record<string, unknown>) => ({
        ...item,
        table_source: "armure" as const,
        categorie: "Armure",
        data: {},
      })),
      ...(r4.data ?? []).map((item: Record<string, unknown>) => ({
        ...item,
        table_source: "equipement" as const,
      })),
    ] as Equipement[];

    all.sort((a, b) => a.nom.localeCompare(b.nom));
    return all;
  }, []);

  const fetchVoieForPeuple = useCallback(async (peupleId: string): Promise<Voie | null> => {
    const { data } = await supabase
      .from("voies")
      .select("*")
      .eq("peuple_id", peupleId)
      .single();

    return (data as Voie) ?? null;
  }, []);

  const fetchVoiesPrestige = useCallback(async (campaignId?: string): Promise<FamilleVoie[]> => {
    const query = applyCampaignFilter(
      supabase.from("voies").select("*, familles(nom)").eq("type", "prestige").order("nom"),
      campaignId,
    );
    const { data } = await query;
    if (!data) {
      return [];
    }

    return data.map((voie: FamilleVoie & { familles?: { nom: string } | null }) => ({
      ...voie,
      famille_nom: voie.familles?.nom ?? null,
    })) as FamilleVoie[];
  }, []);

  const fetchVoiesForProfil = useCallback(async (profilId: string): Promise<FamilleVoie[]> => {
    const { data } = await supabase
      .from("voies")
      .select("*")
      .eq("profil_id", profilId)
      .order("nom");

    return (data as FamilleVoie[]) ?? [];
  }, []);

  const deletePeupleWithVoie = useCallback(async (peupleId: string, voieId?: string | null): Promise<void> => {
    if (voieId) {
      const { error: voieError } = await supabase.from("voies").delete().eq("id", voieId);
      if (voieError) throw voieError;
    }

    const { error: peupleError } = await supabase.from("peuples").delete().eq("id", peupleId);
    if (peupleError) throw peupleError;
  }, []);

  const deleteMonstre = useCallback(async (monstreId: string): Promise<void> => {
    const { error } = await supabase.from("bestiaire").delete().eq("id", monstreId);
    if (error) throw error;
  }, []);

  const deleteEquipement = useCallback(async (source: EquipementSourceTable, equipementId: string): Promise<void> => {
    const tableMap: Record<EquipementSourceTable, string> = {
      arme_contact: "armes_contact",
      arme_distance: "armes_distance",
      armure: "armures",
      equipement: "equipements",
    };

    const { error } = await supabase.from(tableMap[source]).delete().eq("id", equipementId);
    if (error) throw error;
  }, []);

  const deleteProfilWithVoies = useCallback(async (profilId: string): Promise<void> => {
    const { error: voiesError } = await supabase.from("voies").delete().eq("profil_id", profilId);
    if (voiesError) throw voiesError;

    const { error: profilError } = await supabase.from("profils").delete().eq("id", profilId);
    if (profilError) throw profilError;
  }, []);

  const deleteFamilleArchetype = useCallback(async (familleId: string): Promise<void> => {
    const { error } = await supabase.from("familles").delete().eq("id", familleId);
    if (error) throw error;
  }, []);

  const deleteVoiePrestige = useCallback(async (voieId: string): Promise<void> => {
    const { error } = await supabase.from("voies").delete().eq("id", voieId);
    if (error) throw error;
  }, []);

  return {
    fetchPeuples,
    fetchFamillesArchetypes,
    fetchProfils,
    fetchMonstres,
    fetchEquipements,
    fetchVoieForPeuple,
    fetchVoiesPrestige,
    fetchVoiesForProfil,
    deletePeupleWithVoie,
    deleteMonstre,
    deleteEquipement,
    deleteProfilWithVoies,
    deleteFamilleArchetype,
    deleteVoiePrestige,
  };
}
