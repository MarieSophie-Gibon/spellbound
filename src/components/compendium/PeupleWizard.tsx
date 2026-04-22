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
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface PeupleWizardProps {
  onClose: () => void;
  onSuccess: () => void;
  campaignId?: string; // Si null, c'est pour le compendium global
}

// Typage des stats COF2 pour le champ JSONB
interface PeupleData {
  mods: {
    FOR: number;
    DEX: number;
    CON: number;
    INT: number;
    SAG: number;
    CHA: number;
  };
  taille: string;
  vitesse: string;
  traits: string;
}

interface VoieRang {
  nom: string;
  type: string; // Passif, Action, Sort, etc.
  description: string;
}

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

  // --- ÉTAPE 2 : STATS (JSONB) ---
  const [data, setData] = useState<PeupleData>({
    mods: { FOR: 0, DEX: 0, CON: 0, INT: 0, SAG: 0, CHA: 0 },
    taille: "Moyenne",
    vitesse: "20m",
    traits: "",
  });

  // --- ÉTAPE 3 : VOIE DU PEUPLE ---
  const [voieNom, setVoieNom] = useState("");
  const [rangs, setRangs] = useState<Record<string, VoieRang>>({
    rang1: { nom: "", type: "passif", description: "" },
    rang2: { nom: "", type: "passif", description: "" },
    rang3: { nom: "", type: "passif", description: "" },
    rang4: { nom: "", type: "passif", description: "" },
    rang5: { nom: "", type: "passif", description: "" },
  });

  // --- LOGIQUE ---
  const handleModChange = (carac: keyof PeupleData["mods"], value: string) => {
    const num = parseInt(value) || 0;
    setData((prev) => ({ ...prev, mods: { ...prev.mods, [carac]: num } }));
  };

  const handleRangChange = (
    rang: string,
    field: keyof VoieRang,
    value: string,
  ) => {
    setRangs((prev) => ({
      ...prev,
      [rang]: { ...prev[rang], [field]: value },
    }));
  };

  const handleSubmit = async () => {
    if (!nom.trim()) return alert("Le nom du peuple est obligatoire.");
    setIsSubmitting(true);

    try {
      // 1. Création du Peuple
      const { data: newPeuple, error: peupleErr } = await supabase
        .from("peuples")
        .insert({
          nom: nom.trim(),
          description: description.trim(),
          data: data,
          campaign_id: campaignId || null,
          is_custom: !!campaignId, // Si rattaché à une campagne, c'est du custom
        })
        .select()
        .single();

      if (peupleErr) throw peupleErr;

      // 2. Création de la Voie associée (si on a mis un nom de voie ou rempli au moins le rang 1)
      if (voieNom.trim() || rangs.rang1.nom.trim()) {
        const finalVoieNom = voieNom.trim() || `Voie des ${nom.trim()}`;
        const { error: voieErr } = await supabase.from("voies").insert({
          nom: finalVoieNom,
          type: "peuple",
          peuple_id: newPeuple.id,
          famille_id: null,
          campaign_id: campaignId || null,
          is_custom: !!campaignId,
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

  return (
    <div className="fixed inset-0 z-500 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1E1941] border border-[#E3CCCD]/30 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* HEADER & PROGRESS BAR */}
        <div className="shrink-0 p-6 border-b border-[#E3CCCD]/20 bg-black/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-2xl text-white uppercase tracking-wider">
              Créer un Peuple
            </h2>
            <button
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            {[
              { num: 1, icon: UserCircle, label: "Lore" },
              { num: 2, icon: Activity, label: "Attributs" },
              { num: 3, icon: LayoutList, label: "Voie" },
            ].map((s) => (
              <div
                key={s.num}
                className={`flex items-center gap-2 ${step === s.num ? "text-[#E3CCCD]" : step > s.num ? "text-white/60" : "text-white/20"} transition-colors`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === s.num ? "border-[#E3CCCD] bg-[#E3CCCD]/10" : step > s.num ? "border-white/60" : "border-white/20"}`}
                >
                  <s.icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium uppercase tracking-widest hidden sm:block">
                  {s.label}
                </span>
                {s.num < 3 && (
                  <div
                    className={`w-8 h-px ${step > s.num ? "bg-white/60" : "bg-white/20"} mx-2 hidden sm:block`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CONTENU DU WIZARD */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10">
          {/* ETAPE 1: LORE */}
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-white/50 font-bold">
                  Nom du Peuple *
                </label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  autoFocus
                  placeholder="ex: Elfe Sylvain"
                  className="w-full bg-black/40 border border-[#E3CCCD]/30 rounded-xl p-3 text-white text-lg outline-none focus:border-[#E3CCCD] transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-white/50 font-bold">
                  Description et Lore
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Histoire, apparence, comportement..."
                  className="w-full h-40 bg-black/40 border border-[#E3CCCD]/30 rounded-xl p-3 text-white text-sm outline-none focus:border-[#E3CCCD] transition-colors resize-none leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* ETAPE 2: ATTRIBUTS */}
          {step === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 fade-in">
              <div className="space-y-3">
                <label className="text-xs uppercase tracking-widest text-[#E3CCCD] font-bold">
                  Modificateurs de Caractéristiques
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {Object.entries(data.mods).map(([carac, val]) => (
                    <div
                      key={carac}
                      className="bg-black/40 border border-white/10 rounded-xl p-3 flex flex-col items-center gap-2"
                    >
                      <span className="text-xs font-bold text-white/70">
                        {carac}
                      </span>
                      <input
                        type="number"
                        value={val || ""}
                        onChange={(e) =>
                          handleModChange(
                            carac as keyof PeupleData["mods"],
                            e.target.value,
                          )
                        }
                        className="w-full bg-transparent text-center text-lg text-white font-serif outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-white/50 font-bold">
                    Taille
                  </label>
                  <select
                    value={data.taille}
                    onChange={(e) =>
                      setData({ ...data, taille: e.target.value })
                    }
                    className="w-full bg-black/40 border border-[#E3CCCD]/30 rounded-xl p-3 text-white text-sm outline-none focus:border-[#E3CCCD] appearance-none"
                  >
                    <option value="Petite">Petite</option>
                    <option value="Moyenne">Moyenne</option>
                    <option value="Grande">Grande</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-white/50 font-bold">
                    Vitesse de base
                  </label>
                  <input
                    type="text"
                    value={data.vitesse}
                    onChange={(e) =>
                      setData({ ...data, vitesse: e.target.value })
                    }
                    placeholder="ex: 20m"
                    className="w-full bg-black/40 border border-[#E3CCCD]/30 rounded-xl p-3 text-white text-sm outline-none focus:border-[#E3CCCD]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-white/50 font-bold">
                  Traits supplémentaires (Innés)
                </label>
                <textarea
                  value={data.traits}
                  onChange={(e) => setData({ ...data, traits: e.target.value })}
                  placeholder="ex: Vision dans le noir à 20m, Résistance à la magie..."
                  className="w-full h-24 bg-black/40 border border-[#E3CCCD]/30 rounded-xl p-3 text-white text-sm outline-none focus:border-[#E3CCCD] resize-none"
                />
              </div>
            </div>
          )}

          {/* ETAPE 3: VOIE DU PEUPLE */}
          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-[#E3CCCD] font-bold">
                  Nom de la Voie raciale
                </label>
                <input
                  type="text"
                  value={voieNom}
                  onChange={(e) => setVoieNom(e.target.value)}
                  placeholder={`ex: Voie des ${nom || "Elfes"}`}
                  className="w-full bg-black/40 border border-[#E3CCCD]/30 rounded-xl p-3 text-white text-sm outline-none focus:border-[#E3CCCD]"
                />
              </div>

              <div className="space-y-4 border-t border-white/10 pt-4">
                {[1, 2, 3, 4, 5].map((rangNum) => {
                  const key = `rang${rangNum}`;
                  const rangData = rangs[key];
                  return (
                    <div
                      key={key}
                      className="flex gap-3 items-start bg-black/20 p-3 rounded-xl border border-white/5"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#29206A]/60 flex items-center justify-center text-white font-bold shrink-0 border border-[#E3CCCD]/20">
                        {rangNum}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={rangData.nom}
                            onChange={(e) =>
                              handleRangChange(key, "nom", e.target.value)
                            }
                            placeholder="Nom de la capacité"
                            className="flex-1 bg-black/40 border border-[#E3CCCD]/20 rounded-lg p-2 text-white text-sm outline-none focus:border-[#E3CCCD]"
                          />
                          <select
                            value={rangData.type}
                            onChange={(e) =>
                              handleRangChange(key, "type", e.target.value)
                            }
                            className="w-32 bg-black/40 border border-[#E3CCCD]/20 rounded-lg p-2 text-white/80 text-sm outline-none focus:border-[#E3CCCD]"
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
                            handleRangChange(key, "description", e.target.value)
                          }
                          placeholder="Effet mécanique..."
                          className="w-full h-16 bg-black/40 border border-[#E3CCCD]/20 rounded-lg p-2 text-white text-xs outline-none focus:border-[#E3CCCD] resize-none"
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
        <div className="shrink-0 p-4 border-t border-[#E3CCCD]/20 bg-black/20 flex justify-between items-center">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-5 py-2.5 flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Précédent
            </button>
          ) : (
            <div></div>
          )}

          {step < 3 ? (
            <button
              onClick={() => {
                if (step === 1 && !nom) alert("Nom requis");
                else setStep(step + 1);
              }}
              className="px-6 py-2.5 flex items-center gap-2 bg-[#29206A] hover:bg-[#29206A]/80 border border-[#E3CCCD]/40 rounded-xl text-white font-medium transition-all shadow-lg"
            >
              Suivant <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2.5 flex items-center gap-2 bg-[#E3CCCD]/20 hover:bg-[#E3CCCD]/30 border border-[#E3CCCD] text-[#E3CCCD] rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(227,204,205,0.2)] disabled:opacity-50"
            >
              <Save className="w-4 h-4" />{" "}
              {isSubmitting ? "Sauvegarde..." : "Enregistrer le Peuple"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
