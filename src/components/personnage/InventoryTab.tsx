/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { Coins, Package, Shield, Sword, Target, Backpack, Loader2, Plus, Pencil, Trash2, X, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface InventoryTabProps {
  pjId: string;
  profilId?: string | null;
  pjStats: any;
  onUpdateStats: (newStats: any) => void;
}

type ItemType = "arme_contact" | "arme_distance" | "armure" | "equipement";

export default function InventoryTab({ pjId, profilId, pjStats, onUpdateStats }: InventoryTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [unifiedItems, setUnifiedItems] = useState<any[]>([]);

  // Modale CRUD
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
  // Nouveaux états pour le Compendium dans la modale
  const [compendiumItems, setCompendiumItems] = useState<any[]>([]);
  const [isFetchingCompendium, setIsFetchingCompendium] = useState(false);

  const [formData, setFormData] = useState({
    item_type: "arme_contact" as ItemType,
    item_id: null as string | number | null,
    nom_custom: "",
    description_custom: "",
    qte: 1,
    is_equipped: false
  });

  const pa = pjStats?.bourse_pa ?? 0;
  const po = pjStats?.bourse_po ?? 0;
  const pc = pjStats?.bourse_pc ?? 0;

  // --- CHARGEMENT DE L'INVENTAIRE ---
  const fetchEverything = async () => {
    setIsLoading(true);
    let allMerged: any[] = [];

    // 1. Profil de base
    let equipAssoc: any = null;
    if (profilId) {
      const { data: profil } = await supabase.from("profils").select("data").eq("id", profilId).single();
      equipAssoc = profil?.data?.equipement_associe;
    }

    const fetchCompendiumDetails = async (table: string, ids: string[], type: ItemType) => {
      if (!ids || ids.length === 0) return [];
      const { data } = await supabase.from(table).select("*").in("id", ids);
      return (data || []).map(d => ({
        id: `profil-${d.id}`,
        item_type: type,
        nom_custom: d.nom,
        description_custom: d.dm ? `Dégâts: ${d.dm}` : d.bonus_def ? `Défense: ${d.bonus_def}` : d.description,
        qte: 1,
        is_equipped: false,
        is_from_profile: true
      }));
    };

    if (equipAssoc) {
      const armesContact = await fetchCompendiumDetails("armes_contact", equipAssoc.arme_contact, "arme_contact");
      const armesDist = await fetchCompendiumDetails("armes_distance", equipAssoc.arme_distance, "arme_distance");
      const armures = await fetchCompendiumDetails("armures", equipAssoc.armure, "armure");
      const equip = await fetchCompendiumDetails("equipements", equipAssoc.equipement, "equipement");
      allMerged = [...armesContact, ...armesDist, ...armures, ...equip];
    }

    // 2. Inventaire custom (Table pj_inventaire)
    const { data: customInv } = await supabase.from("pj_inventaire").select("*").eq("pj_id", pjId);
    if (customInv) {
      allMerged = [...allMerged, ...customInv.map(i => ({ ...i, is_from_profile: false }))];
    }

    setUnifiedItems(allMerged);
    setIsLoading(false);
  };

  useEffect(() => {
    if (pjId) fetchEverything();
  }, [pjId, profilId]);

  // --- CHARGEMENT DU COMPENDIUM POUR LA MODALE ---
  useEffect(() => {
    if (!isModalOpen) return;

    const fetchTable = async () => {
      setIsFetchingCompendium(true);
      const tableMap: Record<ItemType, string> = {
        arme_contact: "armes_contact",
        arme_distance: "armes_distance",
        armure: "armures",
        equipement: "equipements"
      };

      try {
        const { data } = await supabase.from(tableMap[formData.item_type]).select("*").order("nom");
        setCompendiumItems(data || []);
      } catch (e) {
        setCompendiumItems([]);
      }
      setIsFetchingCompendium(false);
    };

    fetchTable();
  }, [formData.item_type, isModalOpen]);

  const handleCurrencyChange = (type: 'pa' | 'po' | 'pc', val: number) => {
    onUpdateStats({ ...pjStats, [`bourse_${type}`]: val });
  };

  // On ajoute un paramètre defaultType pour savoir depuis quel bloc on a cliqué
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
      // On initialise le formulaire avec la catégorie par défaut du bouton cliqué
      setFormData({ item_type: defaultType, item_id: null, nom_custom: "", description_custom: "", qte: 1, is_equipped: false });
    }
    setIsModalOpen(true);
  };

  // Quand l'utilisateur choisit un objet dans le menu déroulant
  const handleCompendiumSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "custom") {
      setFormData({ ...formData, item_id: null, nom_custom: "", description_custom: "" });
    } else {
      const selected = compendiumItems.find(i => i.id.toString() === val);
      if (selected) {
        let desc = selected.description || "";
        if (formData.item_type === "arme_contact" || formData.item_type === "arme_distance") desc = `Dégâts: ${selected.dm}`;
        if (formData.item_type === "armure") desc = `Défense: ${selected.bonus_def}`;
        
        setFormData({
          ...formData,
          item_id: selected.id,
          nom_custom: selected.nom,
          description_custom: desc
        });
      }
    }
  };

  const handleSaveItem = async () => {
    if (!formData.nom_custom.trim()) return;
    if (editingItemId) {
      await supabase.from("pj_inventaire").update(formData).eq("id", editingItemId);
    } else {
      await supabase.from("pj_inventaire").insert({ ...formData, pj_id: pjId });
    }
    setIsModalOpen(false);
    fetchEverything();
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm("Supprimer cet objet de l'inventaire ?")) {
      await supabase.from("pj_inventaire").delete().eq("id", id);
      fetchEverything();
    }
  };

  const toggleEquip = async (item: any) => {
    if (item.is_from_profile) return;
    await supabase.from("pj_inventaire").update({ is_equipped: !item.is_equipped }).eq("id", item.id);
    fetchEverything();
  };

  const weaponsAndArmor = unifiedItems.filter(i => ["arme_contact", "arme_distance", "armure"].includes(i.item_type));
  const genericItems = unifiedItems.filter(i => i.item_type === "equipement" || !i.item_type);

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-[#E3CCCD]/50 animate-spin" /></div>;

  return (
    <div className="space-y-4 animate-in fade-in duration-200 relative">
      
      {/* MINI BLOC : BOURSE */}
      <div className="bg-[#1E1941]/40 border border-[#E3CCCD]/20 rounded-lg p-4 shadow-inner flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.2em] text-yellow-400/70 flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5" /> Bourse
        </p>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
            <span className="text-white/40 text-[10px] font-bold">PA</span>
            <input type="number" value={pa} onChange={(e) => handleCurrencyChange('pa', parseInt(e.target.value) || 0)} className="w-10 bg-transparent text-white font-mono text-sm text-right outline-none" />
          </div>
          <div className="flex items-center gap-2 bg-yellow-400/10 px-3 py-1.5 rounded-lg border border-yellow-400/20">
            <span className="text-yellow-500/60 text-[10px] font-bold">PO</span>
            <input type="number" value={po} onChange={(e) => handleCurrencyChange('po', parseInt(e.target.value) || 0)} className="w-10 bg-transparent text-yellow-100 font-mono text-sm text-right outline-none" />
          </div>
          <div className="flex items-center gap-2 bg-orange-400/10 px-3 py-1.5 rounded-lg border border-orange-400/20">
            <span className="text-orange-500/60 text-[10px] font-bold">PC</span>
            <input type="number" value={pc} onChange={(e) => handleCurrencyChange('pc', parseInt(e.target.value) || 0)} className="w-10 bg-transparent text-orange-100 font-mono text-sm text-right outline-none" />
          </div>
        </div>
      </div>

      {/* BLOC 1 : ARMES & ARMURES */}
      <div className="bg-[#1E1941]/40 border border-[#E3CCCD]/20 rounded-lg p-5 shadow-inner">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Armes & Armures
          </p>
          <button onClick={() => handleOpenModal(null, "arme_contact")} className="flex items-center gap-1 text-[10px] text-white/50 bg-white/5 hover:bg-white/10 px-2 py-1 rounded border border-white/10 transition-colors">
            <Plus className="w-3 h-3" /> Ajouter
          </button>
        </div>

        {weaponsAndArmor.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {weaponsAndArmor.map(item => (
              <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${item.is_equipped ? "bg-[#E3CCCD]/10 border-[#E3CCCD]/30" : "bg-white/5 border-white/10"}`}>
                <button onClick={() => toggleEquip(item)} disabled={item.is_from_profile} className={`p-2 rounded-lg border transition-colors ${item.is_equipped ? "bg-[#29206A]/40 border-[#E3CCCD]/20" : "bg-black/40 border-transparent hover:bg-white/10"} disabled:opacity-50`}>
                  {item.item_type === "arme_contact" ? <Sword className="w-4 h-4 text-[#E3CCCD]" /> : item.item_type === "arme_distance" ? <Target className="w-4 h-4 text-[#E3CCCD]" /> : <Shield className="w-4 h-4 text-[#E3CCCD]" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{item.nom_custom}</p>
                    {item.is_from_profile && <span className="text-[9px] bg-white/10 text-white/40 px-1.5 rounded uppercase tracking-widest shrink-0">Profil</span>}
                  </div>
                  {item.description_custom && <p className="text-xs text-white/40 truncate font-mono mt-0.5">{item.description_custom}</p>}
                </div>
                {!item.is_from_profile && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleOpenModal(item)} className="p-1.5 text-white/30 hover:text-white transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-white/30 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/25 italic text-xs text-center py-4 border border-dashed border-white/10 rounded-xl">Aucune arme ou armure.</p>
        )}
      </div>

      {/* BLOC 2 : ÉQUIPEMENT & DIVERS */}
      <div className="bg-[#1E1941]/40 border border-[#E3CCCD]/20 rounded-lg p-5 shadow-inner">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50 flex items-center gap-1.5">
            <Backpack className="w-3.5 h-3.5" /> Équipement & Divers
          </p>
          <button onClick={() => handleOpenModal(null, "equipement")} className="flex items-center gap-1 text-[10px] text-white/50 bg-white/5 hover:bg-white/10 px-2 py-1 rounded border border-white/10 transition-colors">
            <Plus className="w-3 h-3" /> Ajouter
          </button>
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
                {!item.is_from_profile && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => handleOpenModal(item)} className="text-white/20 hover:text-white transition-colors mb-2"><Pencil className="w-3 h-3" /></button>
                    <button onClick={() => handleDeleteItem(item.id)} className="text-white/20 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/25 italic text-xs text-center py-4 border border-dashed border-white/10 rounded-xl">Sac vide.</p>
        )}
      </div>

      {/* MODALE CRUD (COMPENDIUM AWARE) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#120D2F] border border-[#E3CCCD]/20 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-serif text-white">{editingItemId ? "Modifier l'objet" : "Ajouter un objet"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-4">
              {/* Type d'objet */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1">Catégorie</label>
                <select value={formData.item_type} onChange={e => { setFormData({...formData, item_type: e.target.value as ItemType, item_id: null, nom_custom: "", description_custom: ""}); }} className="w-full bg-black/20 border border-white/15 rounded-lg p-2.5 text-white text-sm outline-none focus:border-[#E3CCCD]/50">
                  <option value="arme_contact">Arme de contact</option>
                  <option value="arme_distance">Arme à distance</option>
                  <option value="armure">Armure / Bouclier</option>
                  <option value="equipement">Équipement divers</option>
                </select>
              </div>

              {/* Sélection depuis le Compendium */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#E3CCCD]/60 mb-1">Objet du Compendium</label>
                <select 
                  value={formData.item_id?.toString() || "custom"} 
                  onChange={handleCompendiumSelect} 
                  disabled={isFetchingCompendium}
                  className="w-full bg-[#E3CCCD]/5 border border-[#E3CCCD]/30 rounded-lg p-2.5 text-[#E3CCCD] text-sm outline-none focus:border-[#E3CCCD] disabled:opacity-50"
                >
                  <option value="custom" className="bg-[#120D2F]">✨ Objet personnalisé...</option>
                  {compendiumItems.map(item => (
                    <option key={item.id} value={item.id.toString()} className="bg-[#120D2F] text-white">
                      {item.nom}
                    </option>
                  ))}
                </select>
              </div>

              {/* Champs (Grise si lié au compendium pour montrer d'où viennent les données) */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1">Nom de l'objet</label>
                  <input type="text" value={formData.nom_custom} onChange={e => setFormData({...formData, nom_custom: e.target.value})} placeholder="ex: Épée longue" className="w-full bg-black/20 border border-white/15 rounded-lg p-2.5 text-white text-sm outline-none focus:border-[#E3CCCD]/50" />
                </div>
                <div className="w-20">
                  <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1">Qté</label>
                  <input type="number" min={1} value={formData.qte} onChange={e => setFormData({...formData, qte: parseInt(e.target.value)||1})} className="w-full bg-black/20 border border-white/15 rounded-lg p-2.5 text-white text-center font-mono text-sm outline-none focus:border-[#E3CCCD]/50" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1">Stats ou Description</label>
                <input type="text" value={formData.description_custom} onChange={e => setFormData({...formData, description_custom: e.target.value})} placeholder={formData.item_type.includes('arme') ? "ex: Dégâts: 1d8" : formData.item_type === 'armure' ? "ex: Défense: +2" : "ex: Une corde de 15m"} className="w-full bg-black/20 border border-white/15 rounded-lg p-2.5 text-white text-sm outline-none focus:border-[#E3CCCD]/50" />
              </div>

              {formData.item_type !== "equipement" && (
                <label className="flex items-center gap-2 cursor-pointer mt-2 w-max p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/10">
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

    </div>
  );
}