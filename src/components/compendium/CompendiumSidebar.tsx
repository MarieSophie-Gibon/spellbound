import React from "react";
import { ChevronDown, ArrowLeft, Plus, Users, BookOpen as BookOpenIcon, Swords, Wand2 } from "lucide-react";
import type { Peuple, Section } from "@/types/compendium";

interface CompendiumSidebarProps {
  activeSection: Section;
  peuples: Peuple[];
  selectedPeupleId: string | null;
  onSectionChange: (section: Section) => void;
  onSelectPeuple: (id: string) => void;
  onCreatePeuple: () => void;
  onBack: () => void;
}

const OTHER_SECTIONS: { id: Section; label: string }[] = [
  { id: 'familles', label: 'Familles' },
  { id: 'bestiaire', label: 'Bestiaire' },
  { id: 'objets', label: 'Objets Magiques' },
];

export function CompendiumSidebar({
  activeSection,
  peuples,
  selectedPeupleId,
  onSectionChange,
  onSelectPeuple,
  onCreatePeuple,
  onBack,
}: CompendiumSidebarProps) {
  return (
    <>
      <div className="flex-1 overflow-y-auto py-2 px-3 scrollbar-thin scrollbar-thumb-white/5">

        {/* SECTION PEUPLES */}
        <div className="w-full">
          <button
            onClick={() => onSectionChange('peuples')}
            className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg transition-all text-[12px] font-medium ${activeSection === 'peuples' ? 'text-[#E3CCCD] bg-[#29206A]/40' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
          >
            <span>Peuples</span>
            <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${activeSection === 'peuples' ? 'rotate-180' : ''}`} />
          </button>

          {activeSection === 'peuples' && (
            <div className="mt-1 space-y-0.5 ml-2 border-l border-[#E3CCCD]/20 pl-2 mb-1">
              {peuples.length === 0 ? (
                <div className="text-[11px] text-white/30 italic py-1.5 px-2">Aucun peuple.</div>
              ) : (
                peuples.map(peuple => (
                  <button
                    key={peuple.id}
                    onClick={() => onSelectPeuple(peuple.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-all text-[12px] font-light flex items-center gap-2 ${selectedPeupleId === peuple.id ? "bg-[#29206A]/60 text-white" : "hover:bg-white/5 text-white/60 hover:text-white"}`}
                  >
                    <div className={`w-1 h-1 shrink-0 rounded-full ${selectedPeupleId === peuple.id ? "bg-[#E3CCCD]" : "bg-[#E3CCCD]/30"}`} />
                    <span className="truncate">{peuple.nom}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* AUTRES SECTIONS */}
        {OTHER_SECTIONS.map(section => (
          <div key={section.id} className="w-full">
            <button
              onClick={() => onSectionChange(section.id)}
              className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg transition-all text-[12px] font-medium ${activeSection === section.id ? 'text-[#E3CCCD] bg-[#29206A]/40' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
            >
              <span>{section.label}</span>
              <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${activeSection === section.id ? 'rotate-180' : ''}`} />
            </button>
            {activeSection === section.id && (
              <div className="mt-1 ml-2 border-l border-[#E3CCCD]/20 pl-2 mb-1">
                <div className="text-[11px] text-white/30 italic py-1.5 px-2 uppercase tracking-widest">En construction</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ACTIONS */}
      <SidebarActions onCreatePeuple={onCreatePeuple} onBack={onBack} />
    </>
  );
}

function SidebarActions({ onCreatePeuple, onBack }: { onCreatePeuple: () => void; onBack: () => void }) {
  const [showMenu, setShowMenu] = React.useState(false);

  return (
    <div className="p-4 space-y-3 shrink-0 bg-black/10 border-t border-white/5 relative">
      {showMenu && (
        <div className="absolute bottom-27.5 left-4 right-4 bg-[#1E1941]/95 border border-[#E3CCCD]/30 rounded-xl shadow-2xl backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 z-50">
          <button
            onClick={() => { onCreatePeuple(); setShowMenu(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-white hover:bg-white/10 transition-colors border-b border-white/5"
          >
            <Users className="w-4 h-4 text-[#E3CCCD]" /> Ajouter un Peuple
          </button>
          <button disabled className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-white/30 cursor-not-allowed border-b border-white/5">
            <BookOpenIcon className="w-4 h-4" /> Ajouter une Famille <span className="text-[9px] uppercase tracking-widest ml-auto border border-white/10 px-1.5 rounded">Bientôt</span>
          </button>
          <button disabled className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-white/30 cursor-not-allowed border-b border-white/5">
            <Swords className="w-4 h-4" /> Créer un Monstre <span className="text-[9px] uppercase tracking-widest ml-auto border border-white/10 px-1.5 rounded">Bientôt</span>
          </button>
          <button disabled className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-white/30 cursor-not-allowed">
            <Wand2 className="w-4 h-4" /> Créer un Objet <span className="text-[9px] uppercase tracking-widest ml-auto border border-white/10 px-1.5 rounded">Bientôt</span>
          </button>
        </div>
      )}

      <button
        onClick={() => setShowMenu(m => !m)}
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border ${showMenu ? 'border-[#E3CCCD] bg-[#29206A]/60' : 'border-[#E3CCCD]/30 bg-[#29206A]/40'} text-white hover:bg-white/10 text-[13px] transition-all shadow-lg`}
      >
        <div className="flex items-center gap-3">
          <Plus className={`w-4 h-4 transition-transform ${showMenu ? 'rotate-45 text-[#E3CCCD]' : ''}`} />
          Peupler...
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${showMenu ? "rotate-180 text-[#E3CCCD]" : "text-white/50"}`} />
      </button>

      <button onClick={onBack} className="w-full flex items-center justify-start px-3 gap-3 py-2 text-white/60 hover:text-white text-[13px] transition-colors">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>
    </div>
  );
}
