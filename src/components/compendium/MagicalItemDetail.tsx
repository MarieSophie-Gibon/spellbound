import { Maximize2, Minimize2, Pencil, Trash2, Image as ImageIcon, Wand2 } from "lucide-react";
import type { Equipement } from "@/types/compendium";

interface MagicalItemDetailProps {
    equipement: Equipement;
    isFullscreen: boolean;
    onToggleFullscreen: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

const RARETE_COLORS: Record<string, string> = {
    "Commun": "text-white/50 border-white/20",
    "Peu Commun": "text-emerald-400/80 border-emerald-400/30",
    "Rare": "text-blue-400/80 border-blue-400/30",
    "Très Rare": "text-purple-400/80 border-purple-400/30",
    "Légendaire": "text-amber-400/80 border-amber-400/30",
    "Artefact": "text-red-400/80 border-red-400/30",
};

export function MagicalItemDetail({ equipement, isFullscreen, onToggleFullscreen, onEdit, onDelete }: MagicalItemDetailProps) {
    const rarete = equipement.data?.rarete ?? "Commun";
    const rareteColor = RARETE_COLORS[rarete] ?? "text-white/50 border-white/20";
    const proprietes = equipement.data?.proprietes ?? [];
    const description = equipement.data?.description;
    const necessite = equipement.data?.necessite_attunement;

    return (
        <div className="flex-1 flex flex-col h-full min-h-0 p-3 md:p-5 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">

            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-[#E3CCCD]/20 pb-3 mb-3 shrink-0">
                <div className="flex items-baseline gap-3 min-w-0">
                    <h1 className="font-serif text-3xl text-white tracking-wider truncate">{equipement.nom}</h1>
                    <span className="text-[11px] uppercase tracking-widest text-[#E3CCCD]/50 border border-[#E3CCCD]/20 rounded-full px-2.5 py-0.5 shrink-0">
                        {equipement.categorie}
                    </span>
                </div>
                <div className="flex items-center gap-1 bg-[#1E1941]/80 border border-[#E3CCCD]/20 rounded-full px-2 py-1.5 backdrop-blur-md shadow-xl shrink-0">
                    <button onClick={onToggleFullscreen} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    <button onClick={onEdit} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={onDelete} className="p-1.5 text-white/60 hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/10 rounded-full transition-colors">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="space-y-3 flex-1">

                {/* IMAGE + INFO */}
                <div className="flex gap-3 items-stretch">
                    <EquipementCard equipement={equipement} rareteColor={rareteColor} rarete={rarete} />
                    <div className="flex-1 min-h-0 bg-[#1E1941]/40 border border-[#E3CCCD]/20 rounded-2xl p-3 flex flex-col gap-3 shadow-inner">
                        <div className="flex flex-wrap gap-3 text-[12px]">
                            <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${rareteColor}`}>
                                {rarete}
                            </span>
                            {equipement.prix && (
                                <>
                                    <span className="text-white/20 self-center">·</span>
                                    <span className="text-[#E3CCCD]/50 font-semibold uppercase tracking-widest self-center">Prix</span>
                                    <span className="text-white/70 self-center">{equipement.prix}</span>
                                </>
                            )}
                            {necessite && (
                                <>
                                    <span className="text-white/20 self-center">·</span>
                                    <span className="text-[11px] px-2.5 py-0.5 rounded-full border border-amber-400/30 text-amber-300/70">✦ Harmonisation</span>
                                </>
                            )}
                        </div>
                        <div className="border-t border-white/10 pt-3 flex gap-4 text-[13px] font-light text-white/90 leading-relaxed flex-1">
                            <div className="shrink-0 mt-0.5"><span className="text-[#E3CCCD]">✧</span></div>
                            <div className="whitespace-pre-wrap">
                                {description || (
                                    <span className="italic text-white/40">
                                        {equipement.categorie} de rareté <strong className="not-italic text-white/70">{rarete}</strong>.
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* PROPRIÉTÉS */}
                {proprietes.length > 0 && (
                    <div className="border border-dashed border-[#E3CCCD]/25 rounded-2xl px-5 py-4 space-y-2">
                        <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3">Propriétés Magiques</h2>
                        {proprietes.map((p, i) => (
                            <div key={i} className="flex items-start gap-3 text-[13px]">
                                <span className="text-[#E3CCCD]/50 shrink-0 mt-0.5">•</span>
                                <span className="font-semibold text-white/80 shrink-0">{p.label} :</span>
                                <span className="font-light text-white/60">{p.valeur}</span>
                            </div>
                        ))}
                    </div>
                )}

                {proprietes.length === 0 && !description && (
                    <div className="bg-[#29206A]/20 border border-[#E3CCCD]/20 rounded-2xl p-6 text-center text-[13px] text-white/30 italic flex flex-col items-center gap-2">
                        <Wand2 className="w-5 h-5 opacity-30" />
                        Aucune propriété définie pour cet objet.
                    </div>
                )}

            </div>
        </div>
    );
}

function EquipementCard({ equipement, rareteColor, rarete }: { equipement: Equipement; rareteColor: string; rarete: string }) {
    return (
        <div className="w-44 shrink-0 self-start aspect-290/437 rounded-2xl relative border border-white/10 overflow-hidden">
            {equipement.image_url ? (
                <img src={equipement.image_url} alt={equipement.nom} className="absolute inset-0 w-full h-full object-cover opacity-90" />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <ImageIcon className="w-10 h-10 text-white/10" />
                </div>
            )}
            <div className="absolute inset-0 z-10 pointer-events-none"
                style={{ background: "linear-gradient(to bottom, rgba(102,102,102,0) 0%, rgba(90,50,140,0.72) 47%, rgba(55,30,100,0.79) 63%, rgba(18,13,47,1) 100%)" }}
            />
            <img src="/card-overlay.svg" alt="" className="absolute inset-0 w-full h-full z-20 pointer-events-none opacity-80" />
            <div className="absolute bottom-5 inset-x-0 z-30 pb-3 px-2 text-center">
                <div className={`text-[10px] uppercase tracking-widest mb-0.5 ${rareteColor.split(" ")[0]}`}>{rarete}</div>
                <h3 className="font-serif text-sm text-white tracking-widest leading-tight">{equipement.nom}</h3>
            </div>
        </div>
    );
}
