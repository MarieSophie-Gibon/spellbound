import React, { useState } from "react";
import { ChevronDown, ArrowLeft, Plus, Users, BookOpen as BookOpenIcon, Swords, Wand2 } from "lucide-react";
import type { Peuple, Famille, Monstre, Section } from "@/types/compendium";

function SectionPanel({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div className={`grid transition-all duration-200 ease-in-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
      <div className="overflow-hidden">
        {children}
      </div>
    </div>
  );
}

interface CompendiumSidebarProps {
  activeSection: Section | null;
  peuples: Peuple[];
  selectedPeupleId: string | null;
  familles: Famille[];
  selectedFamilleId: string | null;
  monstres: Monstre[];
  selectedMonstreId: string | null;
  onSectionChange: (section: Section | null) => void;
  onSelectPeuple: (id: string) => void;
  onSelectFamille: (id: string) => void;
  onSelectMonstre: (id: string) => void;
  onCreatePeuple: () => void;
  onCreateProfil: () => void;
  onCreateMonstre: () => void;
  onBack: () => void;
}

export function CompendiumSidebar({
  activeSection,
  peuples,
  selectedPeupleId,
  familles,
  selectedFamilleId,
  monstres,
  selectedMonstreId,
  onSectionChange,
  onSelectPeuple,
  onSelectFamille,
  onSelectMonstre,
  onCreatePeuple,
  onCreateProfil,
  onCreateMonstre,
  onBack,
}: CompendiumSidebarProps) {
  const [expandedGroupes, setExpandedGroupes] = useState<Set<string>>(new Set());
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  const toggleType = (type: string) => {
    setExpandedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const monstresParType = monstres.reduce<Record<string, Monstre[]>>((acc, m) => {
    const t = m.type_creature || "Autre";
    if (!acc[t]) acc[t] = [];
    acc[t].push(m);
    return acc;
  }, {});
  const typesOrdonnes = Object.keys(monstresParType).sort();

  const toggleGroupe = (groupe: string) => {
    setExpandedGroupes(prev => {
      const next = new Set(prev);
      if (next.has(groupe)) next.delete(groupe);
      else next.add(groupe);
      return next;
    });
  };

  // Regrouper les familles par groupe
  const famillesParGroupe = familles.reduce<Record<string, Famille[]>>((acc, f) => {
    const g = f.groupe || "Autre";
    if (!acc[g]) acc[g] = [];
    acc[g].push(f);
    return acc;
  }, {});
  const groupesOrdonnes = Object.keys(famillesParGroupe).sort();
  return (
    <>
      <div className="flex-1 overflow-y-auto py-2 px-3 scrollbar-thin scrollbar-thumb-white/5">

        {/* SECTION PEUPLES */}
        <div className="w-full">
          <button
            onClick={() => onSectionChange(activeSection === 'peuples' ? null : 'peuples')}
            className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg transition-all text-[12px] font-medium ${activeSection === 'peuples' ? 'text-[#E3CCCD] bg-[#29206A]/40' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
          >
            <span>Peuples</span>
            <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${activeSection === 'peuples' ? 'rotate-180' : ''}`} />
          </button>

          <SectionPanel open={activeSection === 'peuples'}>
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
          </SectionPanel>
        </div>

        {/* SECTION FAMILLES */}
        <div className="w-full">
          <button
            onClick={() => onSectionChange(activeSection === 'familles' ? null : 'familles')}
            className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg transition-all text-[12px] font-medium ${activeSection === 'familles' ? 'text-[#E3CCCD] bg-[#29206A]/40' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
          >
            <span>Familles</span>
            <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${activeSection === 'familles' ? 'rotate-180' : ''}`} />
          </button>
          <SectionPanel open={activeSection === 'familles'}>
            <div className="mt-1 space-y-0.5 ml-2 border-l border-[#E3CCCD]/20 pl-2 mb-1">
              {familles.length === 0 ? (
                <div className="text-[11px] text-white/30 italic py-1.5 px-2">Aucune famille.</div>
              ) : (
                groupesOrdonnes.map(groupe => {
                  const isOpen = expandedGroupes.has(groupe);
                  return (
                    <div key={groupe}>
                      <button
                        onClick={() => toggleGroupe(groupe)}
                        className="flex items-center justify-between w-full px-2 py-1 rounded-md transition-all text-[11px] font-semibold uppercase tracking-widest text-white/40 hover:text-white/70 hover:bg-white/5"
                      >
                        <span>{groupe}</span>
                        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <SectionPanel open={isOpen}>
                        <div className="mt-0.5 space-y-0.5 ml-1 border-l border-white/10 pl-2">
                          {famillesParGroupe[groupe].map(famille => (
                            <button
                              key={famille.id}
                              onClick={() => onSelectFamille(famille.id)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-all text-[12px] font-light flex items-center gap-2 ${selectedFamilleId === famille.id ? "bg-[#29206A]/60 text-white" : "hover:bg-white/5 text-white/60 hover:text-white"}`}
                            >
                              <div className={`w-1 h-1 shrink-0 rounded-full ${selectedFamilleId === famille.id ? "bg-[#E3CCCD]" : "bg-[#E3CCCD]/30"}`} />
                              <span className="truncate">{famille.nom}</span>
                            </button>
                          ))}
                        </div>
                      </SectionPanel>
                    </div>
                  );
                })
              )}
            </div>
          </SectionPanel>
        </div>

        {/* SECTION BESTIAIRE */}
        <div className="w-full">
          <button
            onClick={() => onSectionChange(activeSection === 'bestiaire' ? null : 'bestiaire')}
            className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg transition-all text-[12px] font-medium ${activeSection === 'bestiaire' ? 'text-[#E3CCCD] bg-[#29206A]/40' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
          >
            <span>Bestiaire</span>
            <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${activeSection === 'bestiaire' ? 'rotate-180' : ''}`} />
          </button>
          <SectionPanel open={activeSection === 'bestiaire'}>
            <div className="mt-1 space-y-0.5 ml-2 border-l border-[#E3CCCD]/20 pl-2 mb-1">
              {monstres.length === 0 ? (
                <div className="text-[11px] text-white/30 italic py-1.5 px-2">Aucune créature.</div>
              ) : (
                typesOrdonnes.map(type => {
                  const isOpen = expandedTypes.has(type);
                  return (
                    <div key={type}>
                      <button
                        onClick={() => toggleType(type)}
                        className="flex items-center justify-between w-full px-2 py-1 rounded-md transition-all text-[11px] font-semibold uppercase tracking-widest text-white/40 hover:text-white/70 hover:bg-white/5"
                      >
                        <span>{type}</span>
                        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <SectionPanel open={isOpen}>
                        <div className="mt-0.5 space-y-0.5 ml-1 border-l border-white/10 pl-2">
                          {monstresParType[type].map(monstre => (
                            <button
                              key={monstre.id}
                              onClick={() => onSelectMonstre(monstre.id)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-all text-[12px] font-light flex items-center gap-2 ${selectedMonstreId === monstre.id ? "bg-[#29206A]/60 text-white" : "hover:bg-white/5 text-white/60 hover:text-white"}`}
                            >
                              <div className={`w-1 h-1 shrink-0 rounded-full ${selectedMonstreId === monstre.id ? "bg-[#E3CCCD]" : "bg-[#E3CCCD]/30"}`} />
                              <span className="truncate flex-1">{monstre.nom}</span>
                              <span className="text-[10px] text-white/30 font-mono shrink-0">NC {monstre.nc}</span>
                            </button>
                          ))}
                        </div>
                      </SectionPanel>
                    </div>
                  );
                })
              )}
            </div>
          </SectionPanel>
        </div>

        {/* SECTION OBJETS */}
        <div className="w-full">
          <button
            onClick={() => onSectionChange(activeSection === 'objets' ? null : 'objets')}
            className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg transition-all text-[12px] font-medium ${activeSection === 'objets' ? 'text-[#E3CCCD] bg-[#29206A]/40' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
          >
            <span>Objets Magiques</span>
            <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${activeSection === 'objets' ? 'rotate-180' : ''}`} />
          </button>
          <SectionPanel open={activeSection === 'objets'}>
            <div className="mt-1 ml-2 border-l border-[#E3CCCD]/20 pl-2 mb-1">
              <div className="text-[11px] text-white/30 italic py-1.5 px-2 uppercase tracking-widest">En construction</div>
            </div>
          </SectionPanel>
        </div>
      </div>

      {/* ACTIONS */}
      <SidebarActions onCreatePeuple={onCreatePeuple} onCreateProfil={onCreateProfil} onCreateMonstre={onCreateMonstre} onBack={onBack} />
    </>
  );
}

function SidebarActions({ onCreatePeuple, onCreateProfil, onCreateMonstre, onBack }: { onCreatePeuple: () => void; onCreateProfil: () => void; onCreateMonstre: () => void; onBack: () => void }) {
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
          <button
            onClick={() => { onCreateProfil(); setShowMenu(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-white hover:bg-white/10 transition-colors border-b border-white/5"
          >
            <BookOpenIcon className="w-4 h-4 text-[#E3CCCD]" /> Ajouter un Profil
          </button>
          <button
            onClick={() => { onCreateMonstre(); setShowMenu(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-white hover:bg-white/10 transition-colors border-b border-white/5"
          >
            <Swords className="w-4 h-4 text-[#E3CCCD]" /> Ajouter une Créature
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
