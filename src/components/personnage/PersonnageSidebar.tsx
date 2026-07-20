/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { User, UserPlus, Loader2, ArrowLeft, ChevronDown, Search, Sword } from "lucide-react";

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
    mobileSummary?: boolean;
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
    mobileSummary = false,
}: PersonnageSidebarProps) {
    const [query, setQuery] = useState("");
    const normalizedQuery = query.trim().toLowerCase();
    const filteredPjs = pjs.filter((perso) => !normalizedQuery || perso.name.toLowerCase().includes(normalizedQuery));
    const filteredPnjs = pnjs.filter((perso) => !normalizedQuery || perso.name.toLowerCase().includes(normalizedQuery));
    const [openSection, setOpenSection] = useState<"pj" | "pnj" | null>("pj");

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
            <div className="px-4 pt-4 pb-3 border-b border-[#E3CCCD]/14 space-y-3">
                {!mobileSummary && (
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#E3CCCD]/70">Sommaire des personnages</p>
                )}
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

            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 pt-3 space-y-2 scrollbar-thin scrollbar-thumb-white/20">
                {sections.map((section) => {
                    const isOpen = openSection === section.key;

                    return (
                        <div key={section.key} className="rounded-xl border border-[#E3CCCD]/16 bg-white/6 overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setOpenSection(isOpen ? null : section.key)}
                                className={`w-full px-3 py-2.5 text-left flex items-center justify-between transition-colors ${
                                    isOpen ? "bg-[#29206A]/45 text-[#E3CCCD]" : "text-white/68 hover:bg-white/10 hover:text-white"
                                }`}
                            >
                                <span className="text-[12px] font-medium truncate pr-2">{section.label}</span>
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                            </button>

                            <div className={`grid transition-all duration-300 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-70"}`}>
                                <div className="overflow-hidden">
                                    <div className="px-2 pb-2 space-y-1">
                                        {isLoading ? (
                                            <div className="flex justify-center py-8">
                                                <Loader2 className="w-6 h-6 animate-spin text-white/30" />
                                            </div>
                                        ) : section.items.length === 0 ? (
                                            <div className="px-3 py-2 text-[11px] text-white/40 italic">Aucun element dans cette categorie.</div>
                                        ) : (
                                            section.items.map((perso) => (
                                                <button
                                                    key={perso.id}
                                                    type="button"
                                                    onClick={() => onSelect(perso.id, section.key)}
                                                    className={`w-full text-left rounded-xl px-3 py-2.5 border transition-colors ${
                                                        selectedId === perso.id
                                                            ? section.key === "pj"
                                                                ? "bg-[#29206A]/50 border-[#E3CCCD]/30 text-white"
                                                                : "bg-sky-500/14 border-sky-500/30 text-white"
                                                            : "bg-white/4 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                                                    }`}
                                                >
                                                    <span className="flex items-center gap-2.5">
                                                        <span className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/15 bg-white/5 flex items-center justify-center">
                                                            {perso.image_url
                                                                ? <img src={perso.image_url} alt={perso.name} className="w-full h-full object-cover" />
                                                                : <User className="w-3.5 h-3.5 text-white/35" />}
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block text-[12px] leading-snug line-clamp-2">{perso.name}</span>
                                                            {(perso.stats?.sexe || perso.stats?.age) && (
                                                                <span className="block text-[10px] text-white/40 mt-0.5">
                                                                    {[perso.stats.sexe, perso.stats.age].filter(Boolean).join(" · ")}
                                                                </span>
                                                            )}
                                                        </span>
                                                        {section.key === "pnj" && perso.stats?.is_combatant && (
                                                            <Sword className="w-3 h-3 text-red-400/80 shrink-0" />
                                                        )}
                                                    </span>
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

            <div className="px-4 pb-4 space-y-2">
                {!readOnly && openSection && (
                    <button
                        type="button"
                        onClick={() => handleCreateForSection(openSection)}
                        className="w-full h-10 rounded-xl border border-[#E3CCCD]/35 bg-[#29206A]/55 text-white text-[12px] font-medium hover:bg-[#29206A]/70 transition-colors flex items-center justify-center gap-2"
                    >
                        <UserPlus className="w-3.5 h-3.5" />
                        Ajouter
                    </button>
                )}
                {!mobileSummary && onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="w-full h-9 rounded-lg border border-white/15 text-white/70 hover:text-white hover:bg-white/10 transition-colors text-[11px] flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Retour
                    </button>
                )}
            </div>
        </div>
    );
}