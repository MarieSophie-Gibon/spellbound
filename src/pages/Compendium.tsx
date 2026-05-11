/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { BookOpen as BookOpenIcon } from "lucide-react";
import { BookLayout } from "@/components/layout/BookLayout";
import { supabase } from "@/lib/supabase";
import { CompendiumSidebar } from "@/components/compendium/CompendiumSidebar";
import { PeupleDetail } from "@/components/compendium/peuple/PeupleDetail";
import { FamilleDetail } from "@/components/compendium/famille/FamilleDetail";
import { ProfilDetail } from "@/components/compendium/profil/ProfilDetail";
import { DeleteConfirmModal } from "@/components/compendium/DeleteConfirmModal";
import { PeupleWizard } from "@/components/compendium/peuple/PeupleWizard";
import { FamilleWizard } from "@/components/compendium/famille/FamilleWizard";
import { ProfilWizard } from "@/components/compendium/profil/ProfilWizard";
import { MonsterWizard } from "@/components/compendium/bestiaire/MonsterWizard";
import { MonsterDetail } from "@/components/compendium/bestiaire/MonsterDetail";
import EquipementWizard from "@/components/compendium/equipement/MagicalItemWizard";
import type { EquipementType } from "@/components/compendium/equipement/MagicalItemWizard";
import { EquipementDetail } from "@/components/compendium/equipement/MagicalItemDetail";
import { VoiePrestigeWizard } from "@/components/compendium/voie de prestige/VoiePrestigeWizard";
import type { Peuple, Voie, Famille, FamilleArchetype, FamilleVoie, Monstre, Equipement, Section } from "@/types/compendium";

interface CompendiumProps {
  onBack: () => void;
  campaignId?: string;
}

export function Compendium({ onBack, campaignId }: CompendiumProps) {
  const [activeSection, setActiveSection] = useState<Section | null>('peuples');
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

  const fetchFamillesArchetypes = async () => {
    let query = supabase.from('familles').select('*').order('nom');
    if (campaignId) {
      query = query.or(`campaign_id.eq.${campaignId},campaign_id.is.null`);
    } else {
      query = query.is('campaign_id', null);
    }
    const { data } = await query;
    if (data) setFamillesArchetypes(data as FamilleArchetype[]);
  };

  const fetchProfils = async () => {
    let query = supabase.from('profils').select('*, familles(nom)').order('nom');
    if (campaignId) {
      query = query.or(`campaign_id.eq.${campaignId},campaign_id.is.null`);
    } else {
      query = query.is('campaign_id', null);
    }
    const { data } = await query;
    if (data) setProfils(data.map((p: any) => ({ ...p, famille_nom: p.familles?.nom ?? null })) as Famille[]);
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
    const filter = (q: any) => {
      if (campaignId) return q.or(`campaign_id.eq.${campaignId},campaign_id.is.null`);
      return q.is('campaign_id', null);
    };

    const [r1, r2, r3, r4] = await Promise.all([
      filter(supabase.from('armes_contact').select('*').order('nom')),
      filter(supabase.from('armes_distance').select('*').order('nom')),
      filter(supabase.from('armures').select('*').order('nom')),
      filter(supabase.from('equipements').select('*').order('nom')),
    ]);

    const all: Equipement[] = [
      ...(r1.data ?? []).map((e: any) => ({ ...e, table_source: 'arme_contact' as const, categorie: e.categorie || 'Arme contact', data: {} })),
      ...(r2.data ?? []).map((e: any) => ({ ...e, table_source: 'arme_distance' as const, categorie: e.categorie || 'Arme distance', data: {} })),
      ...(r3.data ?? []).map((e: any) => ({ ...e, table_source: 'armure' as const, categorie: 'Armure', data: {} })),
      ...(r4.data ?? []).map((e: any) => ({ ...e, table_source: 'equipement' as const })),
    ];

    all.sort((a, b) => a.nom.localeCompare(b.nom));
    setEquipements(all);
  };

  const fetchVoieForPeuple = async (peupleId: string) => {
    const { data } = await supabase
      .from('voies').select('*').eq('peuple_id', peupleId).single();
    setSelectedVoie(data as Voie);
  };

  const fetchVoiesPrestige = async () => {
    let query = supabase.from('voies').select('*, familles(nom)').eq('type', 'prestige').order('nom');
    if (campaignId) {
      query = query.or(`campaign_id.eq.${campaignId},campaign_id.is.null`);
    } else {
      query = query.is('campaign_id', null);
    }
    const { data } = await query;
    if (data) setVoiesPrestige(data.map((v: any) => ({ ...v, famille_nom: v.familles?.nom ?? null })) as FamilleVoie[]);
  };

  const fetchVoiesForProfil = async (profilId: string) => {
    const { data } = await supabase
      .from('voies').select('*').eq('profil_id', profilId).order('nom');
    setSelectedProfilVoies((data as FamilleVoie[]) ?? []);
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
    if (selectedPeupleId) fetchVoieForPeuple(selectedPeupleId);
    else setSelectedVoie(null);
  }, [selectedPeupleId]);

  useEffect(() => {
    if (selectedProfilId) fetchVoiesForProfil(selectedProfilId);
    else setSelectedProfilVoies([]);
  }, [selectedProfilId]);

  const handleSectionChange = (section: Section | null) => {
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
  const selectedFamilleArchetype = famillesArchetypes.find(f => f.id === selectedFamilleArchetypeId);
  const selectedProfil = profils.find(f => f.id === selectedProfilId);
  const selectedMonstre = monstres.find(m => m.id === selectedMonstreId);
  const filteredEquipements = equipements.filter(e => e.table_source === selectedEquipementTable);
  const selectedVoiePrestige = voiesPrestige.find(v => v.id === selectedVoiePrestigeId);

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
    if (!deletingEquipement) return;
    setIsDeletingObjet(true);
    const tableMap = { arme_contact: 'armes_contact', arme_distance: 'armes_distance', armure: 'armures', equipement: 'equipements' } as const;
    const table = tableMap[deletingEquipement.table_source] || 'equipements';
    try {
      await supabase.from(table).delete().eq('id', deletingEquipement.id);
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
      await supabase.from('voies').delete().eq('profil_id', selectedProfil.id);
      await supabase.from('profils').delete().eq('id', selectedProfil.id);
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
      await supabase.from('familles').delete().eq('id', selectedFamilleArchetype.id);
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
      await supabase.from('voies').delete().eq('id', selectedVoiePrestige.id);
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
      peuples={peuples}
      selectedPeupleId={selectedPeupleId}
      famillesArchetypes={famillesArchetypes}
      selectedFamilleArchetypeId={selectedFamilleArchetypeId}
      profils={profils}
      selectedProfilId={selectedProfilId}
      monstres={monstres}
      selectedMonstreId={selectedMonstreId}
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
        ) : activeSection === 'familles' && selectedFamilleArchetype ? (
          <FamilleDetail
            famille={selectedFamilleArchetype}
            isFullscreen={isFullscreen}
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
        ) : activeSection === 'objets' && selectedEquipementTable ? (
          <EquipementDetail
            equipements={filteredEquipements}
            selectedTable={selectedEquipementTable}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(f => !f)}
            onEdit={(eq) => { setEditingEquipement(eq); setShowEditObjet(true); }}
            onDelete={(eq) => { setDeletingEquipement(eq); setShowDeleteObjetConfirm(true); }}
          />
        ) : activeSection === 'voies_prestige' && selectedVoiePrestige ? (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-serif text-2xl text-white tracking-wide">{selectedVoiePrestige.nom}</h2>
                {selectedVoiePrestige.famille_nom && (
                  <span className="text-[11px] uppercase tracking-widest text-[#E3CCCD]/50 mt-1 inline-block">
                    {selectedVoiePrestige.famille_nom}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setEditingVoiePrestige(selectedVoiePrestige); setShowVoiePrestigeWizard(true); }}
                  className="px-3 py-1.5 rounded-lg border border-white/15 text-white/60 hover:text-white hover:border-white/30 text-[12px] transition-all"
                >
                  Éditer
                </button>
                <button
                  onClick={() => setShowDeleteVoiePrestigeConfirm(true)}
                  className="px-3 py-1.5 rounded-lg border border-red-400/30 text-red-400/70 hover:text-red-400 hover:border-red-400/50 text-[12px] transition-all"
                >
                  Supprimer
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {([1, 2, 3, 4, 5] as const).map((rangNum) => {
                const key = `rang${rangNum}` as keyof typeof selectedVoiePrestige.capacites;
                const cap = selectedVoiePrestige.capacites[key];
                if (!cap?.nom) return null;
                return (
                  <div key={key} className="flex gap-4 items-start py-3 border-b border-white/6 last:border-0">
                    <span className="w-5 h-5 mt-0.5 rounded-full border border-white/30 flex items-center justify-center text-[11px] text-white/60 font-medium shrink-0">
                      {rangNum}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white text-sm font-medium">{cap.nom}</span>
                        <span className="text-[10px] uppercase tracking-widest text-[#E3CCCD]/50 border border-[#E3CCCD]/20 rounded-full px-2 py-0.5">
                          {cap.type}
                        </span>
                      </div>
                      {cap.description && (
                        <p className="text-white/60 text-[13px] leading-relaxed">{cap.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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