/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { ModalLayout } from "@/components/ui/ModalLayout";
import {
  X,
  ArrowRight,
  ArrowLeft,
  Save,
  Image as ImageIcon,
  UploadCloud,
} from "lucide-react";
import { usePeupleData } from "@/hooks/compendium/usePeupleData";
import { RangEditorCard } from "@/components/compendium/shared/RangEditorCard";
import { EMPTY_RANGS, type RangsState, type VoieRang } from "@/types/compendium";
import { cleanupRangsForSave, normalizeRangsState } from "@/lib/voieRanks";
import {
  addRangItemState,
  duplicateRangItemState,
  removeRangItemState,
  toggleOpenItem,
  updateRangFieldState,
  updateRangItemState,
  type RangSection,
} from "@/lib/rangEditor";

interface InitialPeupleData {
  id: string;
  nom: string;
  description: string;
  lore?: string | null;
  image_url?: string;
  data: PeupleData;
  voie?: {
    id: string;
    nom: string;
    capacites: Record<string, unknown>;
  };
  campaign_id?: string | null;
}

interface PeupleWizardProps {
  onClose: () => void;
  onSuccess: () => void;
  campaignId?: string;
  initialData?: InitialPeupleData; // Si fourni → mode édition
}

interface PeupleData {
  caracteristiques: string;
  taille: string;
  poids: string;
  age: string;
  esperance: string;
  traits: string;
}

export function PeupleWizard({
  onClose,
  onSuccess,
  campaignId,
  initialData,
}: PeupleWizardProps) {
  const peupleData = usePeupleData();
  const isEditing = !!initialData;
  const [isPrivate, setIsPrivate] = useState(true);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- ÉTAPE 1 : LORE ---
  const [nom, setNom] = useState(initialData?.nom ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [lore, setLore] = useState(initialData?.lore ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image_url ?? null);

  // --- ÉTAPE 2 : STATS (JSONB sans Vitesse) ---
  const [data, setData] = useState<PeupleData>(initialData?.data ?? {
    caracteristiques: "",
    taille: "Moyenne",
    poids: "",
    age: "",
    esperance: "",
    traits: "",
  });

  // --- ÉTAPE 3 : VOIE DU PEUPLE ---
  const [voieNom, setVoieNom] = useState(initialData?.voie?.nom ?? "");
  const [rangs, setRangs] = useState<RangsState>(
    initialData?.voie?.capacites ? normalizeRangsState(initialData.voie.capacites) : structuredClone(EMPTY_RANGS),
  );

  // --- LOGIQUE ---
  const handleDataChange = (field: keyof PeupleData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRangChange = (rangKey: keyof RangsState, field: keyof VoieRang, value: string) => {
    setRangs((prev) => updateRangFieldState(prev, rangKey, field, value));
  };

  const handleRangItemChange = (
    rangKey: keyof RangsState,
    section: RangSection,
    itemIdx: number,
    field: string,
    value: string | boolean,
  ) => {
    setRangs((prev) => updateRangItemState(prev, rangKey, section, itemIdx, field, value));
  };

  const addRangItem = (
    rangKey: keyof RangsState,
    section: RangSection,
  ) => {
    setRangs((prev) => {
      const { next, newIndex } = addRangItemState(prev, rangKey, section);
      const newIkey = `${rangKey}-${section}-${newIndex}`;
      setNewItemKeys(prev2 => { const n = new Set(prev2); n.add(newIkey); return n; });
      return next;
    });
  };

  const removeRangItem = (
    rangKey: keyof RangsState,
    section: RangSection,
    itemIdx: number,
  ) => {
    setRangs((prev) => removeRangItemState(prev, rangKey, section, itemIdx));
  };

  const [openRangItems, setOpenRangItems] = useState<Set<string>>(new Set());
  const [newItemKeys, setNewItemKeys] = useState<Set<string>>(new Set());
  const toggleRangItem = (ikey: string) =>
    setOpenRangItems((prev) => toggleOpenItem(prev, ikey));

  const duplicateRangItem = (
    rangKey: keyof RangsState,
    section: RangSection,
    itemIdx: number,
  ) => {
    setRangs((prev) => duplicateRangItemState(prev, rangKey, section, itemIdx));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!nom.trim()) return alert("Le nom du peuple est obligatoire.");
    setIsSubmitting(true);

    try {
      let finalImageUrl = initialData?.image_url ?? null;

      // Upload de l'image sur Supabase Storage (si nouvelle image)
      if (imageFile) {
        finalImageUrl = await peupleData.uploadPeupleImage(imageFile);
      }

      const finalVoieNom = voieNom.trim() || `Voie des ${nom.trim()}s`;

      if (isEditing && initialData) {
        // --- MODE ÉDITION ---
        const publicMode = campaignId && !isPrivate;
        const cleanedCapacites = cleanupRangsForSave(rangs);
        const campaignData = { campaign_id: publicMode ? null : (campaignId || null), is_custom: !!(campaignId && isPrivate) };

        const voiePromise = initialData.voie
          ? peupleData.updateVoie(initialData.voie.id, { nom: finalVoieNom, capacites: cleanedCapacites, ...campaignData })
          : peupleData.createVoie({ nom: finalVoieNom, type: "peuple", peuple_id: initialData.id, famille_id: null, capacites: cleanedCapacites, ...campaignData });

        await Promise.all([
          peupleData.updatePeuple(initialData.id, {
            nom: nom.trim(), description: description.trim(), lore: lore.trim() || null,
            image_url: finalImageUrl, data: data, ...campaignData,
          }),
          voiePromise,
        ]);
      } else {
        // --- MODE CRÉATION ---
        const publicMode = campaignId && !isPrivate;
        const newPeuple = await peupleData.createPeuple({
            nom: nom.trim(),
            description: description.trim(),
            lore: lore.trim() || null,
            image_url: finalImageUrl,
            data: data,
            campaign_id: publicMode ? null : (campaignId || null),
            is_custom: !!(campaignId && isPrivate),
          });

        await peupleData.createVoie({
          nom: finalVoieNom,
          type: "peuple",
          peuple_id: newPeuple.id,
          famille_id: null,
          campaign_id: publicMode ? null : (campaignId || null),
          is_custom: !!(campaignId && isPrivate),
          capacites: cleanupRangsForSave(rangs),
        });
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      alert("Erreur lors de la sauvegarde : " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalLayout>
      {/* HEADER */}
      <div className="relative z-10 shrink-0 px-8 pt-5 pb-5 border-b border-white/8 bg-black/10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[12px] uppercase tracking-[0.2em] text-[#E3CCCD]/50 mb-1">
              {isEditing ? "Modifier le Peuple" : "Nouveau Peuple"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-white/30 hover:text-white/70 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>


        {/* STEPS */}
        <div className="flex items-center gap-0">
          {[
            { num: 1, label: "Identité" },
            { num: 2, label: "Physiologie" },
            { num: 3, label: "Voie Raciale" },
          ].map((s, i) => (
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
              {i < 2 && <div className={`w-12 h-px mx-3 transition-colors ${step > s.num ? "bg-white/30" : "bg-white/10"}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* CONTENU DU WIZARD */}
      <div className="relative z-10 flex-1 overflow-y-auto px-8 py-7 scrollbar-thin scrollbar-thumb-white/8">
        {/* ETAPE 1: LORE */}
        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Nom du Peuple *</label>
              <input
                type="text" value={nom} onChange={(e) => setNom(e.target.value)} autoFocus placeholder="ex: Demi-Orc"
                className="w-full bg-transparent border-b border-white/30 focus:border-[#E3CCCD]/80 py-2.5 text-white text-lg outline-none transition-colors placeholder:text-white/35"
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
                value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Histoire, mode de vie, relations avec les autres peuples..."
                className="w-full h-28 bg-white/5 border border-white/20 focus:border-white/35 rounded-xl p-4 text-white text-sm outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Histoire & Lore</label>
              <textarea
                value={lore} onChange={(e) => setLore(e.target.value)} placeholder="Mythes, légendes, culture, religion, histoire ancienne..."
                className="w-full h-32 bg-white/5 border border-white/20 focus:border-white/35 rounded-xl p-4 text-white text-sm outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35"
              />
            </div>
          </div>
        )}

        {/* ETAPE 2: ATTRIBUTS */}
        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Modificateurs de Caractéristiques</label>
              <input
                type="text" value={data.caracteristiques} onChange={(e) => handleDataChange('caracteristiques', e.target.value)} autoFocus placeholder="ex: +1 FOR ou CON et -1 CHA ou INT"
                className="w-full bg-transparent border-b border-white/30 focus:border-[#E3CCCD]/80 py-2.5 text-white text-sm outline-none transition-colors placeholder:text-white/35"
              />
              <p className="text-[11px] text-white/50 italic">Affiché à la création du personnage.</p>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              {([
                { field: 'age', label: 'Âge de départ', placeholder: 'ex: 15+' },
                { field: 'esperance', label: 'Espérance de vie', placeholder: 'ex: 60 ans' },
                { field: 'taille', label: 'Taille moyenne', placeholder: 'ex: 1.70m à 2m10' },
                { field: 'poids', label: 'Poids moyen', placeholder: 'ex: 70 à 150 kg' },
              ] as { field: keyof PeupleData; label: string; placeholder: string }[]).map(({ field, label, placeholder }) => (
                <div key={field} className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">{label}</label>
                  <input type="text" value={data[field]} onChange={(e) => handleDataChange(field, e.target.value)} placeholder={placeholder}
                    className="w-full bg-transparent border-b border-white/30 focus:border-[#E3CCCD]/80 py-2 text-white text-sm outline-none transition-colors placeholder:text-white/35" />
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Traits innés</label>
              <textarea value={data.traits} onChange={(e) => handleDataChange('traits', e.target.value)} placeholder="ex: Vision dans le noir à 20m, Résistance à la magie..."
                className="w-full h-24 bg-white/5 border border-white/20 focus:border-white/35 rounded-xl p-4 text-white text-sm outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35" />
            </div>
          </div>
        )}

        {/* ETAPE 3: VOIE DU PEUPLE */}
        {step === 3 && (
          <div className="space-y-5 animate-in slide-in-from-right-4 fade-in">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Nom de la Voie raciale</label>
              <input
                type="text" value={voieNom} onChange={(e) => setVoieNom(e.target.value)} autoFocus
                placeholder={`ex: Voie des ${nom || "Elfes"}`}
                className="w-full bg-transparent border-b border-white/30 focus:border-[#E3CCCD]/80 py-2.5 text-white text-sm outline-none transition-colors placeholder:text-white/35"
              />
            </div>

            <div className="space-y-1.5 pt-1">
              {[1, 2, 3, 4, 5].map((rangNum) => {
                const key = `rang${rangNum}` as keyof RangsState;
                return (
                  <RangEditorCard
                    key={key}
                    rangKey={key}
                    rangNum={rangNum}
                    rangData={rangs[key]}
                    isEditing={isEditing}
                    newItemKeys={newItemKeys}
                    openRangItems={openRangItems}
                    onToggleRangItem={toggleRangItem}
                    onUpdateRangTitle={(value) => handleRangChange(key, "titre", value)}
                    onUpdateRangItem={(section, idx, field, value) => handleRangItemChange(key, section, idx, field, value)}
                    onDuplicateRangItem={(section, idx) => duplicateRangItem(key, section, idx)}
                    onRemoveRangItem={(section, idx) => removeRangItem(key, section, idx)}
                    onAddRangItem={(section) => addRangItem(key, section)}
                  />
                );
              })}
            </div>
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
              <input
                id="peuple-private"
                type="checkbox"
                checked={isPrivate}
                onChange={e => setIsPrivate(e.target.checked)}
                className="accent-indigo-500 w-4 h-4 rounded"
              />
              <label htmlFor="peuple-private" className="text-xs text-white/70 select-none cursor-pointer">
                Privé à cette campagne
              </label>
            </div>
          )}
        </div>

        {step < 3 ? (
          <button onClick={() => { if (step === 1 && !nom) alert("Le nom du peuple est requis."); else setStep(step + 1); }}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#29206A]/60 hover:bg-[#29206A]/80 border border-[#E3CCCD]/25 hover:border-[#E3CCCD]/50 rounded-xl text-white text-[13px] transition-all active:scale-95">
            Suivant <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#E3CCCD]/10 hover:bg-[#E3CCCD]/20 border border-[#E3CCCD]/40 hover:border-[#E3CCCD]/70 rounded-xl text-[#E3CCCD] text-[13px] transition-all active:scale-95 disabled:opacity-40">
            <Save className="w-3.5 h-3.5" /> {isSubmitting ? "Sauvegarde..." : isEditing ? "Enregistrer les modifications" : "Enregistrer le Peuple"}
          </button>
        )}
      </div>
    </ModalLayout>
  );
}