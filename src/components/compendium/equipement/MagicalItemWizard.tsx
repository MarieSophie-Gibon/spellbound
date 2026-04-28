/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
// import { createPortal } from "react-dom";
import { ModalLayout } from "@/components/ui/ModalLayout";
import { X, ArrowRight, ArrowLeft, Save, Plus, Trash2, Image as ImageIcon, UploadCloud } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { EquipementPropriete } from "@/types/compendium";

// --- Types ---

type EquipementType = "arme_contact" | "arme_distance" | "armure" | "equipement";

interface EquipementWizardProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: InitialEquipementData;
  campaignId?: string | null;
}

interface InitialEquipementData {
  id?: string;
  table_source: EquipementType;
  nom: string;
  prix?: string | null;
  image_url?: string;
  is_custom?: boolean;
  // Armes de contact
  dm?: string;
  type_de_dm?: string;
  categorie?: string;
  notes?: string;
  // Armes à distance
  portee?: string;
  // Armures
  bonus_def?: string;
  agi_max?: string;
  // Equipements magiques
  data?: {
    rarete?: string;
    description?: string;
    proprietes?: EquipementPropriete[];
    necessite_attunement?: boolean;
  };
  campaign_id?: string | null;
}

// --- Constants ---

const OBJET_TYPES = [
  { key: "arme_contact", label: "Arme de Contact" },
  { key: "arme_distance", label: "Arme à Distance" },
  { key: "armure", label: "Armure" },
  { key: "equipement", label: "Autre Équipement" },
];

const CATEGORIES = [
  "Arme contact", "Arme distance", "Armure", "Bouclier", "Accessoire",
  "Arme magique", "Parchemin", "Potion", "Relique", "Artefact", "Autre",
];

const RARETES = ["Commun", "Peu Commun", "Rare", "Très Rare", "Légendaire", "Artefact"];



// --- Main Component ---

export default function EquipementWizard({ onClose, onSuccess, initialData, campaignId }: EquipementWizardProps) {
  // --- State ---
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<EquipementType>(initialData?.table_source || "arme_contact");
  const [nom, setNom] = useState(initialData?.nom || "");
  const [prix, setPrix] = useState(initialData?.prix || "");
  const [categorie, setCategorie] = useState(initialData?.categorie || "");
  const [dm, setDm] = useState(initialData?.dm || "");
  const [typeDeDm, setTypeDeDm] = useState(initialData?.type_de_dm || "");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [portee, setPortee] = useState(initialData?.portee || "");
  const [bonusDef, setBonusDef] = useState(initialData?.bonus_def || "");
  const [agiMax, setAgiMax] = useState(initialData?.agi_max || "");
  const [rarete, setRarete] = useState(initialData?.data?.rarete || "Commun");
  const [description, setDescription] = useState(initialData?.data?.description || "");
  const [proprietes, setProprietes] = useState<EquipementPropriete[]>(initialData?.data?.proprietes || []);
  const [necessite, setNecessite] = useState(initialData?.data?.necessite_attunement || false);
  const [isPrivate, setIsPrivate] = useState(initialData?.is_custom || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image_url || null);
  const isEditing = !!initialData;

  // --- Handlers ---
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  function addPropriete() {
    setProprietes([...proprietes, { label: "", valeur: "" }]);
  }
  function updatePropriete(i: number, field: keyof EquipementPropriete, value: string) {
    setProprietes(proprietes.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  }
  function removePropriete(i: number) {
    setProprietes(proprietes.filter((_, idx) => idx !== i));
  }

  // --- Subcomponents ---
  function ImageUploader({ imagePreview, onImageChange }: { imagePreview: string | null; onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
    return (
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
              <input type="file" accept="image/*" className="hidden" onChange={onImageChange} />
            </label>
            <p className="text-[11px] text-white/25 mt-2">PNG, JPG ou WEBP · max 5 Mo</p>
          </div>
        </div>
      </div>
    );
  }
  function ProprietesMagiquesEditor({ proprietes, addPropriete, updatePropriete, removePropriete }: {
    proprietes: EquipementPropriete[];
    addPropriete: () => void;
    updatePropriete: (i: number, field: keyof EquipementPropriete, value: string) => void;
    removePropriete: (i: number) => void;
  }) {
    return (
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
              onChange={e => updatePropriete(i, "label", e.target.value)}
              placeholder="Nom de la propriété"
              className="w-40 shrink-0 bg-transparent border-b border-white/20 focus:border-[#E3CCCD]/50 py-1 text-white text-[13px] outline-none transition-colors placeholder:text-white/25"
            />
            <span className="text-white/20 shrink-0">:</span>
            <input
              type="text"
              value={p.valeur}
              onChange={e => updatePropriete(i, "valeur", e.target.value)}
              placeholder="Valeur ou description courte"
              className="flex-1 bg-transparent border-b border-white/20 focus:border-[#E3CCCD]/50 py-1 text-white text-[13px] outline-none transition-colors placeholder:text-white/25"
            />
            <button type="button" onClick={() => removePropriete(i)} className="p-1 text-white/20 hover:text-red-400 transition-colors shrink-0">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    );
  }
  function ArmeContactFields({ dm, setDm, typeDeDm, setTypeDeDm, categorie, setCategorie, notes, setNotes }: any) {
    return (
      <>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Dégâts (DM)</label>
          <input type="text" value={dm} onChange={e => setDm(e.target.value)} placeholder="ex: 1d8+2" className="w-full bg-transparent border-b border-white/20 focus:border-[#E3CCCD]/60 py-2 text-white text-sm outline-none transition-colors placeholder:text-white/25" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Type de DM</label>
          <input type="text" value={typeDeDm} onChange={e => setTypeDeDm(e.target.value)} placeholder="ex: Tranchant, contondant..." className="w-full bg-transparent border-b border-white/20 focus:border-[#E3CCCD]/60 py-2 text-white text-sm outline-none transition-colors placeholder:text-white/25" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Catégorie</label>
          <input type="text" value={categorie} onChange={e => setCategorie(e.target.value)} placeholder="ex: Épée, Masse, Hache..." className="w-full bg-transparent border-b border-white/20 focus:border-[#E3CCCD]/60 py-2 text-white text-sm outline-none transition-colors placeholder:text-white/25" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Notes</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="ex: Lourde, 2 mains..." className="w-full bg-transparent border-b border-white/20 focus:border-[#E3CCCD]/60 py-2 text-white text-sm outline-none transition-colors placeholder:text-white/25" />
        </div>
      </>
    );
  }
  function ArmeDistanceFields({ dm, setDm, typeDeDm, setTypeDeDm, categorie, setCategorie, portee, setPortee, notes, setNotes }: any) {
    return (
      <>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Dégâts (DM)</label>
          <input type="text" value={dm} onChange={e => setDm(e.target.value)} placeholder="ex: 1d8+2" className="w-full bg-transparent border-b border-white/20 focus:border-[#E3CCCD]/60 py-2 text-white text-sm outline-none transition-colors placeholder:text-white/25" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Type de DM</label>
          <input type="text" value={typeDeDm} onChange={e => setTypeDeDm(e.target.value)} placeholder="ex: Perforant, contondant..." className="w-full bg-transparent border-b border-white/20 focus:border-[#E3CCCD]/60 py-2 text-white text-sm outline-none transition-colors placeholder:text-white/25" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Catégorie</label>
          <input type="text" value={categorie} onChange={e => setCategorie(e.target.value)} placeholder="ex: Arc, Arbalète..." className="w-full bg-transparent border-b border-white/20 focus:border-[#E3CCCD]/60 py-2 text-white text-sm outline-none transition-colors placeholder:text-white/25" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Portée</label>
          <input type="text" value={portee} onChange={e => setPortee(e.target.value)} placeholder="ex: 30/120m" className="w-full bg-transparent border-b border-white/20 focus:border-[#E3CCCD]/60 py-2 text-white text-sm outline-none transition-colors placeholder:text-white/25" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Notes</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="ex: Lancer, 2 mains..." className="w-full bg-transparent border-b border-white/20 focus:border-[#E3CCCD]/60 py-2 text-white text-sm outline-none transition-colors placeholder:text-white/25" />
        </div>
      </>
    );
  }
  function ArmureFields({ bonusDef, setBonusDef, agiMax, setAgiMax }: any) {
    return (
      <>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Bonus de DEF</label>
          <input type="text" value={bonusDef} onChange={e => setBonusDef(e.target.value)} placeholder="ex: +2" className="w-full bg-transparent border-b border-white/20 focus:border-[#E3CCCD]/60 py-2 text-white text-sm outline-none transition-colors placeholder:text-white/25" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">AGI Max</label>
          <input type="text" value={agiMax} onChange={e => setAgiMax(e.target.value)} placeholder="ex: 2" className="w-full bg-transparent border-b border-white/20 focus:border-[#E3CCCD]/60 py-2 text-white text-sm outline-none transition-colors placeholder:text-white/25" />
        </div>
      </>
    );
  }



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

      const publicMode = campaignId && !isPrivate;
      let table = "equipements";
      let payload: any = {};
      switch (selectedType) {
        case "arme_contact":
          table = "armes_contact";
          payload = {
            nom: nom.trim(),
            dm: dm.trim() || null,
            type_de_dm: typeDeDm.trim() || null,
            categorie: categorie.trim() || null,
            notes: notes.trim() || null,
            prix: prix.trim() || null,
            is_custom: !!(campaignId && isPrivate),
            image_url: uploadedImageUrl ?? null,
            campaign_id: publicMode ? null : (campaignId || null),
          };
          break;
        case "arme_distance":
          table = "armes_distance";
          payload = {
            nom: nom.trim(),
            dm: dm.trim() || null,
            type_de_dm: typeDeDm.trim() || null,
            categorie: categorie.trim() || null,
            portee: portee.trim() || null,
            notes: notes.trim() || null,
            prix: prix.trim() || null,
            is_custom: !!(campaignId && isPrivate),
            image_url: uploadedImageUrl ?? null,
            campaign_id: publicMode ? null : (campaignId || null),
          };
          break;
        case "armure":
          table = "armures";
          payload = {
            nom: nom.trim(),
            bonus_def: bonusDef.trim() || null,
            agi_max: agiMax.trim() || null,
            prix: prix.trim() || null,
            is_custom: !!(campaignId && isPrivate),
            image_url: uploadedImageUrl ?? null,
            campaign_id: publicMode ? null : (campaignId || null),
          };
          break;
        case "equipement":
        default:
          table = "equipements";
          payload = {
            nom: nom.trim(),
            categorie: categorie.trim() || null,
            prix: prix.trim() || null,
            is_custom: !!(campaignId && isPrivate),
            image_url: uploadedImageUrl ?? null,
            campaign_id: publicMode ? null : (campaignId || null),
            data: {
              rarete,
              description: description.trim() || undefined,
              proprietes: proprietes.filter(p => p.label.trim()),
              necessite_attunement: necessite,
            },
          };
          break;
      }

      if (isEditing && initialData) {
        const { error } = await supabase.from(table).update(payload).eq("id", initialData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).insert(payload);
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
    { num: 1, label: "Type & Identité" },
    { num: 2, label: "Propriétés" },
  ];

  return (
    <ModalLayout>
      {/* HEADER */}
      <div className="relative z-10 shrink-0 px-8 pt-7 pb-6 border-b border-white/8 bg-black/10">
          <div className="flex items-center justify-between mb-7">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50 mb-1">{campaignId ? "Compendium Custom" : "Compendium Global"}</p>
              <h2 className="font-serif text-2xl text-white tracking-wide">
                {isEditing ? "Modifier l'Objet" : "Nouvel Objet"}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 text-white/30 hover:text-white/70 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sélecteur de type d'objet */}
          <div className="mb-6 flex flex-wrap gap-2">
            {OBJET_TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                disabled={isEditing && initialData?.table_source !== t.key}
                onClick={() => setSelectedType(t.key as EquipementType)}
                className={`px-4 py-2 rounded-full text-[13px] border transition-all font-medium ${selectedType === t.key ? "border-[#E3CCCD]/60 bg-[#E3CCCD]/15 text-[#E3CCCD]" : "border-white/15 text-white/50 hover:border-white/30 hover:text-white/70"} ${isEditing && initialData?.table_source !== t.key ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* PRIVÉ/PUBLIC (création ou édition campagne uniquement) */}
          {campaignId && (!isEditing || (isEditing && initialData?.campaign_id === campaignId)) && (
            <div className="mb-4 flex items-center gap-2">
              <input
                id="equipement-private"
                type="checkbox"
                checked={isPrivate}
                onChange={e => setIsPrivate(e.target.checked)}
                className="accent-indigo-500 w-4 h-4 rounded"
              />
              <label htmlFor="equipement-private" className="text-xs text-white/70 select-none cursor-pointer">
                Privé à cette campagne
              </label>
            </div>
          )}

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

          {/* STEP 1 – Type & Identité */}
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
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Prix</label>
                <input
                  type="text" value={prix} onChange={(e) => setPrix(e.target.value)}
                  placeholder="ex: 500 po, Inestimable..."
                  className="w-full bg-transparent border-b border-white/20 focus:border-[#E3CCCD]/60 py-2 text-white text-sm outline-none transition-colors placeholder:text-white/25"
                />
              </div>


              {selectedType === "arme_contact" && (
                <ArmeContactFields
                  dm={dm} setDm={setDm}
                  typeDeDm={typeDeDm} setTypeDeDm={setTypeDeDm}
                  categorie={categorie} setCategorie={setCategorie}
                  notes={notes} setNotes={setNotes}
                />
              )}

              {selectedType === "arme_distance" && (
                <ArmeDistanceFields
                  dm={dm} setDm={setDm}
                  typeDeDm={typeDeDm} setTypeDeDm={setTypeDeDm}
                  categorie={categorie} setCategorie={setCategorie}
                  portee={portee} setPortee={setPortee}
                  notes={notes} setNotes={setNotes}
                />
              )}

              {selectedType === "armure" && (
                <ArmureFields
                  bonusDef={bonusDef} setBonusDef={setBonusDef}
                  agiMax={agiMax} setAgiMax={setAgiMax}
                />
              )}

              {selectedType !== "equipement" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Notes / Description</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Notes, propriétés spéciales, description..."
                    className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-xl p-3.5 text-white text-sm outline-none transition-colors resize-none placeholder:text-white/25 leading-relaxed"
                  />
                </div>
              )}

              {selectedType === "equipement" && (
                <>
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
                </>
              )}

              {/* Image */}
              <ImageUploader imagePreview={imagePreview} onImageChange={handleImageChange} />

              {/* Footer boutons pour l'étape 1 */}
              <div className="flex justify-end gap-2 pt-4">
                {selectedType === "equipement" ? (
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
          )}

          {/* STEP 2 – Lore & Propriétés (uniquement pour equipement) */}
          {step === 2 && selectedType === "equipement" && (
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
              <ProprietesMagiquesEditor
                proprietes={proprietes}
                addPropriete={addPropriete}
                updatePropriete={updatePropriete}
                removePropriete={removePropriete}
              />
              {/* Footer bouton sauvegarde pour l'étape 2 */}
              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E3CCCD]/20 border border-[#E3CCCD]/40 text-[#E3CCCD] hover:bg-[#E3CCCD]/30 text-[13px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {isSubmitting ? "Sauvegarde..." : isEditing ? "Enregistrer" : "Créer l'objet"}
                </button>
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
    </ModalLayout>
  );
}
