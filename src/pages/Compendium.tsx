/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { BookOpen as BookOpenIcon } from "lucide-react";
import { BookLayout } from "@/components/layout/BookLayout";
import { supabase } from "@/lib/supabase";
import { CompendiumSidebar } from "@/components/compendium/CompendiumSidebar";
import { PeupleDetail } from "@/components/compendium/PeupleDetail";
import { DeleteConfirmModal } from "@/components/compendium/DeleteConfirmModal";
import { PeupleWizard } from "@/components/compendium/PeupleWizard";
import { ProfilWizard } from "@/components/compendium/ProfilWizard";
import type { Peuple, Voie, Famille, Section } from "@/types/compendium";

interface CompendiumProps {
  onBack: () => void;
  campaignId?: string;
}

export function Compendium({ onBack, campaignId }: CompendiumProps) {
  const [activeSection, setActiveSection] = useState<Section>('peuples');
  const [peuples, setPeuples] = useState<Peuple[]>([]);
  const [selectedPeupleId, setSelectedPeupleId] = useState<string | null>(null);
  const [selectedVoie, setSelectedVoie] = useState<Voie | null>(null);
  const [familles, setFamilles] = useState<Famille[]>([]);
  const [selectedFamilleId, setSelectedFamilleId] = useState<string | null>(null);

  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showEditWizard, setShowEditWizard] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCreateProfil, setShowCreateProfil] = useState(false);

  const fetchPeuples = async () => {
    let query = supabase.from('peuples').select('*').order('nom');
    if (campaignId) query = query.eq('campaign_id', campaignId);
    else query = query.is('campaign_id', null);
    const { data } = await query;
    if (data) setPeuples(data as Peuple[]);
  };

  const fetchFamilles = async () => {
    let query = supabase.from('familles').select('*').order('nom');
    if (campaignId) query = query.eq('campaign_id', campaignId);
    else query = query.is('campaign_id', null);
    const { data } = await query;
    if (data) setFamilles(data as Famille[]);
  };

  const fetchVoieForPeuple = async (peupleId: string) => {
    const { data } = await supabase
      .from('voies').select('*').eq('peuple_id', peupleId).single();
    setSelectedVoie(data as Voie);
  };

  useEffect(() => {
    if (activeSection === 'peuples') fetchPeuples();
    if (activeSection === 'familles') fetchFamilles();
  }, [activeSection, campaignId]);

  useEffect(() => {
    if (selectedPeupleId) fetchVoieForPeuple(selectedPeupleId);
    else setSelectedVoie(null);
  }, [selectedPeupleId]);

  const handleSectionChange = (section: Section) => {
    setActiveSection(section);
    setSelectedPeupleId(null);
    setSelectedFamilleId(null);
    setIsFullscreen(false);
  };

  const handleDelete = async () => {
    if (!selectedPeuple) return;
    setIsDeleting(true);
    try {
      if (selectedVoie) await supabase.from('voies').delete().eq('id', selectedVoie.id);
      await supabase.from('peuples').delete().eq('id', selectedPeuple.id);
      setSelectedPeupleId(null);
      setShowDeleteConfirm(false);
      setIsFullscreen(false);
      fetchPeuples();
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedPeuple = peuples.find(p => p.id === selectedPeupleId);

  const sidebar = (
    <CompendiumSidebar
      activeSection={activeSection}
      peuples={peuples}
      selectedPeupleId={selectedPeupleId}
      familles={familles}
      selectedFamilleId={selectedFamilleId}
      onSectionChange={handleSectionChange}
      onSelectPeuple={setSelectedPeupleId}
      onSelectFamille={setSelectedFamilleId}
      onCreatePeuple={() => setShowCreateWizard(true)}
      onCreateProfil={() => setShowCreateProfil(true)}
      onBack={onBack}
    />
  );

  return (
    <>
      <BookLayout spineTitle="Compendium" sidebar={sidebar} hideSidebar={isFullscreen}>
        {activeSection === 'peuples' && selectedPeuple ? (
          <PeupleDetail
            peuple={selectedPeuple}
            voie={selectedVoie}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(f => !f)}
            onEdit={() => setShowEditWizard(true)}
            onDelete={() => setShowDeleteConfirm(true)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 h-full opacity-60">
            <BookOpenIcon className="w-16 h-16 text-[#E3CCCD]/20 mb-6" />
            <h2 className="font-serif text-2xl text-white tracking-widest uppercase mb-3 leading-none">Compendium</h2>
            <p className="text-[13px] text-white/50 font-light max-w-sm">
              Sélectionnez une catégorie dans le menu de gauche pour consulter ou créer des éléments du lore.
            </p>
          </div>
        )}
      </BookLayout>

      {showCreateWizard && (
        <PeupleWizard
          campaignId={campaignId}
          onClose={() => setShowCreateWizard(false)}
          onSuccess={() => { fetchPeuples(); setActiveSection('peuples'); }}
        />
      )}

      {showEditWizard && selectedPeuple && (
        <PeupleWizard
          campaignId={campaignId}
          onClose={() => setShowEditWizard(false)}
          onSuccess={() => { fetchPeuples(); fetchVoieForPeuple(selectedPeuple.id); }}
          initialData={{
            id: selectedPeuple.id,
            nom: selectedPeuple.nom,
            description: selectedPeuple.description,
            image_url: selectedPeuple.image_url,
            data: selectedPeuple.data,
            voie: selectedVoie ? {
              id: selectedVoie.id,
              nom: selectedVoie.nom,
              capacites: selectedVoie.capacites,
            } : undefined,
          }}
        />
      )}

      {showDeleteConfirm && selectedPeuple && (
        <DeleteConfirmModal
          name={selectedPeuple.nom}
          isDeleting={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {showCreateProfil && (
        <ProfilWizard
          campaignId={campaignId}
          onClose={() => setShowCreateProfil(false)}
          onSuccess={() => { fetchFamilles(); setActiveSection('familles'); }}
        />
      )}
    </>
  );
}