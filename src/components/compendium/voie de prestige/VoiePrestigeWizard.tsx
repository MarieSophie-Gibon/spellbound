/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { ModalLayout } from "@/components/ui/ModalLayout";
import { ThemedSelect } from "@/components/ui/ThemedSelect";
import { X, ArrowRight, ArrowLeft, Save } from "lucide-react";
import { RangEditorCard } from "@/components/compendium/shared/RangEditorCard";
import type { VoiePrestigeWizardProps, RangsState, VoieRang } from "@/types/compendium";
import { EMPTY_RANGS } from "@/types/compendium";
import { cleanupRangsForSave, normalizeRangsState } from "@/lib/voieRanks";
import { useVoiePrestigeData } from "@/hooks/useVoiePrestigeData";
import {
  addRangItemState,
  duplicateRangItemState,
  removeRangItemState,
  toggleOpenItem,
  updateRangFieldState,
  updateRangItemState,
  type RangSection,
} from "@/lib/rangEditor";



export function VoiePrestigeWizard({
  onClose,
  onSuccess,
  campaignId,
  initialData,
  familles,
}: VoiePrestigeWizardProps) {
  const isEditing = !!initialData;
  const voiePrestigeData = useVoiePrestigeData();
  const [step, setStep] = useState(1);
  const [nom, setNom] = useState(initialData?.nom ?? "");
  const [familleId, setFamilleId] = useState<string | null>(initialData?.famille_id ?? null);
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [isPrivate, setIsPrivate] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rangs, setRangs] = useState<RangsState>(
    initialData?.capacites
      ? normalizeRangsState(initialData.capacites)
      : structuredClone(EMPTY_RANGS),
  );
  const [openRangItems, setOpenRangItems] = useState<Set<string>>(new Set());
  const [newItemKeys, setNewItemKeys] = useState<Set<string>>(new Set());

  const handleRangChange = (
    rangKey: keyof RangsState,
    field: keyof VoieRang,
    value: string,
  ) => {
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
      setNewItemKeys((prev2) => {
        const n = new Set(prev2);
        n.add(newIkey);
        return n;
      });
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

  const duplicateRangItem = (
    rangKey: keyof RangsState,
    section: RangSection,
    itemIdx: number,
  ) => {
    setRangs((prev) => duplicateRangItemState(prev, rangKey, section, itemIdx));
  };

  const toggleRangItem = (ikey: string) =>
    setOpenRangItems((prev) => toggleOpenItem(prev, ikey));

  const handleSubmit = async () => {
    if (!nom.trim()) return alert("Le nom de la voie est obligatoire.");
    setIsSubmitting(true);
    try {
      await voiePrestigeData.saveVoiePrestige({
        voieId: isEditing ? initialData?.id : undefined,
        nom,
        familleId,
        notes,
        rangs: cleanupRangsForSave(rangs),
        campaignId,
        isPrivate,
      });

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
          <div>
            <p className="text-[12px] uppercase tracking-[0.2em] text-[#E3CCCD]/50 mb-1">
              {isEditing ? "Modifier la Voie de Prestige" : "Nouvelle Voie de Prestige"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/30 hover:text-white/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-0">
          {[
            { num: 1, label: "Identite" },
            { num: 2, label: "Rangs" },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center">
              <button
                onClick={() => {
                  if (s.num < step || (s.num === step + 1 && nom)) setStep(s.num);
                }}
                className={`flex items-center gap-2.5 transition-colors ${
                  step === s.num
                    ? "text-[#E3CCCD]"
                    : step > s.num
                      ? "text-white/60 hover:text-white/80"
                      : "text-white/20 cursor-default"
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold border transition-all ${
                  step === s.num
                    ? "border-[#E3CCCD] bg-[#E3CCCD]/15 text-[#E3CCCD]"
                    : step > s.num
                      ? "border-white/30 bg-white/10 text-white/50"
                      : "border-white/15 text-white/20"
                }`}>
                  {s.num}
                </span>
                <span className="text-[11px] uppercase tracking-widest font-medium hidden sm:block">{s.label}</span>
              </button>
              {i < 1 && <div className={`w-12 h-px mx-3 transition-colors ${step > s.num ? "bg-white/30" : "bg-white/10"}`} />}
            </div>
          ))}
        </div>

      </div>

      {/* CONTENT */}
      <div className="relative z-10 flex-1 overflow-y-auto px-8 py-7 scrollbar-thin scrollbar-thumb-white/8">
        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Nom de la Voie *</label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                autoFocus
                placeholder="ex: Voie du Champion, Voie de l'Ombre..."
                className="w-full bg-transparent border-b border-white/30 focus:border-[#E3CCCD]/80 py-2.5 text-white text-lg outline-none transition-colors placeholder:text-white/35"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Famille (archetype)</label>
              <ThemedSelect
                value={familleId}
                onValueChange={setFamilleId}
                options={familles.map((f) => f.id)}
                placeholder="-- Aucune famille --"
                allowNull
                labels={Object.fromEntries(familles.map((f) => [f.id, f.nom]))}
              />
              <p className="text-[11px] text-white/40 italic">Optionnel - rattache cette voie a une famille d'archetype.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes, remarques, conditions d'acces..."
                className="w-full h-24 bg-transparent border-b border-white/20 focus:border-white/35 py-1.5 text-white/85 text-[13px] outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 animate-in slide-in-from-right-4 fade-in">
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
              <ArrowLeft className="w-3.5 h-3.5" /> Precedent
            </button>
          )}
          {campaignId && (
            <div className="flex items-center gap-2">
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
        {step < 2 ? (
          <button
            onClick={() => {
              if (!nom) alert("Le nom de la voie est requis.");
              else setStep(2);
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#29206A]/60 hover:bg-[#29206A]/80 border border-[#E3CCCD]/25 hover:border-[#E3CCCD]/50 rounded-xl text-white text-[13px] transition-all active:scale-95"
          >
            Suivant <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
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
                : "Creer la Voie"}
          </button>
        )}
      </div>
    </ModalLayout>
  );
}
