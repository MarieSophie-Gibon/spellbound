/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, ArrowRight, ArrowLeft, Save, Plus, Trash2, ChevronDown, Image as ImageIcon, UploadCloud } from "lucide-react";
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

const GROUPES = ["Combattant", "Expert", "Magicien", "Hybride", "Autre"];

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

export function ProfilWizard({ onClose, onSuccess, campaignId, initialData }: ProfilWizardProps) {
  const isEditing = !!initialData;
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1 – Identité
  const [nom, setNom] = useState(initialData?.nom ?? "");
  const [groupe, setGroupe] = useState(initialData?.groupe ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image_url ?? null);

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
  const [deRecuperation, setDeRecuperation] = useState(initialData?.de_recuperation ?? "1d6");
  const [bonusChance, setBonusChance] = useState(initialData?.bonus_chance ?? 0);

  // Step 3 – Voies (liste locale avec _rangs pour édition)
  const [voies, setVoies] = useState<(FamilleVoie & { _rangs: RangsState })[]>(
    initialData?.voies?.length
      ? initialData.voies.map((v) => ({
          ...v,
          _rangs: v.capacites as RangsState,
        }))
      : [makeEmptyVoie()]
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
    setVoies((prev) => prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));
  };

  const updateRang = (
    voieIdx: number,
    rangKey: keyof RangsState,
    field: keyof VoieRangCapacite,
    value: string
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
      })
    );
  };

  // --- Submit ---
  const handleSubmit = async () => {
    if (!nom.trim()) return alert("Le nom du profil est obligatoire.");
    if (!groupe.trim()) return alert("Le groupe est obligatoire.");
    if (voies.length === 0) return alert("Au moins une voie est requise.");
    if (voies.some((v) => !v.nom.trim())) return alert("Toutes les voies doivent avoir un nom.");

    setIsSubmitting(true);
    try {
      // Upload image si un fichier a été choisi
      let uploadedImageUrl: string | undefined = initialData?.image_url;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `familles/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("images").upload(path, imageFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("images").getPublicUrl(path);
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
            image_url: uploadedImageUrl ?? null,
          })
          .eq("id", initialData.id);
        if (famErr) throw famErr;

        // Sync voies: upsert known ids, delete removed
        const existingIds = initialData.voies.map((v) => v.id).filter(Boolean) as string[];
        const currentIds = voies.map((v) => v.id).filter(Boolean) as string[];
        const toDelete = existingIds.filter((id) => !currentIds.includes(id));
        if (toDelete.length) {
          await supabase.from("voies").delete().in("id", toDelete);
        }
        for (const v of voies) {
          const capacites = v._rangs;
          if (v.id) {
            await supabase.from("voies").update({ nom: v.nom.trim(), type: v.type, capacites }).eq("id", v.id);
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
        const { data: newFamille, error: famErr } = await supabase
          .from("familles")
          .insert({
            nom: nom.trim(),
            groupe: groupe.trim(),
            description: description.trim() || null,
            pv_niveau: pvNiveau,
            de_recuperation: deRecuperation.trim(),
            bonus_chance: bonusChance,
            image_url: uploadedImageUrl ?? null,
            campaign_id: campaignId || null,
            is_custom: !!campaignId,
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
            campaign_id: campaignId || null,
            is_custom: !!campaignId,
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

  return createPortal(
    <div className="fixed inset-0 z-9999 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="relative w-full max-w-3xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col h-[85vh] animate-in zoom-in-95 duration-200 border border-white/10 overflow-hidden"
        style={{ background: "linear-gradient(160deg, rgba(80,95,200,0.38) 0%, rgba(55,48,130,0.42) 50%, rgba(70,80,175,0.38) 100%)" }}
      >
        <div className="absolute inset-0 backdrop-blur-3xl -z-10" />
        <div className="absolute inset-0 bg-white/3 -z-10" />
        <div className="absolute inset-px rounded-2xl border border-white/10 pointer-events-none z-0" />

        {/* HEADER */}
        <div className="relative z-10 shrink-0 px-8 pt-7 pb-6 border-b border-white/8 bg-black/10">
          <div className="flex items-center justify-between mb-7">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50 mb-1">
                {campaignId ? "Compendium Custom" : "Compendium Global"}
              </p>
              <h2 className="font-serif text-2xl text-white tracking-wide">
                {isEditing ? "Modifier le Profil" : "Nouveau Profil"}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 text-white/30 hover:text-white/70 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Steps */}
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex items-center">
                <button
                  onClick={() => { if (s.num < step || (s.num === step + 1 && nom && groupe)) setStep(s.num); }}
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

          {/* STEP 1 – Identité */}
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Nom du Profil *</label>
                <input
                  type="text" value={nom} onChange={(e) => setNom(e.target.value)} autoFocus
                  placeholder="ex: Guerrier, Voleur, Mage..."
                  className="w-full bg-transparent border-b border-white/30 focus:border-[#E3CCCD]/80 py-2.5 text-white text-lg outline-none transition-colors placeholder:text-white/35"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Groupe *</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {GROUPES.map((g) => (
                    <button
                      key={g}
                      onClick={() => setGroupe(g)}
                      className={`px-3.5 py-1.5 rounded-full border text-[12px] transition-all ${groupe === g ? "border-[#E3CCCD]/60 bg-[#E3CCCD]/10 text-[#E3CCCD]" : "border-white/20 text-white/50 hover:text-white/80 hover:border-white/40"}`}
                    >
                      {g}
                    </button>
                  ))}
                  {!GROUPES.includes(groupe) && groupe && (
                    <span className="px-3.5 py-1.5 rounded-full border border-[#E3CCCD]/60 bg-[#E3CCCD]/10 text-[#E3CCCD] text-[12px]">{groupe}</span>
                  )}
                </div>
                <input
                  type="text" value={groupe} onChange={(e) => setGroupe(e.target.value)}
                  placeholder="Ou saisissez un groupe personnalisé..."
                  className="w-full bg-transparent border-b border-white/20 focus:border-white/40 py-2 text-white/80 text-sm outline-none transition-colors placeholder:text-white/25 mt-2"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/40">Illustration</label>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
                    {imagePreview
                      ? <img src={imagePreview} alt="Aperçu" className="w-full h-full object-cover" />
                      : <ImageIcon className="w-5 h-5 text-white/20" />
                    }
                  </div>
                  <label className="cursor-pointer flex items-center gap-2 px-3.5 py-2 border border-white/25 hover:border-white/50 rounded-lg text-white/70 hover:text-white text-[12px] transition-colors">
                    <UploadCloud className="w-3.5 h-3.5" />
                    Parcourir
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                  {imageFile && (
                    <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="text-[11px] text-white/50 hover:text-red-400 transition-colors">
                      Retirer
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Description</label>
                <textarea
                  value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Présentation du profil, fantaisie, rôle dans le groupe..."
                  className="w-full h-40 bg-white/5 border border-white/20 focus:border-white/35 rounded-xl p-4 text-white text-sm outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35"
                />
              </div>
            </div>
          )}

          {/* STEP 2 – Mécanique */}
          {step === 2 && (
            <div className="space-y-7 animate-in slide-in-from-right-4 fade-in">
              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">PV par niveau *</label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setPvNiveau(Math.max(1, pvNiveau - 1))} className="w-7 h-7 rounded-lg border border-white/20 text-white/60 hover:text-white hover:border-white/40 flex items-center justify-center text-lg leading-none transition-colors">−</button>
                    <span className="text-white text-xl font-semibold w-8 text-center">{pvNiveau}</span>
                    <button onClick={() => setPvNiveau(pvNiveau + 1)} className="w-7 h-7 rounded-lg border border-white/20 text-white/60 hover:text-white hover:border-white/40 flex items-center justify-center text-lg leading-none transition-colors">+</button>
                  </div>
                  <p className="text-[11px] text-white/40 italic">PV gagnés à chaque niveau.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Dé de Récupération *</label>
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
                  <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Bonus de Chance</label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setBonusChance(Math.max(-5, bonusChance - 1))} className="w-7 h-7 rounded-lg border border-white/20 text-white/60 hover:text-white hover:border-white/40 flex items-center justify-center text-lg leading-none transition-colors">−</button>
                    <span className={`text-xl font-semibold w-10 text-center ${bonusChance > 0 ? "text-emerald-400" : bonusChance < 0 ? "text-red-400" : "text-white/50"}`}>
                      {bonusChance > 0 ? `+${bonusChance}` : bonusChance}
                    </span>
                    <button onClick={() => setBonusChance(bonusChance + 1)} className="w-7 h-7 rounded-lg border border-white/20 text-white/60 hover:text-white hover:border-white/40 flex items-center justify-center text-lg leading-none transition-colors">+</button>
                  </div>
                  <p className="text-[11px] text-white/40 italic">Modificateur appliqué aux jets de chance.</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 – Voies */}
          {step === 3 && (
            <div className="space-y-3 animate-in slide-in-from-right-4 fade-in">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-white/50 italic">
                  {voies.length} voie{voies.length > 1 ? "s" : ""} — une famille a généralement 3 voies.
                </p>
                <button
                  onClick={addVoie}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-white/20 hover:border-[#E3CCCD]/40 text-white/60 hover:text-white text-[12px] rounded-lg transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter une voie
                </button>
              </div>

              {voies.map((voie, voieIdx) => (
                <div key={voieIdx} className="border border-white/10 rounded-xl overflow-hidden bg-white/3">
                  {/* Header voie */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-black/10">
                    <button
                      onClick={() => setExpandedVoie(expandedVoie === voieIdx ? -1 : voieIdx)}
                      className="flex-1 flex items-center gap-3 text-left"
                    >
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
                    <select
                      value={voie.type}
                      onChange={(e) => updateVoie(voieIdx, "type", e.target.value)}
                      className="bg-white/5 border border-white/15 rounded-lg px-2.5 py-1 text-white/70 text-[11px] outline-none focus:border-white/30"
                    >
                      {Object.entries(TYPE_LABELS).map(([val, label]) => (
                        <option key={val} value={val} className="bg-[#1E1941]">{label}</option>
                      ))}
                    </select>
                    {voies.length > 1 && (
                      <button onClick={() => removeVoie(voieIdx)} className="p-1 text-white/30 hover:text-red-400 transition-colors shrink-0">
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
                          <div key={key} className="flex gap-4 items-start py-3 border-b border-white/6 last:border-0">
                            <span className="w-5 h-5 mt-2.5 rounded-full border border-white/30 flex items-center justify-center text-[11px] text-white/60 font-medium shrink-0">
                              {rangNum}
                            </span>
                            <div className="flex-1 space-y-2.5">
                              <div className="flex gap-3">
                                <input
                                  type="text"
                                  value={rangData.nom}
                                  onChange={(e) => updateRang(voieIdx, key, "nom", e.target.value)}
                                  placeholder="Nom de la capacité"
                                  className="flex-1 bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35"
                                />
                                <select
                                  value={rangData.type}
                                  onChange={(e) => updateRang(voieIdx, key, "type", e.target.value)}
                                  className="bg-white/8 border border-white/20 rounded-lg px-2.5 py-1.5 text-white/80 text-[12px] outline-none focus:border-white/40"
                                >
                                  <option value="passif">Passif</option>
                                  <option value="action">Action (L)</option>
                                  <option value="action_limitee">Action Lim. (LL)</option>
                                  <option value="sort">Sort</option>
                                </select>
                              </div>
                              <textarea
                                value={rangData.description}
                                onChange={(e) => updateRang(voieIdx, key, "description", e.target.value)}
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
            <button onClick={() => setStep(step - 1)} className="flex items-center gap-2 text-white/55 hover:text-white transition-colors text-[13px]">
              <ArrowLeft className="w-3.5 h-3.5" /> Précédent
            </button>
          ) : <div />}

          {step < 3 ? (
            <button
              onClick={() => {
                if (step === 1 && !nom.trim()) return alert("Le nom du profil est requis.");
                if (step === 1 && !groupe.trim()) return alert("Le groupe est requis.");
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
      </div>
    </div>,
    document.body
  );
}
