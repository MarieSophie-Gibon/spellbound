/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { BookOpen as BookOpenIcon } from "lucide-react";
import { BookLayout } from "@/components/layout/BookLayout";
import { CompendiumSidebar } from "@/components/compendium/CompendiumSidebar";
import { CompendiumMobile } from "@/components/compendium/CompendiumMobile";
import { PeupleDetail } from "@/components/compendium/peuple/PeupleDetail";
import { FamilleDetail } from "@/components/compendium/famille/FamilleDetail";
import { ProfilDetail } from "@/components/compendium/profil/ProfilDetail";
import { DeleteConfirmModal } from "@/components/compendium/DeleteConfirmModal";
import { PeupleWizard } from "@/components/compendium/peuple/PeupleWizard";
import { FamilleWizard } from "@/components/compendium/famille/FamilleWizard";
import { ProfilWizard } from "@/components/compendium/profil/ProfilWizard";
import { MonsterWizard } from "@/components/compendium/bestiaire/MonsterWizard";
import { MonsterDetail } from "@/components/compendium/bestiaire/MonsterDetail";
import { MonsterDetailMobile } from "@/components/compendium/bestiaire/MonsterDetailMobile";
import EquipementWizard from "@/components/compendium/equipement/MagicalItemWizard";
import type { EquipementType } from "@/components/compendium/equipement/MagicalItemWizard";
import { EquipementDetail } from "@/components/compendium/equipement/MagicalItemDetail";
import { VoiePrestigeWizard } from "@/components/compendium/voie de prestige/VoiePrestigeWizard";
import { VoiePrestigeDetail } from "@/components/compendium/voie de prestige/VoiePrestigeDetail";
import type { Peuple, Voie, Famille, FamilleArchetype, FamilleVoie, Monstre, Equipement, Section } from "@/types/compendium";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useRevealedMonstres, useToggleRevealedMonstre } from "@/hooks/useCampaigns";
import { useCompendiumData } from "@/hooks/useCompendiumData";

interface CompendiumProps {
  onBack: () => void;
  campaignId?: string;
  readOnly?: boolean;
  /** true = l'utilisateur courant est le propriétaire (MJ) de la campagne */
  isOwner?: boolean;
  mode?: 'full' | 'bestiaire';
}

export function Compendium({ onBack, campaignId, readOnly = false, isOwner = false, mode = 'full' }: CompendiumProps) {
  const isMobile = useIsMobile();
  const isBestiaireOnly = mode === 'bestiaire';
  const compendiumData = useCompendiumData();

  // Monstres révélés aux joueurs (uniquement dans le contexte d'une campagne)
  const { data: revealedIds = [] } = useRevealedMonstres(campaignId ?? '');
  const toggleRevealMonstre = useToggleRevealedMonstre();
  const revealedMonstreIds = new Set(revealedIds);

  const handleToggleReveal = (monstreId: string, isCurrentlyRevealed: boolean) => {
    if (!campaignId) return;
    toggleRevealMonstre.mutate({ campaignId, monstreId, isRevealed: isCurrentlyRevealed });
  };
  const [activeSection, setActiveSection] = useState<Section | null>(
    isBestiaireOnly ? 'bestiaire' : (isMobile ? 'peuples' : null),
  );
  const [peuples, setPeuples] = useState<Peuple[]>([]);
  const [selectedPeupleId, setSelectedPeupleId] = useState<string | null>(null);
  const [selectedVoie, setSelectedVoie] = useState<Voie | null>(null);
  const [famillesArchetypes, setFamillesArchetypes] = useState<FamilleArchetype[]>([]);
  const [selectedFamilleArchetypeId, setSelectedFamilleArchetypeId] = useState<string | null>(null);
  const [profils, setProfils] = useState<Famille[]>([]);
  const [selectedProfilId, setSelectedProfilId] = useState<string | null>(null);
  const [selectedProfilVoies, setSelectedProfilVoies] = useState<FamilleVoie[]>([]);
  const [monstres, setMonstres] = useState<Monstre[]>([]);
  const [selectedMonstreId, setSelectedMonstreId] = useState<string | null>(null);
  const [equipements, setEquipements] = useState<Equipement[]>([]);
  const [selectedEquipementTable, setSelectedEquipementTable] = useState<EquipementType | null>(null);
  const [editingEquipement, setEditingEquipement] = useState<Equipement | null>(null);
  const [deletingEquipement, setDeletingEquipement] = useState<Equipement | null>(null);

  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showEditWizard, setShowEditWizard] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteFamilleConfirm, setShowDeleteFamilleConfirm] = useState(false);
  const [isDeletingFamille, setIsDeletingFamille] = useState(false);
  const [showCreateFamilleArchetype, setShowCreateFamilleArchetype] = useState(false);
  const [showEditFamilleArchetype, setShowEditFamilleArchetype] = useState(false);
  const [showDeleteFamilleArchetypeConfirm, setShowDeleteFamilleArchetypeConfirm] = useState(false);
  const [isDeletingFamilleArchetype, setIsDeletingFamilleArchetype] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // ProfilWizard modals removed (unused)
  // Add missing state for commented ProfilWizard modals (to avoid TS errors if uncommented)
  // Remove if not needed
  const [showEditProfil, setShowEditProfil] = useState(false);
  const [showCreateProfil, setShowCreateProfil] = useState(false);
  const [showCreateMonster, setShowCreateMonster] = useState(false);
  const [showEditMonster, setShowEditMonster] = useState(false);
  const [showDeleteMonsterConfirm, setShowDeleteMonsterConfirm] = useState(false);
  const [isDeletingMonster, setIsDeletingMonster] = useState(false);
  const [showCreateObjet, setShowCreateObjet] = useState(false);
  const [createObjetType, setCreateObjetType] = useState<EquipementType>("equipement");
  const [showEditObjet, setShowEditObjet] = useState(false);
  const [showDeleteObjetConfirm, setShowDeleteObjetConfirm] = useState(false);
  const [isDeletingObjet, setIsDeletingObjet] = useState(false);

  // Voies de Prestige
  const [voiesPrestige, setVoiesPrestige] = useState<FamilleVoie[]>([]);
  const [selectedVoiePrestigeId, setSelectedVoiePrestigeId] = useState<string | null>(null);
  const [showVoiePrestigeWizard, setShowVoiePrestigeWizard] = useState(false);
  const [editingVoiePrestige, setEditingVoiePrestige] = useState<FamilleVoie | null>(null);
  const [showDeleteVoiePrestigeConfirm, setShowDeleteVoiePrestigeConfirm] = useState(false);
  const [isDeletingVoiePrestige, setIsDeletingVoiePrestige] = useState(false);
  const [loadingSections, setLoadingSections] = useState<Record<Section, boolean>>({
    peuples: false,
    familles: false,
    profils: false,
    bestiaire: false,
    objets: false,
    voies_prestige: false,
  });

  const setSectionLoading = (section: Section, isLoading: boolean) => {
    setLoadingSections((prev) => ({ ...prev, [section]: isLoading }));
  };

  const fetchPeuples = async () => {
    setSectionLoading('peuples', true);
    try {
      const data = await compendiumData.fetchPeuples(campaignId);
      setPeuples(data);
    } finally {
      setSectionLoading('peuples', false);
    }
  };

  const fetchFamillesArchetypes = async () => {
    setSectionLoading('familles', true);
    try {
      const data = await compendiumData.fetchFamillesArchetypes(campaignId);
      setFamillesArchetypes(data);
    } finally {
      setSectionLoading('familles', false);
    }
  };

  const fetchProfils = async () => {
    setSectionLoading('profils', true);
    try {
      const data = await compendiumData.fetchProfils(campaignId);
      setProfils(data);
    } finally {
      setSectionLoading('profils', false);
    }
  };

  const fetchMonstres = async () => {
    setSectionLoading('bestiaire', true);
    try {
      const data = await compendiumData.fetchMonstres(campaignId);
      setMonstres(data);
    } finally {
      setSectionLoading('bestiaire', false);
    }
  };

  const fetchEquipements = async () => {
    setSectionLoading('objets', true);
    try {
      const data = await compendiumData.fetchEquipements(campaignId);
      setEquipements(data);
    } finally {
      setSectionLoading('objets', false);
    }
  };

  const fetchVoieForPeuple = async (peupleId: string) => {
    const data = await compendiumData.fetchVoieForPeuple(peupleId);
    setSelectedVoie(data);
  };

  const fetchVoiesPrestige = async () => {
    setSectionLoading('voies_prestige', true);
    try {
      const data = await compendiumData.fetchVoiesPrestige(campaignId);
      setVoiesPrestige(data);
    } finally {
      setSectionLoading('voies_prestige', false);
    }
  };

  const fetchVoiesForProfil = async (profilId: string) => {
    const data = await compendiumData.fetchVoiesForProfil(profilId);
    setSelectedProfilVoies(data);
  };

  useEffect(() => {
    if (activeSection === 'peuples') fetchPeuples();
    if (activeSection === 'familles') fetchFamillesArchetypes();
    if (activeSection === 'profils') { fetchProfils(); fetchFamillesArchetypes(); }
    if (activeSection === 'bestiaire') fetchMonstres();
    if (activeSection === 'objets') fetchEquipements();
    if (activeSection === 'voies_prestige') { fetchVoiesPrestige(); fetchFamillesArchetypes(); }
  }, [activeSection, campaignId]);

  useEffect(() => {
    if (isBestiaireOnly) {
      if (activeSection !== 'bestiaire') {
        setActiveSection('bestiaire');
      }
      if (!selectedMonstreId) {
        fetchMonstres();
      }
      return;
    }

    if (isMobile && activeSection === null) {
      setActiveSection('peuples');
    }
  }, [isBestiaireOnly, isMobile, activeSection, selectedMonstreId, campaignId]);

  useEffect(() => {
    if (selectedPeupleId) fetchVoieForPeuple(selectedPeupleId);
    else setSelectedVoie(null);
  }, [selectedPeupleId]);

  useEffect(() => {
    if (selectedProfilId) fetchVoiesForProfil(selectedProfilId);
    else setSelectedProfilVoies([]);
  }, [selectedProfilId]);

  const handleSectionChange = (section: Section | null) => {
    if (isBestiaireOnly && section && section !== 'bestiaire') return;
    setActiveSection(section);
    setSelectedPeupleId(null);
    setSelectedFamilleArchetypeId(null);
    setSelectedProfilId(null);
    setSelectedMonstreId(null);
    setSelectedEquipementTable(null);
    setSelectedVoiePrestigeId(null);
    setIsFullscreen(false);
  };

  const handleDelete = async () => {
    if (!selectedPeuple) return;
    setIsDeleting(true);
    try {
      await compendiumData.deletePeupleWithVoie(selectedPeuple.id, selectedVoie?.id ?? null);
      setSelectedPeupleId(null);
      setShowDeleteConfirm(false);
      setIsFullscreen(false);
      fetchPeuples();
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedPeuple = peuples.find(p => p.id === selectedPeupleId);
  const selectedFamilleArchetype = famillesArchetypes.find(f => f.id === selectedFamilleArchetypeId);
  const selectedProfil = profils.find(f => f.id === selectedProfilId);
  // Pour les joueurs (non-owner) dans une campagne : on ne montre que les monstres révélés par le MJ
  // Les monstres globaux (campaign_id === null) restent toujours visibles
  const visibleMonstres = (campaignId && !isOwner)
    ? monstres.filter(m => m.campaign_id === null || revealedMonstreIds.has(m.id))
    : monstres;
  const selectedMonstre = monstres.find(m => m.id === selectedMonstreId);
  const filteredEquipements = equipements.filter(e => e.table_source === selectedEquipementTable);
  const selectedVoiePrestige = voiesPrestige.find(v => v.id === selectedVoiePrestigeId);
  const availableSections: Section[] = isBestiaireOnly ? ['bestiaire'] : ['peuples', 'familles', 'profils', 'objets', 'voies_prestige'];
  const showMobileList =
    activeSection === 'peuples' ? !selectedPeupleId :
    activeSection === 'familles' ? !selectedFamilleArchetypeId :
    activeSection === 'profils' ? !selectedProfilId :
    activeSection === 'bestiaire' ? !selectedMonstreId :
    activeSection === 'objets' ? !selectedEquipementTable :
    activeSection === 'voies_prestige' ? !selectedVoiePrestigeId :
    true;

  const handleDeleteMonstre = async () => {
    if (!selectedMonstre) return;
    setIsDeletingMonster(true);
    try {
      await compendiumData.deleteMonstre(selectedMonstre.id);
      setSelectedMonstreId(null);
      setShowDeleteMonsterConfirm(false);
      setIsFullscreen(false);
      fetchMonstres();
    } finally {
      setIsDeletingMonster(false);
    }
  };

  const handleDeleteObjet = async () => {
    if (!deletingEquipement) return;
    setIsDeletingObjet(true);
    try {
      await compendiumData.deleteEquipement(deletingEquipement.table_source, deletingEquipement.id);
      setDeletingEquipement(null);
      setShowDeleteObjetConfirm(false);
      fetchEquipements();
    } finally {
      setIsDeletingObjet(false);
    }
  };

  const handleDeleteFamille = async () => {
    if (!selectedProfil) return;
    setIsDeletingFamille(true);
    try {
      await compendiumData.deleteProfilWithVoies(selectedProfil.id);
      setSelectedProfilId(null);
      setShowDeleteFamilleConfirm(false);
      setIsFullscreen(false);
      fetchProfils();
    } finally {
      setIsDeletingFamille(false);
    }
  };

  const handleDeleteFamilleArchetype = async () => {
    if (!selectedFamilleArchetype) return;
    setIsDeletingFamilleArchetype(true);
    try {
      await compendiumData.deleteFamilleArchetype(selectedFamilleArchetype.id);
      setSelectedFamilleArchetypeId(null);
      setShowDeleteFamilleArchetypeConfirm(false);
      setIsFullscreen(false);
      fetchFamillesArchetypes();
    } finally {
      setIsDeletingFamilleArchetype(false);
    }
  };

  const handleDeleteVoiePrestige = async () => {
    if (!selectedVoiePrestige?.id) return;
    setIsDeletingVoiePrestige(true);
    try {
      await compendiumData.deleteVoiePrestige(selectedVoiePrestige.id);
      setSelectedVoiePrestigeId(null);
      setShowDeleteVoiePrestigeConfirm(false);
      setIsFullscreen(false);
      fetchVoiesPrestige();
    } finally {
      setIsDeletingVoiePrestige(false);
    }
  };

  const sidebar = (
    <CompendiumSidebar
      activeSection={activeSection}
      sections={availableSections}
      actionsMode={isBestiaireOnly ? 'bestiaire' : 'compendium'}
      peuples={peuples}
      selectedPeupleId={selectedPeupleId}
      famillesArchetypes={famillesArchetypes}
      selectedFamilleArchetypeId={selectedFamilleArchetypeId}
      profils={profils}
      selectedProfilId={selectedProfilId}
      monstres={visibleMonstres}
      selectedMonstreId={selectedMonstreId}
      revealedMonstreIds={isOwner && campaignId ? revealedMonstreIds : undefined}
      equipements={equipements}
      selectedEquipementTable={selectedEquipementTable}
      voiesPrestige={voiesPrestige}
      selectedVoiePrestigeId={selectedVoiePrestigeId}
      onSectionChange={handleSectionChange}
      onSelectPeuple={setSelectedPeupleId}
      onSelectFamilleArchetype={setSelectedFamilleArchetypeId}
      onSelectProfil={setSelectedProfilId}
      onSelectMonstre={setSelectedMonstreId}
      onSelectEquipementTable={setSelectedEquipementTable}
      onSelectVoiePrestige={setSelectedVoiePrestigeId}
      onCreatePeuple={() => setShowCreateWizard(true)}
      onCreateFamille={() => setShowCreateFamilleArchetype(true)}
      onCreateProfil={() => setShowCreateProfil(true)}
      onCreateMonstre={() => setShowCreateMonster(true)}
      onCreateObjet={(type) => { setCreateObjetType(type); setShowCreateObjet(true); }}
      onCreateVoiePrestige={() => setShowVoiePrestigeWizard(true)}
      onBack={onBack}
      readOnly={readOnly}
      loadingSections={loadingSections}
    />
  );

  return (
    <>
      {isMobile ? (
        <CompendiumMobile
          title={isBestiaireOnly ? "Bestiaire" : "Compendium"}
          sections={availableSections}
          showListInView={showMobileList}
          readOnly={readOnly}
          peuples={peuples}
          famillesArchetypes={famillesArchetypes}
          profils={profils}
          monstres={visibleMonstres}
          equipements={equipements}
          voiesPrestige={voiesPrestige}
          onSectionChange={(section) => handleSectionChange(section)}
          onSelectPeuple={setSelectedPeupleId}
          onSelectFamilleArchetype={setSelectedFamilleArchetypeId}
          onSelectProfil={setSelectedProfilId}
          onSelectMonstre={setSelectedMonstreId}
          onSelectEquipementTable={setSelectedEquipementTable}
          onSelectVoiePrestige={setSelectedVoiePrestigeId}
          onBackToList={() => {
            if (activeSection === 'peuples') setSelectedPeupleId(null);
            if (activeSection === 'familles') setSelectedFamilleArchetypeId(null);
            if (activeSection === 'profils') setSelectedProfilId(null);
            if (activeSection === 'bestiaire') setSelectedMonstreId(null);
            if (activeSection === 'objets') setSelectedEquipementTable(null);
            if (activeSection === 'voies_prestige') setSelectedVoiePrestigeId(null);
            setIsFullscreen(false);
          }}
          onCreateCurrent={() => {
            if (activeSection === 'peuples') setShowCreateWizard(true);
            if (activeSection === 'familles') setShowCreateFamilleArchetype(true);
            if (activeSection === 'profils') setShowCreateProfil(true);
            if (activeSection === 'bestiaire') setShowCreateMonster(true);
            if (activeSection === 'objets') { setCreateObjetType('equipement'); setShowCreateObjet(true); }
            if (activeSection === 'voies_prestige') setShowVoiePrestigeWizard(true);
          }}
        >
          {activeSection === 'peuples' && selectedPeuple ? (
            <PeupleDetail
              peuple={selectedPeuple}
              voie={selectedVoie}
              isFullscreen={isFullscreen}
              readOnly={readOnly}
              onToggleFullscreen={() => setIsFullscreen(f => !f)}
              onEdit={() => setShowEditWizard(true)}
              onDelete={() => setShowDeleteConfirm(true)}
            />
          ) : activeSection === 'familles' && selectedFamilleArchetype ? (
            <FamilleDetail
              famille={selectedFamilleArchetype}
              isFullscreen={isFullscreen}
              readOnly={readOnly}
              onToggleFullscreen={() => setIsFullscreen(f => !f)}
              onEdit={() => setShowEditFamilleArchetype(true)}
              onDelete={() => setShowDeleteFamilleArchetypeConfirm(true)}
            />
          ) : activeSection === 'profils' && selectedProfil ? (
            <ProfilDetail
              profil={selectedProfil}
              familleArchetype={famillesArchetypes.find(f => f.id === selectedProfil.famille_id)}
              voies={selectedProfilVoies}
              isFullscreen={isFullscreen}
              readOnly={readOnly}
              onToggleFullscreen={() => setIsFullscreen(f => !f)}
              onEdit={() => setShowEditProfil(true)}
              onDelete={() => setShowDeleteFamilleConfirm(true)}
            />
          ) : activeSection === 'bestiaire' && selectedMonstre ? (
          <MonsterDetailMobile
              monstre={selectedMonstre}
              isFullscreen={isFullscreen}
              readOnly={readOnly}
              isOwner={isOwner}
              revealedMonstreIds={revealedMonstreIds}
              onToggleReveal={handleToggleReveal}
              onToggleFullscreen={() => setIsFullscreen(f => !f)}
              onEdit={() => setShowEditMonster(true)}
              onDelete={() => setShowDeleteMonsterConfirm(true)}
            />
          ) : activeSection === 'objets' && selectedEquipementTable ? (
            <EquipementDetail
              equipements={filteredEquipements}
              selectedTable={selectedEquipementTable}
              isFullscreen={isFullscreen}
              readOnly={readOnly}
              onToggleFullscreen={() => setIsFullscreen(f => !f)}
              onEdit={(eq) => { setEditingEquipement(eq); setShowEditObjet(true); }}
              onDelete={(eq) => { setDeletingEquipement(eq); setShowDeleteObjetConfirm(true); }}
            />
          ) : activeSection === 'voies_prestige' && selectedVoiePrestige ? (
            <VoiePrestigeDetail
              voie={selectedVoiePrestige}
              isFullscreen={isFullscreen}
              readOnly={readOnly}
              onToggleFullscreen={() => setIsFullscreen(f => !f)}
              onEdit={() => { setEditingVoiePrestige(selectedVoiePrestige); setShowVoiePrestigeWizard(true); }}
              onDelete={() => setShowDeleteVoiePrestigeConfirm(true)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 h-full opacity-60">
              <BookOpenIcon className="w-16 h-16 text-[#E3CCCD]/20 mb-6" />
              <h2 className="font-serif text-2xl text-white tracking-widest uppercase mb-3 leading-none">{isBestiaireOnly ? 'Bestiaire' : 'Compendium'}</h2>
              <p className="text-[13px] text-white/50 font-light max-w-sm">Selectionnez une categorie.</p>
            </div>
          )}
        </CompendiumMobile>
      ) : (
      <BookLayout spineTitle={isBestiaireOnly ? "Bestiaire" : "Compendium"} sidebar={sidebar} hideSidebar={isFullscreen}>
        {activeSection === 'peuples' && selectedPeuple ? (
          <PeupleDetail
            peuple={selectedPeuple}
            voie={selectedVoie}
            isFullscreen={isFullscreen}
            readOnly={readOnly}
            onToggleFullscreen={() => setIsFullscreen(f => !f)}
            onEdit={() => setShowEditWizard(true)}
            onDelete={() => setShowDeleteConfirm(true)}
          />
        ) : activeSection === 'familles' && selectedFamilleArchetype ? (
          <FamilleDetail
            famille={selectedFamilleArchetype}
            isFullscreen={isFullscreen}
            readOnly={readOnly}
            onToggleFullscreen={() => setIsFullscreen(f => !f)}
            onEdit={() => setShowEditFamilleArchetype(true)}
            onDelete={() => setShowDeleteFamilleArchetypeConfirm(true)}
          />
        ) : activeSection === 'profils' && selectedProfil ? (
          <ProfilDetail
            profil={selectedProfil}
            familleArchetype={famillesArchetypes.find(f => f.id === selectedProfil.famille_id)}
            voies={selectedProfilVoies}
            isFullscreen={isFullscreen}
            readOnly={readOnly}
            onToggleFullscreen={() => setIsFullscreen(f => !f)}
            onEdit={() => setShowEditProfil(true)}
            onDelete={() => setShowDeleteFamilleConfirm(true)}
          />
        ) : activeSection === 'bestiaire' && selectedMonstre ? (
          <MonsterDetail
            monstre={selectedMonstre}
            isFullscreen={isFullscreen}
            readOnly={readOnly}
            isOwner={isOwner}
            revealedMonstreIds={revealedMonstreIds}
            onToggleReveal={handleToggleReveal}
            onToggleFullscreen={() => setIsFullscreen(f => !f)}
            onEdit={() => setShowEditMonster(true)}
            onDelete={() => setShowDeleteMonsterConfirm(true)}
          />
        ) : activeSection === 'objets' && selectedEquipementTable ? (
          <EquipementDetail
            equipements={filteredEquipements}
            selectedTable={selectedEquipementTable}
            isFullscreen={isFullscreen}
            readOnly={readOnly}
            onToggleFullscreen={() => setIsFullscreen(f => !f)}
            onEdit={(eq) => { setEditingEquipement(eq); setShowEditObjet(true); }}
            onDelete={(eq) => { setDeletingEquipement(eq); setShowDeleteObjetConfirm(true); }}
          />
        ) : activeSection === 'voies_prestige' && selectedVoiePrestige ? (
          <VoiePrestigeDetail
            voie={selectedVoiePrestige}
            isFullscreen={isFullscreen}
            readOnly={readOnly}
            onToggleFullscreen={() => setIsFullscreen(f => !f)}
            onEdit={() => { setEditingVoiePrestige(selectedVoiePrestige); setShowVoiePrestigeWizard(true); }}
            onDelete={() => setShowDeleteVoiePrestigeConfirm(true)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 h-full opacity-60">
            <BookOpenIcon className="w-16 h-16 text-[#E3CCCD]/20 mb-6" />
            <h2 className="font-serif text-2xl text-white tracking-widest uppercase mb-3 leading-none">{isBestiaireOnly ? 'Bestiaire' : 'Compendium'}</h2>
            <p className="text-[13px] text-white/50 font-light max-w-sm">
              {isBestiaireOnly
                ? 'Sélectionnez une créature dans le menu de gauche pour consulter ou éditer sa fiche.'
                : 'Sélectionnez une catégorie dans le menu de gauche pour consulter ou créer des éléments du lore.'}
            </p>
          </div>
        )}
      </BookLayout>
      )}

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
            lore: selectedPeuple.lore,
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

      {showDeleteFamilleConfirm && selectedProfil && (
        <DeleteConfirmModal
          name={selectedProfil.nom}
          isDeleting={isDeletingFamille}
          onConfirm={handleDeleteFamille}
          onCancel={() => setShowDeleteFamilleConfirm(false)}
        />
      )}

      {showDeleteFamilleArchetypeConfirm && selectedFamilleArchetype && (
        <DeleteConfirmModal
          name={selectedFamilleArchetype.nom}
          isDeleting={isDeletingFamilleArchetype}
          onConfirm={handleDeleteFamilleArchetype}
          onCancel={() => setShowDeleteFamilleArchetypeConfirm(false)}
        />
      )}

      {showEditProfil && selectedProfil && (
        <ProfilWizard
          campaignId={campaignId}
          onClose={() => setShowEditProfil(false)}
          onSuccess={() => { fetchProfils(); fetchVoiesForProfil(selectedProfil.id); }}
          famillesArchetypes={famillesArchetypes}
          initialData={{
            id: selectedProfil.id,
            nom: selectedProfil.nom,
            famille_id: selectedProfil.famille_id,
            description: selectedProfil.description,
            equipement_base: selectedProfil.equipement_base,
            maitrise_equipement: selectedProfil.maitrise_equipement,
            lore: selectedProfil.lore,
            image_url: selectedProfil.image_url,
            data: selectedProfil.data,
            campaign_id: selectedProfil.campaign_id,
            voies: selectedProfilVoies,
          }}
        />
      )}

      {showCreateProfil && (
        <ProfilWizard
          campaignId={campaignId}
          onClose={() => setShowCreateProfil(false)}
          onSuccess={() => { fetchProfils(); setActiveSection('profils'); }}
          famillesArchetypes={famillesArchetypes}
        />
      )}

      {showCreateFamilleArchetype && (
        <FamilleWizard
          campaignId={campaignId}
          onClose={() => setShowCreateFamilleArchetype(false)}
          onSuccess={() => { fetchFamillesArchetypes(); setActiveSection('familles'); }}
        />
      )}

      {showEditFamilleArchetype && selectedFamilleArchetype && (
        <FamilleWizard
          campaignId={campaignId}
          onClose={() => setShowEditFamilleArchetype(false)}
          onSuccess={() => fetchFamillesArchetypes()}
          initialData={{
            id: selectedFamilleArchetype.id,
            nom: selectedFamilleArchetype.nom,
            pv_niveau: selectedFamilleArchetype.pv_niveau,
            de_recuperation: selectedFamilleArchetype.de_recuperation,
            bonus_chance: selectedFamilleArchetype.bonus_chance,
            notes: selectedFamilleArchetype.notes,
          }}
        />
      )}

      {showCreateMonster && (
        <MonsterWizard
          campaignId={campaignId}
          onClose={() => setShowCreateMonster(false)}
          onSuccess={() => { fetchMonstres(); setActiveSection('bestiaire'); }}
        />
      )}

      {showEditMonster && selectedMonstre && (
        <MonsterWizard
          campaignId={campaignId}
          onClose={() => setShowEditMonster(false)}
          onSuccess={() => fetchMonstres()}
          initialData={{
            id: selectedMonstre.id,
            nom: selectedMonstre.nom,
            nc: selectedMonstre.nc,
            type_creature: selectedMonstre.type_creature,
            taille: selectedMonstre.taille,
            description: selectedMonstre.description,
            stats: selectedMonstre.stats,
            combat: selectedMonstre.combat,
            attaques: selectedMonstre.attaques,
            capacites: selectedMonstre.capacites,
            image_url: selectedMonstre.image_url,
            data: selectedMonstre.data,
          }}
        />
      )}

      {showDeleteMonsterConfirm && selectedMonstre && (
        <DeleteConfirmModal
          name={selectedMonstre.nom}
          isDeleting={isDeletingMonster}
          onConfirm={handleDeleteMonstre}
          onCancel={() => setShowDeleteMonsterConfirm(false)}
        />
      )}

      {showCreateObjet && (
        <EquipementWizard
          selectedType={createObjetType}
          campaignId={campaignId}
          onClose={() => setShowCreateObjet(false)}
          onSuccess={() => { fetchEquipements(); setActiveSection('objets'); }}
        />
      )}

      {showEditObjet && editingEquipement && (
        <EquipementWizard
          selectedType={editingEquipement.table_source}
          campaignId={campaignId}
          onClose={() => { setShowEditObjet(false); setEditingEquipement(null); }}
          onSuccess={() => fetchEquipements()}
          initialData={{
            ...editingEquipement,
            table_source: editingEquipement.table_source,
          }}
        />
      )}

      {showDeleteObjetConfirm && deletingEquipement && (
        <DeleteConfirmModal
          name={deletingEquipement.nom}
          isDeleting={isDeletingObjet}
          onConfirm={handleDeleteObjet}
          onCancel={() => setShowDeleteObjetConfirm(false)}
        />
      )}

      {showVoiePrestigeWizard && (
        <VoiePrestigeWizard
          campaignId={campaignId}
          onClose={() => { setShowVoiePrestigeWizard(false); setEditingVoiePrestige(null); }}
          onSuccess={() => { fetchVoiesPrestige(); setActiveSection('voies_prestige'); }}
          initialData={editingVoiePrestige ?? undefined}
          familles={famillesArchetypes.map(f => ({ id: f.id, nom: f.nom }))}
        />
      )}

      {showDeleteVoiePrestigeConfirm && selectedVoiePrestige && (
        <DeleteConfirmModal
          name={selectedVoiePrestige.nom}
          isDeleting={isDeletingVoiePrestige}
          onConfirm={handleDeleteVoiePrestige}
          onCancel={() => setShowDeleteVoiePrestigeConfirm(false)}
        />
      )}
    </>
  );
}