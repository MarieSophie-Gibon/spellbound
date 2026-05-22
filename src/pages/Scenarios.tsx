/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { BookLayout } from "@/components/layout/BookLayout";
import { supabase } from "@/lib/supabase";
import { ScenarioSidebar } from "@/components/scenarios/ScenarioSidebar";
import { ScenarioModal, ChapitreModal } from "@/components/scenarios/ScenarioModals";
import { ChapitreEditor } from "@/components/scenarios/ChapitreEditor";
import { BookOpen, AlertTriangle } from "lucide-react";

interface ScenariosProps {
  campaignId: string;
  onBack: () => void;
}

// Modale de confirmation de suppression générique
function DeleteNodeModal({
  name,
  isDeleting,
  type,
  onConfirm,
  onCancel,
}: {
  name: string;
  isDeleting: boolean;
  type: 'scenario' | 'chapitre';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-[#1E1941] border border-[#ff6b6b]/30 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-red-900/20 animate-in zoom-in-95">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#ff6b6b]/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-[#ff6b6b]" />
          </div>
          <h3 className="text-xl font-serif text-white">Supprimer le {type}</h3>
        </div>
        <p className="text-white/60 text-[13px] leading-relaxed mb-6">
          Êtes-vous sûr de vouloir supprimer <strong className="text-white">{name}</strong> ? 
          <br /><br />
          Cette action est irréversible. {type === 'scenario' && "Tous les chapitres contenus dans ce scénario seront également détruits."}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl text-[13px] font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl text-[13px] font-bold bg-[#ff6b6b]/15 text-[#ff6b6b] border border-[#ff6b6b]/30 hover:bg-[#ff6b6b]/25 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting ? "Suppression..." : "Oui, supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
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
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'scenario' | 'chapitre'; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    fetchData();
  }, [fetchData]);

  const handleToggleScenario = (id: string) => {
    setExpandedScenarios((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const table = deleteTarget.type === 'scenario' ? 'scenarios' : 'chapitres';
      const { error } = await supabase.from(table).delete().eq("id", deleteTarget.id);
      if (error) throw error;
      
      if (deleteTarget.type === 'chapitre' && selectedChapitreId === deleteTarget.id) {
        setSelectedChapitreId(null);
      }
      if (deleteTarget.type === 'scenario') {
        const relatedChapitresIds = chapitres.filter(c => c.scenario_id === deleteTarget.id).map(c => c.id);
        if (selectedChapitreId && relatedChapitresIds.includes(selectedChapitreId)) {
          setSelectedChapitreId(null);
        }
      }
      
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      alert("Erreur lors de la suppression : " + err.message);
    } finally {
      setIsDeleting(false);
    }
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
      onDeleteScenario={(id, title) => setDeleteTarget({ id, type: 'scenario', title })}
      onDeleteChapitre={(id, title) => setDeleteTarget({ id, type: 'chapitre', title })}
      onBack={onBack}
    />
  );

  return (
    <>
      <BookLayout spineTitle="Scénarios" sidebar={sidebar} hideSidebar={isFullscreen}>
        {selectedChapitreId ? (
          <ChapitreEditor 
            chapitreId={selectedChapitreId} 
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(v => !v)}
            campaignId={campaignId}
          />
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
            setExpandedScenarios((prev) => ({ ...prev, [chapitreModalConfig.scenarioId]: true }));
            if (newChapitreId) {
              setSelectedChapitreId(newChapitreId);
            }
          }}
        />
      )}

      {/* Modale de Suppression */}
      {deleteTarget && (
        <DeleteNodeModal
          name={deleteTarget.title}
          type={deleteTarget.type}
          isDeleting={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}