import { Maximize2, Minimize2, Pencil, Trash2 } from "lucide-react";
import type { FamilleArchetype } from "@/types/compendium";

interface FamilleDetailProps {
    famille: FamilleArchetype;
    isFullscreen: boolean;
    readOnly?: boolean;
    onToggleFullscreen: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export function FamilleDetail({ famille, isFullscreen, readOnly, onToggleFullscreen, onEdit, onDelete }: FamilleDetailProps) {
    return (
        <div className="flex-1 flex flex-col h-full min-h-0 p-3 md:p-5 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">

            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-[#E3CCCD]/20 pb-3 mb-3 shrink-0">
                <div className="flex items-baseline gap-3">
                    <h1 className="font-serif text-3xl text-white tracking-wider">{famille.nom}</h1>
                    <span className="text-[11px] uppercase tracking-widest text-[#E3CCCD]/50 border border-[#E3CCCD]/20 rounded-full px-2.5 py-0.5">
                        Archétype
                    </span>
                </div>
                <div className="flex items-center gap-1 bg-[#1E1941]/80 border border-[#E3CCCD]/20 rounded-full px-2 py-1.5 backdrop-blur-md shadow-xl">
                    <button onClick={onToggleFullscreen} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    {!readOnly && <button onClick={onEdit} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"><Pencil className="w-4 h-4" /></button>}
                    {!readOnly && <button onClick={onDelete} className="p-1.5 text-white/60 hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/10 rounded-full transition-colors"><Trash2 className="w-4 h-4" /></button>}
                </div>
            </div>

            <div className="space-y-5 flex-1">
                {/* STATISTIQUES */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="px-5 py-4 rounded-2xl border border-dashed border-[#E3CCCD]/25 bg-[#29206A]/20 text-center">
                        <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">PV / niveau</p>
                        <p className="text-2xl text-white font-semibold">{famille.pv_niveau}</p>
                    </div>
                    <div className="px-5 py-4 rounded-2xl border border-dashed border-[#E3CCCD]/25 bg-[#29206A]/20 text-center">
                        <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Dé de récupération</p>
                        <p className="text-2xl text-white font-semibold font-mono">{famille.de_recuperation}</p>
                    </div>
                    <div className="px-5 py-4 rounded-2xl border border-dashed border-[#E3CCCD]/25 bg-[#29206A]/20 text-center">
                        <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Bonus Chance</p>
                        <p className={`text-2xl font-semibold ${famille.bonus_chance > 0 ? "text-emerald-400" : famille.bonus_chance < 0 ? "text-red-400" : "text-white/50"}`}>
                            {famille.bonus_chance > 0 ? `+${famille.bonus_chance}` : famille.bonus_chance}
                        </p>
                    </div>
                </div>

                {famille.description && (
                    <div className="bg-[#1E1941]/40 border border-[#E3CCCD]/20 rounded-2xl p-4 flex gap-4 text-[13px] font-light text-white/90 leading-relaxed shadow-inner">
                        <div className="shrink-0 mt-0.5"><span className="text-[#E3CCCD]">✧</span></div>
                        <div className="whitespace-pre-wrap">{famille.description}</div>
                    </div>
                )}
            </div>
        </div>
    );
}
