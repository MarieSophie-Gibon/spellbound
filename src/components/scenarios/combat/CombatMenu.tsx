import { Plus, Search, Swords, UserRound, X } from "lucide-react";
import type { SearchResult } from "./types";

interface CombatMenuProps {
  isOpen: boolean;
  onClose: () => void;
  importingCompany: boolean;
  importingEngaged: boolean;
  onImportCompany: () => void;
  onImportEngaged: () => void;
  searchType: "monster" | "npc";
  searchTerm: string;
  searchResults: SearchResult[];
  onSetSearchType: (type: "monster" | "npc") => void;
  onSetSearchTerm: (term: string) => void;
  onAddFromSearch: (result: SearchResult) => void;
}

export function CombatMenu({
  isOpen,
  onClose,
  importingCompany,
  importingEngaged,
  onImportCompany,
  onImportEngaged,
  searchType,
  searchTerm,
  searchResults,
  onSetSearchType,
  onSetSearchTerm,
  onAddFromSearch,
}: CombatMenuProps) {
  return (
    <div
      className={`absolute top-11 left-4 w-64 max-h-[72vh] bg-[#1C1740]/50 backdrop-blur-2xl border border-white/14 rounded-2xl p-3 z-50 transition-all duration-200
        ${isOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none"}`}
    >
      <div className="flex items-center justify-between mb-3 px-0.5">
        <h3 className="text-[10px] uppercase tracking-[0.18em] text-white/70 font-semibold">Menu MJ</h3>
        <button onClick={onClose} className="text-white/45 hover:text-white/80 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-y-auto pr-1 max-h-[calc(72vh-2.5rem)] space-y-3">
        {/* Import rapide */}
        <button
          onClick={onImportCompany}
          disabled={importingCompany}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/6 hover:bg-white/12 text-white/90 text-sm transition-colors border border-white/12"
        >
          <UserRound className="w-4 h-4 text-blue-300" />
          {importingCompany ? "Import..." : "Synchroniser la Compagnie"}
        </button>
        <button
          onClick={onImportEngaged}
          disabled={importingEngaged}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/6 hover:bg-white/12 text-white/90 text-sm transition-colors border border-white/12"
        >
          <Swords className="w-4 h-4 text-rose-300" />
          {importingEngaged ? "Import..." : "Synchroniser les engagés"}
        </button>

        <div className="h-px bg-white/12" />

        {/* Toggle monstre / PNJ */}
        <div className="flex p-1 bg-white/4 rounded-md border border-white/10 backdrop-blur-sm">
          <button
            onClick={() => onSetSearchType("monster")}
            className={`flex-1 py-1.5 rounded text-xs transition-colors ${searchType === "monster" ? "bg-white/16 text-white" : "text-white/55 hover:text-white/75"}`}
          >
            Monstre
          </button>
          <button
            onClick={() => onSetSearchType("npc")}
            className={`flex-1 py-1.5 rounded text-xs transition-colors ${searchType === "npc" ? "bg-white/16 text-white" : "text-white/55 hover:text-white/75"}`}
          >
            PNJ
          </button>
        </div>

        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
          <input
            value={searchTerm}
            onChange={(e) => onSetSearchTerm(e.target.value)}
            placeholder="Chercher et ajouter..."
            className="w-full bg-white/4 border border-white/12 rounded-lg pl-9 pr-3 py-2 text-sm text-white/90 placeholder:text-white/35 outline-none"
          />
        </div>

        {/* Résultats */}
        <div className="space-y-2 max-h-[30vh] overflow-hidden pr-1">
          {searchResults.map((res) => (
            <button
              key={`${res.type}-${res.id}`}
              onClick={() => onAddFromSearch(res)}
              className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-white/4 hover:bg-white/9 transition-colors text-left group border border-transparent hover:border-white/10"
            >
              <img
                src={res.image_url || "/default-avatar.png"}
                alt={res.name}
                className="w-8 h-8 rounded-full object-cover border border-white/20"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white/90 truncate">{res.name}</div>
              </div>
              <Plus className="w-4 h-4 text-white/35 group-hover:text-white/85" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
