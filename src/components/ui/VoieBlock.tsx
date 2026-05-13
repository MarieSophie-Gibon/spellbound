import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface VoieBlockProps {
  voieNom: string;
  capacites?: Record<string, { nom: string; type?: string; description: string }>;
  rangsAcquis: number[];
  defaultOpen?: boolean;
}

export function VoieBlock({ voieNom, capacites, rangsAcquis, defaultOpen }: VoieBlockProps) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="bg-[#29206A]/20 border border-[#E3CCCD]/20 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-serif text-lg text-white">{voieNom}</h3>
          <div className="flex gap-1">
            {[...rangsAcquis].sort((a, b) => a - b).map(r => (
              <span key={r} className="w-5 h-5 rounded-full bg-[#E3CCCD]/20 border border-[#E3CCCD]/40 flex items-center justify-center text-[10px] text-[#E3CCCD]/80 font-bold">
                {r}
              </span>
            ))}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-white/40 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-6 pb-5 border-t border-white/10 pt-4 space-y-4">
          {capacites ? (
            [1, 2, 3, 4, 5].map(rangNum => {
              const rang = capacites[`rang${rangNum}`];
              if (!rang?.nom) return null;
              const isAcquired = rangsAcquis.includes(rangNum);
              return (
                <div key={rangNum} className={`text-[13px] ${isAcquired ? "" : "opacity-30"}`}>
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className={`font-bold ${isAcquired ? "text-white" : "text-white/60"}`}>
                      {rangNum}. {rang.nom}
                    </span>
                    {rang.type && rang.type !== "passif" && (
                      <span className="text-[10px] uppercase tracking-widest text-[#E3CCCD]/50 border border-[#E3CCCD]/15 rounded-full px-1.5 py-0.5">
                        {rang.type}
                      </span>
                    )}
                    {isAcquired && (
                      <span className="ml-auto text-[10px] text-emerald-400/70 font-medium">✓ Acquis</span>
                    )}
                  </div>
                  <p className="font-light text-white/80 leading-relaxed">{rang.description}</p>
                </div>
              );
            })
          ) : (
            <p className="text-[12px] text-white/30 italic">Détails de la voie indisponibles.</p>
          )}
        </div>
      )}
    </div>
  );
}
