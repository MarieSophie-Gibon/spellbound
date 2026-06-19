/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChevronDown, FileText, FolderPlus, Plus, ArrowLeft, Loader2, BookOpen, Trash2, CheckCircle2 } from "lucide-react";

interface Chapitre {
  id: string;
  scenario_id: string;
  title: string;
  ordre: number;
  completed?: boolean;
}

interface Scenario {
  id: string;
  title: string;
  description: string | null;
  ordre: number;
}

interface ScenarioSidebarProps {
  scenarios: Scenario[];
  chapitres: Chapitre[];
  isLoading: boolean;
  selectedChapitreId: string | null;
  selectedScenarioId: string | null;
  expandedScenarios: Record<string, boolean>;
  onSelectChapitre: (id: string) => void;
  onSelectScenario: (id: string) => void;
  onToggleScenario: (id: string) => void;
  onCreateScenario: () => void;
  onCreateChapitre: (scenarioId: string) => void;
  onDeleteScenario: (id: string, title: string) => void;
  onDeleteChapitre: (id: string, title: string) => void;
  onToggleCompleted: (id: string, current: boolean) => void;
  onBack: () => void;
}

export function ScenarioSidebar({
  scenarios,
  chapitres,
  isLoading,
  selectedChapitreId,
  selectedScenarioId,
  expandedScenarios,
  onSelectChapitre,
  onSelectScenario,
  onToggleScenario,
  onCreateScenario,
  onCreateChapitre,
  onDeleteScenario,
  onDeleteChapitre,
  onToggleCompleted,
  onBack,
}: ScenarioSidebarProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-white/30" />
          </div>
        ) : scenarios.length === 0 ? (
          <div className="text-center py-10 px-4 space-y-2">
            <p className="text-[12px] text-white/25 italic">Aucun scénario rédigé.</p>
          </div>
        ) : (
          scenarios.map((scenario) => {
            const isExpanded = !!expandedScenarios[scenario.id];
            const relatedChapitres = chapitres
              .filter((c) => c.scenario_id === scenario.id)
              .sort((a, b) => a.ordre - b.ordre);

            return (
              <div key={scenario.id} className="space-y-0.5">
                <div
                  onClick={() => {
                    onSelectScenario(scenario.id);
                    onToggleScenario(scenario.id);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left border cursor-pointer group transition-all ${
                    selectedScenarioId === scenario.id && !selectedChapitreId
                      ? "bg-[#E3CCCD]/8 border-[#E3CCCD]/20"
                      : "bg-white/2 hover:bg-white/5 border-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <ChevronDown
                      className={`w-4 h-4 text-white/30 shrink-0 transition-transform ${
                        isExpanded ? "rotate-0" : "-rotate-90"
                      }`}
                    />
                    <BookOpen className="w-4 h-4 text-[#E3CCCD]/60 shrink-0" />
                    <span className="text-[13px] font-medium text-white/80 truncate">
                      {scenario.title}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteScenario(scenario.id, scenario.title);
                      }}
                      className="p-1 opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all"
                      title="Supprimer le scénario"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateChapitre(scenario.id);
                      }}
                      className="p-1 opacity-0 group-hover:opacity-100 text-white/40 hover:text-[#E3CCCD] hover:bg-white/10 rounded-md transition-all"
                      title="Ajouter un chapitre"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="pl-6 pr-1 py-0.5 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    {relatedChapitres.map((chapitre) => {
                      const isSelected = selectedChapitreId === chapitre.id;
                      return (
                        <div
                          key={chapitre.id}
                          onClick={() => onSelectChapitre(chapitre.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all text-[12px] group/item cursor-pointer ${
                            isSelected
                              ? "bg-[#E3CCCD]/10 text-[#E3CCCD] font-medium"
                              : "text-white/50 hover:bg-white/4 hover:text-white/80"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-[#E3CCCD]" : "text-white/25"}`} />
                            <span className={`truncate ${chapitre.completed ? "line-through text-white/30" : ""}`}>{chapitre.title}</span>
                          </div>
                          
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleCompleted(chapitre.id, !!chapitre.completed);
                              }}
                              className={`p-1 rounded-md transition-all ${
                                chapitre.completed
                                  ? "text-emerald-400 opacity-100"
                                  : "opacity-0 group-hover/item:opacity-100 text-white/30 hover:text-emerald-400"
                              }`}
                              title={chapitre.completed ? "Marquer comme non réalisé" : "Marquer comme réalisé"}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteChapitre(chapitre.id, chapitre.title);
                              }}
                              className="p-1 opacity-0 group-hover/item:opacity-100 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all shrink-0"
                              title="Supprimer le chapitre"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {relatedChapitres.length === 0 && (
                      <p className="text-[11px] text-white/20 italic pl-6 py-1">
                        Aucun chapitre.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 space-y-3 shrink-0 bg-black/10 border-t border-white/5">
        <button
          onClick={onCreateScenario}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#E3CCCD]/10 border border-[#E3CCCD]/25 text-[#E3CCCD]/80 hover:bg-[#E3CCCD]/18 hover:text-[#E3CCCD] transition-all text-[12px] font-medium"
        >
          <FolderPlus className="w-4 h-4" />
          Nouveau scénario
        </button>
        <button
          onClick={onBack}
          className="w-full flex items-center justify-start px-3 gap-3 py-2 text-white/60 hover:text-white text-[13px] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour au tableau
        </button>
      </div>
    </div>
  );
}