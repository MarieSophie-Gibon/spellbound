import { useState, type ReactNode } from "react";
import { ArrowLeft, BookOpen, ChevronDown, Plus } from "lucide-react";

function SectionPanel({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className={`grid transition-all duration-200 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

interface DndCompendiumSidebarProps {
  onBack: () => void;
  readOnly?: boolean;
}

export function DndCompendiumSidebar({
  onBack,
  readOnly = false,
}: DndCompendiumSidebarProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [activeSection, setActiveSection] = useState<"classes" | "races" | null>("classes");

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto py-2 px-3 scrollbar-thin scrollbar-thumb-white/5">
        <div className="w-full">
          {/* SECTION CLASSES */}
          <button
            onClick={() => setActiveSection((value) => (value === "classes" ? null : "classes"))}
            className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg transition-all text-[12px] font-medium ${activeSection === "classes" ? "text-[#E3CCCD] bg-[#29206A]/40" : "text-white/50 hover:text-white/80 hover:bg-white/5"}`}
          >
            <span>Classes</span>
            <span className="flex items-center gap-2">
              <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${activeSection === "classes" ? "rotate-180" : ""}`} />
            </span>
          </button>

          <SectionPanel open={activeSection === "classes"}>
            <div className="mt-1 space-y-0.5 ml-2 border-l border-[#E3CCCD]/20 pl-2 mb-1">
                <div className="text-[11px] text-white/30 italic py-1.5 px-2">Aucune classe.</div>
            </div>
          </SectionPanel>

          {/* SECTION RACES */}
          <button
            onClick={() => setActiveSection((value) => (value === "races" ? null : "races"))}
            className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg transition-all text-[12px] font-medium ${activeSection === "races" ? "text-[#E3CCCD] bg-[#29206A]/40" : "text-white/50 hover:text-white/80 hover:bg-white/5"}`}
          >
            <span>Races</span>
            <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${activeSection === "races" ? "rotate-180" : ""}`} />
          </button>
          <SectionPanel open={activeSection === "races"}>
            <div className="mt-1 space-y-0.5 ml-2 border-l border-[#E3CCCD]/20 pl-2 mb-1">
              <div className="text-[11px] text-white/30 italic py-1.5 px-2">Aucune race.</div>
            </div>
          </SectionPanel>
        </div>
      </div>

      <div className="p-4 space-y-3 shrink-0 bg-black/10 border-t border-white/5 relative">
        {!readOnly && showMenu && (
          <div className="absolute bottom-27.5 left-4 right-4 bg-[#1E1941]/95 border border-[#E3CCCD]/30 rounded-xl shadow-2xl backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 z-50">
            <button
              onClick={() => {
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-white hover:bg-white/10 transition-colors"
            >
              <BookOpen className="w-4 h-4 text-[#E3CCCD]" /> Ajouter une Classe
            </button>
          </div>
        )}

        {!readOnly && (
          <button
            onClick={() => setShowMenu((m) => !m)}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border ${showMenu ? "border-[#E3CCCD] bg-[#29206A]/60" : "border-[#E3CCCD]/30 bg-[#29206A]/40"} text-white hover:bg-white/10 text-[13px] transition-all shadow-lg`}
          >
            <div className="flex items-center gap-3">
              <Plus className={`w-4 h-4 transition-transform ${showMenu ? "rotate-45 text-[#E3CCCD]" : ""}`} />
              Peupler...
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${showMenu ? "rotate-180 text-[#E3CCCD]" : "text-white/50"}`} />
          </button>
        )}

        <button onClick={onBack} className="w-full flex items-center justify-start px-3 gap-3 py-2 text-white/60 hover:text-white text-[13px] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
      </div>
    </div>
  );
}