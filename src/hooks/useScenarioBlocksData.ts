/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";

function normalizeItemIdForDb(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

export function useScenarioBlocksData() {
  const fetchPnjMiniDetails = useCallback(async (pnjId: string) => {
    const { data, error } = await supabase
      .from("pnj")
      .select("image_url, stats")
      .eq("id", pnjId)
      .single();
    if (error) throw error;
    return data;
  }, []);

  const searchPnjs = useCallback(async (campaignId: string, searchTerm: string, options?: { onlyCombatant?: boolean; limit?: number }) => {
    let query = supabase
      .from("pnj")
      .select("id, name, image_url")
      .eq("campaign_id", campaignId)
      .order("name")
      .limit(options?.limit ?? 6);

    if (options?.onlyCombatant) {
      query = query.filter("stats->>is_combatant", "eq", "true");
    }

    if (searchTerm.trim()) {
      query = query.ilike("name", `%${searchTerm}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }, []);

  const searchClueItems = useCallback(async (campaignId: string, searchTerm: string) => {
    const q = `%${searchTerm}%`;
    const filter = `campaign_id.is.null,campaign_id.eq.${campaignId}`;
    const [eq, ac, ad, ar] = await Promise.all([
      supabase.from("equipements").select("id, nom").or(filter).ilike("nom", q).limit(5),
      supabase.from("armes_contact").select("id, nom").or(filter).ilike("nom", q).limit(4),
      supabase.from("armes_distance").select("id, nom").or(filter).ilike("nom", q).limit(4),
      supabase.from("armures").select("id, nom").or(filter).ilike("nom", q).limit(4),
    ]);

    return [
      ...(eq.data ?? []).map((item) => ({ ...item, table: "equipements" })),
      ...(ac.data ?? []).map((item) => ({ ...item, table: "armes_contact" })),
      ...(ad.data ?? []).map((item) => ({ ...item, table: "armes_distance" })),
      ...(ar.data ?? []).map((item) => ({ ...item, table: "armures" })),
    ];
  }, []);

  const searchEnemyMonsters = useCallback(async (campaignId: string, searchTerm: string) => {
    let query = supabase
      .from("bestiaire")
      .select("id, nom, image_url, type_creature, nc")
      .order("nom")
      .or(`campaign_id.eq.${campaignId},campaign_id.is.null`);

    if (searchTerm.trim()) {
      query = query.ilike("nom", `%${searchTerm}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((monster) => ({
      id: monster.id,
      name: monster.nom,
      image_url: monster.image_url,
      type_creature: monster.type_creature,
      nc: monster.nc,
    }));
  }, []);

  const fetchMonsterDetails = useCallback(async (monsterId: string) => {
    const { data, error } = await supabase
      .from("bestiaire")
      .select("stats, combat, attaques, capacites")
      .eq("id", monsterId)
      .single();
    if (error) throw error;
    return data;
  }, []);

  const fetchPnjStats = useCallback(async (pnjId: string) => {
    const { data, error } = await supabase
      .from("pnj")
      .select("stats")
      .eq("id", pnjId)
      .single();
    if (error) throw error;
    return data;
  }, []);

  const uploadWikiImage = useCallback(async (file: File, folder: string) => {
    const ext = file.name.split(".").pop() || "png";
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const filePath = `${folder}/${fileName}`;
    const { error } = await supabase.storage.from("wiki-images").upload(filePath, file);
    if (error) throw error;
    const { data } = supabase.storage.from("wiki-images").getPublicUrl(filePath);
    return data.publicUrl;
  }, []);

  const uploadCompendiumImage = useCallback(async (file: File, folder: string) => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
    const { error } = await supabase.storage.from("compendium").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("compendium").getPublicUrl(path);
    return data.publicUrl;
  }, []);

  const fetchLootDescriptions = useCallback(async (items: Array<{ id: string; table: string; description?: string | null }>) => {
    const missingDesc = items.filter((item) => item.description === undefined || item.description === null);
    if (!missingDesc.length) return {} as Record<string, string | null>;

    const tableConfig: Record<string, { table: string; select: string; getDesc: (row: any) => string | null }> = {
      equipements: { table: "equipements", select: "id, data", getDesc: (row) => (row.data?.description as string) || null },
      armes_contact: { table: "armes_contact", select: "id, notes", getDesc: (row) => (row.notes as string) || null },
      armes_distance: { table: "armes_distance", select: "id, notes", getDesc: (row) => (row.notes as string) || null },
      armures: { table: "armures", select: "id, notes", getDesc: (row) => (row.notes as string) || null },
    };

    const byTable = missingDesc.reduce<Record<string, string[]>>((acc, item) => {
      acc[item.table] = [...(acc[item.table] || []), item.id];
      return acc;
    }, {});

    const descMap: Record<string, string | null> = {};
    await Promise.all(
      Object.entries(byTable).map(async ([tableKey, ids]) => {
        const cfg = tableConfig[tableKey];
        if (!cfg) return;
        const { data } = await supabase.from(cfg.table).select(cfg.select).in("id", ids);
        (data || []).forEach((row: any) => {
          descMap[`${tableKey}:${row.id}`] = cfg.getDesc(row);
        });
      }),
    );

    return descMap;
  }, []);

  const searchLootItems = useCallback(async (campaignId: string, searchTerm: string) => {
    const q = `%${searchTerm}%`;
    const [eq, ac, ad, ar] = await Promise.all([
      supabase.from("equipements").select("id, nom, image_url, prix, data").or(`campaign_id.is.null,campaign_id.eq.${campaignId}`).ilike("nom", q).limit(5),
      supabase.from("armes_contact").select("id, nom, image_url, prix, notes, dm, type_de_dm").or(`campaign_id.is.null,campaign_id.eq.${campaignId}`).ilike("nom", q).limit(5),
      supabase.from("armes_distance").select("id, nom, image_url, prix, notes, dm, type_de_dm").or(`campaign_id.is.null,campaign_id.eq.${campaignId}`).ilike("nom", q).limit(5),
      supabase.from("armures").select("id, nom, image_url, prix, notes, bonus_def").or(`campaign_id.is.null,campaign_id.eq.${campaignId}`).ilike("nom", q).limit(5),
    ]);

    return [
      ...(eq.data || []).map((item) => ({ ...item, table: "equipements", stat: item.data?.rarete || "Objet", description: item.data?.description || null, quantite: 1 })),
      ...(ac.data || []).map((item) => ({ ...item, table: "armes_contact", stat: `${item.dm || ""} ${item.type_de_dm || ""}`.trim(), description: item.notes || null, quantite: 1 })),
      ...(ad.data || []).map((item) => ({ ...item, table: "armes_distance", stat: `${item.dm || ""} ${item.type_de_dm || ""}`.trim(), description: item.notes || null, quantite: 1 })),
      ...(ar.data || []).map((item) => ({ ...item, table: "armures", stat: item.bonus_def ? `${item.bonus_def} DEF` : "Armure", description: item.notes || null, quantite: 1 })),
    ];
  }, []);

  const assignLootItemToPj = useCallback(async (payload: {
    pjId: string;
    itemType: "arme_contact" | "arme_distance" | "armure" | "equipement";
    itemId: string | number | null;
    nom: string;
    description: string;
    qte: number;
  }) => {
    const { error } = await supabase.from("pj_inventaire").insert({
      pj_id: payload.pjId,
      item_type: payload.itemType,
      item_id: normalizeItemIdForDb(payload.itemId),
      nom_custom: payload.nom,
      description_custom: payload.description,
      qte: payload.qte,
      is_equipped: false,
    });

    if (error) throw error;
  }, []);

  return useMemo(
    () => ({
      fetchPnjMiniDetails,
      searchPnjs,
      searchClueItems,
      searchEnemyMonsters,
      fetchMonsterDetails,
      fetchPnjStats,
      uploadWikiImage,
      uploadCompendiumImage,
      fetchLootDescriptions,
      searchLootItems,
      assignLootItemToPj,
    }),
    [
      fetchPnjMiniDetails,
      searchPnjs,
      searchClueItems,
      searchEnemyMonsters,
      fetchMonsterDetails,
      fetchPnjStats,
      uploadWikiImage,
      uploadCompendiumImage,
      fetchLootDescriptions,
      searchLootItems,
      assignLootItemToPj,
    ],
  );
}