import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { getRankTitle, hasAction, hasBonus, hasCapacite, hasRangContent, normalizeVoieRang } from "@/lib/voieRanks";

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
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/5 transition-colors"
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
        <div className="px-6 pb-5 border-t border-white/10 pt-4 space-y-4">
          {capacites ? (
            [1, 2, 3, 4, 5].map(rangNum => {
              const rang = normalizeVoieRang(capacites[`rang${rangNum}`]);
              if (!hasRangContent(rang)) return null;

              const showBonus = hasBonus(rang);
              const showCapacite = hasCapacite(rang);
              const showAction = hasAction(rang);
              const rankTitle = getRankTitle(rang, `Rang ${rangNum}`);
              const bonuses = rang.bonus || [];
              const rankCapacites = rang.capacites || [];
              const actions = rang.actions || [];
              const isAcquired = rangsAcquis.includes(rangNum);

              return (
                <div key={rangNum} className={`text-[13px] rounded-lg border border-white/10 bg-black/10 p-3 ${isAcquired ? "" : "opacity-30"}`}>
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className={`font-bold ${isAcquired ? "text-white" : "text-white/60"}`}>
                      {rangNum}. {rankTitle}
                    </span>
                  </div>

                  {showBonus && bonuses.length > 0 && (
                    <p className="font-light text-white/80 leading-relaxed">
                      <span className="text-[10px] uppercase tracking-wider text-[#E3CCCD]/65 mr-2">Bonus</span>
                      <span>{bonuses.map((bonus) => `${bonus.titre || "Bonus"}${bonus.type || bonus.valeur ? ` - ${[bonus.type, bonus.valeur].filter(Boolean).join(" ")}` : ""}${bonus.condition ? `: ${bonus.condition}` : ""}`).join(" | ")}</span>
                    </p>
                  )}

                  {showCapacite && rankCapacites.length > 0 && (
                    <p className="font-light text-white/80 leading-relaxed">
                      <span className="text-[10px] uppercase tracking-wider text-[#E3CCCD]/65 mr-2">Capacité</span>
                      <span>{rankCapacites.map((capacite) => `${capacite.titre || "Capacité"}${capacite.description ? `: ${capacite.description}` : ""}`).join(" | ")}</span>
                    </p>
                  )}

                  {showAction && actions.length > 0 && (
                    <p className="font-light text-white/80 leading-relaxed">
                      <span className="text-[10px] uppercase tracking-wider text-[#E3CCCD]/65 mr-2">Action</span>
                      <span>{actions.map((action) => `${action.titre || "Action"}${action.type ? ` [${action.type}]` : ""}${action.sort ? " Sort" : ""}${action.sort && action.cout_mana ? ` PM ${action.cout_mana}` : ""}${action.dm ? ` DM ${action.dm}` : ""}${action.description ? `: ${action.description}` : ""}`).join(" | ")}</span>
                    </p>
                  )}

                  {!showBonus && !showCapacite && !showAction && rang.description && (
                    <p className="font-light text-white/80 leading-relaxed">{rang.description}</p>
                  )}
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
