import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import type { FamilleVoie } from "@/types/compendium";

function getTypeStyles(type?: string | null) {
  if (!type) return { border: "border-white/10", bg: "", badge: "text-[#E3CCCD]/40 border-[#E3CCCD]/15", dot: "bg-white/20" };
  const t = type.toLowerCase();
  if (t.includes("action"))
    return { border: "border-[#f4a261]/50", bg: "bg-[#f4a261]/5", badge: "text-[#f4a261] border-[#f4a261]/40", dot: "bg-[#f4a261]" };
  if (t.includes("bonus"))
    return { border: "border-[#e9c46a]/50", bg: "bg-[#e9c46a]/5", badge: "text-[#e9c46a] border-[#e9c46a]/40", dot: "bg-[#e9c46a]" };
  if (t === "passif")
    return { border: "border-[#90e0ef]/50", bg: "bg-[#90e0ef]/5", badge: "text-[#90e0ef] border-[#90e0ef]/40", dot: "bg-[#90e0ef]" };
  return { border: "border-white/15", bg: "bg-white/3", badge: "text-white/40 border-white/15", dot: "bg-white/20" };
}

interface VoiePrestigeDetailMobileProps {
  voie: FamilleVoie;
  readOnly?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function VoiePrestigeDetailMobile({
  voie,
  readOnly,
  onEdit,
  onDelete,
}: VoiePrestigeDetailMobileProps) {
  const hasActions = !readOnly;
  const notes = voie.notes?.trim() ?? "";

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 p-3 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
      {hasActions && (
        <div className="flex items-center justify-end border-b border-[#E3CCCD]/20 pb-3 mb-3 shrink-0">
          <div className="flex items-center gap-1 bg-[#1E1941]/80 border border-[#E3CCCD]/20 rounded-full px-2 py-1.5 backdrop-blur-md shadow-xl">
            <button
              onClick={onEdit}
              className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-white/60 hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/10 rounded-full transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3 flex-1">
        <div className="border border-dashed border-[#E3CCCD]/25 rounded-2xl p-3 text-white/90">
          <h1 className="font-serif text-xl text-white tracking-wide leading-tight">
            {voie.nom}
          </h1>
          {!!voie.famille_nom && (
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#E3CCCD]/65 mt-2">
              {voie.famille_nom}
            </p>
          )}
        </div>

        {!!notes && (
          <details className="w-full bg-[#1E1941]/40 border border-[#E3CCCD]/20 rounded-2xl p-3 text-[13px] font-light text-white/90 leading-relaxed shadow-inner group">
            <summary className="list-none cursor-pointer select-none flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/90">
              <span>Notes</span>
              <span className="flex h-6 w-6 items-center justify-center origin-center text-white/95 text-sm leading-none transition-transform duration-200 group-open:rotate-180">
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </span>
            </summary>

            <div className="mt-3">
              <p className="whitespace-pre-wrap text-white/75 italic leading-relaxed">
                {notes}
              </p>
            </div>
          </details>
        )}

        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#E3CCCD]/60 px-1">
            Capacites
          </p>
          {[1, 2, 3, 4, 5].map((rangNum) => {
            const key = `rang${rangNum}` as keyof typeof voie.capacites;
            const cap = voie.capacites[key];
            if (!cap?.nom) return null;
            const styles = getTypeStyles(cap.type);

            return (
              <details
                key={key}
                className={`border-l-2 ${styles.border} ${styles.bg} rounded-r-xl pl-3 pr-3 pt-2.5 pb-2.5 group`}
              >
                <summary className="list-none cursor-pointer select-none flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span className="w-5 h-5 rounded-full border border-[#E3CCCD]/30 flex items-center justify-center text-[10px] text-[#E3CCCD]/60 shrink-0">
                      {rangNum}
                    </span>
                    <h3 className="text-[13px] text-white font-medium leading-snug">{cap.nom}</h3>
                    {!!cap.type && (
                      <span className={`text-[9px] uppercase tracking-widest rounded-full px-1.5 py-0.5 border ${styles.badge}`}>
                        {cap.type}
                      </span>
                    )}
                  </div>
                  <span className="flex h-5 w-5 items-center justify-center text-white/50 transition-transform duration-200 group-open:rotate-180 shrink-0">
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </summary>

                {!!cap.description && (
                  <p className="mt-2 text-[12px] font-light text-white/60 leading-relaxed whitespace-pre-wrap">
                    {cap.description}
                  </p>
                )}
              </details>
            );
          })}
        </div>
      </div>
    </div>
  );
}
