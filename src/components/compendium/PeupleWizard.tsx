/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ArrowRight,
  ArrowLeft,
  Save,
  Image as ImageIcon,
  UploadCloud
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface InitialPeupleData {
  id: string;
  nom: string;
  description: string;
  image_url?: string;
  data: PeupleData;
  voie?: {
    id: string;
    nom: string;
    capacites: Record<string, { nom: string; type: string; description: string }>;
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

interface VoieRang {
  nom: string;
  type: string;
  description: string;
}

// Typage strict pour éviter les pertes de référence dans l'état React
type RangsState = {
  rang1: VoieRang;
  rang2: VoieRang;
  rang3: VoieRang;
  rang4: VoieRang;
  rang5: VoieRang;
};

export function PeupleWizard({
  onClose,
  onSuccess,
  campaignId,
  initialData,
}: PeupleWizardProps) {
  const isEditing = !!initialData;
  const [isPrivate, setIsPrivate] = useState(true);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- ÉTAPE 1 : LORE ---
  const [nom, setNom] = useState(initialData?.nom ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
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
  const [rangs, setRangs] = useState<RangsState>({
    rang1: (initialData?.voie?.capacites?.rang1 as VoieRang) ?? { nom: "", type: "passif", description: "" },
    rang2: (initialData?.voie?.capacites?.rang2 as VoieRang) ?? { nom: "", type: "passif", description: "" },
    rang3: (initialData?.voie?.capacites?.rang3 as VoieRang) ?? { nom: "", type: "passif", description: "" },
    rang4: (initialData?.voie?.capacites?.rang4 as VoieRang) ?? { nom: "", type: "passif", description: "" },
    rang5: (initialData?.voie?.capacites?.rang5 as VoieRang) ?? { nom: "", type: "passif", description: "" },
  });

  // --- LOGIQUE ---
  const handleDataChange = (field: keyof PeupleData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRangChange = (rangKey: keyof RangsState, field: keyof VoieRang, value: string) => {
    setRangs((prev) => ({
      ...prev,
      [rangKey]: {
        ...prev[rangKey],
        [field]: value
      }
    }));
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
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `peuples/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('compendium')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('compendium')
          .getPublicUrl(fileName);

        finalImageUrl = publicUrlData.publicUrl;
      }

      const finalVoieNom = voieNom.trim() || `Voie des ${nom.trim()}s`;

      if (isEditing && initialData) {
        // --- MODE ÉDITION ---
        const { error: peupleErr } = await supabase
          .from("peuples")
          .update({
            nom: nom.trim(),
            description: description.trim(),
            image_url: finalImageUrl,
            data: data,
          })
          .eq("id", initialData.id);

        if (peupleErr) throw peupleErr;

        if (initialData.voie) {
          const { error: voieErr } = await supabase
            .from("voies")
            .update({ nom: finalVoieNom, capacites: rangs })
            .eq("id", initialData.voie.id);
          if (voieErr) throw voieErr;
        } else {
          const { error: voieErr } = await supabase.from("voies").insert({
            nom: finalVoieNom,
            type: "peuple",
            peuple_id: initialData.id,
            famille_id: null,
            campaign_id: campaignId || null,
            is_custom: !!campaignId,
            capacites: rangs,
          });
          if (voieErr) throw voieErr;
        }
      } else {
        // --- MODE CRÉATION ---
        const publicMode = campaignId && !isPrivate;
        const { data: newPeuple, error: peupleErr } = await supabase
          .from("peuples")
          .insert({
            nom: nom.trim(),
            description: description.trim(),
            image_url: finalImageUrl,
            data: data,
            campaign_id: publicMode ? null : (campaignId || null),
            is_custom: !!(campaignId && isPrivate),
          })
          .select()
          .single();

        if (peupleErr) throw peupleErr;

        const { error: voieErr } = await supabase.from("voies").insert({
          nom: finalVoieNom,
          type: "peuple",
          peuple_id: newPeuple.id,
          famille_id: null,
          campaign_id: publicMode ? null : (campaignId || null),
          is_custom: !!(campaignId && isPrivate),
          capacites: rangs,
        });

        if (voieErr) throw voieErr;
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      alert("Erreur lors de la sauvegarde : " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-9999 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col h-[85vh] animate-in zoom-in-95 duration-200 border border-white/10 overflow-hidden"
        style={{ background: "linear-gradient(160deg, rgba(80,95,200,0.38) 0%, rgba(55,48,130,0.42) 50%, rgba(70,80,175,0.38) 100%)" }}>
        {/* Backdrop blur layer */}
        <div className="absolute inset-0 backdrop-blur-3xl -z-10" />
        {/* Subtle noise/grain overlay */}
        <div className="absolute inset-0 bg-white/3 -z-10" />
        {/* Inner stroke */}
        <div className="absolute inset-px rounded-2xl border border-white/10 pointer-events-none z-0" />
        
        {/* HEADER */}
        <div className="relative z-10 shrink-0 px-8 pt-7 pb-6 border-b border-white/8 bg-black/10">
          <div className="flex items-center justify-between mb-7">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50 mb-1">
                {campaignId ? "Compendium Custom" : "Compendium Global"}
              </p>
              <h2 className="font-serif text-2xl text-white tracking-wide">
                {isEditing ? "Modifier le Peuple" : "Nouveau Peuple"}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 text-white/30 hover:text-white/70 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* PRIVÉ/PUBLIC (création ou édition campagne uniquement) */}
          {campaignId && (!isEditing || (isEditing && initialData?.campaign_id === campaignId)) && (
            <div className="mb-4 flex items-center gap-2">
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
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Description et Lore</label>
                <textarea
                  value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Histoire, mode de vie, relations avec les autres peuples..."
                  className="w-full h-44 bg-white/5 border border-white/20 focus:border-white/35 rounded-xl p-4 text-white text-sm outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35"
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

              <div className="space-y-2 pt-1">
                {[1, 2, 3, 4, 5].map((rangNum) => {
                  const key = `rang${rangNum}` as keyof RangsState;
                  const rangData = rangs[key];
                  return (
                    <div key={key} className="flex gap-4 items-start py-4 border-b border-white/6 last:border-0">
                      <span className="w-5 h-5 mt-2.5 rounded-full border border-white/30 flex items-center justify-center text-[11px] text-white/60 font-medium shrink-0">{rangNum}</span>
                      <div className="flex-1 space-y-2.5">
                        <div className="flex gap-3">
                          <input
                            type="text" value={rangData.nom} onChange={(e) => handleRangChange(key, "nom", e.target.value)}
                            placeholder="Nom de la capacité"
                            className="flex-1 bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35"
                          />
                          <select
                            value={rangData.type} onChange={(e) => handleRangChange(key, "type", e.target.value)}
                            className="bg-white/8 border border-white/20 rounded-lg px-2.5 py-1.5 text-white/80 text-[12px] outline-none focus:border-white/40"
                          >
                            <option value="passif">Passif</option>
                            <option value="action">Action (L)</option>
                            <option value="action_limitee">Action Lim. (LL)</option>
                            <option value="sort">Sort</option>
                          </select>
                        </div>
                        <textarea
                          value={rangData.description} onChange={(e) => handleRangChange(key, "description", e.target.value)}
                          placeholder="Description et effet mécanique..."
                          className="w-full h-16 bg-transparent border-b border-white/20 focus:border-white/35 py-1.5 text-white/85 text-[13px] outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
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
      </div>
    </div>,
    document.body
  );
}