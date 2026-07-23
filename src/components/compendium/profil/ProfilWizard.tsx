/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { ModalLayout } from "@/components/ui/ModalLayout";
import { ThemedSelect } from "@/components/ui/ThemedSelect";
import {
  X,
  ArrowRight,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  ChevronDown,
  Image as ImageIcon,
  UploadCloud,
  Sword,
  Target,
  Shield,
  Check,
  Copy,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { FamilleArchetype, FamilleVoie, ProfilWizardProps, RangsState, VoieRang } from "@/types/compendium";
import { EMPTY_RANGS, RANG_ACTION_TYPES, RANG_BONUS_TYPES } from "@/types/compendium";
import { cleanupRangsForSave, normalizeRangsState } from "@/lib/voieRanks";


// --- Helpers ---

function makeEmptyVoie(): FamilleVoie & { _rangs: RangsState } {
  return {
    nom: "",
    type: "profil",
    capacites: EMPTY_RANGS,
    _rangs: structuredClone(EMPTY_RANGS),
  };
}

// --- Composant ---

export function ProfilWizard({
  onClose,
  onSuccess,
  campaignId,
  initialData,
  famillesArchetypes,
}: ProfilWizardProps) {
  const isEditing = !!initialData;
  const [isPrivate, setIsPrivate] = useState(true);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1 – Identité + Famille
  const [nom, setNom] = useState(initialData?.nom ?? "");
  const [familleId, setFamilleId] = useState<string | null>(initialData?.famille_id ?? null);
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image_url ?? null);
  const [lore, setLore] = useState(initialData?.lore ?? "");

  const selectedFamille: FamilleArchetype | undefined = famillesArchetypes.find(f => f.id === familleId);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // Step 2 – Équipement
  const [equipementBase, setEquipementBase] = useState(initialData?.equipement_base ?? "");
  const [maitriseEquipement, setMaitriseEquipement] = useState(initialData?.maitrise_equipement ?? "");

  // Equipment associé
  const [armesContact, setArmesContact] = useState<{ id: string; nom: string }[]>([]);
  const [armesDistance, setArmesDistance] = useState<{ id: string; nom: string }[]>([]);
  const [armures, setArmures] = useState<{ id: string; nom: string }[]>([]);

  const initEquip = initialData?.data?.equipement_associe as
    | { arme_contact?: string[]; arme_distance?: string[]; armure?: string[] }
    | undefined;
  const [selectedArmesContact, setSelectedArmesContact] = useState<string[]>(initEquip?.arme_contact ?? []);
  const [selectedArmesDistance, setSelectedArmesDistance] = useState<string[]>(initEquip?.arme_distance ?? []);
  const [selectedArmures, setSelectedArmures] = useState<string[]>(initEquip?.armure ?? []);

  const [openEquipMenu, setOpenEquipMenu] = useState<string | null>(null);
  const equipRowRef = useRef<HTMLDivElement>(null);

  const handleClickOutsideEquip = useCallback((e: MouseEvent) => {
    if (equipRowRef.current && !equipRowRef.current.contains(e.target as Node)) {
      setOpenEquipMenu(null);
    }
  }, []);

  useEffect(() => {
    if (openEquipMenu) {
      document.addEventListener("mousedown", handleClickOutsideEquip);
      return () => document.removeEventListener("mousedown", handleClickOutsideEquip);
    }
  }, [openEquipMenu, handleClickOutsideEquip]);

  useEffect(() => {
    const fetchEquip = async () => {
      const [r1, r2, r3] = await Promise.all([
        supabase.from("armes_contact").select("id, nom").order("nom"),
        supabase.from("armes_distance").select("id, nom").order("nom"),
        supabase.from("armures").select("id, nom").order("nom"),
      ]);
      if (r1.data) setArmesContact(r1.data);
      if (r2.data) setArmesDistance(r2.data);
      if (r3.data) setArmures(r3.data);
    };
    fetchEquip();
  }, []);

  const toggleSelection = (
    id: string,
    selected: string[],
    setSelected: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  // Step 3 – Voies
  const [voies, setVoies] = useState<(FamilleVoie & { _rangs: RangsState })[]>(
    initialData?.voies?.length
      ? initialData.voies.map((v) => ({ ...v, type: v.type || "profil", _rangs: normalizeRangsState(v.capacites) }))
      : [makeEmptyVoie()],
  );
  const [expandedVoie, setExpandedVoie] = useState<number>(0);

  const addVoie = () => {
    setVoies((prev) => [...prev, makeEmptyVoie()]);
    setExpandedVoie(voies.length);
  };

  const removeVoie = (idx: number) => {
    setVoies((prev) => prev.filter((_, i) => i !== idx));
    setExpandedVoie(Math.max(0, idx - 1));
  };

  const updateVoie = (idx: number, field: "nom" | "type", value: string) => {
    setVoies((prev) => prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));
  };

  const updateRangField = (
    voieIdx: number,
    rangKey: keyof RangsState,
    field: keyof VoieRang,
    value: string,
  ) => {
    setVoies((prev) =>
      prev.map((v, i) => {
        if (i !== voieIdx) return v;
        return { ...v, _rangs: { ...v._rangs, [rangKey]: { ...v._rangs[rangKey], [field]: value } } };
      }),
    );
  };

  const updateRangItem = (
    voieIdx: number,
    rangKey: keyof RangsState,
    section: "bonus" | "capacites" | "actions",
    itemIdx: number,
    field: string,
    value: string | boolean,
  ) => {
    setVoies((prev) =>
      prev.map((v, i) => {
        if (i !== voieIdx) return v;
        const current = v._rangs[rangKey];
        const items = Array.isArray(current[section]) ? [...(current[section] as unknown as Array<Record<string, string | boolean>>)] : [];
        const item = { ...(items[itemIdx] || {}) };
        item[field] = value;
        items[itemIdx] = item;
        return {
          ...v,
          _rangs: {
            ...v._rangs,
            [rangKey]: {
              ...current,
              [section]: items,
            },
          },
        };
      }),
    );
  };

  const addRangItem = (
    voieIdx: number,
    rangKey: keyof RangsState,
    section: "bonus" | "capacites" | "actions",
  ) => {
    const emptyBySection = {
      bonus: { titre: "", type: "", valeur: "", condition: "" },
      capacites: { titre: "", description: "" },
      actions: {
        titre: "",
        type: "",
        sort: false,
        cout_mana: "",
        dm: "",
        test_oppose: false,
        test_type: "",
        resultat_si_reussi: "",
        description: "",
      },
    } as const;

    setVoies((prev) =>
      prev.map((v, i) => {
        if (i !== voieIdx) return v;
        const current = v._rangs[rangKey];
        const items = Array.isArray(current[section]) ? [...(current[section] as unknown as Array<Record<string, string | boolean>>)] : [];
        items.push({ ...emptyBySection[section] });
        return {
          ...v,
          _rangs: {
            ...v._rangs,
            [rangKey]: {
              ...current,
              [section]: items,
            },
          },
        };
      }),
    );
  };

  const removeRangItem = (
    voieIdx: number,
    rangKey: keyof RangsState,
    section: "bonus" | "capacites" | "actions",
    itemIdx: number,
  ) => {
    setVoies((prev) =>
      prev.map((v, i) => {
        if (i !== voieIdx) return v;
        const current = v._rangs[rangKey];
        const items = Array.isArray(current[section]) ? [...(current[section] as unknown as Array<Record<string, string | boolean>>)] : [];
        items.splice(itemIdx, 1);
        return {
          ...v,
          _rangs: {
            ...v._rangs,
            [rangKey]: {
              ...current,
              [section]: items,
            },
          },
        };
      }),
    );
  };

  const [openRangItems, setOpenRangItems] = useState<Set<string>>(new Set());
  const toggleRangItem = (ikey: string) =>
    setOpenRangItems((prev) => {
      const n = new Set(prev);
      n.has(ikey) ? n.delete(ikey) : n.add(ikey);
      return n;
    });

  const duplicateRangItem = (
    voieIdx: number,
    rangKey: keyof RangsState,
    section: "bonus" | "capacites" | "actions",
    itemIdx: number,
  ) => {
    setVoies((prev) =>
      prev.map((v, i) => {
        if (i !== voieIdx) return v;
        const current = v._rangs[rangKey];
        const items = Array.isArray(current[section])
          ? [...(current[section] as unknown as Array<Record<string, string | boolean>>)]
          : [];
        items.splice(itemIdx + 1, 0, { ...items[itemIdx] });
        return { ...v, _rangs: { ...v._rangs, [rangKey]: { ...current, [section]: items } } };
      }),
    );
  };

  // --- Submit ---
  const handleSubmit = async () => {
    if (!nom.trim()) return alert("Le nom du profil est obligatoire.");
    if (!familleId) return alert("Veuillez sélectionner une famille.");
    if (voies.length === 0) return alert("Au moins une voie est requise.");
    if (voies.some((v) => !v.nom.trim())) return alert("Toutes les voies doivent avoir un nom.");

    setIsSubmitting(true);
    try {
      let uploadedImageUrl: string | undefined = initialData?.image_url;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `profils/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("compendium").upload(path, imageFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("compendium").getPublicUrl(path);
        uploadedImageUrl = urlData.publicUrl;
      }

      if (isEditing && initialData) {
        const { error: profErr } = await supabase
          .from("profils")
          .update({
            nom: nom.trim(),
            famille_id: familleId,
            description: description.trim() || null,
            equipement_base: equipementBase.trim() || null,
            maitrise_equipement: maitriseEquipement.trim() || null,
            lore: lore.trim() || null,
            image_url: uploadedImageUrl ?? null,
            data: {
              ...(initialData.data ?? {}),
              equipement_associe: {
                arme_contact: selectedArmesContact,
                arme_distance: selectedArmesDistance,
                armure: selectedArmures,
              },
            },
          })
          .eq("id", initialData.id);
        if (profErr) throw profErr;

        // Sync voies
        const existingIds = initialData.voies.map((v) => v.id).filter(Boolean) as string[];
        const currentIds = voies.map((v) => v.id).filter(Boolean) as string[];
        const toDelete = existingIds.filter((id) => !currentIds.includes(id));
        if (toDelete.length) await supabase.from("voies").delete().in("id", toDelete);
        // Use the profil's own campaign_id to keep voies consistent with the profil
        const profilCampaignId = initialData.campaign_id !== undefined ? initialData.campaign_id : campaignId || null;
        const profilIsCustom = profilCampaignId !== null;
        for (const v of voies) {
          const capacites = cleanupRangsForSave(v._rangs);
          const voieType = v.type?.trim() || "profil";
          if (v.id) {
            const { error: updErr } = await supabase.from("voies").update({ nom: v.nom.trim(), type: voieType, capacites }).eq("id", v.id);
            if (updErr) throw updErr;
          } else {
            const { error: insErr } = await supabase.from("voies").insert({
              nom: v.nom.trim(),
              type: voieType,
              profil_id: initialData.id,
              campaign_id: profilCampaignId,
              is_custom: profilIsCustom,
              capacites,
            });
            if (insErr) throw insErr;
          }
        }
      } else {
        const publicMode = campaignId && !isPrivate;
        const { data: newProfil, error: profErr } = await supabase
          .from("profils")
          .insert({
            nom: nom.trim(),
            famille_id: familleId,
            description: description.trim() || null,
            equipement_base: equipementBase.trim() || null,
            maitrise_equipement: maitriseEquipement.trim() || null,
            lore: lore.trim() || null,
            image_url: uploadedImageUrl ?? null,
            data: {
              equipement_associe: {
                arme_contact: selectedArmesContact,
                arme_distance: selectedArmesDistance,
                armure: selectedArmures,
              },
            },
            campaign_id: publicMode ? null : campaignId || null,
            is_custom: !!(campaignId && isPrivate),
          })
          .select()
          .single();
        if (profErr) throw profErr;

        for (const v of voies) {
          const voieType = v.type?.trim() || "profil";
          const { error: voieErr } = await supabase.from("voies").insert({
            nom: v.nom.trim(),
            type: voieType,
            profil_id: newProfil.id,
            campaign_id: publicMode ? null : campaignId || null,
            is_custom: !!(campaignId && isPrivate),
            capacites: cleanupRangsForSave(v._rangs),
          });
          if (voieErr) throw voieErr;
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      alert("Erreur lors de la sauvegarde : " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const STEPS = [
    { num: 1, label: "Identité" },
    { num: 2, label: "Équipement" },
    { num: 3, label: "Voies" },
  ];

  return (
    <ModalLayout>
      {/* HEADER */}
      <div className="relative z-10 shrink-0 px-8 pt-5 pb-5 border-b border-white/8 bg-black/10">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50">
            {isEditing ? "Modifier le Profil" : "Nouveau Profil"}
          </p>
          <button onClick={onClose} className="p-2 text-white/30 hover:text-white/70 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>



        {/* Steps */}
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <button
                onClick={() => { if (s.num < step || (s.num === step + 1 && nom && familleId)) setStep(s.num); }}
                className={`flex items-center gap-2.5 transition-colors ${step === s.num ? "text-[#E3CCCD]" : step > s.num ? "text-white/60 hover:text-white/80" : "text-white/20 cursor-default"}`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold border transition-all ${step === s.num ? "border-[#E3CCCD] bg-[#E3CCCD]/15 text-[#E3CCCD]" : step > s.num ? "border-white/30 bg-white/10 text-white/50" : "border-white/15 text-white/20"}`}>
                  {s.num}
                </span>
                <span className="text-[11px] uppercase tracking-widest font-medium hidden sm:block">{s.label}</span>
              </button>
              {i < 2 && <div className={`w-12 h-px mx-3 transition-colors ${step > s.num ? "bg-white/30" : "bg-white/10"}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="relative z-10 flex-1 overflow-y-auto px-8 py-7 scrollbar-thin scrollbar-thumb-white/8">
        {/* STEP 1 – Identité + Famille */}
        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Nom du Profil *</label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                autoFocus
                placeholder="ex: Guerrier, Voleur, Mage..."
                className="w-full bg-transparent border-b border-white/30 focus:border-[#E3CCCD]/80 py-2.5 text-white text-lg outline-none transition-colors placeholder:text-white/35"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Famille *</label>
              <ThemedSelect
                value={familleId}
                onValueChange={setFamilleId}
                options={famillesArchetypes.map(f => f.id)}
                placeholder="-- Choisir une famille --"
                labels={Object.fromEntries(famillesArchetypes.map(f => [f.id, f.nom]))}
              />
              {selectedFamille && (
                <div className="mt-2 px-4 py-3 rounded-xl border border-[#E3CCCD]/20 bg-[#E3CCCD]/5">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[#E3CCCD]/60 mb-1">Stats héritées</p>
                  <p className="text-[13px] text-white/80 font-light">
                    <span className="font-medium text-white">{selectedFamille.pv_niveau}</span> PV/niv · Dé de récup <span className="font-medium text-white">{selectedFamille.de_recuperation}</span>
                    {selectedFamille.bonus_chance !== 0 && (
                      <> · Chance <span className="font-medium text-white">{selectedFamille.bonus_chance > 0 ? `+${selectedFamille.bonus_chance}` : selectedFamille.bonus_chance}</span></>
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/40">Illustration</label>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
                  {imagePreview ? <img src={imagePreview} alt="Aperçu" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-white/20" />}
                </div>
                <label className="cursor-pointer flex items-center gap-2 px-3.5 py-2 border border-white/25 hover:border-white/50 rounded-lg text-white/70 hover:text-white text-[12px] transition-colors">
                  <UploadCloud className="w-3.5 h-3.5" /> Parcourir
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
                {imageFile && <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="text-[11px] text-white/50 hover:text-red-400 transition-colors">Retirer</button>}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Présentation du profil, fantaisie, rôle dans le groupe..."
                className="w-full h-28 bg-white/5 border border-white/20 focus:border-white/35 rounded-xl p-4 text-white text-sm outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Lore approfondi</label>
              <textarea
                value={lore}
                onChange={(e) => setLore(e.target.value)}
                placeholder="Mythes, culture, histoire, place dans le monde..."
                className="w-full h-32 bg-white/5 border border-white/20 focus:border-white/35 rounded-xl p-4 text-white text-sm outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35"
              />
            </div>
          </div>
        )}

        {/* STEP 2 – Équipement */}
        {step === 2 && (
          <div className="space-y-7 animate-in slide-in-from-right-4 fade-in">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Équipement de base</label>
              <textarea
                value={equipementBase}
                onChange={(e) => setEquipementBase(e.target.value)}
                placeholder="ex: Armure de cuir, épée courte, bouclier, 10 po..."
                className="w-full h-28 bg-white/5 border border-white/20 focus:border-white/35 rounded-xl p-4 text-white text-sm outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35"
              />
              {/* Boutons multi-select équipement */}
              <div ref={equipRowRef} className="flex items-center gap-2 mt-3">
                {/* Arme Contact */}
                <div className="relative flex-1">
                  <button type="button" onClick={() => setOpenEquipMenu(openEquipMenu === "arme_contact" ? null : "arme_contact")} className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-[12px] transition-all ${selectedArmesContact.length > 0 ? "border-[#E3CCCD]/50 bg-[#E3CCCD]/10 text-[#E3CCCD]" : "border-white/20 text-white/50 hover:text-white/80 hover:border-white/40"}`}>
                    <Sword className="w-3.5 h-3.5" /> Contact {selectedArmesContact.length > 0 && <span className="text-[10px] bg-white/10 rounded-full px-1.5">{selectedArmesContact.length}</span>}
                  </button>
                  {openEquipMenu === "arme_contact" && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-white/15 bg-[#1E1941]/95 backdrop-blur-xl shadow-xl scrollbar-thin scrollbar-thumb-white/8">
                      {armesContact.length === 0 ? <p className="text-[11px] text-white/30 italic text-center py-3">Aucune arme</p> : armesContact.map((a) => (
                        <button key={a.id} type="button" onClick={() => toggleSelection(a.id, selectedArmesContact, setSelectedArmesContact)} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors">
                          <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedArmesContact.includes(a.id) ? "border-[#E3CCCD] bg-[#E3CCCD]/20" : "border-white/20"}`}>
                            {selectedArmesContact.includes(a.id) && <Check className="w-3 h-3 text-[#E3CCCD]" />}
                          </span>
                          <span className="text-[12px] text-white/80 truncate">{a.nom}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Arme Distance */}
                <div className="relative flex-1">
                  <button type="button" onClick={() => setOpenEquipMenu(openEquipMenu === "arme_distance" ? null : "arme_distance")} className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-[12px] transition-all ${selectedArmesDistance.length > 0 ? "border-[#E3CCCD]/50 bg-[#E3CCCD]/10 text-[#E3CCCD]" : "border-white/20 text-white/50 hover:text-white/80 hover:border-white/40"}`}>
                    <Target className="w-3.5 h-3.5" /> Distance {selectedArmesDistance.length > 0 && <span className="text-[10px] bg-white/10 rounded-full px-1.5">{selectedArmesDistance.length}</span>}
                  </button>
                  {openEquipMenu === "arme_distance" && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-white/15 bg-[#1E1941]/95 backdrop-blur-xl shadow-xl scrollbar-thin scrollbar-thumb-white/8">
                      {armesDistance.length === 0 ? <p className="text-[11px] text-white/30 italic text-center py-3">Aucune arme</p> : armesDistance.map((a) => (
                        <button key={a.id} type="button" onClick={() => toggleSelection(a.id, selectedArmesDistance, setSelectedArmesDistance)} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors">
                          <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedArmesDistance.includes(a.id) ? "border-[#E3CCCD] bg-[#E3CCCD]/20" : "border-white/20"}`}>
                            {selectedArmesDistance.includes(a.id) && <Check className="w-3 h-3 text-[#E3CCCD]" />}
                          </span>
                          <span className="text-[12px] text-white/80 truncate">{a.nom}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Armure */}
                <div className="relative flex-1">
                  <button type="button" onClick={() => setOpenEquipMenu(openEquipMenu === "armure" ? null : "armure")} className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-[12px] transition-all ${selectedArmures.length > 0 ? "border-[#E3CCCD]/50 bg-[#E3CCCD]/10 text-[#E3CCCD]" : "border-white/20 text-white/50 hover:text-white/80 hover:border-white/40"}`}>
                    <Shield className="w-3.5 h-3.5" /> Armure {selectedArmures.length > 0 && <span className="text-[10px] bg-white/10 rounded-full px-1.5">{selectedArmures.length}</span>}
                  </button>
                  {openEquipMenu === "armure" && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-white/15 bg-[#1E1941]/95 backdrop-blur-xl shadow-xl scrollbar-thin scrollbar-thumb-white/8">
                      {armures.length === 0 ? <p className="text-[11px] text-white/30 italic text-center py-3">Aucune armure</p> : armures.map((a) => (
                        <button key={a.id} type="button" onClick={() => toggleSelection(a.id, selectedArmures, setSelectedArmures)} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors">
                          <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedArmures.includes(a.id) ? "border-[#E3CCCD] bg-[#E3CCCD]/20" : "border-white/20"}`}>
                            {selectedArmures.includes(a.id) && <Check className="w-3 h-3 text-[#E3CCCD]" />}
                          </span>
                          <span className="text-[12px] text-white/80 truncate">{a.nom}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Affichage des équipements sélectionnés */}
              {(selectedArmesContact.length > 0 || selectedArmesDistance.length > 0 || selectedArmures.length > 0) && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedArmesContact.map((id) => {
                    const n = armesContact.find((a) => a.id === id)?.nom || id;
                    return <span key={id} className="inline-flex items-center gap-1.5 text-[11px] text-white/70 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1"><Sword className="w-3 h-3 text-[#E3CCCD]/50" />{n}</span>;
                  })}
                  {selectedArmesDistance.map((id) => {
                    const n = armesDistance.find((a) => a.id === id)?.nom || id;
                    return <span key={id} className="inline-flex items-center gap-1.5 text-[11px] text-white/70 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1"><Target className="w-3 h-3 text-[#E3CCCD]/50" />{n}</span>;
                  })}
                  {selectedArmures.map((id) => {
                    const n = armures.find((a) => a.id === id)?.nom || id;
                    return <span key={id} className="inline-flex items-center gap-1.5 text-[11px] text-white/70 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1"><Shield className="w-3 h-3 text-[#E3CCCD]/50" />{n}</span>;
                  })}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Maîtrise d'équipement</label>
              <textarea
                value={maitriseEquipement}
                onChange={(e) => setMaitriseEquipement(e.target.value)}
                placeholder="ex: Armures légères, armes simples, arcs..."
                className="w-full h-20 bg-white/5 border border-white/20 focus:border-white/35 rounded-xl p-4 text-white text-sm outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35"
              />
            </div>
          </div>
        )}

        {/* STEP 3 – Voies */}
        {step === 3 && (
          <div className="space-y-3 animate-in slide-in-from-right-4 fade-in">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-white/50 italic">{voies.length} voie{voies.length > 1 ? "s" : ""} — un profil a généralement 5 voies.</p>
              <button onClick={addVoie} className="flex items-center gap-1.5 px-3 py-1.5 border border-white/20 hover:border-[#E3CCCD]/40 text-white/60 hover:text-white text-[12px] rounded-lg transition-all">
                <Plus className="w-3.5 h-3.5" /> Ajouter une voie
              </button>
            </div>

            {voies.map((voie, voieIdx) => (
              <div key={voieIdx} className="border border-white/10 rounded-xl overflow-hidden bg-white/3">
                <div className="flex items-center gap-3 px-4 py-3 bg-black/10">
                  <button onClick={() => setExpandedVoie(expandedVoie === voieIdx ? -1 : voieIdx)} className="flex-1 flex items-center gap-3 text-left">
                    <ChevronDown className={`w-4 h-4 text-white/40 shrink-0 transition-transform ${expandedVoie === voieIdx ? "rotate-180" : ""}`} />
                    <input
                      type="text"
                      value={voie.nom}
                      onChange={(e) => { e.stopPropagation(); updateVoie(voieIdx, "nom", e.target.value); }}
                      onClick={(e) => e.stopPropagation()}
                      placeholder={`Voie ${voieIdx + 1}...`}
                      className="flex-1 bg-transparent outline-none text-white text-[14px] font-medium placeholder:text-white/30"
                    />
                  </button>
                  {voies.length > 1 && (
                    <button onClick={() => removeVoie(voieIdx)} className="p-1 text-white/30 hover:text-red-400 transition-colors shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {expandedVoie === voieIdx && (
                  <div className="px-4 pb-4 space-y-2 pt-2">
                    {([1, 2, 3, 4, 5] as const).map((rangNum) => {
                      const key = `rang${rangNum}` as keyof RangsState;
                      const rangData = voie._rangs[key];
                      const bonuses = Array.isArray(rangData.bonus) ? rangData.bonus : [];
                      const capacites = Array.isArray(rangData.capacites) ? rangData.capacites : [];
                      const actions = Array.isArray(rangData.actions) ? rangData.actions : [];
                      return (
                        <div key={key} className="rounded-xl border border-white/8 overflow-hidden">
                          {/* Rang header */}
                          <div className="flex items-center gap-3 px-3 py-2.5 bg-black/10">
                            <span className="w-5 h-5 rounded-full border border-white/25 flex items-center justify-center text-[11px] text-white/50 font-medium shrink-0">{rangNum}</span>
                            <input
                              type="text"
                              value={rangData.titre || ""}
                              onChange={(e) => updateRangField(voieIdx, key, "titre", e.target.value)}
                              placeholder={`Rang ${rangNum}`}
                              className="flex-1 bg-transparent outline-none text-white text-sm placeholder:text-white/25 border-b border-transparent focus:border-white/20 py-0.5 transition-colors"
                            />
                          </div>
                          {/* Items */}
                          {(bonuses.length > 0 || capacites.length > 0 || actions.length > 0) && (
                            <div className="px-3 pt-1 pb-0.5 space-y-1">
                              {bonuses.map((bonus, idx) => {
                                const ikey = `v${voieIdx}-${key}-bonus-${idx}`;
                                const isOpen = openRangItems.has(ikey);
                                return (
                                  <div key={ikey} className="rounded border border-white/8 overflow-hidden">
                                    <div className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-white/3 transition-colors" onClick={() => toggleRangItem(ikey)}>
                                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-900/25 text-amber-300/60 shrink-0">bonus</span>
                                      <span className="flex-1 text-[12px] text-white/75 truncate">{bonus.titre || <span className="text-white/25 italic">sans titre</span>}</span>
                                      <button type="button" title="Dupliquer" onClick={(e) => { e.stopPropagation(); duplicateRangItem(voieIdx, key, "bonus", idx); }} className="p-1 text-white/20 hover:text-white/60 transition-colors"><Copy className="w-3 h-3" /></button>
                                      <button type="button" title="Supprimer" onClick={(e) => { e.stopPropagation(); removeRangItem(voieIdx, key, "bonus", idx); }} className="p-1 text-white/20 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                                      <ChevronDown className={`w-3 h-3 text-white/25 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                                    </div>
                                    {isOpen && (
                                      <div className="px-2.5 pb-2.5 pt-2 space-y-2 border-t border-white/6 bg-black/10">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                          <input type="text" value={bonus.titre || ""} onChange={(e) => updateRangItem(voieIdx, key, "bonus", idx, "titre", e.target.value)} placeholder="Titre du bonus" className="bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35" />
                                          <ThemedSelect value={bonus.type || ""} onValueChange={(v) => updateRangItem(voieIdx, key, "bonus", idx, "type", v || "")} options={[...RANG_BONUS_TYPES]} placeholder="Type de bonus" />
                                          <input type="text" value={bonus.valeur || ""} onChange={(e) => updateRangItem(voieIdx, key, "bonus", idx, "valeur", e.target.value)} placeholder="Valeur (ex: +2)" className="bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35" />
                                        </div>
                                        <textarea value={bonus.condition || ""} onChange={(e) => updateRangItem(voieIdx, key, "bonus", idx, "condition", e.target.value)} placeholder="Description / condition (optionnel)" className="w-full h-14 bg-transparent border-b border-white/20 focus:border-white/35 py-1.5 text-white/85 text-[13px] outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35" />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {capacites.map((capacite, idx) => {
                                const ikey = `v${voieIdx}-${key}-capacites-${idx}`;
                                const isOpen = openRangItems.has(ikey);
                                return (
                                  <div key={ikey} className="rounded border border-white/8 overflow-hidden">
                                    <div className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-white/3 transition-colors" onClick={() => toggleRangItem(ikey)}>
                                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-900/25 text-blue-300/60 shrink-0">cap.</span>
                                      <span className="flex-1 text-[12px] text-white/75 truncate">{capacite.titre || <span className="text-white/25 italic">sans titre</span>}</span>
                                      <button type="button" title="Dupliquer" onClick={(e) => { e.stopPropagation(); duplicateRangItem(voieIdx, key, "capacites", idx); }} className="p-1 text-white/20 hover:text-white/60 transition-colors"><Copy className="w-3 h-3" /></button>
                                      <button type="button" title="Supprimer" onClick={(e) => { e.stopPropagation(); removeRangItem(voieIdx, key, "capacites", idx); }} className="p-1 text-white/20 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                                      <ChevronDown className={`w-3 h-3 text-white/25 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                                    </div>
                                    {isOpen && (
                                      <div className="px-2.5 pb-2.5 pt-2 space-y-2 border-t border-white/6 bg-black/10">
                                        <input type="text" value={capacite.titre || ""} onChange={(e) => updateRangItem(voieIdx, key, "capacites", idx, "titre", e.target.value)} placeholder="Titre de la capacité" className="w-full bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35" />
                                        <textarea value={capacite.description || ""} onChange={(e) => updateRangItem(voieIdx, key, "capacites", idx, "description", e.target.value)} placeholder="Description de la capacité" className="w-full h-14 bg-transparent border-b border-white/20 focus:border-white/35 py-1.5 text-white/85 text-[13px] outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35" />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {actions.map((action, idx) => {
                                const ikey = `v${voieIdx}-${key}-actions-${idx}`;
                                const isOpen = openRangItems.has(ikey);
                                return (
                                  <div key={ikey} className="rounded border border-white/8 overflow-hidden">
                                    <div className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-white/3 transition-colors" onClick={() => toggleRangItem(ikey)}>
                                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-900/25 text-emerald-300/60 shrink-0">action</span>
                                      <span className="flex-1 text-[12px] text-white/75 truncate">{action.titre || <span className="text-white/25 italic">sans titre</span>}</span>
                                      <button type="button" title="Dupliquer" onClick={(e) => { e.stopPropagation(); duplicateRangItem(voieIdx, key, "actions", idx); }} className="p-1 text-white/20 hover:text-white/60 transition-colors"><Copy className="w-3 h-3" /></button>
                                      <button type="button" title="Supprimer" onClick={(e) => { e.stopPropagation(); removeRangItem(voieIdx, key, "actions", idx); }} className="p-1 text-white/20 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                                      <ChevronDown className={`w-3 h-3 text-white/25 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                                    </div>
                                    {isOpen && (
                                      <div className="px-2.5 pb-2.5 pt-2 space-y-2 border-t border-white/6 bg-black/10">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                          <input type="text" value={action.titre || ""} onChange={(e) => updateRangItem(voieIdx, key, "actions", idx, "titre", e.target.value)} placeholder="Titre de l'action" className="bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35" />
                                          <ThemedSelect value={action.type || ""} onValueChange={(v) => updateRangItem(voieIdx, key, "actions", idx, "type", v || "")} options={[...RANG_ACTION_TYPES]} placeholder="Type (A/M/L/G)" />
                                          <input type="text" value={action.dm || ""} onChange={(e) => updateRangItem(voieIdx, key, "actions", idx, "dm", e.target.value)} placeholder="DM" className="bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35" />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                          <label className="flex items-center gap-2 text-[12px] text-white/75">
                                            <input type="checkbox" checked={!!action.sort} onChange={(e) => updateRangItem(voieIdx, key, "actions", idx, "sort", e.target.checked)} className="accent-indigo-500 w-4 h-4 rounded" />
                                            Sort
                                          </label>
                                          <input type="text" value={action.cout_mana || ""} onChange={(e) => updateRangItem(voieIdx, key, "actions", idx, "cout_mana", e.target.value)} placeholder="Coût en PM" disabled={!action.sort} className="bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35 disabled:opacity-40" />
                                        </div>
                                        <label className="flex items-center gap-2 text-[12px] text-white/75">
                                          <input type="checkbox" checked={!!action.test_oppose} onChange={(e) => updateRangItem(voieIdx, key, "actions", idx, "test_oppose", e.target.checked)} className="accent-indigo-500 w-4 h-4 rounded" />
                                          Test opposé
                                        </label>
                                        {action.test_oppose && (
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                            <input type="text" value={action.test_type || ""} onChange={(e) => updateRangItem(voieIdx, key, "actions", idx, "test_type", e.target.value)} placeholder="Type de test" className="bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35" />
                                            <input type="text" value={action.resultat_si_reussi || ""} onChange={(e) => updateRangItem(voieIdx, key, "actions", idx, "resultat_si_reussi", e.target.value)} placeholder="Résultat si réussi" className="bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35" />
                                          </div>
                                        )}
                                        <textarea value={action.description || ""} onChange={(e) => updateRangItem(voieIdx, key, "actions", idx, "description", e.target.value)} placeholder="Description de l'action" className="w-full h-14 bg-transparent border-b border-white/20 focus:border-white/35 py-1.5 text-white/85 text-[13px] outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35" />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {/* Add buttons + legacy */}
                          <div className="px-3 pb-2.5 pt-1.5 flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => addRangItem(voieIdx, key, "bonus")} className="text-[11px] px-2 py-0.5 rounded border border-white/15 text-white/40 hover:text-amber-300/70 hover:border-amber-900/40 transition-colors">+ Bonus</button>
                            <button type="button" onClick={() => addRangItem(voieIdx, key, "capacites")} className="text-[11px] px-2 py-0.5 rounded border border-white/15 text-white/40 hover:text-blue-300/70 hover:border-blue-900/40 transition-colors">+ Capacité</button>
                            <button type="button" onClick={() => addRangItem(voieIdx, key, "actions")} className="text-[11px] px-2 py-0.5 rounded border border-white/15 text-white/40 hover:text-emerald-300/70 hover:border-emerald-900/40 transition-colors">+ Action</button>
                            <details className="ml-auto">
                              <summary className="cursor-pointer text-[10px] text-white/25 hover:text-white/45 transition-colors">legacy</summary>
                              <div className="mt-1 grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
                                <input type="text" value={rangData.nom || ""} onChange={(e) => updateRangField(voieIdx, key, "nom", e.target.value)} placeholder="Nom legacy" className="bg-transparent border-b border-white/15 py-1 text-white/50 text-xs outline-none placeholder:text-white/25" />
                                <input type="text" value={rangData.type || ""} onChange={(e) => updateRangField(voieIdx, key, "type", e.target.value)} placeholder="Type legacy" className="bg-transparent border-b border-white/15 py-1 text-white/50 text-xs outline-none placeholder:text-white/25" />
                                <input type="text" value={rangData.description || ""} onChange={(e) => updateRangField(voieIdx, key, "description", e.target.value)} placeholder="Description legacy" className="bg-transparent border-b border-white/15 py-1 text-white/50 text-xs outline-none placeholder:text-white/25" />
                              </div>
                            </details>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="relative z-10 shrink-0 px-8 py-5 border-t border-white/8 bg-black/10 flex justify-between items-center">
        <div className="flex items-center gap-4">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="flex items-center gap-2 text-white/55 hover:text-white transition-colors text-[13px]">
              <ArrowLeft className="w-3.5 h-3.5" /> Précédent
            </button>
          )}
          {campaignId && (
            <div className="flex items-center gap-2">
              <input id="profil-private" type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="accent-indigo-500 w-4 h-4 rounded" />
              <label htmlFor="profil-private" className="text-xs text-white/70 select-none cursor-pointer">Privé à cette campagne</label>
            </div>
          )}
        </div>

        {step < 3 ? (
          <button
            onClick={() => {
              if (step === 1 && !nom.trim()) return alert("Le nom du profil est requis.");
              if (step === 1 && !familleId) return alert("Veuillez sélectionner une famille.");
              setStep(step + 1);
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#1a4a2a]/60 hover:bg-[#1a4a2a]/80 border border-[#E3CCCD]/25 hover:border-[#E3CCCD]/50 rounded-xl text-white text-[13px] transition-all active:scale-95"
          >
            Suivant <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#E3CCCD]/10 hover:bg-[#E3CCCD]/20 border border-[#E3CCCD]/40 hover:border-[#E3CCCD]/70 rounded-xl text-[#E3CCCD] text-[13px] transition-all active:scale-95 disabled:opacity-40"
          >
            <Save className="w-3.5 h-3.5" />
            {isSubmitting ? "Sauvegarde..." : isEditing ? "Enregistrer les modifications" : "Enregistrer le Profil"}
          </button>
        )}
      </div>
    </ModalLayout>
  );
}
