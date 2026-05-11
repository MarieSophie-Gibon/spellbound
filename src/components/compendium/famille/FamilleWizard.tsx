/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { ModalLayout } from "@/components/ui/ModalLayout";
import {
  X,
  Save,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { FamilleWizardProps } from "@/types/compendium";

export function FamilleWizard({
  onClose,
  onSuccess,
  campaignId,
  initialData,
}: FamilleWizardProps) {
  const isEditing = !!initialData;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [nom, setNom] = useState(initialData?.nom ?? "");
  const [pvNiveau, setPvNiveau] = useState(initialData?.pv_niveau ?? 4);
  const [deRecuperation, setDeRecuperation] = useState(initialData?.de_recuperation ?? "1d6");
  const [bonusChance, setBonusChance] = useState(initialData?.bonus_chance ?? 0);

  const handleSubmit = async () => {
    if (!nom.trim()) return alert("Le nom de la famille est obligatoire.");
    setIsSubmitting(true);
    try {
      const payload = {
        nom: nom.trim(),
        pv_niveau: pvNiveau,
        de_recuperation: deRecuperation.trim(),
        bonus_chance: bonusChance,
        campaign_id: campaignId || null,
        is_custom: !!campaignId,
      };

      if (isEditing && initialData) {
        const { error } = await supabase
          .from("familles")
          .update(payload)
          .eq("id", initialData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("familles").insert(payload);
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

  return (
    <ModalLayout>
      {/* HEADER */}
      <div className="relative z-10 shrink-0 px-8 pt-5 pb-5 border-b border-white/8 bg-black/10">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50">
            {isEditing ? "Modifier la Famille" : "Nouvelle Famille"}
          </p>
          <button onClick={onClose} className="p-2 text-white/30 hover:text-white/70 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="relative z-10 flex-1 overflow-y-auto px-8 py-7 scrollbar-thin scrollbar-thumb-white/8">
        <div className="space-y-7 animate-in slide-in-from-right-4 fade-in">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Nom de la Famille *</label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              autoFocus
              placeholder="ex: Combattants, Aventuriers, Mages..."
              className="w-full bg-transparent border-b border-white/30 focus:border-[#E3CCCD]/80 py-2.5 text-white text-lg outline-none transition-colors placeholder:text-white/35"
            />
          </div>

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
      </div>

      {/* FOOTER */}
      <div className="relative z-10 shrink-0 px-8 py-5 border-t border-white/8 bg-black/10 flex justify-end items-center">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#E3CCCD]/10 hover:bg-[#E3CCCD]/20 border border-[#E3CCCD]/40 hover:border-[#E3CCCD]/70 rounded-xl text-[#E3CCCD] text-[13px] transition-all active:scale-95 disabled:opacity-40"
        >
          <Save className="w-3.5 h-3.5" />
          {isSubmitting ? "Sauvegarde..." : isEditing ? "Enregistrer" : "Créer la Famille"}
        </button>
      </div>
    </ModalLayout>
  );
}
