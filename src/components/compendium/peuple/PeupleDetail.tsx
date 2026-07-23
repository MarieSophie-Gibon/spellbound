import { Maximize2, Minimize2, Pencil, Trash2, Image as ImageIcon } from "lucide-react";
import type { Peuple, Voie } from "@/types/compendium";
import { useIsMobile } from "@/hooks/useIsMobile";
import { PeupleDetailMobile } from "@/components/compendium/peuple/PeupleDetailMobile";
import { getRankTitle, hasAction, hasBonus, hasCapacite, hasRangContent, normalizeVoieRang } from "@/lib/voieRanks";

interface PeupleDetailProps {
  peuple: Peuple;
  voie: Voie | null;
  isFullscreen: boolean;
  readOnly?: boolean;
  onToggleFullscreen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function PeupleDetail({ peuple, voie, isFullscreen, readOnly, onToggleFullscreen, onEdit, onDelete }: PeupleDetailProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <PeupleDetailMobile
        peuple={peuple}
        voie={voie}
        readOnly={readOnly}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
  }

  const hasActions = !readOnly;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 p-3 md:p-5 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">

      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-[#E3CCCD]/20 pb-3 mb-3 shrink-0">
        <h1 className="font-serif text-3xl text-white tracking-wider">{peuple.nom}</h1>
        {hasActions && (
          <div className="flex items-center gap-1 bg-[#1E1941]/80 border border-[#E3CCCD]/20 rounded-full px-2 py-1.5 backdrop-blur-md shadow-xl">
            <button onClick={onToggleFullscreen} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors">
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            {!readOnly && <button onClick={onEdit} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"><Pencil className="w-4 h-4" /></button>}
            {!readOnly && <button onClick={onDelete} className="p-1.5 text-white/60 hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/10 rounded-full transition-colors"><Trash2 className="w-4 h-4" /></button>}
          </div>
        )}
      </div>

      <div className="space-y-3 flex-1">

        {/* IMAGE + LORE */}
        <div className="flex gap-3 items-stretch">
          <PeupleCard peuple={peuple} />

          <div className="w-full flex-1 md:max-h-66.25 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 bg-[#1E1941]/40 border border-[#E3CCCD]/20 rounded-2xl p-3 flex gap-4 text-[13px] font-light text-white/90 leading-relaxed shadow-inner">
            <div className="shrink-0 mt-0.5"><span className="text-[#E3CCCD]">✧</span></div>
            <div>
              <div className="whitespace-pre-wrap">{peuple.description || "Aucune description renseignée."}</div>
              {peuple.lore && (
                <div className="whitespace-pre-wrap mt-4 pt-4 border-t border-white/10 text-white/70 italic">{peuple.lore}</div>
              )}
            </div>
          </div>
        </div>

        {/* TRAITS DE BASE */}
        <div className="border border-dashed border-[#E3CCCD]/25 rounded-2xl p-5 text-[13px] text-white/90">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            <StatRow label="Âge de départ" value={peuple.data?.age} />
            <StatRow label="Espérance de vie" value={peuple.data?.esperance} />
            <StatRow label="Taille" value={peuple.data?.taille} />
            <StatRow label="Poids" value={peuple.data?.poids} />
          </div>
          <div className="flex gap-2 mt-3 pt-3 border-t border-dashed border-white/10">
            <span className="font-bold shrink-0">• Traits :</span>
            <span className="font-light">{peuple.data?.traits || "Aucun"}</span>
          </div>
          <div className="flex gap-2 mt-3 pt-3 border-t border-dashed border-white/10">
            <span className="font-bold shrink-0">• Caractéristiques :</span>
            <span className="font-light">{peuple.data?.caracteristiques || "N/A"}</span>
          </div>
        </div>

        {/* VOIE DU PEUPLE */}
        <div className="bg-[#29206A]/20 border border-[#E3CCCD]/20 rounded-2xl p-6 shadow-inner">
          <h3 className="font-serif text-xl text-white mb-5">{voie ? voie.nom : "Voie raciale non définie"}</h3>
          {voie ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((rangNum) => {
                const rang = normalizeVoieRang(voie.capacites[`rang${rangNum}` as keyof typeof voie.capacites]);
                if (!hasRangContent(rang)) return null;

                const rankTitle = getRankTitle(rang, `Rang ${rangNum}`);
                const showBonus = hasBonus(rang);
                const showCapacite = hasCapacite(rang);
                const showAction = hasAction(rang);
                const bonuses = rang.bonus || [];
                const capacites = rang.capacites || [];
                const actions = rang.actions || [];

                return (
                  <div key={rangNum} className="text-[13px] rounded-lg border border-white/10 bg-black/10 p-3">
                    <p className="font-bold text-white mb-1">{rangNum}. {rankTitle}</p>

                    {showBonus && bonuses.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[10px] uppercase tracking-wider text-[#E3CCCD]/65">Bonus</p>
                        {bonuses.map((bonus, idx) => (
                          <div key={`bonus-${idx}`}>
                            <p className="text-white/80">
                              <span className="font-medium">{bonus.titre || "Bonus"}</span>
                              {(bonus.type || bonus.valeur) && (
                                <span className="text-white/65"> - {[bonus.type, bonus.valeur].filter(Boolean).join(" ")}</span>
                              )}
                            </p>
                            {bonus.condition && <p className="text-white/65">{bonus.condition}</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {showCapacite && capacites.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[10px] uppercase tracking-wider text-[#E3CCCD]/65">Capacité</p>
                        {capacites.map((capacite, idx) => (
                          <div key={`capacite-${idx}`}>
                            <p className="text-white/80 font-medium">{capacite.titre || "Capacité"}</p>
                            {capacite.description && <p className="text-white/65">{capacite.description}</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {showAction && actions.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#E3CCCD]/65">Action</p>
                        {actions.map((action, idx) => (
                          <div key={`action-${idx}`}>
                            <p className="text-white/80 flex flex-wrap items-center gap-1.5">
                              <span className="font-medium">{action.titre || "Action"}</span>
                              {action.type && <span className="text-[10px] border border-[#E3CCCD]/20 rounded-full px-1.5 py-0.5 text-[#E3CCCD]/70">{action.type}</span>}
                              {action.sort && <span className="text-[10px] border border-sky-300/30 rounded-full px-1.5 py-0.5 text-sky-200/70">Sort</span>}
                              {action.sort && action.cout_mana && <span className="text-[10px] text-sky-200/70">PM {action.cout_mana}</span>}
                              {action.dm && <span className="text-[10px] text-amber-200/80">DM {action.dm}</span>}
                            </p>
                            {action.test_oppose && (
                              <p className="text-white/65">Test opposé{action.test_type ? ` (${action.test_type})` : ""}{action.resultat_si_reussi ? ` - Si réussi: ${action.resultat_si_reussi}` : ""}</p>
                            )}
                            {action.description && <p className="text-white/65">{action.description}</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {!showBonus && !showCapacite && !showAction && rang.description && (
                      <p className="font-light text-white/80 leading-relaxed">{rang.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm font-light text-white/40 italic">Aucune voie n'a été trouvée pour ce peuple dans la base de données.</p>
          )}
        </div>

      </div>
    </div>
  );
}

function PeupleCard({ peuple }: { peuple: Peuple }) {
  return (
    <div className="w-44 shrink-0 self-start aspect-290/437 rounded-2xl relative border border-white/10 overflow-hidden">
      {peuple.image_url ? (
        <img src={peuple.image_url} alt={peuple.nom} className="absolute inset-0 w-full h-full object-cover opacity-90" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <ImageIcon className="w-10 h-10 text-white/10" />
        </div>
      )}
      <div className="absolute inset-0 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(102,102,102,0) 0%, rgba(55,42,132,0.72) 47%, rgba(36,27,89,0.79) 63%, rgba(18,13,47,1) 100%)" }}
      />
      <img src="/card-overlay.svg" alt="" className="absolute inset-0 w-full h-full z-20 pointer-events-none opacity-80" />
      <div className="absolute bottom-5 inset-x-0 z-30 pb-4 text-center">
        <h3 className="font-serif text-base text-white tracking-widest">{peuple.nom}</h3>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex gap-2">
      <span className="font-bold">• {label} :</span>
      <span className="font-light">{value || "N/A"}</span>
    </div>
  );
}
