/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { BookLayout } from "@/components/layout/BookLayout";
import { supabase } from "@/lib/supabase";
import { ScenarioSidebar } from "@/components/scenarios/ScenarioSidebar";
import { ScenarioModal, ChapitreModal } from "@/components/scenarios/ScenarioModals";
import { ChapitreEditor } from "@/components/scenarios/ChapitreEditor";
import { BookOpen, AlertTriangle, Edit3 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [chapitres, setChapitres] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChapitreId, setSelectedChapitreId] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [expandedScenarios, setExpandedScenarios] = useState<Record<string, boolean>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Gestion des Modales
  const [showScenarioModal, setShowScenarioModal] = useState(false);
  const [editingScenario, setEditingScenario] = useState<{ id: string; title: string; description: string | null } | null>(null);
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
          .select("id, scenario_id, title, ordre, completed")
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

  useEffect(() => {
    const chapitreFromQuery = searchParams.get("chapitreId");
    if (chapitreFromQuery) {
      setSelectedChapitreId(chapitreFromQuery);
    }
  }, [searchParams]);

  const handleToggleCompleted = async (chapitreId: string, current: boolean) => {
    await supabase.from("chapitres").update({ completed: !current }).eq("id", chapitreId);
    setChapitres((prev) => prev.map((c) => c.id === chapitreId ? { ...c, completed: !current } : c));

    // Quand on marque un chapitre comme réalisé, on révèle les PNJs de ses blocs NPC
    if (!current) {
      const { data: chapData } = await supabase
        .from("chapitres")
        .select("content")
        .eq("id", chapitreId)
        .single();

      const blocks: any[] = chapData?.content ?? [];
      const npcIds: string[] = blocks
        .filter((b) => b.type === "npc" && b.data?.npcId)
        .map((b) => b.data.npcId);

      if (npcIds.length > 0) {
        await supabase
          .from("campaign_revealed_pnjs")
          .upsert(
            npcIds.map((pnj_id) => ({ campaign_id: campaignId, pnj_id })),
            { onConflict: "campaign_id,pnj_id" }
          );
      }
    }
  };

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
      selectedScenarioId={selectedScenarioId}
      expandedScenarios={expandedScenarios}
      onSelectChapitre={(id) => { setSelectedChapitreId(id); setSelectedScenarioId(null); }}
      onSelectScenario={(id) => { setSelectedScenarioId(id); setSelectedChapitreId(null); }}
      onToggleScenario={handleToggleScenario}
      onCreateScenario={() => { setEditingScenario(null); setShowScenarioModal(true); }}
      onCreateChapitre={(scenarioId) => setChapitreModalConfig({ isOpen: true, scenarioId })}
      onDeleteScenario={(id, title) => setDeleteTarget({ id, type: 'scenario', title })}
      onDeleteChapitre={(id, title) => setDeleteTarget({ id, type: 'chapitre', title })}
      onToggleCompleted={handleToggleCompleted}
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
            completed={!!chapitres.find(c => c.id === selectedChapitreId)?.completed}
            onToggleCompleted={() => {
              const ch = chapitres.find(c => c.id === selectedChapitreId);
              if (ch) handleToggleCompleted(ch.id, !!ch.completed);
            }}
            onOpenCombatDashboard={(chapId, enemyBlockId) => {
              const params = new URLSearchParams({ chapitreId: chapId });
              if (enemyBlockId) params.set("enemyBlockId", enemyBlockId);
              navigate(`/campaign/combat?${params.toString()}`);
            }}
          />
        ) : selectedScenarioId ? (() => {
          const sc = scenarios.find(s => s.id === selectedScenarioId);
          const relatedChapitres = chapitres.filter(c => c.scenario_id === selectedScenarioId).sort((a, b) => a.ordre - b.ordre);
          return (
            <div className="flex-1 p-8 md:p-10 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
              <div className="max-w-2xl mx-auto space-y-8">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h1 className="font-serif text-3xl text-white tracking-wider">{sc?.title}</h1>
                    {sc && (
                      <button
                        onClick={() => {
                          setEditingScenario({ id: sc.id, title: sc.title, description: sc.description });
                          setShowScenarioModal(true);
                        }}
                        className="shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-colors text-[12px]"
                        title="Modifier le scénario"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Modifier
                      </button>
                    )}
                  </div>
                  {sc?.description ? (
                    <p className="text-[14px] text-white/60 leading-relaxed whitespace-pre-wrap">{sc.description}</p>
                  ) : (
                    <p className="text-[13px] text-white/25 italic">Aucune description.</p>
                  )}
                </div>

                <div className="space-y-3">
                  <h2 className="text-[11px] uppercase tracking-widest text-[#E3CCCD]/60 font-semibold">Chapitres</h2>
                  {relatedChapitres.length === 0 ? (
                    <p className="text-[13px] text-white/25 italic">Aucun chapitre pour ce scénario.</p>
                  ) : (
                    <div className="space-y-2">
                      {relatedChapitres.map((ch, idx) => (
                        <button
                          key={ch.id}
                          onClick={() => { setSelectedChapitreId(ch.id); setSelectedScenarioId(null); }}
                          className="w-full flex items-center gap-4 px-4 py-3 rounded-xl border border-white/8 bg-white/3 hover:bg-[#E3CCCD]/8 hover:border-[#E3CCCD]/20 transition-all text-left group"
                        >
                          <span className="text-[11px] text-white/30 font-mono shrink-0 w-6 text-right">{idx + 1}</span>
                          <BookOpen className="w-4 h-4 text-[#E3CCCD]/40 shrink-0 group-hover:text-[#E3CCCD]/70 transition-colors" />
                          <span className="text-[13px] text-white/70 group-hover:text-white transition-colors truncate">{ch.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })() : (
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
          initialData={editingScenario ?? undefined}
          onClose={() => {
            setShowScenarioModal(false);
            setEditingScenario(null);
          }}
          onSuccess={() => {
            fetchData();
            setShowScenarioModal(false);
            setEditingScenario(null);
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