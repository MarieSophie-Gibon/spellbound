

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Image as ImageIcon, UploadCloud } from "lucide-react";
import { useCreateCampaign, useUpdateCampaign } from "@/hooks/useCampaigns";
import type { Campaign } from "@/hooks/useCampaigns";
import { supabase } from "@/lib/supabase";

interface CreateCampaignProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (campaign: Campaign) => void;
  initialData?: Campaign;
}

export function CreateCampaign({ open, onOpenChange, onCreated, initialData }: CreateCampaignProps) {
  const isEditing = !!initialData;
  const [nom, setNom] = useState(initialData?.nom ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image_url ?? null);
  const [error, setError] = useState<string | null>(null);
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();

  if (!open) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let image_url = initialData?.image_url ?? null;
    if (imageFile) {
      const ext = imageFile.name.split('.').pop();
      const path = `campagnes/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("compendium").upload(path, imageFile, { upsert: true });
      if (upErr) {
        setError("Erreur lors de l'upload de l'image");
        return;
      }
      const { data: urlData } = supabase.storage.from("compendium").getPublicUrl(path);
      image_url = urlData.publicUrl;
    }

    if (isEditing && initialData) {
      updateCampaign.mutate(
        { id: initialData.id, nom, description, image_url },
        {
          onSuccess: (data) => { onCreated(data); onOpenChange(false); },
          onError: (err: unknown) => { setError((err as Error).message || "Erreur inconnue"); },
        }
      );
    } else {
      createCampaign.mutate(
        { nom, description, image_url },
        {
          onSuccess: (data) => { onCreated(data); onOpenChange(false); },
          onError: (err: unknown) => { setError((err as Error).message || "Erreur inconnue"); },
        }
      );
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-9999 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="relative w-full max-w-3xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col animate-in zoom-in-95 duration-200 border border-white/10 overflow-hidden"
        style={{ background: "linear-gradient(160deg, rgba(80,95,200,0.38) 0%, rgba(55,48,130,0.42) 50%, rgba(70,80,175,0.38) 100%)" }}
      >
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
                Campagne
              </p>
              <h2 className="font-serif text-2xl text-white tracking-wide">
                {isEditing ? "Modifier la campagne" : "Nouvelle campagne"}
              </h2>
            </div>
            <button onClick={() => onOpenChange(false)} className="p-2 text-white/30 hover:text-white/70 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* FORMULAIRE */}
        <form className="relative z-10 flex flex-col gap-6 px-8 py-7" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Nom de la campagne *</label>
            <input
              type="text"
              value={nom}
              onChange={e => setNom(e.target.value)}
              autoFocus
              required
              placeholder="ex: Les Héritiers du Feu"
              className="w-full bg-transparent border-b border-white/30 focus:border-[#E3CCCD]/80 py-2.5 text-white text-lg outline-none transition-colors placeholder:text-white/35"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Illustration</label>
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
                <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }} className="text-[11px] text-white/50 hover:text-red-400 transition-colors">
                  Retirer
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Résumé, ambiance, pitch..."
              className="w-full h-32 bg-white/5 border border-white/20 focus:border-white/35 rounded-xl p-4 text-white text-sm outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35"
            />
          </div>

          {error && <div className="text-red-400 text-sm mt-1">{error}</div>}

          <div className="flex gap-2 mt-2 justify-end">
            <button
              type="button"
              className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white"
              onClick={() => onOpenChange(false)}
              disabled={createCampaign.isPending || updateCampaign.isPending}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white"
              disabled={createCampaign.isPending || updateCampaign.isPending}
            >
              {createCampaign.isPending || updateCampaign.isPending
                ? (isEditing ? "Modification..." : "Création...")
                : (isEditing ? "Enregistrer" : "Créer")}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
