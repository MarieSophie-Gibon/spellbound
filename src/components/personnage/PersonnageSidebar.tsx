/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { UserPlus, Loader2, ArrowLeft, ChevronDown, Search, Sword } from "lucide-react";

interface PJ {
    id: string;
    name: string;
    image_url: string | null;
    stats: any;
}

interface PersonnageSidebarProps {
    pjs: PJ[];
    pnjs?: PJ[]; // Rendu optionnel pour l'instant pour ne pas casser le composant parent
    isLoading: boolean;
    selectedId: string | null;
    // On met à jour onSelect pour indiquer au parent le type sélectionné
    onSelect: (id: string, type?: "pj" | "pnj") => void; 
    // On prévoit les nouvelles fonctions de création
    onCreatePJClick?: () => void;
    onCreatePNJClick?: () => void;
    onCreateClick?: () => void; // Fallback (ancienne prop)
    onBack?: () => void;
    readOnly?: boolean;
    canCreateOwnPJ?: boolean;
    mobileSummary?: boolean;
    defaultOpenSection?: "pj" | "pnj";
}

export function PersonnageSidebar({ 
    pjs, 
    pnjs = [], 
    isLoading, 
    selectedId, 
    onSelect, 
    onCreatePJClick, 
    onCreatePNJClick, 
    onCreateClick, 
    onBack,
    readOnly,
    canCreateOwnPJ,
    mobileSummary = false,
    defaultOpenSection,
}: PersonnageSidebarProps) {
    const [query, setQuery] = useState("");
    const normalizedQuery = query.trim().toLowerCase();
    const filteredPjs = pjs.filter((perso) => !normalizedQuery || perso.name.toLowerCase().includes(normalizedQuery));
    const filteredPnjs = pnjs.filter((perso) => !normalizedQuery || perso.name.toLowerCase().includes(normalizedQuery));
    const [openSection, setOpenSection] = useState<"pj" | "pnj" | null>(defaultOpenSection ?? "pj");

    const handleCreateForSection = (section: "pj" | "pnj") => {
        if (section === "pj") {
            if (onCreatePJClick) onCreatePJClick();
            else if (onCreateClick) onCreateClick();
            return;
        }

        if (onCreatePNJClick) onCreatePNJClick();
        else if (onCreateClick) onCreateClick();
    };

    const sections: Array<{ key: "pj" | "pnj"; label: string; items: PJ[] }> = [
        { key: "pj", label: "Joueurs", items: filteredPjs },
        { key: "pnj", label: "PNJ", items: filteredPnjs },
    ];

    return (
        <div className={`h-full min-h-0 flex flex-col ${mobileSummary ? "" : "bg-linear-to-b from-[#1E1941]/30 via-transparent to-black/10"}`}>
            {mobileSummary && (
                <div className="px-4 pt-4 pb-3 border-b border-[#E3CCCD]/14">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/35" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Rechercher"
                            className="w-full h-9 rounded-lg border border-[#E3CCCD]/20 bg-white/8 pl-9 pr-3 text-[12px] text-white placeholder:text-white/45 outline-none focus:border-[#E3CCCD]/55"
                        />
                    </div>
                </div>
            )}

            <div className={mobileSummary
                ? "flex-1 min-h-0 overflow-y-auto px-4 pb-4 pt-3 space-y-2 scrollbar-thin scrollbar-thumb-white/20"
                : "flex-1 overflow-y-auto py-2 px-3 scrollbar-thin scrollbar-thumb-white/5"
            }>
                {sections.map((section) => {
                    const isOpen = openSection === section.key;

                    return mobileSummary ? (
                        <div key={section.key} className="rounded-xl border border-[#E3CCCD]/16 bg-white/6 overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setOpenSection(isOpen ? null : section.key)}
                                className={`w-full px-3 py-2.5 text-left flex items-center justify-between transition-colors ${
                                    isOpen ? "bg-[#29206A]/45 text-[#E3CCCD]" : "text-white/68 hover:bg-white/10 hover:text-white"
                                }`}
                            >
                                <span className="text-[12px] font-medium truncate pr-2">{section.label}</span>
                                <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                            </button>

                            <div className={`grid transition-all duration-300 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-70"}`}>
                                <div className="overflow-hidden">
                                    <div className="px-2 pb-2 space-y-1">
                                        {isLoading ? (
                                            <div className="flex justify-center py-6">
                                                <Loader2 className="w-5 h-5 animate-spin text-white/30" />
                                            </div>
                                        ) : section.items.length === 0 ? (
                                            <div className="px-3 py-2 text-[11px] text-white/40 italic">Aucun élément dans cette catégorie.</div>
                                        ) : (
                                            section.items.map((perso) => (
                                                <button
                                                    key={perso.id}
                                                    type="button"
                                                    onClick={() => onSelect(perso.id, section.key)}
                                                    className={`w-full text-left rounded-lg px-2.5 py-1.5 text-[12px] font-light transition-colors flex items-center gap-2 ${
                                                        selectedId === perso.id
                                                            ? section.key === "pj" ? "bg-[#29206A]/50 text-white" : "bg-sky-500/14 text-white"
                                                            : "text-white/65 hover:bg-white/6 hover:text-white"
                                                    }`}
                                                >
                                                    <span className="block leading-snug line-clamp-2 flex-1">{perso.name}</span>
                                                    {section.key === "pnj" && perso.stats?.is_combatant && (
                                                        <Sword className="w-3 h-3 text-red-400/80 shrink-0" />
                                                    )}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div key={section.key} className="w-full">
                            <button
                                type="button"
                                onClick={() => setOpenSection(isOpen ? null : section.key)}
                                className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg transition-all text-[12px] font-medium ${
                                    isOpen ? "text-[#E3CCCD] bg-[#29206A]/40" : "text-white/50 hover:text-white/80 hover:bg-white/5"
                                }`}
                            >
                                <span>{section.label}</span>
                                <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                            </button>

                            <div className={`grid transition-all duration-200 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                                <div className="overflow-hidden">
                                    <div className="mt-1 space-y-0.5 ml-2 border-l border-[#E3CCCD]/20 pl-2 mb-1">
                                        {isLoading ? (
                                            <div className="flex justify-center py-6">
                                                <Loader2 className="w-5 h-5 animate-spin text-white/30" />
                                            </div>
                                        ) : section.items.length === 0 ? (
                                            <div className="text-[11px] text-white/30 italic py-1.5 px-2">Aucun élément dans cette catégorie.</div>
                                        ) : (
                                            section.items.map((perso) => (
                                                <button
                                                    key={perso.id}
                                                    type="button"
                                                    onClick={() => onSelect(perso.id, section.key)}
                                                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-all text-[12px] font-light flex items-center gap-2 ${
                                                        selectedId === perso.id
                                                            ? section.key === "pj" ? "bg-[#29206A]/60 text-white" : "bg-sky-500/14 text-white"
                                                            : "hover:bg-white/5 text-white/60 hover:text-white"
                                                    }`}
                                                >
                                                    <div className={`w-1 h-1 shrink-0 rounded-full ${selectedId === perso.id ? "bg-[#E3CCCD]" : "bg-[#E3CCCD]/30"}`} />
                                                    <span className="wrap-break-word min-w-0 flex-1">{perso.name}</span>
                                                    {section.key === "pnj" && perso.stats?.is_combatant && (
                                                        <Sword className="w-3 h-3 text-red-400/80 shrink-0" />
                                                    )}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {!mobileSummary && (
            <div className="p-4 space-y-3 shrink-0 bg-black/10 border-t border-white/5">
                {(!readOnly || (canCreateOwnPJ && openSection === 'pj')) && openSection && (
                    <button
                        type="button"
                        onClick={() => handleCreateForSection(openSection)}
                        className="w-full flex items-center justify-start gap-3 px-4 py-2.5 rounded-xl border border-[#E3CCCD]/30 bg-[#29206A]/40 text-white hover:bg-white/10 text-[13px] transition-all shadow-lg"
                    >
                        <UserPlus className="w-4 h-4 text-[#E3CCCD]" />
                        Ajouter
                    </button>
                )}
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="w-full flex items-center justify-start px-3 gap-3 py-2 text-white/60 hover:text-white text-[13px] transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Retour
                    </button>
                )}
            </div>
            )}
        </div>
    );
}