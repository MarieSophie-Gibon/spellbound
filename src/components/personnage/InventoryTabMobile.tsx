/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import {
  Coins, Package, Shield, Sword, Target, Backpack,
  Loader2, Plus, Minus, Trash2, X, Save,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface InventoryTabMobileProps {
  pjId: string;
  pnjId?: string | null;
  profilId?: string | null;
  pjStats: any;
  onUpdateStats: (newStats: any) => void;
  readOnly?: boolean;
}

type ItemType = "arme_contact" | "arme_distance" | "armure" | "equipement";

const normalizeItemIdForDb = (value: string | number | null) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
};

export default function InventoryTabMobile({
  pjId, pnjId, profilId, pjStats, onUpdateStats, readOnly = false,
}: InventoryTabMobileProps) {
  const isPnj = !!pnjId;
  const ownerId = pnjId || pjId;

  const [isLoading, setIsLoading] = useState(true);
  const [unifiedItems, setUnifiedItems] = useState<any[]>([]);

  // Bourse
  const [pa, setPa] = useState<number>(pjStats?.bourse_pa ?? 0);
  const [po, setPo] = useState<number>(pjStats?.bourse_po ?? 0);
  const [pc, setPc] = useState<number>(pjStats?.bourse_pc ?? 0);

  // Quick-edit bottom sheet
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editNom, setEditNom] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editQte, setEditQte] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<ItemType>("equipement");
  const [addNom, setAddNom] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addQte, setAddQte] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    setPa(pjStats?.bourse_pa ?? 0);
    setPo(pjStats?.bourse_po ?? 0);
    setPc(pjStats?.bourse_pc ?? 0);
  }, [ownerId]);

  const fetchItems = async () => {
    setIsLoading(true);
    if (isPnj) {
      const { data } = await supabase.from("pnj").select("inventory").eq("id", pnjId).single();
      setUnifiedItems(data?.inventory?.items ?? []);
    } else {
      const { data } = await supabase.from("pj_inventaire").select("*").eq("pj_id", pjId);
      setUnifiedItems(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (ownerId) fetchItems();
  }, [ownerId, profilId]);

  const openEdit = (item: any) => {
    setEditItem(item);
    setEditNom(item.nom_custom || "");
    setEditDesc(item.description_custom || "");
    setEditQte(item.qte || 1);
  };

  const handleSave = async () => {
    if (!editItem) return;
    setIsSaving(true);
    try {
      const payload = { nom_custom: editNom, description_custom: editDesc, qte: editQte };
      if (isPnj) {
        const { data } = await supabase.from("pnj").select("inventory").eq("id", pnjId).single();
        const current: any[] = data?.inventory?.items ?? [];
        const updated = current.map((it: any) => it.id === editItem.id ? { ...it, ...payload } : it);
        await supabase.from("pnj").update({ inventory: { ...(data?.inventory ?? {}), items: updated } }).eq("id", pnjId);
      } else {
        await supabase.from("pj_inventaire").update(payload).eq("id", editItem.id);
      }
      setEditItem(null);
      fetchItems();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editItem) return;
    setIsSaving(true);
    try {
      if (isPnj) {
        const { data } = await supabase.from("pnj").select("inventory").eq("id", pnjId).single();
        const current: any[] = data?.inventory?.items ?? [];
        const updated = current.filter((it: any) => it.id !== editItem.id);
        await supabase.from("pnj").update({ inventory: { ...(data?.inventory ?? {}), items: updated } }).eq("id", pnjId);
      } else {
        await supabase.from("pj_inventaire").delete().eq("id", editItem.id);
      }
      setEditItem(null);
      fetchItems();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleEquip = async (item: any) => {
    if (item.is_from_profile || readOnly) return;
    if (isPnj) {
      const { data } = await supabase.from("pnj").select("inventory").eq("id", pnjId).single();
      const current: any[] = data?.inventory?.items ?? [];
      const updated = current.map((it: any) => it.id === item.id ? { ...it, is_equipped: !it.is_equipped } : it);
      await supabase.from("pnj").update({ inventory: { ...(data?.inventory ?? {}), items: updated } }).eq("id", pnjId);
    } else {
      await supabase.from("pj_inventaire").update({ is_equipped: !item.is_equipped }).eq("id", item.id);
    }
    fetchItems();
  };

  const handleAdd = async () => {
    if (!addNom.trim()) return;
    setIsAdding(true);
    try {
      const payload = {
        item_type: addType,
        item_id: normalizeItemIdForDb(null),
        nom_custom: addNom.trim(),
        description_custom: addDesc.trim(),
        qte: addQte,
        is_equipped: false,
      };
      if (isPnj) {
        const { data } = await supabase.from("pnj").select("inventory").eq("id", pnjId).single();
        const current: any[] = data?.inventory?.items ?? [];
        await supabase.from("pnj").update({
          inventory: { ...(data?.inventory ?? {}), items: [...current, { ...payload, id: crypto.randomUUID() }] },
        }).eq("id", pnjId);
      } else {
        await supabase.from("pj_inventaire").insert({ ...payload, pj_id: pjId });
      }
      setShowAddModal(false);
      setAddNom(""); setAddDesc(""); setAddQte(1); setAddType("equipement");
      fetchItems();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsAdding(false);
    }
  };

  const weaponsAndArmor = unifiedItems.filter(i => ["arme_contact", "arme_distance", "armure"].includes(i.item_type));
  const genericItems = unifiedItems.filter(i => i.item_type === "equipement" || !i.item_type);

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-7 h-7 text-[#E3CCCD]/50 animate-spin" /></div>;
  }

  return (
    <div className="space-y-2 animate-in fade-in duration-200">

      {/* BOURSE */}
      <div className="rounded-xl border border-[#E3CCCD]/20 bg-[#1E1941]/40 p-2 flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-[0.2em] text-yellow-400 flex items-center gap-1">
          <Coins className="w-3 h-3" /> Bourse
        </span>
        <div className="flex gap-1">
          {[
            { label: "PA", value: pa, set: setPa, cls: "border-white/10 text-white" },
            { label: "PO", value: po, set: setPo, cls: "border-yellow-400/25 text-yellow-100" },
            { label: "PC", value: pc, set: setPc, cls: "border-orange-400/25 text-orange-100" },
          ].map(({ label, value, set, cls }) => (
            <div key={label} className={`flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-lg border ${cls}`}>
              <span className="text-[9px] font-bold text-white/40">{label}</span>
              <input
                type="number"
                disabled={readOnly}
                value={value}
                onChange={(e) => {
                  const v = parseInt(e.target.value) || 0;
                  set(v);
                  onUpdateStats({ ...pjStats, bourse_pa: label === "PA" ? v : pa, bourse_po: label === "PO" ? v : po, bourse_pc: label === "PC" ? v : pc });
                }}
                onKeyDown={(e) => e.stopPropagation()}
                className="w-9 bg-transparent font-mono text-xs text-right outline-none disabled:opacity-50"
              />
            </div>
          ))}
        </div>
      </div>

      {/* ARMES & ARMURES */}
      <div className="rounded-xl border border-[#E3CCCD]/20 bg-[#1E1941]/40 p-2">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[9px] uppercase tracking-[0.2em] text-[#E3CCCD] flex items-center gap-1">
            <Shield className="w-3 h-3" /> Armes & Armures
          </span>
          {!readOnly && (
            <button
              onClick={() => { setAddType("arme_contact"); setShowAddModal(true); }}
              className="flex items-center gap-1 text-white/50 bg-white/5 hover:bg-white/10 px-1 py-1 rounded-lg border border-white/10 transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
        </div>

        {weaponsAndArmor.length === 0 ? (
          <p className="text-white/25 italic text-xs text-center py-3 border border-dashed border-white/10 rounded-xl">Aucune arme ou armure.</p>
        ) : (
          <div className="space-y-1.5">
            {weaponsAndArmor.map(item => (
              <div
                key={item.id}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${item.is_equipped ? "bg-[#E3CCCD]/10 border-[#E3CCCD]/28" : "bg-white/5 border-white/10"} ${!item.is_from_profile && !readOnly ? "cursor-pointer active:bg-white/14" : ""}`}
                onClick={!item.is_from_profile && !readOnly ? () => openEdit(item) : undefined}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); toggleEquip(item); }}
                  disabled={item.is_from_profile || readOnly}
                  className={`p-1.5 rounded-lg border shrink-0 transition-colors ${item.is_equipped ? "bg-[#29206A]/40 border-[#E3CCCD]/20" : "bg-black/40 border-transparent"} disabled:opacity-50`}
                >
                  {item.item_type === "arme_contact" ? <Sword className="w-3.5 h-3.5 text-[#E3CCCD]" /> : item.item_type === "arme_distance" ? <Target className="w-3.5 h-3.5 text-[#E3CCCD]" /> : <Shield className="w-3.5 h-3.5 text-[#E3CCCD]" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-white truncate">{item.nom_custom}</p>
                    {item.is_from_profile && <span className="text-[8px] bg-white/10 text-white/40 px-1 rounded uppercase shrink-0">Profil</span>}
                  </div>
                  {item.description_custom && <p className="text-[10px] text-white/40 truncate font-mono mt-0.5">{item.description_custom}</p>}
                </div>
                {!item.is_from_profile && !readOnly && (
                  <span className="text-white/20 shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ÉQUIPEMENT & DIVERS */}
      <div className="rounded-xl border border-[#E3CCCD]/20 bg-[#1E1941]/40 p-2">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[9px] uppercase tracking-[0.2em] text-[#E3CCCD] flex items-center gap-1">
            <Backpack className="w-3 h-3" /> Équipement & Divers
          </span>
          {!readOnly && (
            <button
              onClick={() => { setAddType("equipement"); setShowAddModal(true); }}
              className="flex items-center gap-1 text-white/50 bg-white/5 hover:bg-white/10 px-1 py-1 rounded-lg border border-white/10 transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
        </div>

        {genericItems.length === 0 ? (
          <p className="text-white/25 italic text-xs text-center py-3 border border-dashed border-white/10 rounded-xl">Sac vide.</p>
        ) : (
          <div className="space-y-1.5">
            {genericItems.map(item => (
              <div
                key={item.id}
                className={`flex items-center gap-2.5 p-2.5 bg-white/5 rounded-xl border border-white/10 transition-all ${!item.is_from_profile && !readOnly ? "cursor-pointer active:bg-white/14" : ""}`}
                onClick={!item.is_from_profile && !readOnly ? () => openEdit(item) : undefined}
              >
                <Package className="w-3.5 h-3.5 text-white/30 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-white truncate">{item.nom_custom}</p>
                    <span className="text-[9px] font-mono text-white/40 bg-black/30 px-1 rounded shrink-0">×{item.qte}</span>
                    {item.is_from_profile && <span className="text-[8px] bg-white/10 text-white/40 px-1 rounded uppercase shrink-0">Profil</span>}
                  </div>
                  {item.description_custom && <p className="text-[10px] text-white/45 mt-0.5 leading-snug line-clamp-1">{item.description_custom}</p>}
                </div>
                {!item.is_from_profile && !readOnly && (
                  <span className="text-white/20 shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── BOTTOM SHEET : ÉDITION D'UN OBJET ── */}
      {editItem && !readOnly && (
        <div
          className="fixed inset-0 z-9999 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4 pb-8"
          onClick={() => !isSaving && setEditItem(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[#E3CCCD]/20 shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden"
            style={{ background: "linear-gradient(160deg,rgba(30,25,65,0.97) 0%,rgba(36,27,89,0.97) 100%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/8">
              <span className="font-serif text-sm font-semibold text-white">Modifier l'objet</span>
              <button onClick={() => setEditItem(null)} className="p-1 text-white/40 hover:text-white rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/40 block mb-1">Nom</label>
                <input
                  type="text"
                  value={editNom}
                  onChange={(e) => setEditNom(e.target.value)}
                  className="w-full bg-white/8 border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#E3CCCD]/50"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/40 block mb-1">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-white/8 border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#E3CCCD]/50 resize-none"
                />
              </div>
              {(editItem.item_type === "equipement" || !editItem.item_type) && (
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/40 block mb-1">Quantité</label>
                  <div className="flex items-center gap-3 bg-white/8 border border-white/20 rounded-lg px-3 py-1.5 w-max">
                    <button type="button" onClick={() => setEditQte(q => Math.max(1, q - 1))} className="p-1 text-white/50 hover:text-white">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-base font-bold text-white w-8 text-center">{editQte}</span>
                    <button type="button" onClick={() => setEditQte(q => q + 1)} className="p-1 text-white/50 hover:text-white">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 px-4 pb-4">
              <button
                type="button"
                disabled={isSaving}
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-400/30 bg-red-400/10 text-red-300 text-[12px] font-semibold hover:bg-red-400/20 transition-colors disabled:opacity-60"
              >
                <Trash2 className="w-3.5 h-3.5" /> Supprimer
              </button>
              <button
                type="button"
                disabled={isSaving || !editNom.trim()}
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#E3CCCD]/30 bg-[#E3CCCD]/12 text-[#E3CCCD] text-[12px] font-semibold hover:bg-[#E3CCCD]/20 transition-colors disabled:opacity-60"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? "Sauvegarde..." : "Sauvegarder"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM SHEET : AJOUT D'UN OBJET ── */}
      {showAddModal && !readOnly && (
        <div
          className="fixed inset-0 z-9999 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4 pb-8"
          onClick={() => !isAdding && setShowAddModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[#E3CCCD]/20 shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden"
            style={{ background: "linear-gradient(160deg,rgba(30,25,65,0.97) 0%,rgba(36,27,89,0.97) 100%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/8">
              <span className="font-serif text-sm font-semibold text-white">Ajouter un objet</span>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-white/40 hover:text-white rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Type */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/40 block mb-1.5">Catégorie</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["arme_contact", "arme_distance", "armure", "equipement"] as ItemType[]).map(t => {
                    const labels: Record<ItemType, string> = { arme_contact: "Contact", arme_distance: "Distance", armure: "Armure", equipement: "Équipement" };
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAddType(t)}
                        className={`py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${addType === t ? "bg-[#E3CCCD]/18 border-[#E3CCCD]/40 text-[#E3CCCD]" : "bg-white/5 border-white/12 text-white/55"}`}
                      >
                        {labels[t]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/40 block mb-1">Nom</label>
                <input
                  type="text"
                  value={addNom}
                  onChange={(e) => setAddNom(e.target.value)}
                  placeholder="ex: Épée longue"
                  className="w-full bg-white/8 border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#E3CCCD]/50 placeholder:text-white/25"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/40 block mb-1">Description</label>
                <input
                  type="text"
                  value={addDesc}
                  onChange={(e) => setAddDesc(e.target.value)}
                  placeholder={addType.includes("arme") ? "ex: Dégâts 1d8" : addType === "armure" ? "ex: Défense +2" : "ex: Corde de 15m"}
                  className="w-full bg-white/8 border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#E3CCCD]/50 placeholder:text-white/25"
                />
              </div>
              {addType === "equipement" && (
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/40 block mb-1">Quantité</label>
                  <div className="flex items-center gap-3 bg-white/8 border border-white/20 rounded-lg px-3 py-1.5 w-max">
                    <button type="button" onClick={() => setAddQte(q => Math.max(1, q - 1))} className="p-1 text-white/50 hover:text-white">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-base font-bold text-white w-8 text-center">{addQte}</span>
                    <button type="button" onClick={() => setAddQte(q => q + 1)} className="p-1 text-white/50 hover:text-white">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 px-4 pb-4">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2.5 rounded-xl border border-white/20 text-white/60 text-[12px] font-semibold hover:bg-white/8 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isAdding || !addNom.trim()}
                onClick={handleAdd}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-emerald-400/40 bg-emerald-400/20 text-emerald-100 text-[12px] font-semibold hover:bg-emerald-400/30 transition-colors disabled:opacity-60"
              >
                <Plus className="w-3.5 h-3.5" />
                {isAdding ? "Ajout..." : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
