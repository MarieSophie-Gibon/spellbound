import { useState, useEffect, useCallback } from "react";
import { BookLayout } from "@/components/layout/BookLayout";
import { supabase } from "@/lib/supabase";
import { PJWizard } from "@/components/personnage/PJWizard";
import { PNJWizard } from "@/components/personnage/PNJWizard";
import { PersonnageSidebar } from "@/components/personnage/PersonnageSidebar";
import { PersonnageDetail } from "@/components/personnage/PersonnageDetail";
import { PersonnageDetailMobile } from "@/components/personnage/PersonnageDetailMobile";
import { AlertTriangle, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";

interface PersonnagesProps {
  campaignId: string;
  onBack: () => void;
  isMJ?: boolean;
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

export function Personnages({ campaignId, onBack, isMJ = false }: PersonnagesProps) {
  const [searchParams] = useSearchParams();
  const currentUserId = useAuthStore((s) => s.session?.user?.id);
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
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

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

  useEffect(() => {
    if (!selectedCharacter && mobileView === "detail") {
      setMobileView("list");
    }
  }, [selectedCharacter, mobileView]);

  // Read-only: players can edit only their own PJ (explicit user_id match required).
  // Any falsy value (no user assigned, no session) → read-only for players.
  const effectiveReadOnly = !isMJ && (
    selectedType === "pnj"
    || !currentUserId
    || !selectedCharacter?.user_id
    || selectedCharacter.user_id !== currentUserId
  );

  const technicalSheetOnly = !isMJ
    && selectedType === "pj"
    && (
      !currentUserId
      || !selectedCharacter?.user_id
      || selectedCharacter.user_id !== currentUserId
    );

  // Auto-select PJ from URL param (e.g. coming from PJList banner)
  useEffect(() => {
    const pjId = searchParams.get("pjId");
    if (pjId) { setSelectedId(pjId); setSelectedType("pj"); }
  }, [searchParams]);

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
      {/* Mobile-native flow */}
      <div className="lg:hidden h-full min-h-0 flex flex-col relative">
        {/* Bouton retour flottant (vue détail) */}
        {mobileView !== "list" && (
          <button
            type="button"
            onClick={() => setMobileView("list")}
            className="fixed top-2 right-2 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-[#29206A] border border-[#E3CCCD]/50 text-white shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all hover:bg-[#3a2d8a] hover:scale-105"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="flex-1 min-h-0 overflow-hidden p-2">
          <div className="relative h-full rounded-xl border border-[#E3CCCD]/18 bg-[#1E1941]/35 backdrop-blur-xl overflow-hidden">
            <div className="absolute inset-1 border border-[#E3CCCD]/12 rounded-[10px] pointer-events-none" />
            {mobileView === "list" ? (
              <PersonnageSidebar
                pjs={pjs}
                pnjs={pnjs}
                isLoading={isLoading}
                selectedId={selectedId}
                readOnly={!isMJ}
                mobileSummary={true}
                onSelect={(id, type) => {
                  setSelectedId(id);
                  if (type) setSelectedType(type);
                  setMobileView("detail");
                }}
                onCreatePJClick={() => setShowPJWizard(true)}
                onCreatePNJClick={() => setShowPNJWizard(true)}
              />
            ) : (
              <div className="h-full min-h-0 overflow-hidden">
                <PersonnageDetailMobile
                  pj={selectedCharacter}
                  type={selectedType}
                  campaignId={campaignId}
                  isFullscreen={true}
                  readOnly={effectiveReadOnly}
                  technicalSheetOnly={technicalSheetOnly}
                  isMJ={isMJ}
                  showFullscreenToggle={false}
                  onToggleFullscreen={() => setMobileView("list")}
                  onDeleteClick={() => setShowDeleteConfirm(true)}
                  onCreateClick={() => selectedType === "pj" ? setShowPJWizard(true) : setShowPNJWizard(true)}
                  onEditSuccess={() => fetchData()}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop/tablet existing layout */}
      <div className="hidden lg:block h-full min-h-0">
        <BookLayout
          spineTitle="Personnages"
          hideSidebar={isFullscreen}
          sidebar={
            <PersonnageSidebar
              pjs={pjs}
              pnjs={pnjs}
              isLoading={isLoading}
              selectedId={selectedId}
              readOnly={!isMJ}
              mobileSummary={true}
              onSelect={(id, type) => {
                setSelectedId(id);
                if (type) setSelectedType(type);
              }}
              onCreatePJClick={() => setShowPJWizard(true)}
              onCreatePNJClick={() => setShowPNJWizard(true)}
            />
          }
        >
          <PersonnageDetail
            pj={selectedCharacter}
            type={selectedType}
            campaignId={campaignId}
            isFullscreen={isFullscreen}
            readOnly={effectiveReadOnly}
            technicalSheetOnly={technicalSheetOnly}
            isMJ={isMJ}
            onToggleFullscreen={() => setIsFullscreen((v) => !v)}
            onDeleteClick={() => setShowDeleteConfirm(true)}
            onCreateClick={() => selectedType === "pj" ? setShowPJWizard(true) : setShowPNJWizard(true)}
            onEditSuccess={() => fetchData()}
          />
        </BookLayout>
      </div>

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