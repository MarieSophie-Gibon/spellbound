/* eslint-disable @typescript-eslint/no-explicit-any */
import { User, UserPlus, Loader2, ArrowLeft } from "lucide-react";

interface PJ {
    id: string;
    name: string;
    image_url: string | null;
    stats: any;
}

interface PersonnageSidebarProps {
    pjs: PJ[];
    isLoading: boolean;
    selectedId: string | null;
    onSelect: (id: string) => void;
    onCreateClick: () => void;
    onBack?: () => void;
}

export function PersonnageSidebar({ pjs, isLoading, selectedId, onSelect, onCreateClick, onBack }: PersonnageSidebarProps) {
    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto py-3 scrollbar-thin scrollbar-thumb-white/10">
                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin text-white/30" />
                    </div>
                ) : pjs.length === 0 ? (
                    <p className="text-[12px] text-white/25 italic text-center py-10 px-4">
                        Aucun personnage. Créez-en un !
                    </p>
                ) : (
                    pjs.map(pj => (
                        <button
                            key={pj.id}
                            onClick={() => onSelect(pj.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/5 ${selectedId === pj.id ? "bg-[#E3CCCD]/10 border-r-2 border-[#E3CCCD]/50" : ""}`}
                        >
                            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/15 bg-white/5 flex items-center justify-center">
                                {pj.image_url
                                    ? <img src={pj.image_url} alt={pj.name} className="w-full h-full object-cover" />
                                    : <User className="w-4 h-4 text-white/30" />}
                            </div>
                            <div className="min-w-0">
                                <p className={`text-[13px] font-medium truncate ${selectedId === pj.id ? "text-[#E3CCCD]" : "text-white/70"}`}>
                                    {pj.name}
                                </p>
                                {pj.stats?.sexe && (
                                    <p className="text-[11px] text-white/35 truncate">
                                        {pj.stats.sexe}{pj.stats.age ? ` · ${pj.stats.age}` : ""}
                                    </p>
                                )}
                            </div>
                        </button>
                    ))
                )}
            </div>

            <div className="p-4 space-y-3 shrink-0 bg-black/10 border-t border-white/5">
                <button
                    onClick={onCreateClick}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#E3CCCD]/10 border border-[#E3CCCD]/25 text-[#E3CCCD]/80 hover:bg-[#E3CCCD]/18 hover:text-[#E3CCCD] transition-all text-[12px]"
                >
                    <UserPlus className="w-4 h-4" />
                    Nouveau personnage
                </button>
                {onBack && (
                    <button
                        onClick={onBack}
                        className="w-full flex items-center justify-start px-3 gap-3 py-2 text-white/60 hover:text-white text-[13px] transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Retour
                    </button>
                )}
            </div>
        </div>
    );
}
