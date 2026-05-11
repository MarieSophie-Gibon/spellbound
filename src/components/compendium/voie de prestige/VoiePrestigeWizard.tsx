/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { ModalLayout } from "@/components/ui/ModalLayout";
import { ThemedSelect } from "@/components/ui/ThemedSelect";
import { X, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { VoieRangCapacite, VoiePrestigeWizardProps, RangsState } from "@/types/compendium";
import { EMPTY_RANGS, CATEGORIE_OPTIONS, TYPE_OPTIONS } from "@/types/compendium";



export function VoiePrestigeWizard({
  onClose,
  onSuccess,
  campaignId,
  initialData,
}: VoiePrestigeWizardProps) {
  const isEditing = !!initialData;
  const [nom, setNom] = useState(initialData?.nom ?? "");
  const [categorie, setCategorie] = useState<string | null>(initialData?.categorie ?? "Voies génériques");
  const [isPrivate, setIsPrivate] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rangs, setRangs] = useState<RangsState>(
    initialData?.capacites
      ? (initialData.capacites as RangsState)
      : structuredClone(EMPTY_RANGS),
  );

  const updateRang = (
    rangKey: keyof RangsState,
    field: keyof VoieRangCapacite,
    value: string,
  ) => {
    setRangs((prev) => ({
      ...prev,
      [rangKey]: { ...prev[rangKey], [field]: value },
    }));
  };

  const handleSubmit = async () => {
    if (!nom.trim()) return alert("Le nom de la voie est obligatoire.");
    setIsSubmitting(true);
    try {
      const publicMode = campaignId && !isPrivate;
      const payload = {
        nom: nom.trim(),
        type: "prestige",
        categorie: categorie || null,
        peuple_id: null,
        famille_id: null,
        campaign_id: publicMode ? null : campaignId || null,
        is_custom: !!(campaignId && isPrivate),
        capacites: rangs,
      };

      if (isEditing && initialData?.id) {
        const { error } = await supabase
          .from("voies")
          .update(payload)
          .eq("id", initialData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("voies").insert(payload);
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
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50">
            {isEditing ? "Modifier la Voie de Prestige" : "Nouvelle Voie de Prestige"}
          </p>
          <button
            onClick={onClose}
            className="p-2 text-white/30 hover:text-white/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {campaignId && (
          <div className="mb-2 flex items-center gap-2">
            <input
              id="voie-prestige-private"
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="accent-indigo-500 w-4 h-4 rounded"
            />
            <label
              htmlFor="voie-prestige-private"
              className="text-xs text-white/70 select-none cursor-pointer"
            >
              Privé à cette campagne
            </label>
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="relative z-10 flex-1 overflow-y-auto px-8 py-7 scrollbar-thin scrollbar-thumb-white/8">
        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
          {/* Nom */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
              Nom de la Voie *
            </label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              autoFocus
              placeholder="ex: Voie du Champion, Voie de l'Ombre..."
              className="w-full bg-transparent border-b border-white/30 focus:border-[#E3CCCD]/80 py-2.5 text-white text-lg outline-none transition-colors placeholder:text-white/35"
            />
          </div>

          {/* Catégorie */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
              Catégorie
            </label>
            <ThemedSelect
              value={categorie}
              onValueChange={setCategorie}
              options={CATEGORIE_OPTIONS}
              placeholder="-- Sélectionner une catégorie --"
            />
          </div>

          {/* Rangs */}
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.15em] text-white/60">
              Capacités (Rangs 1 à 5)
            </p>
            {([1, 2, 3, 4, 5] as const).map((rangNum) => {
              const key = `rang${rangNum}` as keyof RangsState;
              const rangData = rangs[key];
              return (
                <div
                  key={key}
                  className="flex gap-4 items-start py-3 border-b border-white/6 last:border-0"
                >
                  <span className="w-5 h-5 mt-2.5 rounded-full border border-white/30 flex items-center justify-center text-[11px] text-white/60 font-medium shrink-0">
                    {rangNum}
                  </span>
                  <div className="flex-1 space-y-2.5">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={rangData.nom}
                        onChange={(e) => updateRang(key, "nom", e.target.value)}
                        placeholder="Nom de la capacité"
                        className="flex-1 bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35"
                      />
                      <div className="w-40">
                        <ThemedSelect
                          value={rangData.type}
                          onValueChange={(v) => updateRang(key, "type", v || "passif")}
                          options={TYPE_OPTIONS}
                          placeholder="Type"
                        />
                      </div>
                    </div>
                    <textarea
                      value={rangData.description}
                      onChange={(e) => updateRang(key, "description", e.target.value)}
                      placeholder="Description et effet mécanique..."
                      className="w-full h-16 bg-transparent border-b border-white/20 focus:border-white/35 py-1.5 text-white/85 text-[13px] outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="relative z-10 shrink-0 px-8 py-5 border-t border-white/8 bg-black/10 flex justify-between items-center">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-white/55 hover:text-white transition-colors text-[13px]"
        >
          Annuler
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#E3CCCD]/10 hover:bg-[#E3CCCD]/20 border border-[#E3CCCD]/40 hover:border-[#E3CCCD]/70 rounded-xl text-[#E3CCCD] text-[13px] transition-all active:scale-95 disabled:opacity-40"
        >
          <Save className="w-3.5 h-3.5" />
          {isSubmitting
            ? "Sauvegarde..."
            : isEditing
              ? "Enregistrer les modifications"
              : "Créer la Voie"}
        </button>
      </div>
    </ModalLayout>
  );
}
