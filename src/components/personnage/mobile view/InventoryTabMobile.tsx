/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Coins, Package, Shield, Sword, Target, Backpack,
  Loader2, Plus, Minus, Trash2, X, Save,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EquipementWizard from "@/components/compendium/equipement/MagicalItemWizard";
import type { EquipementType } from "@/components/compendium/equipement/MagicalItemWizard";
import { useInventory, type ItemType } from "@/hooks/useInventory";

interface InventoryTabMobileProps {
  pjId: string;
  pnjId?: string | null;
  profilId?: string | null;
  pjStats: any;
  onUpdateStats: (newStats: any) => void;
  readOnly?: boolean;
  autoOpenItemId?: string | null;
  onInventoryChange?: () => void;
}

export default function InventoryTabMobile({
  pjId, pnjId, profilId, pjStats, onUpdateStats, readOnly = false, autoOpenItemId, onInventoryChange,
}: InventoryTabMobileProps) {
  const {
    isLoading, unifiedItems, weaponsAndArmor, genericItems, pa, po, pc, updateBourse, toggleEquip, saveItem, deleteItem, fetchCompendiumItems
  } = useInventory({ pjId, pnjId, profilId, pjStats, onUpdateStats, onInventoryChange });

  // Quick-edit bottom sheet
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editType, setEditType] = useState<ItemType>("arme_contact");
  const [editItemId, setEditItemId] = useState<string | number | null>(null);
  const [editNom, setEditNom] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editQte, setEditQte] = useState(1);
  const [editIsEquipped, setEditIsEquipped] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editCompendiumItems, setEditCompendiumItems] = useState<any[]>([]);
  const [isFetchingEditCompendium, setIsFetchingEditCompendium] = useState(false);

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<ItemType>("equipement");
  const [addItemId, setAddItemId] = useState<string | number | null>(null);
  const [addNom, setAddNom] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addQte, setAddQte] = useState(1);
  const [addIsEquipped, setAddIsEquipped] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [compendiumItems, setCompendiumItems] = useState<any[]>([]);
  const [isFetchingCompendium, setIsFetchingCompendium] = useState(false);

  // Wizard
  const [wizardType, setWizardType] = useState<EquipementType | null>(null);

  const handleWizardCreated = (newItem?: any) => {
    if (!newItem || !wizardType) { setWizardType(null); return; }
    const desc = newItem.notes || newItem.description || newItem.data?.description || "";
    setAddItemId(newItem.id);
    setAddNom(newItem.nom);
    setAddDesc(desc);
    setCompendiumItems(prev => [...prev.filter(i => i.id !== newItem.id), newItem]);
    setWizardType(null);
  };

  useEffect(() => {
    if (!autoOpenItemId || isLoading || unifiedItems.length === 0) return;
    const item = unifiedItems.find((i: any) => i.id === autoOpenItemId);
    if (item) openEdit(item);
  }, [autoOpenItemId, isLoading, unifiedItems]);

  useEffect(() => {
    if (!showAddModal) return;
    setIsFetchingCompendium(true);
    fetchCompendiumItems(addType)
      .then(setCompendiumItems)
      .finally(() => setIsFetchingCompendium(false));
  }, [addType, showAddModal]);

  const openEdit = (item: any) => {
    setEditItem(item);
    setEditType(item.item_type ?? "equipement");
    setEditItemId(item.item_id ?? null);
    setEditNom(item.nom_custom || "");
    setEditDesc(item.description_custom || "");
    setEditQte(item.qte || 1);
    setEditIsEquipped(item.is_equipped || false);
  };

  useEffect(() => {
    if (!editItem) return;
    setIsFetchingEditCompendium(true);
    fetchCompendiumItems(editType)
      .then(setEditCompendiumItems)
      .finally(() => setIsFetchingEditCompendium(false));
  }, [editType, editItem]);

  const handleSave = async () => {
    if (!editItem) return;
    setIsSaving(true);
    try {
      await saveItem({
        item_type: editType,
        item_id: editItemId,
        nom_custom: editNom,
        description_custom: editDesc,
        qte: editQte,
        is_equipped: editIsEquipped,
      }, editItem.id);
      setEditItem(null);
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
      await deleteItem(editItem.id);
      setEditItem(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!addNom.trim()) return;
    setIsAdding(true);
    try {
      await saveItem({
        item_type: addType,
        item_id: addItemId,
        nom_custom: addNom.trim(),
        description_custom: addDesc.trim(),
        qte: addQte,
        is_equipped: addType === "equipement" ? false : addIsEquipped,
      });
      setShowAddModal(false);
      setAddNom("");
      setAddDesc("");
      setAddQte(1);
      setAddType("equipement");
      setAddItemId(null);
      setAddIsEquipped(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsAdding(false);
    }
  };

  const selectItemClass = "!text-white **:!text-white hover:!text-white focus:!text-white data-highlighted:!text-white hover:bg-white/10 focus:bg-white/10 data-highlighted:bg-white/10 data-[state=checked]:!text-white";

  const handleAddTypeChange = (nextType: ItemType) => {
    setAddType(nextType);
    setAddItemId(null);
    setAddNom("");
    setAddDesc("");
    setAddQte(1);
    setAddIsEquipped(false);
  };

  const handleCompendiumSelect = (value: string) => {
    if (value === "custom") {
      setAddItemId(null);
      setAddNom("");
      setAddDesc("");
      return;
    }
    const selected = compendiumItems.find((i) => i.id.toString() === value);
    if (!selected) return;
    const desc = selected.notes || selected.description || selected.data?.description || "";
    setAddItemId(selected.id);
    setAddNom(selected.nom || "");
    setAddDesc(desc);
  };

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
            { label: "PA", value: pa, setPa: (v: number) => updateBourse(v, po, pc), cls: "border-white/10 text-white" },
            { label: "PO", value: po, setPo: (v: number) => updateBourse(pa, v, pc), cls: "border-yellow-400/25 text-yellow-100" },
            { label: "PC", value: pc, setPc: (v: number) => updateBourse(pa, po, v), cls: "border-orange-400/25 text-orange-100" },
          ].map(({ label, value, setPa, setPo, setPc, cls }: any) => (
            <div key={label} className={`flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-lg border ${cls}`}>
              <span className="text-[9px] font-bold text-white/40">{label}</span>
              <input
                type="number"
                disabled={readOnly}
                value={value}
                onChange={(e) => {
                  const v = parseInt(e.target.value) || 0;
                  if (setPa) setPa(v);
                  if (setPo) setPo(v);
                  if (setPc) setPc(v);
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
              onClick={() => {
                handleAddTypeChange("arme_contact");
                setShowAddModal(true);
              }}
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
              onClick={() => {
                handleAddTypeChange("equipement");
                setShowAddModal(true);
              }}
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

      {wizardType && createPortal(
        <div className="fixed inset-0 z-200">
          <EquipementWizard selectedType={wizardType} onClose={() => setWizardType(null)} onSuccess={handleWizardCreated} />
        </div>,
        document.body
      )}

      {/* BOTTOM SHEET : ÉDITION */}
      {editItem && !readOnly && createPortal(
        <div className="fixed inset-0 z-9999 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !isSaving && setEditItem(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-[#E3CCCD]/20 shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden" style={{ background: "linear-gradient(160deg,rgba(30,25,65,0.97) 0%,rgba(36,27,89,0.97) 100%)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/8">
              <span className="font-serif text-sm font-semibold text-white">Modifier l'objet</span>
              <button onClick={() => setEditItem(null)} className="p-1 text-white/40 hover:text-white rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/40 block mb-1.5">Catégorie</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["arme_contact","arme_distance","armure","equipement"] as ItemType[]).map(t => (
                    <button key={t} type="button" onClick={() => { setEditType(t); setEditItemId(null); setEditNom(""); setEditDesc(""); }} className={`py-1.5 rounded-lg border text-[11px] font-medium transition-colors ${editType === t ? "border-[#E3CCCD]/50 bg-[#E3CCCD]/15 text-[#E3CCCD]" : "border-white/15 text-white/50 hover:text-white/80"}`}>{t === "arme_contact" ? "Contact" : t === "arme_distance" ? "Distance" : t === "armure" ? "Armure" : "Équipement"}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#E3CCCD]/60 block mb-1">Objet du Compendium</label>
                <Select value={editItemId?.toString() || "custom"} onValueChange={(val) => {
                  if (val === "custom") { setEditItemId(null); setEditNom(""); setEditDesc(""); return; }
                  const sel = editCompendiumItems.find(i => i.id?.toString() === val);
                  if (!sel) return;
                  const desc = sel.notes || sel.description || sel.data?.description || "";
                  setEditItemId(sel.id); setEditNom(sel.nom); setEditDesc(desc);
                }} disabled={isFetchingEditCompendium}>
                  <SelectTrigger className="w-full h-10 bg-white/8 border border-white/20 rounded-lg px-2.5 text-white text-sm focus-visible:ring-0 disabled:opacity-50"><SelectValue placeholder="Objet personnalisé…" /></SelectTrigger>
                  <SelectContent className="bg-[#2A2458] border border-white/18 text-white rounded-lg max-h-60 z-10000">
                    <SelectItem value="custom" className="text-white! hover:bg-white/10">Objet personnalisé…</SelectItem>
                    {editCompendiumItems.map(ci => (<SelectItem key={ci.id} value={ci.id.toString()} className="text-white! hover:bg-white/10">{ci.nom}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/40 block mb-1">Nom</label>
                <input type="text" value={editNom} onChange={(e) => setEditNom(e.target.value)} className="w-full bg-white/8 border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#E3CCCD]/50" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/40 block mb-1">{editType.includes("arme") ? "Dégâts" : editType === "armure" ? "Défense" : "Description"}</label>
                <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full bg-white/8 border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#E3CCCD]/50" />
              </div>
              {(editType === "equipement" || !editType) && (
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/40 block mb-1">Quantité</label>
                  <div className="flex items-center gap-3 bg-white/8 border border-white/20 rounded-lg px-3 py-1.5 w-max">
                    <button type="button" onClick={() => setEditQte(q => Math.max(1, q - 1))} className="p-1 text-white/50 hover:text-white"><Minus className="w-3.5 h-3.5" /></button>
                    <span className="font-mono text-base font-bold text-white w-8 text-center">{editQte}</span>
                    <button type="button" onClick={() => setEditQte(q => q + 1)} className="p-1 text-white/50 hover:text-white"><Plus className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              )}
              {editType !== "equipement" && (
                <label className="flex items-center gap-2 cursor-pointer w-max">
                  <input type="checkbox" checked={editIsEquipped} onChange={(e) => setEditIsEquipped(e.target.checked)} className="accent-[#E3CCCD] w-4 h-4" />
                  <span className="text-sm text-white/80 select-none">Porté / équipé en main</span>
                </label>
              )}
            </div>
            <div className="flex gap-2 px-4 pb-4">
              <button type="button" disabled={isSaving} onClick={handleDelete} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-400/30 bg-red-400/10 text-red-300 text-[12px] font-semibold hover:bg-red-400/20 transition-colors disabled:opacity-60"><Trash2 className="w-3.5 h-3.5" /> Supprimer</button>
              <button type="button" disabled={isSaving || !editNom.trim()} onClick={handleSave} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#E3CCCD]/30 bg-[#E3CCCD]/12 text-[#E3CCCD] text-[12px] font-semibold hover:bg-[#E3CCCD]/20 transition-colors disabled:opacity-60"><Save className="w-3.5 h-3.5" /> {isSaving ? "Sauvegarde..." : "Sauvegarder"}</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* BOTTOM SHEET : AJOUT */}
      {showAddModal && !readOnly && createPortal(
        <div className="fixed inset-0 z-9999 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !isAdding && setShowAddModal(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-[#E3CCCD]/20 shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden" style={{ background: "linear-gradient(160deg,rgba(30,25,65,0.97) 0%,rgba(36,27,89,0.97) 100%)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/8">
              <span className="font-serif text-sm font-semibold text-white">Ajouter un objet</span>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-white/40 hover:text-white rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/40 block mb-1.5">Catégorie</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["arme_contact", "arme_distance", "armure", "equipement"] as ItemType[]).map(t => (
                    <button key={t} type="button" onClick={() => handleAddTypeChange(t)} className={`py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${addType === t ? "bg-[#E3CCCD]/18 border-[#E3CCCD]/40 text-[#E3CCCD]" : "bg-white/5 border-white/12 text-white/55"}`}>{t === "arme_contact" ? "Contact" : t === "arme_distance" ? "Distance" : t === "armure" ? "Armure" : "Équipement"}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] uppercase tracking-widest text-[#E3CCCD]/60">Objet du Compendium</label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/35 font-mono">{compendiumItems.length}</span>
                    <button type="button" onClick={() => setWizardType(addType as EquipementType)} className="flex items-center gap-1 text-[10px] text-[#E3CCCD]/70 border border-[#E3CCCD]/25 bg-[#E3CCCD]/8 hover:bg-[#E3CCCD]/15 rounded px-2 py-0.5 transition-colors"><Plus className="w-3 h-3" /> Créer</button>
                  </div>
                </div>
                <Select value={addItemId?.toString() || "custom"} onValueChange={handleCompendiumSelect} disabled={isFetchingCompendium}>
                  <SelectTrigger className="w-full h-10.5 bg-[#2C255F]/65 border border-white/20 rounded-lg px-2.5 text-white text-sm focus-visible:ring-0 disabled:opacity-50"><SelectValue placeholder="Objet personnalisé..." /></SelectTrigger>
                  <SelectContent className="bg-[#2A2458] border border-white/18 text-white rounded-lg max-h-72 overflow-hidden z-10000">
                    <SelectItem value="custom" className={selectItemClass}>Objet personnalisé...</SelectItem>
                    {compendiumItems.map((item) => (<SelectItem key={item.id} value={item.id.toString()} className={selectItemClass}>{item.nom}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/40 block mb-1">Nom</label>
                <input type="text" value={addNom} onChange={(e) => setAddNom(e.target.value)} placeholder="ex: Épée longue" className="w-full bg-white/8 border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#E3CCCD]/50" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/40 block mb-1">Description</label>
                <input type="text" value={addDesc} onChange={(e) => setAddDesc(e.target.value)} className="w-full bg-white/8 border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#E3CCCD]/50" />
              </div>
              {addType === "equipement" && (
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/40 block mb-1">Quantité</label>
                  <div className="flex items-center gap-3 bg-white/8 border border-white/20 rounded-lg px-3 py-1.5 w-max">
                    <button type="button" onClick={() => setAddQte(q => Math.max(1, q - 1))} className="p-1 text-white/50 hover:text-white"><Minus className="w-3.5 h-3.5" /></button>
                    <span className="font-mono text-base font-bold text-white w-8 text-center">{addQte}</span>
                    <button type="button" onClick={() => setAddQte(q => q + 1)} className="p-1 text-white/50 hover:text-white"><Plus className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              )}
              {addType !== "equipement" && (
                <label className="flex items-center gap-2 cursor-pointer mt-1 w-max p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <input type="checkbox" checked={addIsEquipped} onChange={(e) => setAddIsEquipped(e.target.checked)} className="accent-[#E3CCCD] w-4 h-4" />
                  <span className="text-[12px] text-white/80 select-none">Objet équipé en main / porté</span>
                </label>
              )}
            </div>
            <div className="flex gap-2 px-4 pb-4">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2.5 rounded-xl border border-white/20 text-white/60 text-[12px] font-semibold hover:bg-white/8 transition-colors">Annuler</button>
              <button type="button" disabled={isAdding || !addNom.trim()} onClick={handleAdd} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-emerald-400/40 bg-emerald-400/20 text-emerald-100 text-[12px] font-semibold hover:bg-emerald-400/30 transition-colors disabled:opacity-60"><Plus className="w-3.5 h-3.5" /> {isAdding ? "Ajout..." : "Ajouter"}</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}