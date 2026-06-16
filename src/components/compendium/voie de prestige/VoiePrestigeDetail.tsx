import { Maximize2, Minimize2, Pencil, Trash2 } from "lucide-react";
import type { FamilleVoie } from "@/types/compendium";

interface VoiePrestigeDetailProps {
  voie: FamilleVoie;
  isFullscreen: boolean;
  readOnly?: boolean;
  onToggleFullscreen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function VoiePrestigeDetail({ voie, isFullscreen, readOnly, onToggleFullscreen, onEdit, onDelete }: VoiePrestigeDetailProps) {
  return (
    <div className="flex-1 flex flex-col h-full min-h-0 p-3 md:p-5 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">

      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-[#E3CCCD]/20 pb-3 mb-3 shrink-0">
        <div className="flex items-baseline gap-3">
          <h1 className="font-serif text-3xl text-white tracking-wider">{voie.nom}</h1>
          {voie.famille_nom && (
            <span className="text-[11px] uppercase tracking-widest text-[#E3CCCD]/50 border border-[#E3CCCD]/20 rounded-full px-2.5 py-0.5">
              {voie.famille_nom}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 bg-[#1E1941]/80 border border-[#E3CCCD]/20 rounded-full px-2 py-1.5 backdrop-blur-md shadow-xl">
          <button onClick={onToggleFullscreen} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors">
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          {!readOnly && <button onClick={onEdit} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"><Pencil className="w-4 h-4" /></button>}
          {!readOnly && <button onClick={onDelete} className="p-1.5 text-white/60 hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/10 rounded-full transition-colors"><Trash2 className="w-4 h-4" /></button>}
        </div>
      </div>

      {/* NOTES */}
      {voie.notes && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-[#1E1941]/40 border border-[#E3CCCD]/15">
          <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-1.5">Notes</p>
          <p className="text-white/60 text-[13px] leading-relaxed whitespace-pre-wrap">{voie.notes}</p>
        </div>
      )}

      {/* RANGS */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3">Capacités</p>
        {([1, 2, 3, 4, 5] as const).map((rangNum) => {
          const key = `rang${rangNum}` as keyof typeof voie.capacites;
          const cap = voie.capacites[key];
          if (!cap?.nom) return null;
          return (
            <div
              key={key}
              className="flex gap-4 items-start py-3 border-b border-white/6 last:border-0"
            >
              <span className="w-6 h-6 mt-0.5 rounded-full border border-[#E3CCCD]/30 flex items-center justify-center text-[11px] text-[#E3CCCD]/60 font-medium shrink-0">
                {rangNum}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white text-sm font-medium">{cap.nom}</span>
                  {cap.type && (
                    <span className="text-[10px] uppercase tracking-widest text-[#E3CCCD]/50 border border-[#E3CCCD]/20 rounded-full px-2 py-0.5">
                      {cap.type}
                    </span>
                  )}
                </div>
                {cap.description && (
                  <p className="text-white/60 text-[13px] leading-relaxed whitespace-pre-wrap">{cap.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
