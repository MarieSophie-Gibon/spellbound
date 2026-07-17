import { useCallback, useState } from "react";
import { Check, ChevronRight, Ghost, Plus, Search, Swords, UserRound, Users, X } from "lucide-react";
import type { SearchResult } from "./types";

interface FamilierResult {
  id: string;
  name: string;
  image_url: string | null;
  pv_max: number;
  pv: number;
  owner: string;
  data: Record<string, unknown> | null;
}

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
  onAddFromSearch: (result: SearchResult) => void | Promise<void>;
  familierResults: FamilierResult[];
  onAddFamilier: (f: FamilierResult) => void;
  combatantCounts?: Record<string, number>;
}

export function CombatMenu({
  isOpen,
  onClose,
  importingCompany,
  importingEngaged,
  onImportCompany,
  onImportEngaged,
  searchTerm,
  searchResults,
  onSetSearchType,
  onSetSearchTerm,
  onAddFromSearch,
  familierResults,
  onAddFamilier,
  combatantCounts = {},
}: CombatMenuProps) {
  const [submenu, setSubmenu] = useState<"monster" | "npc" | "familier" | null>(null);
  const [familierFilter, setFamilierFilter] = useState("");
  const [flashedIds, setFlashedIds] = useState<Set<string>>(new Set());

  const flashId = useCallback((id: string) => {
    setFlashedIds((prev) => new Set(prev).add(id));
    setTimeout(() => setFlashedIds((prev) => { const next = new Set(prev); next.delete(id); return next; }), 1200);
  }, []);

  const openSubmenu = (type: "monster" | "npc") => {
    if (submenu === type) {
      setSubmenu(null);
    } else {
      onSetSearchType(type);
      onSetSearchTerm("");
      setSubmenu(type);
    }
  };

  return (
    <div className={`absolute top-11 left-4 z-50 flex items-start gap-2 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
      {/* Panneau principal */}
      <div
        className={`w-56 bg-[#1C1740]/60 backdrop-blur-2xl border border-white/14 rounded-2xl p-3 transition-all duration-200
          ${isOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none"}`}
      >
        <div className="flex items-center justify-between mb-3 px-0.5">
          <h3 className="text-[10px] uppercase tracking-[0.18em] text-white/70 font-semibold">Menu MJ</h3>
          <button onClick={() => { onClose(); setSubmenu(null); }} className="text-white/45 hover:text-white/80 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          {/* Synchronisations */}
          <button
            onClick={onImportCompany}
            disabled={importingCompany}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/6 hover:bg-white/12 text-white/90 text-sm transition-colors border border-white/12"
          >
            <UserRound className="w-4 h-4 text-blue-300 shrink-0" />
            <span className="text-xs truncate">{importingCompany ? "Import..." : "Synchroniser la Compagnie"}</span>
          </button>
          <button
            onClick={onImportEngaged}
            disabled={importingEngaged}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/6 hover:bg-white/12 text-white/90 text-sm transition-colors border border-white/12"
          >
            <Swords className="w-4 h-4 text-rose-300 shrink-0" />
            <span className="text-xs truncate">{importingEngaged ? "Import..." : "Synchroniser les engagés"}</span>
          </button>

          <div className="h-px bg-white/12 my-2" />

          {/* Boutons sous-menus */}
          <button
            onClick={() => openSubmenu("monster")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors border ${
              submenu === "monster"
                ? "bg-red-500/20 border-red-500/40 text-red-200"
                : "bg-white/6 hover:bg-white/12 text-white/90 border-white/12"
            }`}
          >
            <Ghost className="w-4 h-4 shrink-0" />
            <span className="text-xs flex-1 text-left">Ajouter un Monstre</span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${submenu === "monster" ? "rotate-90" : ""}`} />
          </button>
          <button
            onClick={() => openSubmenu("npc")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors border ${
              submenu === "npc"
                ? "bg-purple-500/20 border-purple-500/40 text-purple-200"
                : "bg-white/6 hover:bg-white/12 text-white/90 border-white/12"
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="text-xs flex-1 text-left">Ajouter un PNJ</span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${submenu === "npc" ? "rotate-90" : ""}`} />
          </button>
          <button
            onClick={() => { setSubmenu(submenu === "familier" ? null : "familier"); setFamilierFilter(""); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors border ${
              submenu === "familier"
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200"
                : "bg-white/6 hover:bg-white/12 text-white/90 border-white/12"
            }`}
          >
            <span className="text-base leading-none shrink-0">🐾</span>
            <span className="text-xs flex-1 text-left">Ajouter un Familier</span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${submenu === "familier" ? "rotate-90" : ""}`} />
          </button>
        </div>
      </div>

      {/* Sous-menu volant — Monstres / PNJs */}
      <div
        className={`w-60 bg-[#1C1740]/60 backdrop-blur-2xl border rounded-2xl p-3 transition-all duration-200 ${
          submenu === "monster" ? "border-red-500/30" : "border-purple-500/30"
        } ${submenu === "monster" || submenu === "npc" ? "opacity-100 translate-x-0 pointer-events-auto" : "opacity-0 -translate-x-2 pointer-events-none"}`}
      >
        <div className="flex items-center justify-between mb-3 px-0.5">
          <h3 className={`text-[10px] uppercase tracking-[0.18em] font-semibold ${submenu === "monster" ? "text-red-300/80" : "text-purple-300/80"}`}>
            {submenu === "monster" ? "Monstres" : "PNJs"}
          </h3>
          <button onClick={() => setSubmenu(null)} className="text-white/45 hover:text-white/80 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/35" />
          <input
            value={searchTerm}
            onChange={(e) => onSetSearchTerm(e.target.value)}
            placeholder="Rechercher..."
            className="w-full bg-white/4 border border-white/12 rounded-lg pl-8 pr-3 py-2 text-sm text-white/90 placeholder:text-white/35 outline-none focus:border-white/25 transition-colors"
            autoFocus
          />
        </div>

        <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-0.5">
          {searchResults.length === 0 && (
            <p className="text-[11px] text-white/30 italic text-center py-2">Aucun résultat</p>
          )}
          {searchResults.map((res) => {
            const isMonster = res.type === "monster";
            const count = combatantCounts[res.id] ?? 0;
            const flashed = flashedIds.has(res.id);
            return (
              <button
                key={`${res.type}-${res.id}`}
                onClick={() => {
                  void onAddFromSearch(res);
                  if (isMonster) {
                    flashId(res.id);
                  } else {
                    setSubmenu(null);
                  }
                }}
                className={`w-full flex items-center gap-2.5 p-2 rounded-lg transition-all text-left group border ${
                  flashed
                    ? "bg-emerald-500/15 border-emerald-500/40"
                    : "bg-white/4 hover:bg-white/9 border-transparent hover:border-white/10"
                }`}
              >
                <img src={res.image_url || "/default-avatar.png"} alt={res.name} className="w-8 h-8 rounded-full object-cover border border-white/20 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white/90 truncate">{res.name}</div>
                </div>
                {count > 0 && (
                  <span className="text-[10px] font-bold text-white/60 bg-white/12 rounded-full w-5 h-5 flex items-center justify-center shrink-0">{count}</span>
                )}
                {flashed
                  ? <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  : <Plus className="w-4 h-4 text-white/35 group-hover:text-white/85 shrink-0" />
                }
              </button>
            );
          })}
        </div>
      </div>

      {/* Sous-menu volant — Familiers */}
      <div
        className={`w-60 bg-[#1C1740]/60 backdrop-blur-2xl border border-emerald-500/30 rounded-2xl p-3 transition-all duration-200 ${
          submenu === "familier" ? "opacity-100 translate-x-0 pointer-events-auto" : "opacity-0 -translate-x-2 pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between mb-3 px-0.5">
          <h3 className="text-[10px] uppercase tracking-[0.18em] font-semibold text-emerald-300/80">Familiers</h3>
          <button onClick={() => setSubmenu(null)} className="text-white/45 hover:text-white/80 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/35" />
          <input
            value={familierFilter}
            onChange={(e) => setFamilierFilter(e.target.value)}
            placeholder="Filtrer..."
            className="w-full bg-white/4 border border-white/12 rounded-lg pl-8 pr-3 py-2 text-sm text-white/90 placeholder:text-white/35 outline-none focus:border-emerald-500/30 transition-colors"
            autoFocus
          />
        </div>

        <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-0.5">
          {familierResults.length === 0 && (
            <p className="text-[11px] text-white/30 italic text-center py-2">Aucun familier dans la campagne</p>
          )}
          {familierResults
            .filter((f) => !familierFilter || f.name.toLowerCase().includes(familierFilter.toLowerCase()))
            .map((f) => (
              <button
                key={f.id}
                onClick={() => { onAddFamilier(f); setSubmenu(null); }}
                className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-white/4 hover:bg-emerald-500/10 transition-colors text-left group border border-transparent hover:border-emerald-500/20"
              >
                <img src={f.image_url || "/default-avatar.png"} alt={f.name} className="w-8 h-8 rounded-full object-cover border border-white/20 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white/90 truncate">{f.name}</div>
                  <div className="text-[10px] text-white/35 truncate">{f.owner}</div>
                </div>
                <Plus className="w-4 h-4 text-white/35 group-hover:text-emerald-400 shrink-0" />
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
