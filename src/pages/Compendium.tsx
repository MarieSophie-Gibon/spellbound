/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { BookOpen as BookOpenIcon } from "lucide-react";
import { BookLayout } from "@/components/layout/BookLayout";
import { supabase } from "@/lib/supabase";
import { CompendiumSidebar } from "@/components/compendium/CompendiumSidebar";
import { PeupleDetail } from "@/components/compendium/peuple/PeupleDetail";
import { FamilleDetail } from "@/components/compendium/famille/FamilleDetail";
import { DeleteConfirmModal } from "@/components/compendium/DeleteConfirmModal";
import { PeupleWizard } from "@/components/compendium/peuple/PeupleWizard";
import { ProfilWizard } from "@/components/compendium/famille/ProfilWizard";
import { MonsterWizard } from "@/components/compendium/bestiaire/MonsterWizard";
import { MonsterDetail } from "@/components/compendium/bestiaire/MonsterDetail";
import EquipementWizard from "@/components/compendium/equipement/MagicalItemWizard";
import { EquipementDetail } from "@/components/compendium/equipement/MagicalItemDetail";
import type { Peuple, Voie, Famille, FamilleVoie, Monstre, Equipement, Section } from "@/types/compendium";

interface CompendiumProps {
  onBack: () => void;
  campaignId?: string;
}

export function Compendium({ onBack, campaignId }: CompendiumProps) {
  const [activeSection, setActiveSection] = useState<Section | null>('peuples');
  const [peuples, setPeuples] = useState<Peuple[]>([]);
  const [selectedPeupleId, setSelectedPeupleId] = useState<string | null>(null);
  const [selectedVoie, setSelectedVoie] = useState<Voie | null>(null);
  const [familles, setFamilles] = useState<Famille[]>([]);
  const [selectedFamilleId, setSelectedFamilleId] = useState<string | null>(null);
  const [selectedFamilleVoies, setSelectedFamilleVoies] = useState<FamilleVoie[]>([]);
  const [monstres, setMonstres] = useState<Monstre[]>([]);
  const [selectedMonstreId, setSelectedMonstreId] = useState<string | null>(null);
  const [equipements, setEquipements] = useState<Equipement[]>([]);
  const [selectedEquipementId, setSelectedEquipementId] = useState<string | null>(null);

  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showEditWizard, setShowEditWizard] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteFamilleConfirm, setShowDeleteFamilleConfirm] = useState(false);
  const [isDeletingFamille, setIsDeletingFamille] = useState(false);
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
  const [showEditObjet, setShowEditObjet] = useState(false);
  const [showDeleteObjetConfirm, setShowDeleteObjetConfirm] = useState(false);
  const [isDeletingObjet, setIsDeletingObjet] = useState(false);

  const fetchPeuples = async () => {
    let query = supabase.from('peuples').select('*').order('nom');
    if (campaignId) {
      query = query.or(`campaign_id.eq.${campaignId},campaign_id.is.null`);
    } else {
      query = query.is('campaign_id', null);
    }
    const { data } = await query;
    if (data) setPeuples(data as Peuple[]);
  };

  const fetchFamilles = async () => {
    let query = supabase.from('familles').select('*').order('nom');
    if (campaignId) {
      query = query.or(`campaign_id.eq.${campaignId},campaign_id.is.null`);
    } else {
      query = query.is('campaign_id', null);
    }
    const { data } = await query;
    if (data) setFamilles(data as Famille[]);
  };

  const fetchMonstres = async () => {
    let query = supabase.from('bestiaire').select('*').order('nom');
    if (campaignId) {
      query = query.or(`campaign_id.eq.${campaignId},campaign_id.is.null`);
    } else {
      query = query.is('campaign_id', null);
    }
    const { data } = await query;
    if (data) setMonstres(data as Monstre[]);
  };

  const fetchEquipements = async () => {
    let query = supabase.from('equipements').select('*').order('nom');
    if (campaignId) {
      query = query.or(`campaign_id.eq.${campaignId},campaign_id.is.null`);
    } else {
      query = query.is('campaign_id', null);
    }
    const { data } = await query;
    if (data) setEquipements(data as Equipement[]);
  };

  const fetchVoieForPeuple = async (peupleId: string) => {
    const { data } = await supabase
      .from('voies').select('*').eq('peuple_id', peupleId).single();
    setSelectedVoie(data as Voie);
  };

  const fetchVoiesForFamille = async (familleId: string) => {
    const { data } = await supabase
      .from('voies').select('*').eq('famille_id', familleId).order('nom');
    setSelectedFamilleVoies((data as FamilleVoie[]) ?? []);
  };

  useEffect(() => {
    if (activeSection === 'peuples') fetchPeuples();
    if (activeSection === 'familles') fetchFamilles();
    if (activeSection === 'bestiaire') fetchMonstres();
    if (activeSection === 'objets') fetchEquipements();
  }, [activeSection, campaignId]);

  useEffect(() => {
    if (selectedPeupleId) fetchVoieForPeuple(selectedPeupleId);
    else setSelectedVoie(null);
  }, [selectedPeupleId]);

  useEffect(() => {
    if (selectedFamilleId) fetchVoiesForFamille(selectedFamilleId);
    else setSelectedFamilleVoies([]);
  }, [selectedFamilleId]);

  const handleSectionChange = (section: Section | null) => {
    setActiveSection(section);
    setSelectedPeupleId(null);
    setSelectedFamilleId(null);
    setSelectedMonstreId(null);
    setSelectedEquipementId(null);
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
  const selectedFamille = familles.find(f => f.id === selectedFamilleId);
  const selectedMonstre = monstres.find(m => m.id === selectedMonstreId);
  const selectedEquipement = equipements.find(e => e.id === selectedEquipementId);

  const handleDeleteMonstre = async () => {
    if (!selectedMonstre) return;
    setIsDeletingMonster(true);
    try {
      await supabase.from('bestiaire').delete().eq('id', selectedMonstre.id);
      setSelectedMonstreId(null);
      setShowDeleteMonsterConfirm(false);
      setIsFullscreen(false);
      fetchMonstres();
    } finally {
      setIsDeletingMonster(false);
    }
  };

  const handleDeleteObjet = async () => {
    if (!selectedEquipement) return;
    setIsDeletingObjet(true);
    try {
      await supabase.from('equipements').delete().eq('id', selectedEquipement.id);
      setSelectedEquipementId(null);
      setShowDeleteObjetConfirm(false);
      setIsFullscreen(false);
      fetchEquipements();
    } finally {
      setIsDeletingObjet(false);
    }
  };

  const handleDeleteFamille = async () => {
    if (!selectedFamille) return;
    setIsDeletingFamille(true);
    try {
      await supabase.from('voies').delete().eq('famille_id', selectedFamille.id);
      await supabase.from('familles').delete().eq('id', selectedFamille.id);
      setSelectedFamilleId(null);
      setShowDeleteFamilleConfirm(false);
      setIsFullscreen(false);
      fetchFamilles();
    } finally {
      setIsDeletingFamille(false);
    }
  };

  const sidebar = (
    <CompendiumSidebar
      activeSection={activeSection}
      peuples={peuples}
      selectedPeupleId={selectedPeupleId}
      familles={familles}
      selectedFamilleId={selectedFamilleId}
      monstres={monstres}
      selectedMonstreId={selectedMonstreId}
      equipements={equipements}
      selectedEquipementId={selectedEquipementId}
      onSectionChange={handleSectionChange}
      onSelectPeuple={setSelectedPeupleId}
      onSelectFamille={setSelectedFamilleId}
      onSelectMonstre={setSelectedMonstreId}
      onSelectEquipement={setSelectedEquipementId}
      onCreatePeuple={() => setShowCreateWizard(true)}
      onCreateProfil={() => setShowCreateProfil(true)}
      onCreateMonstre={() => setShowCreateMonster(true)}
      onCreateObjet={() => setShowCreateObjet(true)}
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
        ) : activeSection === 'familles' && selectedFamille ? (
          <FamilleDetail
            famille={selectedFamille}
            voies={selectedFamilleVoies}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(f => !f)}
            onEdit={() => setShowEditProfil(true)}
            onDelete={() => setShowDeleteFamilleConfirm(true)}
          />
        ) : activeSection === 'bestiaire' && selectedMonstre ? (
          <MonsterDetail
            monstre={selectedMonstre}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(f => !f)}
            onEdit={() => setShowEditMonster(true)}
            onDelete={() => setShowDeleteMonsterConfirm(true)}
          />
        ) : activeSection === 'objets' && selectedEquipement ? (
          <EquipementDetail
            equipement={selectedEquipement}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(f => !f)}
            onEdit={() => setShowEditObjet(true)}
            onDelete={() => setShowDeleteObjetConfirm(true)}
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

      {showDeleteFamilleConfirm && selectedFamille && (
        <DeleteConfirmModal
          name={selectedFamille.nom}
          isDeleting={isDeletingFamille}
          onConfirm={handleDeleteFamille}
          onCancel={() => setShowDeleteFamilleConfirm(false)}
        />
      )}

      {showEditProfil && selectedFamille && (
        <ProfilWizard
          campaignId={campaignId}
          onClose={() => setShowEditProfil(false)}
          onSuccess={() => { fetchFamilles(); fetchVoiesForFamille(selectedFamille.id); }}
          initialData={{
            id: selectedFamille.id,
            nom: selectedFamille.nom,
            groupe: selectedFamille.groupe,
            description: selectedFamille.description,
            pv_niveau: selectedFamille.pv_niveau,
            de_recuperation: selectedFamille.de_recuperation,
            bonus_chance: selectedFamille.bonus_chance,
            equipement_base: selectedFamille.equipement_base,
            maitrise_equipement: selectedFamille.maitrise_equipement,
            lore: selectedFamille.lore,
            image_url: selectedFamille.image_url,
            data: selectedFamille.data,
            voies: selectedFamilleVoies,
          }}
        />
      )}

      {showCreateProfil && (
        <ProfilWizard
          campaignId={campaignId}
          onClose={() => setShowCreateProfil(false)}
          onSuccess={() => { fetchFamilles(); setActiveSection('familles'); }}
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
          onClose={() => setShowCreateObjet(false)}
          onSuccess={() => { fetchEquipements(); setActiveSection('objets'); }}
        />
      )}

      {showEditObjet && selectedEquipement && (
        <EquipementWizard
          onClose={() => setShowEditObjet(false)}
          onSuccess={() => fetchEquipements()}
          initialData={{
            ...selectedEquipement,
            table_source: "equipement", // fallback, or infer from context if available
          }}
        />
      )}

      {showDeleteObjetConfirm && selectedEquipement && (
        <DeleteConfirmModal
          name={selectedEquipement.nom}
          isDeleting={isDeletingObjet}
          onConfirm={handleDeleteObjet}
          onCancel={() => setShowDeleteObjetConfirm(false)}
        />
      )}
    </>
  );
}