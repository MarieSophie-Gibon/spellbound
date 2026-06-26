/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { BookLayout } from "@/components/layout/BookLayout";
import { supabase } from "@/lib/supabase";
import { PJWizard } from "@/components/personnage/PJWizard";
import { PNJWizard } from "@/components/personnage/PNJWizard";
import { PersonnageSidebar } from "@/components/personnage/PersonnageSidebar";
import { PersonnageDetail } from "@/components/personnage/PersonnageDetail";
import { AlertTriangle } from "lucide-react";

interface PersonnagesProps {
  campaignId: string;
  onBack: () => void;
  readOnly?: boolean;
}

interface Character {
  id: string;
  name: string;
  image_url: string | null;
  user_id?: string | null;
  stats: any;
  pathways: any;
  inventory: any;
}

// ─────────────────────────────────────────────
// MODALE DE SUPPRESSION
// ─────────────────────────────────────────────
function DeleteCharacterModal({
  name,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  name: string;
  isDeleting: boolean;
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
          <h3 className="text-xl font-serif text-white">Supprimer le personnage</h3>
        </div>
        <p className="text-white/60 text-[13px] leading-relaxed mb-6">
          Êtes-vous sûr de vouloir supprimer définitivement <strong className="text-white">{name}</strong> ? 
          <br /><br />
          Cette action est irréversible. Toutes ses données seront détruites.
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
            {isDeleting ? "Suppression en cours..." : "Oui, supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Personnages({ campaignId, onBack, readOnly = false }: PersonnagesProps) {
  const [pjs, setPjs] = useState<Character[]>([]);
  const [pnjs, setPnjs] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"pj" | "pnj">("pj");
  
  const [showPJWizard, setShowPJWizard] = useState(false);
  const [showPNJWizard, setShowPNJWizard] = useState(false);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Récupère les PJ ET les PNJ
  const fetchData = useCallback(async () => {
    const [pjRes, pnjRes] = await Promise.all([
      supabase.from("pj").select("id, name, image_url, user_id, stats, pathways, inventory").eq("campaign_id", campaignId).order("name"),
      supabase.from("pnj").select("id, name, image_url, stats, pathways, inventory").eq("campaign_id", campaignId).order("name")
    ]);
    
    if (pjRes.data) setPjs(pjRes.data);
    if (pnjRes.data) setPnjs(pnjRes.data);
    setIsLoading(false);
  }, [campaignId]);

  useEffect(() => { 
    const initFetch = async () => {
      await fetchData();
    };
    initFetch();
  }, [fetchData]);

  const selectedCharacter = selectedType === "pj" 
    ? pjs.find(p => p.id === selectedId) ?? null 
    : pnjs.find(p => p.id === selectedId) ?? null;

  const handleDelete = async () => {
    if (!selectedId) return;
    setIsDeleting(true);
    const table = selectedType === "pj" ? "pj" : "pnj";
    await supabase.from(table).delete().eq("id", selectedId);
    
    setSelectedId(null);
    setShowDeleteConfirm(false);
    setIsDeleting(false);
    fetchData();
  };

  return (
    <>
      <BookLayout
        spineTitle="Personnages"
        hideSidebar={isFullscreen}
        sidebar={
          <PersonnageSidebar
            pjs={pjs}
            pnjs={pnjs}
            isLoading={isLoading}
            selectedId={selectedId}
            readOnly={readOnly}
            onSelect={(id, type) => {
              setSelectedId(id);
              if (type) setSelectedType(type);
            }}
            onCreatePJClick={() => setShowPJWizard(true)}
            onCreatePNJClick={() => setShowPNJWizard(true)}
            onBack={onBack}
          />
        }
      >
        <PersonnageDetail
          pj={selectedCharacter}
          type={selectedType}
          campaignId={campaignId}
          isFullscreen={isFullscreen}
          readOnly={readOnly}
          onToggleFullscreen={() => setIsFullscreen((v) => !v)}
          onDeleteClick={() => setShowDeleteConfirm(true)}
          onCreateClick={() => selectedType === "pj" ? setShowPJWizard(true) : setShowPNJWizard(true)}
          onEditSuccess={() => fetchData()}
        />
      </BookLayout>

      {showPJWizard && (
        <PJWizard
          campaignId={campaignId}
          onClose={() => setShowPJWizard(false)}
          onSuccess={() => { fetchData(); setShowPJWizard(false); }}
        />
      )}

      {showPNJWizard && (
        <PNJWizard
          campaignId={campaignId}
          onClose={() => setShowPNJWizard(false)}
          onSuccess={() => { fetchData(); setShowPNJWizard(false); }}
        />
      )}

      {showDeleteConfirm && selectedCharacter && (
        <DeleteCharacterModal
          name={selectedCharacter.name}
          isDeleting={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}