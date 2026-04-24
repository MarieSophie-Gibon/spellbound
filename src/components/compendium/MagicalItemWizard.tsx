/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, ArrowRight, ArrowLeft, Save, Plus, Trash2, Image as ImageIcon, UploadCloud } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { EquipementPropriete } from "@/types/compendium";

// --- Types ---

interface MagicalItemWizardProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: InitialEquipementData;
}

export interface InitialEquipementData {
  id: string;
  nom: string;
  categorie: string;
  prix: string | null;
  is_custom: boolean;
  image_url?: string;
  data: {
    rarete?: string;
    description?: string;
    proprietes?: EquipementPropriete[];
    necessite_attunement?: boolean;
  };
}

// --- Constants ---

const CATEGORIES = [
  "Arme contact", "Arme distance","Armure", "Bouclier", "Accessoire",
"Arme magique", "Parchemin", "Potion", "Relique", "Artefact", "Autre",
];

const RARETES = ["Commun", "Peu Commun", "Rare", "Très Rare", "Légendaire", "Artefact"];

// --- Composant ---

export function MagicalItemWizard({ onClose, onSuccess, initialData }: MagicalItemWizardProps) {
  const isEditing = !!initialData;
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1 – Identité
  const [nom, setNom] = useState(initialData?.nom ?? "");
  const [categorie, setCategorie] = useState(initialData?.categorie ?? "Autre");
  const [rarete, setRarete] = useState(initialData?.data?.rarete ?? "Commun");
  const [prix, setPrix] = useState(initialData?.prix ?? "");
  const [necessite, setNecessite] = useState(initialData?.data?.necessite_attunement ?? false);
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

  // Step 2 – Lore & Propriétés
  const [description, setDescription] = useState(initialData?.data?.description ?? "");
  const [proprietes, setProprietes] = useState<EquipementPropriete[]>(
    initialData?.data?.proprietes?.length ? structuredClone(initialData.data.proprietes) : []
  );

  const addPropriete = () => setProprietes(prev => [...prev, { label: "", valeur: "" }]);
  const updatePropriete = (i: number, field: keyof EquipementPropriete, value: string) => {
    setProprietes(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  };
  const removePropriete = (i: number) => setProprietes(prev => prev.filter((_, idx) => idx !== i));

  // --- Submit ---
  const handleSubmit = async () => {
    if (!nom.trim()) return alert("Le nom est obligatoire.");
    setIsSubmitting(true);
    try {
      let uploadedImageUrl: string | undefined = initialData?.image_url;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `equipements/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("compendium").upload(path, imageFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("compendium").getPublicUrl(path);
        uploadedImageUrl = urlData.publicUrl;
      }

      const payload = {
        nom: nom.trim(),
        categorie,
        prix: prix.trim() || null,
        is_custom: false,
        image_url: uploadedImageUrl ?? null,
        data: {
          rarete,
          description: description.trim() || undefined,
          proprietes: proprietes.filter(p => p.label.trim()),
          necessite_attunement: necessite,
        },
      };

      if (isEditing && initialData) {
        const { error } = await supabase.from("equipements").update(payload).eq("id", initialData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("equipements").insert(payload);
        if (error) throw error;
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
    { num: 2, label: "Propriétés" },
  ];

  return createPortal(
    <div className="fixed inset-0 z-9999 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="relative w-full max-w-2xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col h-[80vh] animate-in zoom-in-95 duration-200 border border-white/10 overflow-hidden"
        style={{ background: "linear-gradient(160deg, rgba(100,70,180,0.38) 0%, rgba(70,45,140,0.44) 50%, rgba(130,80,160,0.38) 100%)" }}
      >
        <div className="absolute inset-0 backdrop-blur-3xl -z-10" />
        <div className="absolute inset-0 bg-white/3 -z-10" />
        <div className="absolute inset-px rounded-2xl border border-white/10 pointer-events-none z-0" />

        {/* HEADER */}
        <div className="relative z-10 shrink-0 px-8 pt-7 pb-6 border-b border-white/8 bg-black/10">
          <div className="flex items-center justify-between mb-7">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50 mb-1">Compendium Global</p>
              <h2 className="font-serif text-2xl text-white tracking-wide">
                {isEditing ? "Modifier l'Objet" : "Nouvel Objet Magique"}
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
                  onClick={() => { if (s.num < step || (s.num === step + 1 && nom)) setStep(s.num); }}
                  className={`flex items-center gap-2.5 transition-colors ${step === s.num ? "text-[#E3CCCD]" : step > s.num ? "text-white/60 hover:text-white/80" : "text-white/20 cursor-default"}`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold border transition-all ${step === s.num ? "border-[#E3CCCD] bg-[#E3CCCD]/15 text-[#E3CCCD]" : step > s.num ? "border-white/30 bg-white/10 text-white/50" : "border-white/15 text-white/20"}`}>
                    {s.num}
                  </span>
                  <span className="text-[11px] uppercase tracking-widest font-medium hidden sm:block">{s.label}</span>
                </button>
                {i < 1 && <div className={`w-8 h-px mx-3 transition-colors ${step > s.num ? "bg-white/30" : "bg-white/10"}`} />}
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
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Nom *</label>
                <input
                  type="text" value={nom} onChange={(e) => setNom(e.target.value)} autoFocus
                  placeholder="ex: Épée de feu, Anneau de protection..."
                  className="w-full bg-transparent border-b border-white/30 focus:border-[#E3CCCD]/80 py-2.5 text-white text-lg outline-none transition-colors placeholder:text-white/35"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Catégorie</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategorie(c)}
                      className={`px-3 py-1.5 rounded-full text-[12px] border transition-all ${categorie === c ? "border-[#E3CCCD]/60 bg-[#E3CCCD]/15 text-[#E3CCCD]" : "border-white/15 text-white/50 hover:border-white/30 hover:text-white/70"}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Rareté</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {RARETES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRarete(r)}
                      className={`px-3 py-1.5 rounded-full text-[12px] border transition-all ${rarete === r ? "border-[#E3CCCD]/60 bg-[#E3CCCD]/15 text-[#E3CCCD]" : "border-white/15 text-white/50 hover:border-white/30 hover:text-white/70"}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Prix</label>
                  <input
                    type="text" value={prix} onChange={(e) => setPrix(e.target.value)}
                    placeholder="ex: 500 po, Inestimable..."
                    className="w-full bg-transparent border-b border-white/20 focus:border-[#E3CCCD]/60 py-2 text-white text-sm outline-none transition-colors placeholder:text-white/25"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Harmonisation</label>
                  <button
                    type="button"
                    onClick={() => setNecessite(n => !n)}
                    className={`mt-1 px-4 py-2 rounded-xl border text-[12px] transition-all ${necessite ? "border-amber-400/50 bg-amber-400/10 text-amber-300" : "border-white/15 text-white/40 hover:border-white/25"}`}
                  >
                    {necessite ? "✦ Requiert harmonisation" : "Pas d'harmonisation"}
                  </button>
                </div>
              </div>

              {/* Image */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Illustration</label>
                <div className="flex gap-4 items-start">
                  <div className="w-28 h-28 rounded-xl border border-white/15 bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                    {imagePreview ? (
                      <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-white/15" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-white/20 text-[12px] text-white/40 hover:border-white/40 hover:text-white/60 cursor-pointer transition-colors">
                      <UploadCloud className="w-4 h-4" />
                      Choisir une image...
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                    <p className="text-[11px] text-white/25 mt-2">PNG, JPG ou WEBP · max 5 Mo</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 – Lore & Propriétés */}
          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  placeholder="Histoire de l'objet, son apparence, son origine..."
                  className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-xl p-3.5 text-white text-sm outline-none transition-colors resize-none placeholder:text-white/25 leading-relaxed"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Propriétés Magiques</label>
                  <button
                    type="button"
                    onClick={addPropriete}
                    className="flex items-center gap-1.5 text-[11px] text-[#E3CCCD]/60 hover:text-[#E3CCCD] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter
                  </button>
                </div>

                {proprietes.length === 0 && (
                  <div className="text-[12px] text-white/25 italic text-center py-4 border border-dashed border-white/10 rounded-xl">
                    Aucune propriété. Cliquez sur "Ajouter" pour en créer une.
                  </div>
                )}

                {proprietes.map((p, i) => (
                  <div key={i} className="flex gap-3 items-center bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                    <input
                      type="text"
                      value={p.label}
                      onChange={(e) => updatePropriete(i, "label", e.target.value)}
                      placeholder="Nom de la propriété"
                      className="w-40 shrink-0 bg-transparent border-b border-white/20 focus:border-[#E3CCCD]/50 py-1 text-white text-[13px] outline-none transition-colors placeholder:text-white/25"
                    />
                    <span className="text-white/20 shrink-0">:</span>
                    <input
                      type="text"
                      value={p.valeur}
                      onChange={(e) => updatePropriete(i, "valeur", e.target.value)}
                      placeholder="Valeur ou description courte"
                      className="flex-1 bg-transparent border-b border-white/20 focus:border-[#E3CCCD]/50 py-1 text-white text-[13px] outline-none transition-colors placeholder:text-white/25"
                    />
                    <button type="button" onClick={() => removePropriete(i)} className="p-1 text-white/20 hover:text-red-400 transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="relative z-10 shrink-0 px-8 py-5 border-t border-white/8 bg-black/10 flex items-center justify-between gap-3">
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-white/50 hover:text-white hover:border-white/30 text-[13px] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            {step > 1 ? "Retour" : "Annuler"}
          </button>

          <div className="flex items-center gap-2">
            {STEPS.map(s => (
              <div key={s.num} className={`w-1.5 h-1.5 rounded-full transition-all ${step === s.num ? "bg-[#E3CCCD]" : step > s.num ? "bg-white/40" : "bg-white/15"}`} />
            ))}
          </div>

          {step < 2 ? (
            <button
              onClick={() => { if (!nom.trim()) return alert("Le nom est obligatoire."); setStep(2); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E3CCCD]/15 border border-[#E3CCCD]/30 text-[#E3CCCD] hover:bg-[#E3CCCD]/25 text-[13px] transition-all"
            >
              Suivant <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E3CCCD]/20 border border-[#E3CCCD]/40 text-[#E3CCCD] hover:bg-[#E3CCCD]/30 text-[13px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? "Sauvegarde..." : isEditing ? "Enregistrer" : "Créer l'objet"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
