import { useState } from "react";
import { Maximize2, Minimize2, Pencil, Trash2, Image as ImageIcon, ChevronDown } from "lucide-react";
import type { Famille, FamilleVoie } from "@/types/compendium";

interface FamilleDetailProps {
    famille: Famille;
    voies: FamilleVoie[];
    isFullscreen: boolean;
    onToggleFullscreen: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export function FamilleDetail({ famille, voies, isFullscreen, onToggleFullscreen, onEdit, onDelete }: FamilleDetailProps) {
    return (
        <div className="flex-1 flex flex-col h-full min-h-0 p-3 md:p-5 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">

            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-[#E3CCCD]/20 pb-3 mb-3 shrink-0">
                <div className="flex items-baseline gap-3">
                    <h1 className="font-serif text-3xl text-white tracking-wider">{famille.nom}</h1>
                    <span className="text-[11px] uppercase tracking-widest text-[#E3CCCD]/50 border border-[#E3CCCD]/20 rounded-full px-2.5 py-0.5">
                        {famille.groupe}
                    </span>
                </div>
                <div className="flex items-center gap-1 bg-[#1E1941]/80 border border-[#E3CCCD]/20 rounded-full px-2 py-1.5 backdrop-blur-md shadow-xl">
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

                {/* IMAGE + DESCRIPTION */}
                <div className="flex gap-3 items-stretch">
                    <FamilleCard famille={famille} />
                    <div className="flex-1 min-h-0 max-h-66.25 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 bg-[#1E1941]/40 border border-[#E3CCCD]/20 rounded-2xl p-3 flex gap-4 text-[13px] font-light text-white/90 leading-relaxed shadow-inner">
                        <div className="shrink-0 mt-0.5"><span className="text-[#E3CCCD]">✧</span></div>
                        <div className="whitespace-pre-wrap">{famille.description || "Aucune description renseignée."}</div>
                    </div>
                </div>

                {/* STATISTIQUES */}
                <div className="border border-dashed border-[#E3CCCD]/25 rounded-2xl px-5 py-4 text-[13px] text-white/90">
                    <div className="grid grid-cols-3 gap-x-8 gap-y-2">
                        <StatRow label="PV par niveau" value={String(famille.pv_niveau)} />
                        <StatRow label="Dé de récupération" value={famille.de_recuperation} />
                        {famille.bonus_chance > 0 && (
                            <StatRow label="Bonus Chance" value={`+${famille.bonus_chance}`} />
                        )}
                    </div>
                    {famille.equipement_base && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-dashed border-white/10">
                            <span className="font-bold shrink-0">• Équipement de base :</span>
                            <span className="font-light">{famille.equipement_base}</span>
                        </div>
                    )}
                    {famille.maitrise_equipement && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-dashed border-white/10">
                            <span className="font-bold shrink-0">• Maîtrise d'équipement :</span>
                            <span className="font-light">{famille.maitrise_equipement}</span>
                        </div>
                    )}
                </div>

                {/* VOIES */}
                <div className="space-y-2">
                    {voies.length === 0 ? (
                        <div className="bg-[#29206A]/20 border border-[#E3CCCD]/20 rounded-2xl p-6 text-center text-[13px] text-white/30 italic">
                            Aucune voie n'a encore été définie pour ce profil.
                        </div>
                    ) : (
                        voies.map((voie, i) => (
                            <VoieBlock key={voie.id ?? i} voie={voie} defaultOpen={i === 0} />
                        ))
                    )}
                </div>

            </div>
        </div>
    );
}

function VoieBlock({ voie, defaultOpen }: { voie: FamilleVoie; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen ?? false);

    return (
        <div className="bg-[#29206A]/20 border border-[#E3CCCD]/20 rounded-2xl overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <h3 className="font-serif text-lg text-white">{voie.nom}</h3>
                </div>
                <ChevronDown className={`w-4 h-4 text-white/40 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="px-6 pb-5 border-t border-white/10 pt-4 space-y-4">
                    {[1, 2, 3, 4, 5].map((rangNum) => {
                        const rang = voie.capacites[`rang${rangNum}` as keyof typeof voie.capacites];
                        if (!rang?.nom) return null;
                        return (
                            <div key={rangNum} className="text-[13px]">
                                <span className="font-bold text-white">{rangNum}. {rang.nom} </span>
                                {rang.type && rang.type !== "passif" && (
                                    <span className="text-[10px] uppercase tracking-widest text-[#E3CCCD]/50 border border-[#E3CCCD]/15 rounded-full px-1.5 py-0.5 mr-1">{rang.type}</span>
                                )}
                                <span className="font-light text-white/80 leading-relaxed">: {rang.description}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function FamilleCard({ famille }: { famille: Famille }) {
    return (
        <div className="w-44 shrink-0 self-start aspect-290/437 rounded-2xl relative border border-white/10 overflow-hidden">
            {famille.image_url ? (
                <img src={famille.image_url} alt={famille.nom} className="absolute inset-0 w-full h-full object-cover opacity-90" />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <ImageIcon className="w-10 h-10 text-white/10" />
                </div>
            )}
            <div className="absolute inset-0 z-10 pointer-events-none"
                style={{ background: "linear-gradient(to bottom, rgba(102,102,102,0) 0%, rgba(55,42,132,0.72) 47%, rgba(36,27,89,0.79) 63%, rgba(18,13,47,1) 100%)" }}
            />
            <img src="/card-overlay.svg" alt="" className="absolute inset-0 w-full h-full z-20 pointer-events-none opacity-80" />
            <div className="absolute bottom-0 inset-x-0 z-30 pb-4 text-center">
                <h3 className="font-serif text-base text-white tracking-widest">{famille.nom}</h3>
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
