/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { ChevronDown, Maximize2, Pencil, Trash2, ArrowLeft, Plus, Image as ImageIcon, Users, BookOpen as BookOpenIcon, Swords, Wand2 } from "lucide-react";
import { BookLayout } from "@/components/layout/BookLayout";
import { supabase } from "@/lib/supabase";
import { PeupleWizard } from "@/components/compendium/PeupleWizard"; 

// --- TYPES ---
interface PeupleData {
  age: string;
  esperance: string;
  taille: string;
  poids: string;
  traits: string;
  caracteristiques: string;
}

interface Peuple {
  id: string;
  nom: string;
  description: string;
  data: PeupleData;
  image_url?: string;
}

interface Voie {
  id: string;
  nom: string;
  capacites: {
    rang1: { nom: string; description: string };
    rang2: { nom: string; description: string };
    rang3: { nom: string; description: string };
    rang4: { nom: string; description: string };
    rang5: { nom: string; description: string };
  };
}

interface CompendiumProps {
  onBack: () => void;
  campaignId?: string; // null = Compendium Global
}

type Section = 'peuples' | 'familles' | 'bestiaire' | 'objets';

export function Compendium({ onBack, campaignId }: CompendiumProps) {
  // Navigation
  const [activeSection, setActiveSection] = useState<Section>('peuples');
  
  // Menus & Modals
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showPeupleWizard, setShowPeupleWizard] = useState(false);
  
  // Données
  const [peuples, setPeuples] = useState<Peuple[]>([]);
  const [selectedPeupleId, setSelectedPeupleId] = useState<string | null>(null);
  const [selectedVoie, setSelectedVoie] = useState<Voie | null>(null);

  const fetchPeuples = async () => {
    let query = supabase.from('peuples').select('*').order('nom');
    if (campaignId) query = query.eq('campaign_id', campaignId);
    else query = query.is('campaign_id', null);

    const { data } = await query;
    if (data) setPeuples(data as Peuple[]);
  };

  const fetchVoieForPeuple = async (peupleId: string) => {
    const { data } = await supabase
      .from('voies')
      .select('*')
      .eq('peuple_id', peupleId)
      .single();
    setSelectedVoie(data as Voie);
  };

  useEffect(() => {
    if (activeSection === 'peuples') {
      fetchPeuples();
    }
  }, [activeSection, campaignId]);

  useEffect(() => {
    if (selectedPeupleId) fetchVoieForPeuple(selectedPeupleId);
    else setSelectedVoie(null);
  }, [selectedPeupleId]);

  const selectedPeuple = peuples.find(p => p.id === selectedPeupleId);

  // --- BARRE LATÉRALE ---
  const sidebar = (
    <>
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-white/5 space-y-2">
        
        {/* SECTION PEUPLES */}
        <div className="w-full">
          <button 
            onClick={() => setActiveSection('peuples')} 
            className={`flex items-center justify-between w-full p-2.5 text-white/90 bg-[#1E1941]/40 border ${activeSection === 'peuples' ? 'border-[#E3CCCD]/50 bg-[#29206A]/40 shadow-[0_0_15px_rgba(227,204,205,0.1)]' : 'border-[#E3CCCD]/20 hover:border-[#E3CCCD]/40'} rounded-lg transition-all text-[13px] font-medium`}
          >
            <span>Peuples</span>
            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${activeSection === 'peuples' ? 'rotate-180 text-[#E3CCCD]' : ''}`} />
          </button>
          
          {activeSection === 'peuples' && (
            <div className="mt-2 space-y-1 ml-2 border-l border-[#E3CCCD]/20 pl-2.5 mb-2">
              {peuples.length === 0 ? (
                <div className="text-xs text-white/40 italic py-2">Aucun peuple.</div>
              ) : (
                peuples.map(peuple => (
                  <button 
                    key={peuple.id} 
                    onClick={() => setSelectedPeupleId(peuple.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all text-[13px] font-light flex items-center gap-2.5 border ${selectedPeupleId === peuple.id ? "bg-[#29206A]/60 text-white border-[#E3CCCD]/30 shadow-inner" : "hover:bg-white/5 text-white/70 hover:text-white border-transparent"}`}
                  >
                    <div className={`w-1.5 h-1.5 shrink-0 rounded-full ${selectedPeupleId === peuple.id ? "bg-[#E3CCCD] shadow-[0_0_8px_#E3CCCD]" : "bg-[#E3CCCD]/30"}`} />
                    <span className="truncate">{peuple.nom}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* AUTRES SECTIONS */}
        {[
          { id: 'familles', label: 'Familles' },
          { id: 'bestiaire', label: 'Bestiaire' },
          { id: 'objets', label: 'Objets Magiques' }
        ].map(section => (
          <div key={section.id} className="w-full">
            <button 
              onClick={() => { setActiveSection(section.id as Section); setSelectedPeupleId(null); }} 
              className={`flex items-center justify-between w-full p-2.5 text-white/90 bg-[#1E1941]/40 border ${activeSection === section.id ? 'border-[#E3CCCD]/50 bg-[#29206A]/40 shadow-[0_0_15px_rgba(227,204,205,0.1)]' : 'border-[#E3CCCD]/20 hover:border-[#E3CCCD]/40'} rounded-lg transition-all text-[13px] font-medium`}
            >
              <span>{section.label}</span>
              <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${activeSection === section.id ? 'rotate-180 text-[#E3CCCD]' : ''}`} />
            </button>
            {activeSection === section.id && (
              <div className="mt-2 ml-2 border-l border-[#E3CCCD]/20 pl-2.5 mb-2">
                <div className="text-[11px] text-white/30 italic py-2 px-2 uppercase tracking-widest">En construction</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ZONE BOUTONS D'ACTION AVEC MENU DÉROULANT */}
      <div className="p-4 space-y-3 shrink-0 bg-black/10 border-t border-white/5 relative">
        
        {/* Le menu déroulant (qui s'ouvre vers le haut) */}
        {showCreateMenu && (
          <div className="absolute bottom-27.5 left-4 right-4 bg-[#1E1941]/95 border border-[#E3CCCD]/30 rounded-xl shadow-2xl backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 z-50">
            <button 
              onClick={() => { setShowPeupleWizard(true); setShowCreateMenu(false); }} 
              className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-white hover:bg-white/10 transition-colors border-b border-white/5"
            >
              <Users className="w-4 h-4 text-[#E3CCCD]" /> Ajouter un Peuple
            </button>
            <button disabled className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-white/30 cursor-not-allowed border-b border-white/5">
              <BookOpenIcon className="w-4 h-4" /> Ajouter une Famille <span className="text-[9px] uppercase tracking-widest ml-auto border border-white/10 px-1.5 rounded">Bientôt</span>
            </button>
            <button disabled className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-white/30 cursor-not-allowed border-b border-white/5">
              <Swords className="w-4 h-4" /> Créer un Monstre <span className="text-[9px] uppercase tracking-widest ml-auto border border-white/10 px-1.5 rounded">Bientôt</span>
            </button>
            <button disabled className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-white/30 cursor-not-allowed">
              <Wand2 className="w-4 h-4" /> Créer un Objet <span className="text-[9px] uppercase tracking-widest ml-auto border border-white/10 px-1.5 rounded">Bientôt</span>
            </button>
          </div>
        )}

        {/* Le bouton Peupler modifié */}
        <button 
          onClick={() => setShowCreateMenu(!showCreateMenu)} 
          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border ${showCreateMenu ? 'border-[#E3CCCD] bg-[#29206A]/60' : 'border-[#E3CCCD]/30 bg-[#29206A]/40'} text-white hover:bg-white/10 text-[13px] transition-all shadow-lg`}
        >
          <div className="flex items-center gap-3">
            <Plus className={`w-4 h-4 transition-transform ${showCreateMenu ? 'rotate-45 text-[#E3CCCD]' : ''}`} /> 
            Peupler...
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${showCreateMenu ? "rotate-180 text-[#E3CCCD]" : "text-white/50"}`} />
        </button>

        <button onClick={onBack} className="w-full flex items-center justify-start px-3 gap-3 py-2 text-white/60 hover:text-white text-[13px] transition-colors border border-transparent">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
      </div>
    </>
  );

  return (
    <>
      <BookLayout spineTitle="Compendium" sidebar={sidebar}>
        {activeSection === 'peuples' && selectedPeuple ? (
          <div className="flex-1 flex flex-col h-full min-h-0 p-6 md:p-10 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
            
            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-[#E3CCCD]/20 pb-4 mb-6 shrink-0">
              <h1 className="font-serif text-4xl text-white tracking-wider">{selectedPeuple.nom}</h1>
              <div className="flex items-center gap-1 bg-[#1E1941]/80 border border-[#E3CCCD]/20 rounded-full px-2 py-1.5 backdrop-blur-md shadow-xl">
                <button className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"><Maximize2 className="w-4 h-4" /></button>
                <button className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"><Pencil className="w-4 h-4" /></button>
                <button className="p-1.5 text-white/60 hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/10 rounded-full transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="space-y-4 flex-1">
              {/* LORE (Description) */}
              <div className="bg-[#1E1941]/40 border border-[#E3CCCD]/20 rounded-2xl p-5 flex gap-4 text-[13px] font-light text-white/90 leading-relaxed shadow-inner">
                <div className="shrink-0 mt-0.5"><span className="text-[#E3CCCD]">✧</span></div>
                <div className="whitespace-pre-wrap">{selectedPeuple.description || "Aucune description renseignée."}</div>
              </div>

              {/* TRAITS DE BASE (Grid) */}
              <div className="bg-[#1E1941]/40 border border-[#E3CCCD]/20 rounded-2xl p-5 text-[13px] text-white/90 shadow-inner">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                  <div className="flex gap-2">
                    <span className="font-bold">• Âge de départ :</span> 
                    <span className="font-light">{selectedPeuple.data?.age || "N/A"}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold">• Espérance de vie :</span> 
                    <span className="font-light">{selectedPeuple.data?.esperance || "N/A"}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold">• Taille :</span> 
                    <span className="font-light">{selectedPeuple.data?.taille || "N/A"}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold">• Poids :</span> 
                    <span className="font-light">{selectedPeuple.data?.poids || "N/A"}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                  <span className="font-bold shrink-0">• Traits :</span> 
                  <span className="font-light">{selectedPeuple.data?.traits || "Aucun"}</span>
                </div>
              </div>

              {/* CARTE ET VOIE */}
              <div className="flex flex-col xl:flex-row gap-4 items-stretch">
                
                {/* Image Card */}
                <div className="xl:w-72 shrink-0 bg-[#1E1941]/40 border border-[#E3CCCD]/20 rounded-2xl p-2 relative overflow-hidden flex flex-col shadow-inner">
                  <div className="flex-1 min-h-87.5 border border-[#E3CCCD]/30 rounded-xl overflow-hidden relative flex items-center justify-center bg-black/20">
                    {selectedPeuple.image_url ? (
                      <img src={selectedPeuple.image_url} alt={selectedPeuple.nom} className="absolute inset-0 w-full h-full object-cover opacity-90" />
                    ) : (
                      <ImageIcon className="w-12 h-12 text-white/10" />
                    )}
                    {/* Overlay text de la carte */}
                    <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black via-black/80 to-transparent pt-16 pb-6 text-center">
                      <h3 className="font-serif text-2xl text-white tracking-widest">{selectedPeuple.nom}</h3>
                    </div>
                  </div>
                  {/* Décorations de la carte */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-3 h-3 border border-[#E3CCCD]/60 rotate-45" />
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3 h-3 border border-[#E3CCCD]/60 rotate-45" />
                </div>

                {/* Voie du Peuple */}
                <div className="flex-1 bg-[#29206A]/20 border border-[#E3CCCD]/20 rounded-2xl p-6 shadow-inner">
                  <div className="mb-5 pb-5 border-b border-white/10 text-[13px]">
                    <span className="font-bold text-white">Caractéristiques : </span>
                    <span className="font-light text-white/90">{selectedPeuple.data?.caracteristiques || "N/A"}</span>
                  </div>

                  <h3 className="font-serif text-xl text-white mb-5">{selectedVoie ? selectedVoie.nom : "Voie raciale non définie"}</h3>
                  
                  {selectedVoie ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5].map((rangNum) => {
                        const rang = selectedVoie.capacites[`rang${rangNum}` as keyof typeof selectedVoie.capacites];
                        return (
                          <div key={rangNum} className="text-[13px]">
                            <span className="font-bold text-white">{rangNum}. {rang.nom} : </span>
                            <span className="font-light text-white/80 leading-relaxed">{rang.description}</span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm font-light text-white/40 italic">Aucune voie n'a été trouvée pour ce peuple dans la base de données.</p>
                  )}
                </div>

              </div>
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

      {/* --- INTEGRATION DU WIZARD --- */}
      {showPeupleWizard && (
        <PeupleWizard 
          campaignId={campaignId}
          onClose={() => setShowPeupleWizard(false)}
          onSuccess={() => {
            fetchPeuples(); // Recharger les peuples après création
            setActiveSection('peuples'); // Rediriger sur l'onglet peuples
          }}
        />
      )}
    </>
  );
}