/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { Coins, Package, Shield, Sword, Target, Backpack, Loader2, Plus, Pencil, Trash2, X, Save } from "lucide-react";
import { createPortal } from "react-dom";
import { DeleteConfirmModal } from "@/components/compendium/DeleteConfirmModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EquipementWizard from "@/components/compendium/equipement/MagicalItemWizard";
import type { EquipementType } from "@/components/compendium/equipement/MagicalItemWizard";
import { useInventory, type ItemType } from "@/hooks/useInventory";

interface InventoryTabProps {
  pjId: string;
  pnjId?: string | null;
  profilId?: string | null;
  pjStats: any;
  onUpdateStats: (newStats: any) => void;
  readOnly?: boolean;
  onInventoryChange?: () => void;
}

export default function InventoryTab({
  pjId, pnjId, profilId, pjStats, onUpdateStats, readOnly = false, onInventoryChange,
}: InventoryTabProps) {
  const {
    isLoading, weaponsAndArmor, genericItems, pa, po, pc, updateBourse, toggleEquip, saveItem, deleteItem, fetchCompendiumItems
  } = useInventory({ pjId, pnjId, profilId, pjStats, onUpdateStats, onInventoryChange });

  // Modale CRUD
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Compendium
  const [compendiumItems, setCompendiumItems] = useState<any[]>([]);
  const [isFetchingCompendium, setIsFetchingCompendium] = useState(false);

  // Wizard
  const [wizardType, setWizardType] = useState<EquipementType | null>(null);

  const [formData, setFormData] = useState({
    item_type: "arme_contact" as ItemType,
    item_id: null as string | number | null,
    nom_custom: "",
    description_custom: "",
    qte: 1,
    is_equipped: false
  });

  const handleWizardCreated = (newItem?: any) => {
    if (!newItem || !wizardType) { setWizardType(null); return; }
    const desc = newItem.notes || newItem.description || newItem.data?.description || "";
    setFormData(prev => ({ ...prev, item_id: newItem.id, nom_custom: newItem.nom, description_custom: desc }));
    setCompendiumItems(prev => [...prev.filter(i => i.id !== newItem.id), newItem]);
    setWizardType(null);
  };

  useEffect(() => {
    if (!isModalOpen) return;
    setIsFetchingCompendium(true);
    fetchCompendiumItems(formData.item_type)
      .then(setCompendiumItems)
      .finally(() => setIsFetchingCompendium(false));
  }, [formData.item_type, isModalOpen]);

  const handleOpenModal = (item?: any, defaultType: ItemType = "arme_contact") => {
    if (item && !item.is_from_profile) {
      setEditingItemId(item.id);
      setFormData({
        item_type: item.item_type,
        item_id: item.item_id || null,
        nom_custom: item.nom_custom || "",
        description_custom: item.description_custom || "",
        qte: item.qte || 1,
        is_equipped: item.is_equipped || false
      });
    } else {
      setEditingItemId(null);
      setFormData({ item_type: defaultType, item_id: null, nom_custom: "", description_custom: "", qte: 1, is_equipped: false });
    }
    setIsModalOpen(true);
  };

  const handleCompendiumSelect = (val: string) => {
    if (val === "custom") {
      setFormData({ ...formData, item_id: null, nom_custom: "", description_custom: "" });
    } else {
      const selected = compendiumItems.find(i => i.id.toString() === val);
      if (selected) {
        const desc = selected.notes || selected.description || selected.data?.description || "";
        setFormData({ ...formData, item_id: selected.id, nom_custom: selected.nom, description_custom: desc });
      }
    }
  };

  const handleSaveItem = async () => {
    try {
      await saveItem(formData, editingItemId);
      setIsModalOpen(false);
    } catch (error: any) {
      alert("Impossible d'enregistrer cet objet: " + (error?.message ?? "erreur inconnue"));
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete?.id) return;
    setIsDeleting(true);
    await deleteItem(itemToDelete.id);
    setIsDeleting(false);
    setItemToDelete(null);
  };

  const selectItemClass = "!text-white **:!text-white hover:!text-white focus:!text-white data-highlighted:!text-white hover:bg-white/10 focus:bg-white/10 data-highlighted:bg-white/10 data-[state=checked]:!text-white";

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-[#E3CCCD]/50 animate-spin" /></div>;

  return (
    <div className="space-y-4 animate-in fade-in duration-200 relative">
      {/* BOURSE */}
      <div className="bg-[#1E1941]/40 border border-[#E3CCCD]/20 rounded-lg p-4 shadow-inner flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.2em] text-yellow-400/70 flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5" /> Bourse
        </p>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
            <span className="text-white/40 text-[10px] font-bold">PA</span>
            <input type="number" disabled={readOnly} value={pa} onChange={(e) => updateBourse(parseInt(e.target.value) || 0, po, pc)} className="w-10 bg-transparent text-white font-mono text-sm text-right outline-none disabled:opacity-50" />
          </div>
          <div className="flex items-center gap-2 bg-yellow-400/10 px-3 py-1.5 rounded-lg border border-yellow-400/20">
            <span className="text-yellow-500/60 text-[10px] font-bold">PO</span>
            <input type="number" disabled={readOnly} value={po} onChange={(e) => updateBourse(pa, parseInt(e.target.value) || 0, pc)} className="w-10 bg-transparent text-yellow-100 font-mono text-sm text-right outline-none disabled:opacity-50" />
          </div>
          <div className="flex items-center gap-2 bg-orange-400/10 px-3 py-1.5 rounded-lg border border-orange-400/20">
            <span className="text-orange-500/60 text-[10px] font-bold">PC</span>
            <input type="number" disabled={readOnly} value={pc} onChange={(e) => updateBourse(pa, po, parseInt(e.target.value) || 0)} className="w-10 bg-transparent text-orange-100 font-mono text-sm text-right outline-none disabled:opacity-50" />
          </div>
        </div>
      </div>

      {/* ARMES & ARMURES */}
      <div className="bg-[#1E1941]/40 border border-[#E3CCCD]/20 rounded-lg p-5 shadow-inner">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Armes & Armures
          </p>
          {!readOnly && (
            <button onClick={() => handleOpenModal(null, "arme_contact")} className="flex items-center gap-1 text-[10px] text-white/50 bg-white/5 hover:bg-white/10 px-2 py-1 rounded border border-white/10 transition-colors">
              <Plus className="w-3 h-3" /> Ajouter
            </button>
          )}
        </div>

        {weaponsAndArmor.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {weaponsAndArmor.map(item => (
              <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${item.is_equipped ? "bg-[#E3CCCD]/10 border-[#E3CCCD]/30" : "bg-white/5 border-white/10"}`}>
                <button onClick={() => toggleEquip(item)} disabled={item.is_from_profile || readOnly} className={`p-2 rounded-lg border transition-colors ${item.is_equipped ? "bg-[#29206A]/40 border-[#E3CCCD]/20" : "bg-black/40 border-transparent hover:bg-white/10"} disabled:opacity-50`}>
                  {item.item_type === "arme_contact" ? <Sword className="w-4 h-4 text-[#E3CCCD]" /> : item.item_type === "arme_distance" ? <Target className="w-4 h-4 text-[#E3CCCD]" /> : <Shield className="w-4 h-4 text-[#E3CCCD]" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{item.nom_custom}</p>
                    {item.is_from_profile && <span className="text-[9px] bg-white/10 text-white/40 px-1.5 rounded uppercase tracking-widest shrink-0">Profil</span>}
                  </div>
                  {item.description_custom && <p className="text-xs text-white/40 truncate font-mono mt-0.5">{item.description_custom}</p>}
                </div>
                {!item.is_from_profile && !readOnly && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleOpenModal(item)} className="p-1.5 text-white/30 hover:text-white transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setItemToDelete(item)} className="p-1.5 text-white/30 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/25 italic text-xs text-center py-4 border border-dashed border-white/10 rounded-xl">Aucune arme ou armure.</p>
        )}
      </div>

      {/* ÉQUIPEMENT & DIVERS */}
      <div className="bg-[#1E1941]/40 border border-[#E3CCCD]/20 rounded-lg p-5 shadow-inner">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50 flex items-center gap-1.5">
            <Backpack className="w-3.5 h-3.5" /> Équipement & Divers
          </p>
          {!readOnly && (
            <button onClick={() => handleOpenModal(null, "equipement")} className="flex items-center gap-1 text-[10px] text-white/50 bg-white/5 hover:bg-white/10 px-2 py-1 rounded border border-white/10 transition-colors">
              <Plus className="w-3 h-3" /> Ajouter
            </button>
          )}
        </div>

        {genericItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {genericItems.map(item => (
              <div key={item.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                <Package className="w-4 h-4 text-white/30 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-white truncate">{item.nom_custom}</p>
                    <span className="text-[10px] font-mono text-white/40 bg-black/40 px-1.5 rounded">x{item.qte}</span>
                    {item.is_from_profile && <span className="text-[8px] bg-white/10 text-white/40 px-1 rounded uppercase shrink-0">Profil</span>}
                  </div>
                  {item.description_custom && <p className="text-[11px] text-white/50 mt-1 leading-tight">{item.description_custom}</p>}
                </div>
                {!item.is_from_profile && !readOnly && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => handleOpenModal(item)} className="text-white/20 hover:text-white transition-colors mb-2"><Pencil className="w-3 h-3" /></button>
                    <button onClick={() => setItemToDelete(item)} className="text-white/20 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/25 italic text-xs text-center py-4 border border-dashed border-white/10 rounded-xl">Sac vide.</p>
        )}
      </div>

      {/* MODALE CRUD */}
      {isModalOpen && !readOnly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[1px] p-4">
          <div className="bg-[#221B50]/95 border border-[#E3CCCD]/28 rounded-2xl w-full max-w-md p-6 shadow-[0_18px_55px_rgba(7,5,20,0.45)]">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-serif text-white">{editingItemId ? "Modifier l'objet" : "Ajouter un objet"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1">Catégorie</label>
                <Select
                  value={formData.item_type}
                  onValueChange={(val) => setFormData({ ...formData, item_type: val as ItemType, item_id: null, nom_custom: "", description_custom: "" })}
                >
                  <SelectTrigger className="w-full h-10.5 bg-[#2C255F]/65 border border-white/20 rounded-lg px-2.5 text-white text-sm focus-visible:ring-0">
                    <SelectValue placeholder="Choisir une catégorie" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2A2458] border border-white/18 text-white rounded-lg overflow-hidden">
                    <SelectItem value="arme_contact" className={selectItemClass}>Arme de contact</SelectItem>
                    <SelectItem value="arme_distance" className={selectItemClass}>Arme à distance</SelectItem>
                    <SelectItem value="armure" className={selectItemClass}>Armure / Bouclier</SelectItem>
                    <SelectItem value="equipement" className={selectItemClass}>Équipement divers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] uppercase tracking-widest text-[#E3CCCD]/60">Objet du Compendium</label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/35 font-mono">{compendiumItems.length}</span>
                    <button
                      type="button"
                      onClick={() => setWizardType(formData.item_type as EquipementType)}
                      className="flex items-center gap-1 text-[10px] text-[#E3CCCD]/70 border border-[#E3CCCD]/25 bg-[#E3CCCD]/8 hover:bg-[#E3CCCD]/15 rounded px-2 py-0.5 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Créer
                    </button>
                  </div>
                </div>

                <Select
                  value={formData.item_id?.toString() || "custom"}
                  onValueChange={handleCompendiumSelect}
                  disabled={isFetchingCompendium}
                >
                  <SelectTrigger className="w-full h-10.5 bg-[#2C255F]/65 border border-white/20 rounded-lg px-2.5 text-white text-sm focus-visible:ring-0 disabled:opacity-50">
                    <SelectValue placeholder="Objet personnalisé..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2A2458] border border-white/18 text-white rounded-lg max-h-72 overflow-hidden">
                    <SelectItem value="custom" className={selectItemClass}>Objet personnalisé...</SelectItem>
                    {compendiumItems.map(item => (
                      <SelectItem key={item.id} value={item.id.toString()} className={selectItemClass}>
                        {item.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1">Nom de l'objet</label>
                  <input type="text" value={formData.nom_custom} onChange={e => setFormData({...formData, nom_custom: e.target.value})} placeholder="ex: Épée longue" className="w-full bg-[#2C255F]/65 border border-white/20 rounded-lg p-2.5 text-white text-sm outline-none" />
                </div>
                <div className="w-20">
                  <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1">Qté</label>
                  <input type="number" min={1} value={formData.qte} onChange={e => setFormData({...formData, qte: parseInt(e.target.value)||1})} className="w-full bg-[#2C255F]/65 border border-white/20 rounded-lg p-2.5 text-white text-center font-mono text-sm outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1">Description</label>
                <input type="text" value={formData.description_custom} onChange={e => setFormData({...formData, description_custom: e.target.value})} className="w-full bg-[#2C255F]/65 border border-white/20 rounded-lg p-2.5 text-white text-sm outline-none" />
              </div>

              {formData.item_type !== "equipement" && (
                <label className="flex items-center gap-2 cursor-pointer mt-2 w-max p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <input type="checkbox" checked={formData.is_equipped} onChange={e => setFormData({...formData, is_equipped: e.target.checked})} className="accent-[#E3CCCD] w-4 h-4 cursor-pointer" />
                  <span className="text-sm text-white/80 select-none">Objet équipé en main / porté</span>
                </label>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-white/10">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-white/50 hover:text-white transition-colors text-sm">Annuler</button>
              <button onClick={handleSaveItem} disabled={!formData.nom_custom.trim()} className="flex items-center gap-2 px-4 py-2 bg-[#E3CCCD]/10 border border-[#E3CCCD]/30 text-[#E3CCCD] rounded-lg hover:bg-[#E3CCCD]/20 transition-colors text-sm disabled:opacity-50">
                <Save className="w-4 h-4" /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {wizardType && createPortal(
        <div className="fixed inset-0 z-200">
          <EquipementWizard selectedType={wizardType} onClose={() => setWizardType(null)} onSuccess={handleWizardCreated} />
        </div>,
        document.body
      )}

      {itemToDelete && !readOnly && (
        <DeleteConfirmModal
          name={itemToDelete.nom_custom || "cet objet"}
          isDeleting={isDeleting}
          onConfirm={handleDeleteItem}
          onCancel={() => { if (!isDeleting) setItemToDelete(null); }}
          title="Supprimer cet équipement ?"
          description={`L'objet "${itemToDelete.nom_custom || "sans nom"}" sera retiré de l'inventaire du personnage.`}
        />
      )}
    </div>
  );
}