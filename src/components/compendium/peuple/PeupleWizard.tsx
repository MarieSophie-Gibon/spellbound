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
  ChevronDown,
  Trash2,
  Copy,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ThemedSelect } from "@/components/ui/ThemedSelect";
import { EMPTY_RANGS, RANG_ACTION_TYPES, RANG_BONUS_TYPES, type RangsState, type VoieRang } from "@/types/compendium";
import { cleanupRangsForSave, normalizeRangsState } from "@/lib/voieRanks";

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
    setRangs((prev) => ({
      ...prev,
      [rangKey]: {
        ...prev[rangKey],
        [field]: value
      }
    }));
  };

  const handleRangItemChange = (
    rangKey: keyof RangsState,
    section: "bonus" | "capacites" | "actions",
    itemIdx: number,
    field: string,
    value: string | boolean,
  ) => {
    setRangs((prev) => {
      const current = prev[rangKey];
      const items = Array.isArray(current[section]) ? [...(current[section] as unknown as Array<Record<string, string | boolean>>)] : [];
      const item = { ...(items[itemIdx] || {}) };
      item[field] = value;
      items[itemIdx] = item;
      return {
        ...prev,
        [rangKey]: {
          ...current,
          [section]: items,
        },
      };
    });
  };

  const addRangItem = (
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

    setRangs((prev) => {
      const current = prev[rangKey];
      const items = Array.isArray(current[section]) ? [...(current[section] as unknown as Array<Record<string, string | boolean>>)] : [];
      items.push({ ...emptyBySection[section] });
      return {
        ...prev,
        [rangKey]: {
          ...current,
          [section]: items,
        },
      };
    });
  };

  const removeRangItem = (
    rangKey: keyof RangsState,
    section: "bonus" | "capacites" | "actions",
    itemIdx: number,
  ) => {
    setRangs((prev) => {
      const current = prev[rangKey];
      const items = Array.isArray(current[section]) ? [...(current[section] as unknown as Array<Record<string, string | boolean>>)] : [];
      items.splice(itemIdx, 1);
      return {
        ...prev,
        [rangKey]: {
          ...current,
          [section]: items,
        },
      };
    });
  };

  const [openRangItems, setOpenRangItems] = useState<Set<string>>(new Set());
  const toggleRangItem = (ikey: string) =>
    setOpenRangItems((prev) => {
      const n = new Set(prev);
      n.has(ikey) ? n.delete(ikey) : n.add(ikey);
      return n;
    });

  const duplicateRangItem = (
    rangKey: keyof RangsState,
    section: "bonus" | "capacites" | "actions",
    itemIdx: number,
  ) => {
    setRangs((prev) => {
      const current = prev[rangKey];
      const items = Array.isArray(current[section])
        ? [...(current[section] as unknown as Array<Record<string, string | boolean>>)]
        : [];
      items.splice(itemIdx + 1, 0, { ...items[itemIdx] });
      return { ...prev, [rangKey]: { ...current, [section]: items } };
    });
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
        const publicMode = campaignId && !isPrivate;
        const { error: peupleErr } = await supabase
          .from("peuples")
          .update({
            nom: nom.trim(),
            description: description.trim(),
            lore: lore.trim() || null,
            image_url: finalImageUrl,
            data: data,
            campaign_id: publicMode ? null : (campaignId || null),
            is_custom: !!(campaignId && isPrivate),
          })
          .eq("id", initialData.id);

        if (peupleErr) throw peupleErr;

        if (initialData.voie) {
          const { error: voieErr } = await supabase
            .from("voies")
            .update({
              nom: finalVoieNom,
              capacites: cleanupRangsForSave(rangs),
              campaign_id: publicMode ? null : (campaignId || null),
              is_custom: !!(campaignId && isPrivate),
            })
            .eq("id", initialData.voie.id);
          if (voieErr) throw voieErr;
        } else {
          const { error: voieErr } = await supabase.from("voies").insert({
            nom: finalVoieNom,
            type: "peuple",
            peuple_id: initialData.id,
            famille_id: null,
            campaign_id: publicMode ? null : (campaignId || null),
            is_custom: !!(campaignId && isPrivate),
            capacites: cleanupRangsForSave(rangs),
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
            lore: lore.trim() || null,
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
          capacites: cleanupRangsForSave(rangs),
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
                const rangData = rangs[key];
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
                        onChange={(e) => handleRangChange(key, "titre", e.target.value)}
                        placeholder={`Rang ${rangNum}`}
                        className="flex-1 bg-transparent outline-none text-white text-sm placeholder:text-white/25 border-b border-transparent focus:border-white/20 py-0.5 transition-colors"
                      />
                    </div>
                    {/* Items */}
                    {(bonuses.length > 0 || capacites.length > 0 || actions.length > 0) && (
                      <div className="px-3 pt-1 pb-0.5 space-y-1">
                        {bonuses.map((bonus, idx) => {
                          const ikey = `${key}-bonus-${idx}`;
                          const isOpen = openRangItems.has(ikey);
                          return (
                            <div key={ikey} className="rounded border border-white/8 overflow-hidden">
                              <div className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-white/3 transition-colors" onClick={() => toggleRangItem(ikey)}>
                                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-900/25 text-amber-300/60 shrink-0">bonus</span>
                                <span className="flex-1 text-[12px] text-white/75 truncate">{bonus.titre || <span className="text-white/25 italic">sans titre</span>}</span>
                                <button type="button" title="Dupliquer" onClick={(e) => { e.stopPropagation(); duplicateRangItem(key, "bonus", idx); }} className="p-1 text-white/20 hover:text-white/60 transition-colors"><Copy className="w-3 h-3" /></button>
                                <button type="button" title="Supprimer" onClick={(e) => { e.stopPropagation(); removeRangItem(key, "bonus", idx); }} className="p-1 text-white/20 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                                <ChevronDown className={`w-3 h-3 text-white/25 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                              </div>
                              {isOpen && (
                                <div className="px-2.5 pb-2.5 pt-2 space-y-2 border-t border-white/6 bg-black/10">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                    <input type="text" value={bonus.titre || ""} onChange={(e) => handleRangItemChange(key, "bonus", idx, "titre", e.target.value)} placeholder="Titre du bonus" className="bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35" />
                                    <ThemedSelect value={bonus.type || ""} onValueChange={(value) => handleRangItemChange(key, "bonus", idx, "type", value || "")} options={[...RANG_BONUS_TYPES]} placeholder="Type de bonus" />
                                    <input type="text" value={bonus.valeur || ""} onChange={(e) => handleRangItemChange(key, "bonus", idx, "valeur", e.target.value)} placeholder="Valeur (ex: +1)" className="bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35" />
                                  </div>
                                  <textarea value={bonus.condition || ""} onChange={(e) => handleRangItemChange(key, "bonus", idx, "condition", e.target.value)} placeholder="Description / condition (optionnel)" className="w-full h-14 bg-transparent border-b border-white/20 focus:border-white/35 py-1.5 text-white/85 text-[13px] outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {capacites.map((capacite, idx) => {
                          const ikey = `${key}-capacites-${idx}`;
                          const isOpen = openRangItems.has(ikey);
                          return (
                            <div key={ikey} className="rounded border border-white/8 overflow-hidden">
                              <div className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-white/3 transition-colors" onClick={() => toggleRangItem(ikey)}>
                                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-900/25 text-blue-300/60 shrink-0">cap.</span>
                                <span className="flex-1 text-[12px] text-white/75 truncate">{capacite.titre || <span className="text-white/25 italic">sans titre</span>}</span>
                                <button type="button" title="Dupliquer" onClick={(e) => { e.stopPropagation(); duplicateRangItem(key, "capacites", idx); }} className="p-1 text-white/20 hover:text-white/60 transition-colors"><Copy className="w-3 h-3" /></button>
                                <button type="button" title="Supprimer" onClick={(e) => { e.stopPropagation(); removeRangItem(key, "capacites", idx); }} className="p-1 text-white/20 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                                <ChevronDown className={`w-3 h-3 text-white/25 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                              </div>
                              {isOpen && (
                                <div className="px-2.5 pb-2.5 pt-2 space-y-2 border-t border-white/6 bg-black/10">
                                  <input type="text" value={capacite.titre || ""} onChange={(e) => handleRangItemChange(key, "capacites", idx, "titre", e.target.value)} placeholder="Titre de la capacité" className="w-full bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35" />
                                  <textarea value={capacite.description || ""} onChange={(e) => handleRangItemChange(key, "capacites", idx, "description", e.target.value)} placeholder="Description de la capacité" className="w-full h-14 bg-transparent border-b border-white/20 focus:border-white/35 py-1.5 text-white/85 text-[13px] outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {actions.map((action, idx) => {
                          const ikey = `${key}-actions-${idx}`;
                          const isOpen = openRangItems.has(ikey);
                          return (
                            <div key={ikey} className="rounded border border-white/8 overflow-hidden">
                              <div className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-white/3 transition-colors" onClick={() => toggleRangItem(ikey)}>
                                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-900/25 text-emerald-300/60 shrink-0">action</span>
                                <span className="flex-1 text-[12px] text-white/75 truncate">{action.titre || <span className="text-white/25 italic">sans titre</span>}</span>
                                <button type="button" title="Dupliquer" onClick={(e) => { e.stopPropagation(); duplicateRangItem(key, "actions", idx); }} className="p-1 text-white/20 hover:text-white/60 transition-colors"><Copy className="w-3 h-3" /></button>
                                <button type="button" title="Supprimer" onClick={(e) => { e.stopPropagation(); removeRangItem(key, "actions", idx); }} className="p-1 text-white/20 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                                <ChevronDown className={`w-3 h-3 text-white/25 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                              </div>
                              {isOpen && (
                                <div className="px-2.5 pb-2.5 pt-2 space-y-2 border-t border-white/6 bg-black/10">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                    <input type="text" value={action.titre || ""} onChange={(e) => handleRangItemChange(key, "actions", idx, "titre", e.target.value)} placeholder="Titre de l'action" className="bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35" />
                                    <ThemedSelect value={action.type || ""} onValueChange={(value) => handleRangItemChange(key, "actions", idx, "type", value || "")} options={[...RANG_ACTION_TYPES]} placeholder="Type (A/M/L/G)" />
                                    <input type="text" value={action.dm || ""} onChange={(e) => handleRangItemChange(key, "actions", idx, "dm", e.target.value)} placeholder="DM" className="bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35" />
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                    <label className="flex items-center gap-2 text-[12px] text-white/75">
                                      <input type="checkbox" checked={!!action.sort} onChange={(e) => handleRangItemChange(key, "actions", idx, "sort", e.target.checked)} className="accent-indigo-500 w-4 h-4 rounded" />
                                      Sort
                                    </label>
                                    <input type="text" value={action.cout_mana || ""} onChange={(e) => handleRangItemChange(key, "actions", idx, "cout_mana", e.target.value)} placeholder="Coût en PM" disabled={!action.sort} className="bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35 disabled:opacity-40" />
                                  </div>
                                  <label className="flex items-center gap-2 text-[12px] text-white/75">
                                    <input type="checkbox" checked={!!action.test_oppose} onChange={(e) => handleRangItemChange(key, "actions", idx, "test_oppose", e.target.checked)} className="accent-indigo-500 w-4 h-4 rounded" />
                                    Test opposé
                                  </label>
                                  {action.test_oppose && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                      <input type="text" value={action.test_type || ""} onChange={(e) => handleRangItemChange(key, "actions", idx, "test_type", e.target.value)} placeholder="Type de test" className="bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35" />
                                      <input type="text" value={action.resultat_si_reussi || ""} onChange={(e) => handleRangItemChange(key, "actions", idx, "resultat_si_reussi", e.target.value)} placeholder="Résultat si réussi" className="bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35" />
                                    </div>
                                  )}
                                  <textarea value={action.description || ""} onChange={(e) => handleRangItemChange(key, "actions", idx, "description", e.target.value)} placeholder="Description de l'action" className="w-full h-14 bg-transparent border-b border-white/20 focus:border-white/35 py-1.5 text-white/85 text-[13px] outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Add buttons + legacy */}
                    <div className="px-3 pb-2.5 pt-1.5 flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => addRangItem(key, "bonus")} className="text-[11px] px-2 py-0.5 rounded border border-white/15 text-white/40 hover:text-amber-300/70 hover:border-amber-900/40 transition-colors">+ Bonus</button>
                      <button type="button" onClick={() => addRangItem(key, "capacites")} className="text-[11px] px-2 py-0.5 rounded border border-white/15 text-white/40 hover:text-blue-300/70 hover:border-blue-900/40 transition-colors">+ Capacité</button>
                      <button type="button" onClick={() => addRangItem(key, "actions")} className="text-[11px] px-2 py-0.5 rounded border border-white/15 text-white/40 hover:text-emerald-300/70 hover:border-emerald-900/40 transition-colors">+ Action</button>
                      <details className="ml-auto">
                        <summary className="cursor-pointer text-[10px] text-white/25 hover:text-white/45 transition-colors">legacy</summary>
                        <div className="mt-1 grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
                          <input type="text" value={rangData.nom || ""} onChange={(e) => handleRangChange(key, "nom", e.target.value)} placeholder="Nom legacy" className="bg-transparent border-b border-white/15 py-1 text-white/50 text-xs outline-none placeholder:text-white/25" />
                          <input type="text" value={rangData.type || ""} onChange={(e) => handleRangChange(key, "type", e.target.value)} placeholder="Type legacy" className="bg-transparent border-b border-white/15 py-1 text-white/50 text-xs outline-none placeholder:text-white/25" />
                          <input type="text" value={rangData.description || ""} onChange={(e) => handleRangChange(key, "description", e.target.value)} placeholder="Description legacy" className="bg-transparent border-b border-white/15 py-1 text-white/50 text-xs outline-none placeholder:text-white/25" />
                        </div>
                      </details>
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