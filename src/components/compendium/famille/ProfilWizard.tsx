/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { ModalLayout } from "@/components/ui/ModalLayout";
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
  Copy,
  Sword,
  Target,
  Shield,
  Check,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { FamilleVoie, VoieRangCapacite } from "@/types/compendium";

// --- Types internes ---

interface ProfilWizardProps {
  onClose: () => void;
  onSuccess: () => void;
  campaignId?: string;
  initialData?: InitialFamilleData;
}

export interface InitialFamilleData {
  id: string;
  nom: string;
  groupe: string;
  description: string | null;
  pv_niveau: number;
  de_recuperation: string;
  bonus_chance: number;
  equipement_base: string | null;
  maitrise_equipement: string | null;
  lore?: string | null;
  campaign_id?: string | null;
  image_url?: string;
  data: Record<string, unknown>;
  voies: FamilleVoie[];
}

type RangsState = {
  rang1: VoieRangCapacite;
  rang2: VoieRangCapacite;
  rang3: VoieRangCapacite;
  rang4: VoieRangCapacite;
  rang5: VoieRangCapacite;
};

const EMPTY_RANGS: RangsState = {
  rang1: { nom: "", type: "passif", description: "" },
  rang2: { nom: "", type: "passif", description: "" },
  rang3: { nom: "", type: "passif", description: "" },
  rang4: { nom: "", type: "passif", description: "" },
  rang5: { nom: "", type: "passif", description: "" },
};

const FALLBACK_GROUPES = [
  "Combattant",
  "Expert",
  "Magicien",
  "Hybride",
  "Autre",
];

const TYPE_LABELS: Record<string, string> = {
  principale: "Voie Principale",
  secondaire: "Voie Secondaire",
  prestige: "Voie de Prestige",
};

// --- Helpers ---

function makeEmptyVoie(): FamilleVoie & { _rangs: RangsState } {
  return {
    nom: "",
    type: "principale",
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
}: ProfilWizardProps) {
  const isEditing = !!initialData;
  const [isPrivate, setIsPrivate] = useState(true);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Template picker (création seulement)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templates, setTemplates] = useState<
    { id: string; nom: string; groupe: string }[]
  >([]);
  const [groupes, setGroupes] = useState<string[]>(FALLBACK_GROUPES);

  useEffect(() => {
    if (isEditing) return;
    supabase
      .from("familles")
      .select("id, nom, groupe")
      .is("campaign_id", null)
      .order("nom")
      .then(({ data }) => {
        if (data) {
          setTemplates(data);
          const distinct = Array.from(
            new Set(
              data.map((f: { groupe: string }) => f.groupe).filter(Boolean),
            ),
          ).sort() as string[];
          if (distinct.length > 0) setGroupes(distinct);
        }
      });
  }, [isEditing]);

  // En mode édition, charger aussi les groupes existants
  useEffect(() => {
    if (!isEditing) return;
    supabase
      .from("familles")
      .select("groupe")
      .is("campaign_id", null)
      .then(({ data }) => {
        if (data) {
          const distinct = Array.from(
            new Set(
              data.map((f: { groupe: string }) => f.groupe).filter(Boolean),
            ),
          ).sort() as string[];
          if (distinct.length > 0) setGroupes(distinct);
        }
      });
  }, [isEditing]);

  const applyTemplate = async (templateId: string) => {
    const { data: fam } = await supabase
      .from("familles")
      .select("*")
      .eq("id", templateId)
      .single();
    if (!fam) return;
    setNom(fam.nom + " (copie)");
    setGroupe(fam.groupe ?? "");
    setDescription(fam.description ?? "");
    setImagePreview(fam.image_url ?? null);
    setImageFile(null);
    setPvNiveau(fam.pv_niveau ?? 4);
    setDeRecuperation(fam.de_recuperation ?? "1d6");
    setBonusChance(fam.bonus_chance ?? 0);
    setEquipementBase(fam.equipement_base ?? "");
    setMaitriseEquipement(fam.maitrise_equipement ?? "");
    // Charger les voies du template
    const { data: voiesData } = await supabase
      .from("voies")
      .select("*")
      .eq("famille_id", templateId)
      .order("nom");
    if (voiesData?.length) {
      setVoies(
        voiesData.map((v: any) => ({
          nom: v.nom,
          type: v.type,
          capacites: v.capacites,
          _rangs: v.capacites as RangsState,
        })),
      );
    }
    setShowTemplatePicker(false);
  };

  // Step 1 – Identité
  const [nom, setNom] = useState(initialData?.nom ?? "");
  const [groupe, setGroupe] = useState(initialData?.groupe ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialData?.image_url ?? null,
  );

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // Step 2 – Mécanique
  const [pvNiveau, setPvNiveau] = useState(initialData?.pv_niveau ?? 4);
  const [deRecuperation, setDeRecuperation] = useState(
    initialData?.de_recuperation ?? "1d6",
  );
  const [bonusChance, setBonusChance] = useState(
    initialData?.bonus_chance ?? 0,
  );
  const [equipementBase, setEquipementBase] = useState(
    initialData?.equipement_base ?? "",
  );
  const [maitriseEquipement, setMaitriseEquipement] = useState(
    initialData?.maitrise_equipement ?? "",
  );
  const [lore, setLore] = useState(initialData?.lore ?? "");

  // Equipment associé
  const [armesContact, setArmesContact] = useState<
    { id: string; nom: string }[]
  >([]);
  const [armesDistance, setArmesDistance] = useState<
    { id: string; nom: string }[]
  >([]);
  const [armures, setArmures] = useState<{ id: string; nom: string }[]>([]);

  const initEquip = initialData?.data?.equipement_associe as
    | { arme_contact?: string[]; arme_distance?: string[]; armure?: string[] }
    | undefined;
  const [selectedArmesContact, setSelectedArmesContact] = useState<string[]>(
    initEquip?.arme_contact ?? [],
  );
  const [selectedArmesDistance, setSelectedArmesDistance] = useState<string[]>(
    initEquip?.arme_distance ?? [],
  );
  const [selectedArmures, setSelectedArmures] = useState<string[]>(
    initEquip?.armure ?? [],
  );

  const [openEquipMenu, setOpenEquipMenu] = useState<string | null>(null);
  const equipRowRef = useRef<HTMLDivElement>(null);

  const handleClickOutsideEquip = useCallback((e: MouseEvent) => {
    if (
      equipRowRef.current &&
      !equipRowRef.current.contains(e.target as Node)
    ) {
      setOpenEquipMenu(null);
    }
  }, []);

  useEffect(() => {
    if (openEquipMenu) {
      document.addEventListener("mousedown", handleClickOutsideEquip);
      return () =>
        document.removeEventListener("mousedown", handleClickOutsideEquip);
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
    setSelected(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );
  };

  // Step 3 – Voies (liste locale avec _rangs pour édition)
  const [voies, setVoies] = useState<(FamilleVoie & { _rangs: RangsState })[]>(
    initialData?.voies?.length
      ? initialData.voies.map((v) => ({
          ...v,
          _rangs: v.capacites as RangsState,
        }))
      : [makeEmptyVoie()],
  );
  const [expandedVoie, setExpandedVoie] = useState<number>(0);

  // --- Actions voies ---
  const addVoie = () => {
    setVoies((prev) => [...prev, makeEmptyVoie()]);
    setExpandedVoie(voies.length);
  };

  const removeVoie = (idx: number) => {
    setVoies((prev) => prev.filter((_, i) => i !== idx));
    setExpandedVoie(Math.max(0, idx - 1));
  };

  const updateVoie = (idx: number, field: "nom" | "type", value: string) => {
    setVoies((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)),
    );
  };

  const updateRang = (
    voieIdx: number,
    rangKey: keyof RangsState,
    field: keyof VoieRangCapacite,
    value: string,
  ) => {
    setVoies((prev) =>
      prev.map((v, i) => {
        if (i !== voieIdx) return v;
        return {
          ...v,
          _rangs: {
            ...v._rangs,
            [rangKey]: { ...v._rangs[rangKey], [field]: value },
          },
        };
      }),
    );
  };

  // --- Submit ---
  const handleSubmit = async () => {
    if (!nom.trim()) return alert("Le nom du profil est obligatoire.");
    if (!groupe.trim()) return alert("Le groupe est obligatoire.");
    if (voies.length === 0) return alert("Au moins une voie est requise.");
    if (voies.some((v) => !v.nom.trim()))
      return alert("Toutes les voies doivent avoir un nom.");

    setIsSubmitting(true);
    try {
      // Upload image si un fichier a été choisi
      let uploadedImageUrl: string | undefined = initialData?.image_url;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `familles/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("compendium")
          .upload(path, imageFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage
          .from("compendium")
          .getPublicUrl(path);
        uploadedImageUrl = urlData.publicUrl;
      }

      if (isEditing && initialData) {
        // Update famille
        const { error: famErr } = await supabase
          .from("familles")
          .update({
            nom: nom.trim(),
            groupe: groupe.trim(),
            description: description.trim() || null,
            pv_niveau: pvNiveau,
            de_recuperation: deRecuperation.trim(),
            bonus_chance: bonusChance,
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
        if (famErr) throw famErr;

        // Sync voies: upsert known ids, delete removed
        const existingIds = initialData.voies
          .map((v) => v.id)
          .filter(Boolean) as string[];
        const currentIds = voies.map((v) => v.id).filter(Boolean) as string[];
        const toDelete = existingIds.filter((id) => !currentIds.includes(id));
        if (toDelete.length) {
          await supabase.from("voies").delete().in("id", toDelete);
        }
        for (const v of voies) {
          const capacites = v._rangs;
          if (v.id) {
            await supabase
              .from("voies")
              .update({ nom: v.nom.trim(), type: v.type, capacites })
              .eq("id", v.id);
          } else {
            await supabase.from("voies").insert({
              nom: v.nom.trim(),
              type: v.type,
              famille_id: initialData.id,
              campaign_id: campaignId || null,
              is_custom: !!campaignId,
              capacites,
            });
          }
        }
      } else {
        // Create famille
        const publicMode = campaignId && !isPrivate;
        const { data: newFamille, error: famErr } = await supabase
          .from("familles")
          .insert({
            nom: nom.trim(),
            groupe: groupe.trim(),
            description: description.trim() || null,
            pv_niveau: pvNiveau,
            de_recuperation: deRecuperation.trim(),
            bonus_chance: bonusChance,
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
        if (famErr) throw famErr;

        // Create voies
        for (const v of voies) {
          const { error: voieErr } = await supabase.from("voies").insert({
            nom: v.nom.trim(),
            type: v.type,
            famille_id: newFamille.id,
            campaign_id: publicMode ? null : campaignId || null,
            is_custom: !!(campaignId && isPrivate),
            capacites: v._rangs,
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
    { num: 2, label: "Mécanique" },
    { num: 3, label: "Voies" },
  ];

  return (
    <ModalLayout>
      {/* HEADER */}
      <div className="relative z-10 shrink-0 px-8 pt-5 pb-5 border-b border-white/8 bg-black/10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50">
              {isEditing ? "Modifier le Profil" : "Nouveau Profil"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/30 hover:text-white/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PRIVÉ/PUBLIC (création ou édition campagne uniquement) */}
        {campaignId && (
            <div className="mb-4 flex items-center gap-2">
              <input
                id="profil-private"
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="accent-indigo-500 w-4 h-4 rounded"
              />
              <label
                htmlFor="profil-private"
                className="text-xs text-white/70 select-none cursor-pointer"
              >
                Privé à cette campagne
              </label>
            </div>
        )}
        {/* Steps */}
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <button
                onClick={() => {
                  if (s.num < step || (s.num === step + 1 && nom && groupe))
                    setStep(s.num);
                }}
                className={`flex items-center gap-2.5 transition-colors ${step === s.num ? "text-[#E3CCCD]" : step > s.num ? "text-white/60 hover:text-white/80" : "text-white/20 cursor-default"}`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold border transition-all ${step === s.num ? "border-[#E3CCCD] bg-[#E3CCCD]/15 text-[#E3CCCD]" : step > s.num ? "border-white/30 bg-white/10 text-white/50" : "border-white/15 text-white/20"}`}
                >
                  {s.num}
                </span>
                <span className="text-[11px] uppercase tracking-widest font-medium hidden sm:block">
                  {s.label}
                </span>
              </button>
              {i < 2 && (
                <div
                  className={`w-12 h-px mx-3 transition-colors ${step > s.num ? "bg-white/30" : "bg-white/10"}`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="relative z-10 flex-1 overflow-y-auto px-8 py-7 scrollbar-thin scrollbar-thumb-white/8">
        {/* STEP 1 – Identité */}
        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
            {/* TEMPLATE PICKER (création seulement) */}
            {!isEditing && (
              <div className="border border-white/10 rounded-xl overflow-hidden bg-white/3">
                <button
                  onClick={() => setShowTemplatePicker((o) => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2.5 text-[12px] text-white/50">
                    <Copy className="w-3.5 h-3.5 text-[#E3CCCD]/40" />
                    <span>Partir d'un modèle existant</span>
                    {templates.length > 0 && (
                      <span className="text-[10px] text-white/30 border border-white/15 rounded-full px-1.5">
                        {templates.length}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-white/30 transition-transform duration-200 ${showTemplatePicker ? "rotate-180" : ""}`}
                  />
                </button>
                {showTemplatePicker && (
                  <div className="border-t border-white/10 px-4 py-3 max-h-52 overflow-y-auto scrollbar-thin scrollbar-thumb-white/8">
                    {templates.length === 0 ? (
                      <p className="text-[12px] text-white/30 italic text-center py-2">
                        Aucun profil dans le compendium global.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {templates.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => applyTemplate(t.id)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#E3CCCD]/10 hover:border-[#E3CCCD]/20 border border-transparent transition-all text-left group"
                          >
                            <span className="text-[13px] text-white/80 group-hover:text-white transition-colors">
                              {t.nom}
                            </span>
                            <span className="text-[10px] text-white/30 uppercase tracking-widest">
                              {t.groupe}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                Nom du Profil *
              </label>
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
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                Groupe *
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {groupes.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGroupe(g)}
                    className={`px-3.5 py-1.5 rounded-full border text-[12px] transition-all ${groupe === g ? "border-[#E3CCCD]/60 bg-[#E3CCCD]/10 text-[#E3CCCD]" : "border-white/20 text-white/50 hover:text-white/80 hover:border-white/40"}`}
                  >
                    {g}
                  </button>
                ))}
                {!groupes.includes(groupe) && groupe && (
                  <span className="px-3.5 py-1.5 rounded-full border border-[#E3CCCD]/60 bg-[#E3CCCD]/10 text-[#E3CCCD] text-[12px]">
                    {groupe}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={groupe}
                onChange={(e) => setGroupe(e.target.value)}
                placeholder="Ou saisissez un groupe personnalisé..."
                className="w-full bg-transparent border-b border-white/20 focus:border-white/40 py-2 text-white/80 text-sm outline-none transition-colors placeholder:text-white/25 mt-2"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/40">
                Illustration
              </label>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Aperçu"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-white/20" />
                  )}
                </div>
                <label className="cursor-pointer flex items-center gap-2 px-3.5 py-2 border border-white/25 hover:border-white/50 rounded-lg text-white/70 hover:text-white text-[12px] transition-colors">
                  <UploadCloud className="w-3.5 h-3.5" />
                  Parcourir
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
                {imageFile && (
                  <button
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="text-[11px] text-white/50 hover:text-red-400 transition-colors"
                  >
                    Retirer
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Présentation du profil, fantaisie, rôle dans le groupe..."
                className="w-full h-28 bg-white/5 border border-white/20 focus:border-white/35 rounded-xl p-4 text-white text-sm outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                Lore approfondi
              </label>
              <textarea
                value={lore}
                onChange={(e) => setLore(e.target.value)}
                placeholder="Mythes, culture, histoire, place dans le monde..."
                className="w-full h-32 bg-white/5 border border-white/20 focus:border-white/35 rounded-xl p-4 text-white text-sm outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35"
              />
            </div>
          </div>
        )}

        {/* STEP 2 – Mécanique */}
        {step === 2 && (
          <div className="space-y-7 animate-in slide-in-from-right-4 fade-in">
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                  PV par niveau *
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPvNiveau(Math.max(1, pvNiveau - 1))}
                    className="w-7 h-7 rounded-lg border border-white/20 text-white/60 hover:text-white hover:border-white/40 flex items-center justify-center text-lg leading-none transition-colors"
                  >
                    −
                  </button>
                  <span className="text-white text-xl font-semibold w-8 text-center">
                    {pvNiveau}
                  </span>
                  <button
                    onClick={() => setPvNiveau(pvNiveau + 1)}
                    className="w-7 h-7 rounded-lg border border-white/20 text-white/60 hover:text-white hover:border-white/40 flex items-center justify-center text-lg leading-none transition-colors"
                  >
                    +
                  </button>
                </div>
                <p className="text-[11px] text-white/40 italic">
                  PV gagnés à chaque niveau.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                  Dé de Récupération *
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {["1d4", "1d6", "1d8", "1d10", "1d12"].map((de) => (
                    <button
                      key={de}
                      onClick={() => setDeRecuperation(de)}
                      className={`px-3 py-1.5 rounded-lg border text-[12px] font-mono transition-all ${deRecuperation === de ? "border-[#E3CCCD]/60 bg-[#E3CCCD]/10 text-[#E3CCCD]" : "border-white/20 text-white/50 hover:text-white/80 hover:border-white/40"}`}
                    >
                      {de}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                  Bonus de Chance
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      setBonusChance(Math.max(-5, bonusChance - 1))
                    }
                    className="w-7 h-7 rounded-lg border border-white/20 text-white/60 hover:text-white hover:border-white/40 flex items-center justify-center text-lg leading-none transition-colors"
                  >
                    −
                  </button>
                  <span
                    className={`text-xl font-semibold w-10 text-center ${bonusChance > 0 ? "text-emerald-400" : bonusChance < 0 ? "text-red-400" : "text-white/50"}`}
                  >
                    {bonusChance > 0 ? `+${bonusChance}` : bonusChance}
                  </span>
                  <button
                    onClick={() => setBonusChance(bonusChance + 1)}
                    className="w-7 h-7 rounded-lg border border-white/20 text-white/60 hover:text-white hover:border-white/40 flex items-center justify-center text-lg leading-none transition-colors"
                  >
                    +
                  </button>
                </div>
                <p className="text-[11px] text-white/40 italic">
                  Modificateur appliqué aux jets de chance.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                Équipement de base
              </label>
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
                  <button
                    type="button"
                    onClick={() =>
                      setOpenEquipMenu(
                        openEquipMenu === "arme_contact"
                          ? null
                          : "arme_contact",
                      )
                    }
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-[12px] transition-all ${
                      selectedArmesContact.length > 0
                        ? "border-[#E3CCCD]/50 bg-[#E3CCCD]/10 text-[#E3CCCD]"
                        : "border-white/20 text-white/50 hover:text-white/80 hover:border-white/40"
                    }`}
                  >
                    <Sword className="w-3.5 h-3.5" />
                    Contact{" "}
                    {selectedArmesContact.length > 0 && (
                      <span className="text-[10px] bg-white/10 rounded-full px-1.5">
                        {selectedArmesContact.length}
                      </span>
                    )}
                  </button>
                  {openEquipMenu === "arme_contact" && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-white/15 bg-[#1E1941]/95 backdrop-blur-xl shadow-xl scrollbar-thin scrollbar-thumb-white/8">
                      {armesContact.length === 0 ? (
                        <p className="text-[11px] text-white/30 italic text-center py-3">
                          Aucune arme
                        </p>
                      ) : (
                        armesContact.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() =>
                              toggleSelection(
                                a.id,
                                selectedArmesContact,
                                setSelectedArmesContact,
                              )
                            }
                            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors"
                          >
                            <span
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                selectedArmesContact.includes(a.id)
                                  ? "border-[#E3CCCD] bg-[#E3CCCD]/20"
                                  : "border-white/20"
                              }`}
                            >
                              {selectedArmesContact.includes(a.id) && (
                                <Check className="w-3 h-3 text-[#E3CCCD]" />
                              )}
                            </span>
                            <span className="text-[12px] text-white/80 truncate">
                              {a.nom}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Arme Distance */}
                <div className="relative flex-1">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenEquipMenu(
                        openEquipMenu === "arme_distance"
                          ? null
                          : "arme_distance",
                      )
                    }
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-[12px] transition-all ${
                      selectedArmesDistance.length > 0
                        ? "border-[#E3CCCD]/50 bg-[#E3CCCD]/10 text-[#E3CCCD]"
                        : "border-white/20 text-white/50 hover:text-white/80 hover:border-white/40"
                    }`}
                  >
                    <Target className="w-3.5 h-3.5" />
                    Distance{" "}
                    {selectedArmesDistance.length > 0 && (
                      <span className="text-[10px] bg-white/10 rounded-full px-1.5">
                        {selectedArmesDistance.length}
                      </span>
                    )}
                  </button>
                  {openEquipMenu === "arme_distance" && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-white/15 bg-[#1E1941]/95 backdrop-blur-xl shadow-xl scrollbar-thin scrollbar-thumb-white/8">
                      {armesDistance.length === 0 ? (
                        <p className="text-[11px] text-white/30 italic text-center py-3">
                          Aucune arme
                        </p>
                      ) : (
                        armesDistance.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() =>
                              toggleSelection(
                                a.id,
                                selectedArmesDistance,
                                setSelectedArmesDistance,
                              )
                            }
                            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors"
                          >
                            <span
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                selectedArmesDistance.includes(a.id)
                                  ? "border-[#E3CCCD] bg-[#E3CCCD]/20"
                                  : "border-white/20"
                              }`}
                            >
                              {selectedArmesDistance.includes(a.id) && (
                                <Check className="w-3 h-3 text-[#E3CCCD]" />
                              )}
                            </span>
                            <span className="text-[12px] text-white/80 truncate">
                              {a.nom}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {/* Armure */}
                <div className="relative flex-1">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenEquipMenu(
                        openEquipMenu === "armure" ? null : "armure",
                      )
                    }
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-[12px] transition-all ${
                      selectedArmures.length > 0
                        ? "border-[#E3CCCD]/50 bg-[#E3CCCD]/10 text-[#E3CCCD]"
                        : "border-white/20 text-white/50 hover:text-white/80 hover:border-white/40"
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Armure{" "}
                    {selectedArmures.length > 0 && (
                      <span className="text-[10px] bg-white/10 rounded-full px-1.5">
                        {selectedArmures.length}
                      </span>
                    )}
                  </button>
                  {openEquipMenu === "armure" && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-white/15 bg-[#1E1941]/95 backdrop-blur-xl shadow-xl scrollbar-thin scrollbar-thumb-white/8">
                      {armures.length === 0 ? (
                        <p className="text-[11px] text-white/30 italic text-center py-3">
                          Aucune armure
                        </p>
                      ) : (
                        armures.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() =>
                              toggleSelection(
                                a.id,
                                selectedArmures,
                                setSelectedArmures,
                              )
                            }
                            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors"
                          >
                            <span
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                selectedArmures.includes(a.id)
                                  ? "border-[#E3CCCD] bg-[#E3CCCD]/20"
                                  : "border-white/20"
                              }`}
                            >
                              {selectedArmures.includes(a.id) && (
                                <Check className="w-3 h-3 text-[#E3CCCD]" />
                              )}
                            </span>
                            <span className="text-[12px] text-white/80 truncate">
                              {a.nom}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              {/* Affichage des équipements sélectionnés */}
              {(selectedArmesContact.length > 0 ||
                selectedArmesDistance.length > 0 ||
                selectedArmures.length > 0) && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedArmesContact.map((id) => {
                    const nom =
                      armesContact.find((a) => a.id === id)?.nom || id;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 text-[11px] text-white/70 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1"
                      >
                        <Sword className="w-3 h-3 text-[#E3CCCD]/50" />
                        {nom}
                      </span>
                    );
                  })}
                  {selectedArmesDistance.map((id) => {
                    const nom =
                      armesDistance.find((a) => a.id === id)?.nom || id;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 text-[11px] text-white/70 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1"
                      >
                        <Target className="w-3 h-3 text-[#E3CCCD]/50" />
                        {nom}
                      </span>
                    );
                  })}
                  {selectedArmures.map((id) => {
                    const nom = armures.find((a) => a.id === id)?.nom || id;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 text-[11px] text-white/70 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1"
                      >
                        <Shield className="w-3 h-3 text-[#E3CCCD]/50" />
                        {nom}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                Maîtrise d'équipement
              </label>
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
              <p className="text-[11px] text-white/50 italic">
                {voies.length} voie{voies.length > 1 ? "s" : ""} — une famille a
                généralement 3 voies.
              </p>
              <button
                onClick={addVoie}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-white/20 hover:border-[#E3CCCD]/40 text-white/60 hover:text-white text-[12px] rounded-lg transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter une voie
              </button>
            </div>

            {voies.map((voie, voieIdx) => (
              <div
                key={voieIdx}
                className="border border-white/10 rounded-xl overflow-hidden bg-white/3"
              >
                {/* Header voie */}
                <div className="flex items-center gap-3 px-4 py-3 bg-black/10">
                  <button
                    onClick={() =>
                      setExpandedVoie(expandedVoie === voieIdx ? -1 : voieIdx)
                    }
                    className="flex-1 flex items-center gap-3 text-left"
                  >
                    <ChevronDown
                      className={`w-4 h-4 text-white/40 shrink-0 transition-transform ${expandedVoie === voieIdx ? "rotate-180" : ""}`}
                    />
                    <input
                      type="text"
                      value={voie.nom}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateVoie(voieIdx, "nom", e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      placeholder={`Voie ${voieIdx + 1}...`}
                      className="flex-1 bg-transparent outline-none text-white text-[14px] font-medium placeholder:text-white/30"
                    />
                  </button>
                  <select
                    value={voie.type}
                    onChange={(e) =>
                      updateVoie(voieIdx, "type", e.target.value)
                    }
                    className="bg-white/5 border border-white/15 rounded-lg px-2.5 py-1 text-white/70 text-[11px] outline-none focus:border-white/30"
                  >
                    {Object.entries(TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val} className="bg-[#1E1941]">
                        {label}
                      </option>
                    ))}
                  </select>
                  {voies.length > 1 && (
                    <button
                      onClick={() => removeVoie(voieIdx)}
                      className="p-1 text-white/30 hover:text-red-400 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Rangs */}
                {expandedVoie === voieIdx && (
                  <div className="px-4 pb-4 space-y-2 pt-2">
                    {([1, 2, 3, 4, 5] as const).map((rangNum) => {
                      const key = `rang${rangNum}` as keyof RangsState;
                      const rangData = voie._rangs[key];
                      return (
                        <div
                          key={key}
                          className="flex gap-4 items-start py-3 border-b border-white/6 last:border-0"
                        >
                          <span className="w-5 h-5 mt-2.5 rounded-full border border-white/30 flex items-center justify-center text-[11px] text-white/60 font-medium shrink-0">
                            {rangNum}
                          </span>
                          <div className="flex-1 space-y-2.5">
                            <div className="flex gap-3">
                              <input
                                type="text"
                                value={rangData.nom}
                                onChange={(e) =>
                                  updateRang(
                                    voieIdx,
                                    key,
                                    "nom",
                                    e.target.value,
                                  )
                                }
                                placeholder="Nom de la capacité"
                                className="flex-1 bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35"
                              />
                              <select
                                value={rangData.type}
                                onChange={(e) =>
                                  updateRang(
                                    voieIdx,
                                    key,
                                    "type",
                                    e.target.value,
                                  )
                                }
                                className="bg-white/8 border border-white/20 rounded-lg px-2.5 py-1.5 text-white/80 text-[12px] outline-none focus:border-white/40"
                              >
                                <option value="passif">Passif</option>
                                <option value="action">Action (L)</option>
                                <option value="action_limitee">
                                  Action Lim. (LL)
                                </option>
                                <option value="sort">Sort</option>
                              </select>
                            </div>
                            <textarea
                              value={rangData.description}
                              onChange={(e) =>
                                updateRang(
                                  voieIdx,
                                  key,
                                  "description",
                                  e.target.value,
                                )
                              }
                              placeholder="Description et effet mécanique..."
                              className="w-full h-16 bg-transparent border-b border-white/20 focus:border-white/35 py-1.5 text-white/85 text-[13px] outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35"
                            />
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
        {step > 1 ? (
          <button
            onClick={() => setStep(step - 1)}
            className="flex items-center gap-2 text-white/55 hover:text-white transition-colors text-[13px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Précédent
          </button>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <button
            onClick={() => {
              if (step === 1 && !nom.trim())
                return alert("Le nom du profil est requis.");
              if (step === 1 && !groupe.trim())
                return alert("Le groupe est requis.");
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
            {isSubmitting
              ? "Sauvegarde..."
              : isEditing
                ? "Enregistrer les modifications"
                : "Enregistrer le Profil"}
          </button>
        )}
      </div>
    </ModalLayout>
  );
}
