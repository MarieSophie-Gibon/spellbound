import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { hasRangContent, normalizeVoieRang } from "@/lib/voieRanks";
import { RangCard } from "@/components/ui/RangCard";

interface VoieBlockProps {
  voieNom: string;
  capacites?: Record<string, unknown>;
  rangsAcquis: number[];
  defaultOpen?: boolean;
}

export function VoieBlock({ voieNom, capacites, rangsAcquis, defaultOpen }: VoieBlockProps) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="bg-[#29206A]/20 border border-[#E3CCCD]/20 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-serif text-md text-white">{voieNom}</h3>
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
        <div className="px-3 pb-3 border-t border-white/10 pt-3 space-y-2">
          {capacites ? (
            [1, 2, 3, 4, 5].map(rangNum => {
              const rang = normalizeVoieRang(capacites[`rang${rangNum}`]);
              if (!hasRangContent(rang)) return null;
              const isAcquired = rangsAcquis.includes(rangNum);
              return <RangCard key={rangNum} rang={rang} rangNum={rangNum} isAcquired={isAcquired} />;
            })
          ) : (
            <p className="text-[12px] text-white/30 italic">Détails de la voie indisponibles.</p>
          )}
        </div>
      )}
    </div>
  );
}
