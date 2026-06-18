import { useState } from "react";
import { ModalLayout } from "@/components/ui/ModalLayout";
import { X, Save, FolderPlus, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";

// ─────────────────────────────────────────────
// MODALE SCÉNARIO
// ─────────────────────────────────────────────
interface ScenarioModalProps {
  campaignId: string;
  initialData?: { id: string; title: string; description: string | null };
  onClose: () => void;
  onSuccess: () => void;
}

export function ScenarioModal({
  campaignId,
  initialData,
  onClose,
  onSuccess,
}: ScenarioModalProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return alert("Le titre est obligatoire");
    setIsSubmitting(true);
    try {
      if (initialData?.id) {
        await supabase.from("scenarios").update({ title: title.trim(), description: description.trim() || null }).eq("id", initialData.id);
      } else {
        // Optionnel : Gérer l'ordre (mettre à la fin)
        const { count } = await supabase.from("scenarios").select("*", { count: "exact", head: true }).eq("campaign_id", campaignId);
        await supabase.from("scenarios").insert({ campaign_id: campaignId, title: title.trim(), description: description.trim() || null, ordre: count || 0 });
      }
      onSuccess();
    } catch (err) {
      if (err instanceof Error) {
        alert("Erreur : " + err.message);
      } else {
        alert("Erreur inconnue");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalLayout>
      <div className="h-full p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderPlus className="w-5 h-5 text-[#E3CCCD]" />
            <h2 className="text-xl font-serif text-white">{initialData ? "Modifier le scénario" : "Nouveau scénario"}</h2>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="flex-1 min-h-0 flex flex-col gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-white/60 mb-1.5 block">Titre *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#E3CCCD]/50 transition-colors"
              placeholder="Ex: L'Ombre sur le village..."
            />
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            <label className="text-[10px] uppercase tracking-widest text-white/60 mb-1.5 block">Synopsis (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full flex-1 min-h-40 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#E3CCCD]/50 transition-colors resize-none"
              placeholder="Bref résumé de l'arc narratif..."
            />
          </div>
        </div>

        <div className="shrink-0 flex justify-end gap-3 pt-4 border-t border-white/10">
          <button onClick={onClose} className="px-4 py-2 text-sm text-white/60 hover:text-white">Annuler</button>
          <button onClick={handleSubmit} disabled={isSubmitting || !title.trim()} className="flex items-center gap-2 px-5 py-2 bg-[#E3CCCD]/20 text-[#E3CCCD] border border-[#E3CCCD]/30 hover:bg-[#E3CCCD]/30 rounded-xl text-sm font-medium transition-all disabled:opacity-50">
            <Save className="w-4 h-4" /> {isSubmitting ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </ModalLayout>
  );
}

// ─────────────────────────────────────────────
// MODALE CHAPITRE
// ─────────────────────────────────────────────
interface ChapitreModalProps {
  scenarioId: string;
  initialData?: { id: string; title: string };
  onClose: () => void;
  onSuccess: (newChapitreId?: string) => void;
}

export function ChapitreModal({
  scenarioId,
  initialData,
  onClose,
  onSuccess,
}: ChapitreModalProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return alert("Le titre est obligatoire");
    setIsSubmitting(true);
    try {
      if (initialData?.id) {
        await supabase.from("chapitres").update({ title: title.trim() }).eq("id", initialData.id);
        onSuccess(initialData.id);
      } else {
        const { count } = await supabase.from("chapitres").select("*", { count: "exact", head: true }).eq("scenario_id", scenarioId);
        const { data } = await supabase.from("chapitres").insert({ scenario_id: scenarioId, title: title.trim(), ordre: count || 0 }).select();
        onSuccess(data?.[0]?.id);
      }
    } catch (err) {
      if (err instanceof Error) {
        alert("Erreur : " + err.message);
      } else {
        alert("Erreur inconnue");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-sky-400" />
            <h2 className="text-xl font-serif text-white">{initialData ? "Modifier le chapitre" : "Nouveau chapitre"}</h2>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        
        <div>
          <label className="text-[10px] uppercase tracking-widest text-white/60 mb-1.5 block">Titre *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-sky-400/50 transition-colors"
            placeholder="Ex: Arrivée à la taverne..."
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <button onClick={onClose} className="px-4 py-2 text-sm text-white/60 hover:text-white">Annuler</button>
          <button onClick={handleSubmit} disabled={isSubmitting || !title.trim()} className="flex items-center gap-2 px-5 py-2 bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500/30 rounded-xl text-sm font-medium transition-all disabled:opacity-50">
            <Save className="w-4 h-4" /> {isSubmitting ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </ModalLayout>
  );
}