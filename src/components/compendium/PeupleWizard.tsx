/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import {
  X,
  ArrowRight,
  ArrowLeft,
  Save,
  UserCircle,
  Activity,
  LayoutList,
  Image as ImageIcon,
  UploadCloud
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface PeupleWizardProps {
  onClose: () => void;
  onSuccess: () => void;
  campaignId?: string; // Si null, c'est pour le compendium global
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
}: PeupleWizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- ÉTAPE 1 : LORE ---
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // --- ÉTAPE 2 : STATS (JSONB sans Vitesse) ---
  const [data, setData] = useState<PeupleData>({
    caracteristiques: "",
    taille: "Moyenne",
    poids: "",
    age: "",
    esperance: "",
    traits: "",
  });

  // --- ÉTAPE 3 : VOIE DU PEUPLE ---
  const [voieNom, setVoieNom] = useState("");
  const [rangs, setRangs] = useState<RangsState>({
    rang1: { nom: "", type: "passif", description: "" },
    rang2: { nom: "", type: "passif", description: "" },
    rang3: { nom: "", type: "passif", description: "" },
    rang4: { nom: "", type: "passif", description: "" },
    rang5: { nom: "", type: "passif", description: "" },
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
      let finalImageUrl = null;

      // Upload de l'image sur Supabase Storage (si présente)
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

      // 1. CRÉATION DU PEUPLE
      const { data: newPeuple, error: peupleErr } = await supabase
        .from("peuples")
        .insert({
          nom: nom.trim(),
          description: description.trim(),
          image_url: finalImageUrl,
          data: data,
          campaign_id: campaignId || null,
          is_custom: !!campaignId,
        })
        .select()
        .single();

      if (peupleErr) throw peupleErr;

      // 2. CRÉATION SIMULTANÉE DE LA VOIE (Liée par le peuple_id)
      const finalVoieNom = voieNom.trim() || `Voie des ${nom.trim()}s`;
      const { error: voieErr } = await supabase.from("voies").insert({
        nom: finalVoieNom,
        type: "peuple",
        peuple_id: newPeuple.id, // C'est ici qu'on fait le lien fort !
        famille_id: null,
        campaign_id: campaignId || null,
        is_custom: !!campaignId,
        capacites: rangs,
      });

      if (voieErr) throw voieErr;

      onSuccess();
      onClose();
    } catch (error: any) {
      alert("Erreur lors de la sauvegarde : " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-500 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1E1941] border border-[#E3CCCD]/30 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* HEADER & PROGRESS BAR */}
        <div className="shrink-0 p-6 border-b border-[#E3CCCD]/20 bg-black/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-2xl text-white uppercase tracking-wider">
              Créer un Peuple {campaignId && <span className="text-[#E3CCCD] text-sm ml-2 border border-[#E3CCCD]/40 px-2 py-1 rounded-full">Custom</span>}
            </h2>
            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            {[
              { num: 1, icon: UserCircle, label: "Identité" },
              { num: 2, icon: Activity, label: "Physiologie" },
              { num: 3, icon: LayoutList, label: "Voie Raciale" },
            ].map((s) => (
              <div key={s.num} className={`flex items-center gap-2 ${step === s.num ? "text-[#E3CCCD]" : step > s.num ? "text-white/80" : "text-white/30"} transition-colors`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${step === s.num ? "border-[#E3CCCD] bg-[#E3CCCD]/10 shadow-[0_0_10px_rgba(227,204,205,0.3)]" : step > s.num ? "border-white/60 bg-white/10" : "border-white/20"}`}>
                  <s.icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium uppercase tracking-widest hidden sm:block">{s.label}</span>
                {s.num < 3 && <div className={`w-8 h-px ${step > s.num ? "bg-white/60" : "bg-white/20"} mx-2 hidden sm:block`} />}
              </div>
            ))}
          </div>
        </div>

        {/* CONTENU DU WIZARD */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-thin scrollbar-thumb-white/10">
          
          {/* ETAPE 1: LORE */}
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-widest text-[#E3CCCD] font-bold">
                  Nom du Peuple *
                </label>
                <input
                  type="text" value={nom} onChange={(e) => setNom(e.target.value)} autoFocus placeholder="ex: Demi-Orc"
                  className="w-full bg-black/40 border border-[#E3CCCD]/30 rounded-xl p-3.5 text-white text-lg outline-none focus:border-[#E3CCCD] transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-widest text-[#E3CCCD] font-bold flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> Illustration du Peuple
                </label>
                <div className="flex items-center gap-4">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Aperçu" className="w-16 h-16 rounded-xl object-cover border border-[#E3CCCD]/50 shadow-md" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-black/40 border border-[#E3CCCD]/30 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-white/30" />
                    </div>
                  )}
                  <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 bg-[#29206A]/40 border border-[#E3CCCD]/30 hover:border-[#E3CCCD]/60 rounded-xl text-white text-sm transition-colors shadow-sm">
                    <UploadCloud className="w-4 h-4" />
                    Parcourir...
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                  {imageFile && (
                    <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="text-[11px] text-white/50 hover:text-red-400 underline">
                      Retirer
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-widest text-[#E3CCCD] font-bold">
                  Description et Lore
                </label>
                <textarea
                  value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Histoire, mode de vie, relations avec les autres peuples..."
                  className="w-full h-40 bg-black/40 border border-[#E3CCCD]/30 rounded-xl p-4 text-white text-sm outline-none focus:border-[#E3CCCD] transition-colors resize-none leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* ETAPE 2: ATTRIBUTS (Sans Vitesse) */}
          {step === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 fade-in">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-widest text-[#E3CCCD] font-bold">
                  Modificateurs de Caractéristiques
                </label>
                <input
                  type="text" value={data.caracteristiques} onChange={(e) => handleDataChange('caracteristiques', e.target.value)} autoFocus placeholder="ex: +1 FOR ou CON et -1 CHA ou INT"
                  className="w-full bg-black/40 border border-[#E3CCCD]/30 rounded-xl p-3.5 text-white text-sm outline-none focus:border-[#E3CCCD]"
                />
                <p className="text-xs text-white/40 italic pl-1">Sera affiché à la création du personnage pour guider le joueur.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-widest text-[#E3CCCD] font-bold">Âge de départ</label>
                  <input type="text" value={data.age} onChange={(e) => handleDataChange('age', e.target.value)} placeholder="ex: 15+" className="w-full bg-black/40 border border-[#E3CCCD]/30 rounded-xl p-3 text-white text-sm outline-none focus:border-[#E3CCCD]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-widest text-[#E3CCCD] font-bold">Espérance de vie</label>
                  <input type="text" value={data.esperance} onChange={(e) => handleDataChange('esperance', e.target.value)} placeholder="ex: 60 ans" className="w-full bg-black/40 border border-[#E3CCCD]/30 rounded-xl p-3 text-white text-sm outline-none focus:border-[#E3CCCD]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-widest text-[#E3CCCD] font-bold">Taille moyenne</label>
                  <input type="text" value={data.taille} onChange={(e) => handleDataChange('taille', e.target.value)} placeholder="ex: 1.70m à 2m10" className="w-full bg-black/40 border border-[#E3CCCD]/30 rounded-xl p-3 text-white text-sm outline-none focus:border-[#E3CCCD]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-widest text-[#E3CCCD] font-bold">Poids moyen</label>
                  <input type="text" value={data.poids} onChange={(e) => handleDataChange('poids', e.target.value)} placeholder="ex: 70 à 150 kg" className="w-full bg-black/40 border border-[#E3CCCD]/30 rounded-xl p-3 text-white text-sm outline-none focus:border-[#E3CCCD]" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-widest text-[#E3CCCD] font-bold">Traits physiques et culturels (Innés)</label>
                <textarea value={data.traits} onChange={(e) => handleDataChange('traits', e.target.value)} placeholder="ex: Vision dans le noir à 20m, Résistance à la magie..." className="w-full h-24 bg-black/40 border border-[#E3CCCD]/30 rounded-xl p-3 text-white text-sm outline-none focus:border-[#E3CCCD] resize-none leading-relaxed" />
              </div>
            </div>
          )}

          {/* ETAPE 3: VOIE DU PEUPLE */}
          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
              <div className="space-y-2 bg-[#1E1941]/80 p-4 border border-[#E3CCCD]/30 rounded-xl sticky top-0 z-10 backdrop-blur-md">
                <label className="text-[11px] uppercase tracking-widest text-[#E3CCCD] font-bold">Nom de la Voie raciale</label>
                <input 
                  type="text" value={voieNom} onChange={(e) => setVoieNom(e.target.value)} autoFocus 
                  placeholder={`ex: Voie des ${nom || "Elfes"}`} 
                  className="w-full bg-black/40 border border-[#E3CCCD]/30 rounded-lg p-2.5 text-white text-sm outline-none focus:border-[#E3CCCD]" 
                />
              </div>

              <div className="space-y-4 pt-2">
                {[1, 2, 3, 4, 5].map((rangNum) => {
                  const key = `rang${rangNum}` as keyof RangsState;
                  const rangData = rangs[key];
                  return (
                    <div key={key} className="flex gap-4 items-start bg-black/20 p-4 rounded-xl border border-white/10 hover:border-[#E3CCCD]/40 transition-colors group">
                      <div className="w-10 h-10 rounded-full bg-[#29206A]/80 flex items-center justify-center text-white font-serif text-lg shrink-0 border border-[#E3CCCD]/30 group-hover:bg-[#E3CCCD]/20 group-hover:text-[#E3CCCD] transition-colors">{rangNum}</div>
                      <div className="flex-1 space-y-3">
                        <div className="flex gap-2">
                          <input 
                            type="text" value={rangData.nom} onChange={(e) => handleRangChange(key, "nom", e.target.value)} 
                            placeholder="Nom de la capacité" 
                            className="flex-1 bg-black/40 border border-[#E3CCCD]/20 rounded-lg p-2.5 text-white text-sm font-medium outline-none focus:border-[#E3CCCD]" 
                          />
                          <select 
                            value={rangData.type} onChange={(e) => handleRangChange(key, "type", e.target.value)} 
                            className="w-32 bg-black/40 border border-[#E3CCCD]/20 rounded-lg p-2.5 text-white/80 text-sm outline-none focus:border-[#E3CCCD]"
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
                          className="w-full h-20 bg-black/40 border border-[#E3CCCD]/20 rounded-lg p-2.5 text-white/80 text-sm outline-none focus:border-[#E3CCCD] resize-none leading-relaxed" 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER & CONTROLES */}
        <div className="shrink-0 p-5 border-t border-[#E3CCCD]/20 bg-black/40 flex justify-between items-center rounded-b-2xl">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="px-5 py-2.5 flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-medium">
              <ArrowLeft className="w-4 h-4" /> Précédent
            </button>
          ) : <div></div>}

          {step < 3 ? (
            <button onClick={() => { if (step === 1 && !nom) alert("Le nom du peuple est requis."); else setStep(step + 1); }} className="px-8 py-2.5 flex items-center gap-2 bg-[#29206A] hover:bg-[#29206A]/80 border border-[#E3CCCD]/40 rounded-xl text-white text-sm font-medium transition-all shadow-lg active:scale-95">
              Suivant <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={isSubmitting} className="px-8 py-2.5 flex items-center gap-2 bg-[#E3CCCD]/20 hover:bg-[#E3CCCD]/30 border border-[#E3CCCD] text-[#E3CCCD] rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(227,204,205,0.2)] active:scale-95 disabled:opacity-50">
              <Save className="w-4 h-4" /> {isSubmitting ? "Sauvegarde..." : "Enregistrer le Peuple"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}