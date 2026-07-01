/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { User, UserPlus, Loader2, ArrowLeft, Sword, Users } from "lucide-react";

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
}: PersonnageSidebarProps) {
    // État local pour savoir quel onglet est actif
    const [activeTab, setActiveTab] = useState<"pj" | "pnj">("pj");

    // Liste affichée en fonction de l'onglet
    const displayedList = activeTab === "pj" ? pjs : pnjs;

    const handleCreate = () => {
        if (activeTab === "pj") {
            if (onCreatePJClick) onCreatePJClick();
            else if (onCreateClick) onCreateClick(); // Rétrocompatibilité
        } else {
            if (onCreatePNJClick) onCreatePNJClick();
            else if (onCreateClick) onCreateClick();
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* SÉLECTEUR D'ONGLETS */}
            <div className="flex p-2 gap-1 border-b border-white/10 shrink-0 bg-black/10">
                <button 
                    onClick={() => setActiveTab("pj")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${
                        activeTab === "pj" 
                        ? "bg-[#E3CCCD]/15 text-[#E3CCCD] border border-[#E3CCCD]/30" 
                        : "text-white/40 hover:bg-white/5 hover:text-white/80 border border-transparent"
                    }`}
                >
                    <User className="w-3.5 h-3.5" />
                    Joueurs
                </button>
                <button 
                    onClick={() => setActiveTab("pnj")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${
                        activeTab === "pnj" 
                        ? "bg-sky-500/15 text-sky-400 border border-sky-500/30" 
                        : "text-white/40 hover:bg-white/5 hover:text-white/80 border border-transparent"
                    }`}
                >
                    <Users className="w-3.5 h-3.5" />
                    PNJ
                </button>
            </div>

            {/* LISTE DES PERSONNAGES */}
            <div className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-white/10">
                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin text-white/30" />
                    </div>
                ) : displayedList.length === 0 ? (
                    <p className="text-[12px] text-white/25 italic text-center py-10 px-4">
                        Aucun personnage dans cette catégorie.
                    </p>
                ) : (
                    displayedList.map(perso => (
                        <button
                            key={perso.id}
                            onClick={() => onSelect(perso.id, activeTab)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/5 ${
                                selectedId === perso.id 
                                    ? activeTab === "pj" 
                                        ? "bg-[#E3CCCD]/10 border-r-2 border-[#E3CCCD]/50" 
                                        : "bg-sky-500/10 border-r-2 border-sky-500/50"
                                    : ""
                            }`}
                        >
                            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/15 bg-white/5 flex items-center justify-center">
                                {perso.image_url
                                    ? <img src={perso.image_url} alt={perso.name} className="w-full h-full object-cover" />
                                    : <User className="w-4 h-4 text-white/30" />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                    <p className={`text-[13px] font-medium break-words min-w-0 ${
                                        selectedId === perso.id 
                                            ? activeTab === "pj" ? "text-[#E3CCCD]" : "text-sky-400"
                                            : "text-white/70"
                                    }`}>
                                        {perso.name}
                                    </p>
                                    {/* Petit badge Épée pour les PNJ Combattants */}
                                    {activeTab === "pnj" && perso.stats?.is_combatant && (
                                        <Sword className="w-3 h-3 text-red-400/80 shrink-0" />
                                    )}
                                </div>
                                {(perso.stats?.sexe || perso.stats?.age) && (
                                    <p className="text-[11px] text-white/35 break-words min-w-0 mt-0.5">
                                        {[perso.stats.sexe, perso.stats.age].filter(Boolean).join(" · ")}
                                    </p>
                                )}
                            </div>
                        </button>
                    ))
                )}
            </div>

            {/* FOOTER : BOUTONS D'ACTION */}
            <div className="p-4 space-y-3 shrink-0 bg-black/10 border-t border-white/5">
                {!readOnly && (
                  <button
                    onClick={handleCreate}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all text-[12px] font-medium ${
                        activeTab === "pj"
                        ? "bg-[#E3CCCD]/10 border-[#E3CCCD]/25 text-[#E3CCCD]/80 hover:bg-[#E3CCCD]/20 hover:text-[#E3CCCD]"
                        : "bg-sky-500/10 border-sky-500/25 text-sky-400/80 hover:bg-sky-500/20 hover:text-sky-400"
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    Créer un {activeTab === "pj" ? "PJ" : "PNJ"}
                  </button>
                )}
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