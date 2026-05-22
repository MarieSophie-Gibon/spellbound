/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { ThemedSelect } from "@/components/ui/ThemedSelect";
import { ModalLayout } from "@/components/ui/ModalLayout";
import {
  X,
  ArrowRight,
  ArrowLeft,
  Save,
  Image as ImageIcon,
  UploadCloud,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { EquipementPropriete } from "@/types/compendium";

// --- Types ---

export type EquipementType =
  | "arme_contact"
  | "arme_distance"
  | "armure"
  | "equipement";

interface EquipementWizardProps {
  onClose: () => void;
  onSuccess: (newItem?: any) => void;
  selectedType: EquipementType;
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


const CATEGORIES = [
  "Accessoire",
  "Parchemin",
  "Potion",
  "Artefact",
  "Matériel",
  "Autre",
];

const RARETES = [
  "Commun",
  "Rare",
  "Légendaire",
];

// --- Main Component ---

function ImageUploader({
  imagePreview,
  onImageChange,
}: {
  imagePreview: string | null;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-14 h-14 rounded-xl border border-white/15 bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
        {imagePreview ? (
          <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="w-5 h-5 text-white/15" />
        )}
      </div>
      <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-white/20 text-[11px] text-white/40 hover:border-white/40 hover:text-white/60 cursor-pointer transition-colors">
        <UploadCloud className="w-3.5 h-3.5" />
        Choisir une image...
        <input type="file" accept="image/*" className="hidden" onChange={onImageChange} />
      </label>
    </div>
  );
}

function ArmeContactFields({
  dm, setDm, typeDeDm, setTypeDeDm, categorie, setCategorie, notes, setNotes,
}: any) {
  const CATEGORIES = [
    null,
    "Arme à deux mains",
    "Arme à une ou deux mains",
    "Arme à poudre",
    "Arme légère",
  ];
  // Filter out nulls for options
  const CATEGORY_OPTIONS: string[] = CATEGORIES.filter((c): c is string => Boolean(c));
  const TYPES_DM = [
    "Perforants",
    "Contondants",
    "Tranchants",
  ];
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Dégâts (DM)</label>
        <input type="text" value={dm} onChange={(e: any) => setDm(e.target.value)} placeholder="ex: 1d8+2"
          className="w-full bg-transparent border-b border-white/20 focus:border-[#E3CCCD]/60 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/25" />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Type de DM</label>
        <ThemedSelect value={typeDeDm} onValueChange={setTypeDeDm} options={TYPES_DM} allowNull />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Catégorie</label>
        <ThemedSelect value={categorie} onValueChange={setCategorie} options={CATEGORY_OPTIONS} allowNull />
      </div>
      <div className="space-y-1 col-span-2">
        <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Notes</label>
        <textarea value={notes} onChange={(e: any) => setNotes(e.target.value)} placeholder="Lourde, 2 mains..." rows={2}
          className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-lg p-2.5 text-white text-sm outline-none transition-colors resize-none placeholder:text-white/25 leading-relaxed" />
      </div>
    </div>
  );
}

function ArmeDistanceFields({
  dm, setDm, typeDeDm, setTypeDeDm, categorie, setCategorie, portee, setPortee, notes, setNotes,
}: any) {
  const CATEGORIES = [
    null,
    "Arme à deux mains",
    "Arme à une ou deux mains",
    "Arme à poudre",
    "Arme légère",
  ];
  // Filter out nulls for options
  const CATEGORY_OPTIONS: string[] = CATEGORIES.filter((c): c is string => Boolean(c));
  const TYPES_DM = [
    "Perforants",
    "Contondants",
    "Tranchants",
  ];
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Dégâts (DM)</label>
        <input type="text" value={dm} onChange={(e: any) => setDm(e.target.value)} placeholder="ex: 1d8+2"
          className="w-full bg-transparent border-b border-white/20 focus:border-[#E3CCCD]/60 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/25" />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Type de DM</label>
        <ThemedSelect value={typeDeDm} onValueChange={setTypeDeDm} options={TYPES_DM} allowNull />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Catégorie</label>
        <ThemedSelect value={categorie} onValueChange={setCategorie} options={CATEGORY_OPTIONS} allowNull />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Portée</label>
        <input type="text" value={portee} onChange={(e: any) => setPortee(e.target.value)} placeholder="30/120m"
          className="w-full bg-transparent border-b border-white/20 focus:border-[#E3CCCD]/60 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/25" />
      </div>
      <div className="space-y-1 col-span-2">
        <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Notes</label>
        <textarea value={notes} onChange={(e: any) => setNotes(e.target.value)} placeholder="Lancer, 2 mains..." rows={2}
          className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-lg p-2.5 text-white text-sm outline-none transition-colors resize-none placeholder:text-white/25 leading-relaxed" />
      </div>
    </div>
  );
}

function ArmureFields({ bonusDef, setBonusDef, agiMax, setAgiMax }: any) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Bonus de DEF</label>
        <input type="text" value={bonusDef} onChange={(e: any) => setBonusDef(e.target.value)} placeholder="ex: +2"
          className="w-full bg-transparent border-b border-white/20 focus:border-[#E3CCCD]/60 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/25" />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">AGI Max</label>
        <input type="text" value={agiMax} onChange={(e: any) => setAgiMax(e.target.value)} placeholder="ex: 2"
          className="w-full bg-transparent border-b border-white/20 focus:border-[#E3CCCD]/60 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/25" />
      </div>
    </div>
  );
}

export default function EquipementWizard({
  onClose,
  onSuccess,
  selectedType,
  initialData,
  campaignId,
}: EquipementWizardProps) {
  // --- State ---
  const [step, setStep] = useState(1);
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
  const [description, setDescription] = useState(
    initialData?.data?.description || "",
  );
  const [isPrivate, setIsPrivate] = useState(initialData?.is_custom || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialData?.image_url || null,
  );
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

  // --- Submit ---
  const handleSubmit = async () => {
    if (!nom.trim()) return alert("Le nom est obligatoire.");
    setIsSubmitting(true);
    try {
      let uploadedImageUrl: string | undefined = initialData?.image_url;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `equipements/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("compendium")
          .upload(path, imageFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage
          .from("compendium")
          .getPublicUrl(path);
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
            image_url: uploadedImageUrl ?? null,
            is_custom: !!(campaignId && isPrivate),
            campaign_id: publicMode ? null : campaignId || null,
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
            image_url: uploadedImageUrl ?? null,
            is_custom: !!(campaignId && isPrivate),
            campaign_id: publicMode ? null : campaignId || null,
          };
          break;
        case "armure":
          table = "armures";
          payload = {
            nom: nom.trim(),
            bonus_def: bonusDef.trim() || null,
            agi_max: agiMax.trim() || null,
            prix: prix.trim() || null,
            image_url: uploadedImageUrl ?? null,
            is_custom: !!(campaignId && isPrivate),
            campaign_id: publicMode ? null : campaignId || null,
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
            campaign_id: publicMode ? null : campaignId || null,
            data: {
              rarete,
              description: description.trim() || undefined,
            },
          };
          break;
      }

      if (isEditing && initialData) {
        const { error } = await supabase
          .from(table)
          .update(payload)
          .eq("id", initialData.id);
        if (error) throw error;
        onSuccess(); // Mode édition, pas besoin de retourner l'objet
      } else {
        // AJOUTE .select().single() POUR RÉCUPÉRER L'OBJET CRÉÉ
        const { data: newItem, error } = await supabase.from(table).insert(payload).select().single();
        if (error) throw error;
        onSuccess(newItem); // <-- ON PASSE L'OBJET ICI
      }

      onClose();
    } catch (err: any) {
      alert("Erreur lors de la sauvegarde : " + err.message);
    } finally {
      setIsSubmitting(false);
    }

  };

  const STEPS = [{ num: 1, label: "Identité" }];
  const maxStep = 1;

  return (
    <ModalLayout>
      {/* HEADER */}
      <div className="relative z-10 shrink-0 px-8 pt-5 pb-3 border-b border-white/8 bg-black/10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[12px] uppercase tracking-[0.2em] text-[#E3CCCD]/50">
              {isEditing ? "Modifier l'Objet" : "Nouvel Objet"} - {selectedType === "arme_contact"
                ? "Arme de Contact"
                : selectedType === "arme_distance"
                  ? "Arme à Distance"
                  : selectedType === "armure"
                    ? "Armure"
                    : "Équipement"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/30 hover:text-white/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>


      </div>

      {/* CONTENT */}
      <div className="relative z-10 flex-1 overflow-y-auto px-8 py-3 scrollbar-thin scrollbar-thumb-white/8">
        {/* STEP 1 – Type & Identité */}
        {step === 1 && (
          <div className="space-y-4 animate-in slide-in-from-right-4 fade-in">
            <div className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Nom *</label>
                <input
                  type="text" value={nom} onChange={(e) => setNom(e.target.value)} autoFocus
                  placeholder="ex: Épée de feu, Anneau de protection..."
                  className="w-full bg-transparent border-b border-white/30 focus:border-[#E3CCCD]/80 py-2 text-white text-base outline-none transition-colors placeholder:text-white/35"
                />
              </div>
              <div className="space-y-1 w-32">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Prix</label>
                <input
                  type="text" value={prix} onChange={(e) => setPrix(e.target.value)}
                  placeholder="500 po..."
                  className="w-full bg-transparent border-b border-white/20 focus:border-[#E3CCCD]/60 py-2 text-white text-sm outline-none transition-colors placeholder:text-white/25"
                />
              </div>
            </div>

            {selectedType === "arme_contact" && (
              <ArmeContactFields
                dm={dm}
                setDm={setDm}
                typeDeDm={typeDeDm}
                setTypeDeDm={setTypeDeDm}
                categorie={categorie}
                setCategorie={setCategorie}
                notes={notes}
                setNotes={setNotes}
              />
            )}

            {selectedType === "arme_distance" && (
              <ArmeDistanceFields
                dm={dm}
                setDm={setDm}
                typeDeDm={typeDeDm}
                setTypeDeDm={setTypeDeDm}
                categorie={categorie}
                setCategorie={setCategorie}
                portee={portee}
                setPortee={setPortee}
                notes={notes}
                setNotes={setNotes}
              />
            )}

            {selectedType === "armure" && (
              <ArmureFields
                bonusDef={bonusDef}
                setBonusDef={setBonusDef}
                agiMax={agiMax}
                setAgiMax={setAgiMax}
              />
            )}

            {selectedType === "equipement" && (
              <>
                <div className="flex gap-6">
                  <div className="space-y-1.5 flex-1">
                    <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Catégorie</label>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {CATEGORIES.map((c) => (
                        <button key={c} type="button" onClick={() => setCategorie(c)}
                          className={`px-2.5 py-1 rounded-full text-[11px] border transition-all ${categorie === c ? "border-[#E3CCCD]/60 bg-[#E3CCCD]/15 text-[#E3CCCD]" : "border-white/15 text-white/50 hover:border-white/30 hover:text-white/70"}`}
                        >{c}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1 shrink-0">
                    <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Rareté</label>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {RARETES.map((r) => (
                        <button key={r} type="button" onClick={() => setRarete(r)}
                          className={`px-2.5 py-1 rounded-full text-[11px] border transition-all ${rarete === r ? "border-[#E3CCCD]/60 bg-[#E3CCCD]/15 text-[#E3CCCD]" : "border-white/15 text-white/50 hover:border-white/30 hover:text-white/70"}`}
                        >{r}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                    placeholder="Histoire, apparence, effet..."
                    className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-lg p-2.5 text-white text-sm outline-none transition-colors resize-none placeholder:text-white/25 leading-relaxed" />
                </div>
              </>
            )}

            {/* Image */}
            <ImageUploader
              imagePreview={imagePreview}
              onImageChange={handleImageChange}
            />


          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="relative z-10 shrink-0 px-8 py-5 border-t border-white/8 bg-black/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => (step > 1 ? setStep((s) => s - 1) : onClose())}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-white/50 hover:text-white hover:border-white/30 text-[13px] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            {step > 1 ? "Retour" : "Annuler"}
          </button>
          {campaignId && (
            <div className="flex items-center gap-2">
              <input
                id="equipement-private"
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="accent-indigo-500 w-4 h-4 rounded"
              />
              <label
                htmlFor="equipement-private"
                className="text-xs text-white/70 select-none cursor-pointer"
              >
                Privé à cette campagne
              </label>
            </div>
          )}
        </div>

        {maxStep > 1 && (
          <div className="flex items-center gap-2">
            {STEPS.map((s) => (
              <div
                key={s.num}
                className={`w-1.5 h-1.5 rounded-full transition-all ${step === s.num ? "bg-[#E3CCCD]" : step > s.num ? "bg-white/40" : "bg-white/15"}`}
              />
            ))}
          </div>
        )}

        {step < maxStep ? (
          <button
            onClick={() => {
              if (!nom.trim()) return alert("Le nom est obligatoire.");
              setStep(step + 1);
            }}
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
            {isSubmitting
              ? "Sauvegarde..."
              : isEditing
                ? "Enregistrer"
                : "Créer l'objet"}
          </button>
        )}
      </div>
    </ModalLayout>
  );
}
