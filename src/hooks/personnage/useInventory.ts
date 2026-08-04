/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type ItemType = "arme_contact" | "arme_distance" | "armure" | "equipement";

export interface UseInventoryOptions {
  pjId: string;
  pnjId?: string | null;
  profilId?: string | null;
  pjStats: any;
  onUpdateStats: (newStats: any) => void;
  onInventoryChange?: () => void;
}

export const normalizeItemIdForDb = (value: string | number | null) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
};

export function useInventory({
  pjId,
  pnjId,
  profilId,
  pjStats,
  onUpdateStats,
  onInventoryChange,
}: UseInventoryOptions) {
  const isPnj = !!pnjId;
  const ownerId = pnjId || pjId;

  const [isLoading, setIsLoading] = useState(true);
  const [unifiedItems, setUnifiedItems] = useState<any[]>([]);

  // Bourse
  const [pa, setPa] = useState<number>(pjStats?.bourse_pa ?? 0);
  const [po, setPo] = useState<number>(pjStats?.bourse_po ?? 0);
  const [pc, setPc] = useState<number>(pjStats?.bourse_pc ?? 0);

  // Synchronisation de la bourse si les stats du PJ changent
  useEffect(() => {
    setPa(pjStats?.bourse_pa ?? 0);
    setPo(pjStats?.bourse_po ?? 0);
    setPc(pjStats?.bourse_pc ?? 0);
  }, [ownerId, pjStats?.bourse_pa, pjStats?.bourse_po, pjStats?.bourse_pc]);

  // --- CHARGEMENT DES OBJETS ---
  const fetchItems = useCallback(async () => {
    if (!ownerId) return;
    setIsLoading(true);
    try {
      if (isPnj) {
        const { data } = await supabase.from("pnj").select("inventory").eq("id", pnjId).single();
        setUnifiedItems(data?.inventory?.items ?? []);
      } else {
        const { data } = await supabase.from("pj_inventaire").select("*").eq("pj_id", pjId);
        setUnifiedItems(data || []);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération de l'inventaire:", err);
    } finally {
      setIsLoading(false);
    }
  }, [pjId, pnjId, isPnj, ownerId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems, profilId]);

  // --- MISE À JOUR DE LA BOURSE ---
  const updateBourse = (newPa: number, newPo: number, newPc: number) => {
    setPa(newPa);
    setPo(newPo);
    setPc(newPc);
    onUpdateStats({
      ...(pjStats ?? {}),
      bourse_pa: newPa,
      bourse_po: newPo,
      bourse_pc: newPc,
    });
  };

  // --- BASCULER L'ÉQUIPEMENT (ÉQUIPER / DÉSÉQUIPER) ---
  const toggleEquip = async (item: any) => {
    if (item.is_from_profile) return;
    try {
      if (isPnj) {
        const { data } = await supabase.from("pnj").select("inventory").eq("id", pnjId).single();
        const current: any[] = data?.inventory?.items ?? [];
        const updated = current.map((it: any) =>
          it.id === item.id ? { ...it, is_equipped: !it.is_equipped } : it
        );
        await supabase
          .from("pnj")
          .update({ inventory: { ...(data?.inventory ?? {}), items: updated } })
          .eq("id", pnjId);
      } else {
        await supabase
          .from("pj_inventaire")
          .update({ is_equipped: !item.is_equipped })
          .eq("id", item.id);
      }
      await fetchItems();
      onInventoryChange?.();
    } catch (err: any) {
      console.error("Erreur lors du basculement de l'équipement:", err.message);
    }
  };

  // --- SAUVEGARDER / MODIFIER UN OBJET ---
  const saveItem = async (
    itemData: {
      item_type: ItemType;
      item_id: string | number | null;
      nom_custom: string;
      description_custom: string;
      qte: number;
      is_equipped: boolean;
    },
    editingItemId?: string | null
  ) => {
    if (!itemData.nom_custom.trim()) return;

    const payload = {
      ...itemData,
      item_id: normalizeItemIdForDb(itemData.item_id),
    };

    if (isPnj) {
      const { data, error } = await supabase.from("pnj").select("inventory").eq("id", pnjId).single();
      if (error) throw error;

      const current: any[] = data?.inventory?.items ?? [];
      let updated: any[];

      if (editingItemId) {
        updated = current.map((it: any) => (it.id === editingItemId ? { ...it, ...payload } : it));
      } else {
        updated = [...current, { ...payload, id: crypto.randomUUID() }];
      }

      const { error: updateErr } = await supabase
        .from("pnj")
        .update({ inventory: { ...(data?.inventory ?? {}), items: updated } })
        .eq("id", pnjId);
      if (updateErr) throw updateErr;
    } else {
      if (editingItemId) {
        const { error } = await supabase
          .from("pj_inventaire")
          .update(payload)
          .eq("id", editingItemId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("pj_inventaire")
          .insert({ ...payload, pj_id: pjId });
        if (error) throw error;
      }
    }

    await fetchItems();
    onInventoryChange?.();
  };

  // --- SUPPRIMER UN OBJET ---
  const deleteItem = async (itemId: string) => {
    if (!itemId) return;
    if (isPnj) {
      const { data } = await supabase.from("pnj").select("inventory").eq("id", pnjId).single();
      const current: any[] = data?.inventory?.items ?? [];
      const updated = current.filter((it: any) => it.id !== itemId);
      await supabase
        .from("pnj")
        .update({ inventory: { ...(data?.inventory ?? {}), items: updated } })
        .eq("id", pnjId);
    } else {
      await supabase.from("pj_inventaire").delete().eq("id", itemId);
    }
    await fetchItems();
    onInventoryChange?.();
  };

  // --- CHARGER LES OBJETS DU COMPENDIUM SELON LE TYPE ---
  const fetchCompendiumItems = async (itemType: ItemType) => {
    const tableMap: Record<ItemType, string> = {
      arme_contact: "armes_contact",
      arme_distance: "armes_distance",
      armure: "armures",
      equipement: "equipements",
    };

    const { data } = await supabase.from(tableMap[itemType]).select("*").order("nom");
    return data || [];
  };

  // Filtrage par catégorie
  const weaponsAndArmor = unifiedItems.filter((i) =>
    ["arme_contact", "arme_distance", "armure"].includes(i.item_type)
  );
  const genericItems = unifiedItems.filter((i) => i.item_type === "equipement" || !i.item_type);

  return {
    isLoading,
    unifiedItems,
    weaponsAndArmor,
    genericItems,
    pa,
    po,
    pc,
    updateBourse,
    toggleEquip,
    saveItem,
    deleteItem,
    fetchCompendiumItems,
    refetchItems: fetchItems,
  };
}