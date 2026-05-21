/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { BookLayout } from "@/components/layout/BookLayout";
import { supabase } from "@/lib/supabase";
import { ScenarioSidebar } from "@/components/scenarios/ScenarioSidebar";
import { ScenarioModal, ChapitreModal } from "@/components/scenarios/ScenarioModals";
import { ChapitreEditor } from "@/components/scenarios/ChapitreEditor";
import { BookOpen } from "lucide-react";

interface ScenariosProps {
  campaignId: string;
  onBack: () => void;
}

export function Scenarios({ campaignId, onBack }: ScenariosProps) {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [chapitres, setChapitres] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChapitreId, setSelectedChapitreId] = useState<string | null>(null);
  const [expandedScenarios, setExpandedScenarios] = useState<Record<string, boolean>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Gestion des Modales
  const [showScenarioModal, setShowScenarioModal] = useState(false);
  const [chapitreModalConfig, setChapitreModalConfig] = useState<{ isOpen: boolean; scenarioId: string }>({ isOpen: false, scenarioId: "" });

  const fetchData = useCallback(async () => {
    const { data: scData } = await supabase
      .from("scenarios")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("ordre", { ascending: true });

    if (scData) {
      setScenarios(scData);
      
      const scIds = scData.map((s) => s.id);
      if (scIds.length > 0) {
        const { data: chData } = await supabase
          .from("chapitres")
          .select("id, scenario_id, title, ordre")
          .in("scenario_id", scIds)
          .order("ordre", { ascending: true });
          
        if (chData) setChapitres(chData);
      } else {
        setChapitres([]);
      }
    }
    setIsLoading(false);
  }, [campaignId]);

  useEffect(() => {
    const initFetch = async () => {
      await fetchData();
    };
    initFetch();
  }, [fetchData]);

  const handleToggleScenario = (id: string) => {
    setExpandedScenarios((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const sidebar = (
    <ScenarioSidebar
      scenarios={scenarios}
      chapitres={chapitres}
      isLoading={isLoading}
      selectedChapitreId={selectedChapitreId}
      expandedScenarios={expandedScenarios}
      onSelectChapitre={setSelectedChapitreId}
      onToggleScenario={handleToggleScenario}
      onCreateScenario={() => setShowScenarioModal(true)}
      onCreateChapitre={(scenarioId) => setChapitreModalConfig({ isOpen: true, scenarioId })}
      onBack={onBack}
    />
  );

  return (
    <>
      <BookLayout spineTitle="Scénarios" sidebar={sidebar} hideSidebar={isFullscreen}>
        {selectedChapitreId ? (
          <ChapitreEditor chapitreId={selectedChapitreId} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 h-full opacity-60">
            <BookOpen className="w-16 h-16 text-[#E3CCCD]/20 mb-6" />
            <h2 className="font-serif text-xl text-white tracking-widest uppercase mb-2 leading-none">
              Campagne & Récits
            </h2>
            <p className="text-[12px] text-white/40 italic font-light max-w-xs">
              Sélectionnez un chapitre ou créez un arc narratif dans le sommaire pour déployer vos modules de jeu.
            </p>
          </div>
        )}
      </BookLayout>

      {/* Modale Scénario */}
      {showScenarioModal && (
        <ScenarioModal
          campaignId={campaignId}
          onClose={() => setShowScenarioModal(false)}
          onSuccess={() => {
            fetchData();
            setShowScenarioModal(false);
          }}
        />
      )}

      {/* Modale Chapitre */}
      {chapitreModalConfig.isOpen && (
        <ChapitreModal
          scenarioId={chapitreModalConfig.scenarioId}
          onClose={() => setChapitreModalConfig({ isOpen: false, scenarioId: "" })}
          onSuccess={(newChapitreId) => {
            fetchData();
            setChapitreModalConfig({ isOpen: false, scenarioId: "" });
            
            // On ouvre automatiquement l'accordéon du scénario concerné
            setExpandedScenarios((prev) => ({ ...prev, [chapitreModalConfig.scenarioId]: true }));
            
            // On sélectionne le nouveau chapitre pour l'éditer tout de suite
            if (newChapitreId) {
              setSelectedChapitreId(newChapitreId);
            }
          }}
        />
      )}
    </>
  );
}