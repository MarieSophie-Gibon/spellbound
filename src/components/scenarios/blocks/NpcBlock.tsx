import { useState, useEffect } from "react";
import { Users, Search, MessageSquare, Info, X, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MagicCard } from "@/components/ui/MagicCard";
import { PNJWizard } from "@/components/personnage/PNJWizard";

interface NpcBlockProps {
  campaignId: string;
  data: {
    npcId?: string;
    nom?: string;
    imageUrl?: string;
    contexte?: string;
    informations?: string;
  };
  onChange: (newData: Partial<NpcBlockProps["data"]>) => void;
}

interface PnjResult {
  id: string;
  name: string;
  image_url: string | null;
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function NpcBlock({ campaignId, data, onChange }: NpcBlockProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<PnjResult[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const hasValidCampaignId = isValidUuid(campaignId);

  // Recherche des PNJs dans la base de données
  useEffect(() => {
    if (data.nom || showWizard || !hasValidCampaignId) {
      return;
    }

    const searchPnjs = async () => {
      let query = supabase
        .from('pnj')
        .select('id, name, image_url')
        .eq('campaign_id', campaignId)
        .limit(5);

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      const { data: results } = await query;
      if (results) setSearchResults(results);
    };

    const debounce = setTimeout(searchPnjs, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, data.nom, showWizard, campaignId, hasValidCampaignId]);

  const visibleResults = (data.nom || showWizard || !hasValidCampaignId) ? [] : searchResults;

  // Si aucun PNJ n'est défini, on affiche l'interface de recherche/création
  if (!data.nom) {
    return (
      <>
        <div className="flex flex-col border border-violet-500/20 bg-violet-500/5 rounded-2xl overflow-visible shadow-lg p-4 md:p-5">
          <div className="flex items-center gap-2 text-violet-400 mb-4">
            <Users className="w-5 h-5" />
            <span className="text-[13px] uppercase tracking-widest font-bold">Rencontre PNJ</span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400/50" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              placeholder="Rechercher un PNJ existant..."
              className="w-full bg-black/20 border border-violet-500/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-violet-400/50 transition-colors"
            />
            
            {/* Résultats de recherche */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1E1941] border border-violet-500/20 rounded-xl shadow-xl overflow-hidden z-20">
                {visibleResults.map(npc => (
                  <button
                    key={npc.id}
                    onClick={() => onChange({ npcId: npc.id, nom: npc.name, imageUrl: npc.image_url ?? undefined })}
                    className="w-full flex items-center gap-3 p-3 hover:bg-violet-500/10 transition-colors text-left border-b border-white/5 last:border-0"
                  >
                    <img src={npc.image_url || '/default-avatar.png'} alt={npc.name} className="w-8 h-8 rounded-full object-cover border border-violet-500/30 bg-black/50" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{npc.name}</div>
                    </div>
                  </button>
                ))}
                
                {/* Option Création à la volée via le Wizard */}
                <button
                  onClick={() => setShowWizard(true)}
                  disabled={!hasValidCampaignId}
                  className="w-full flex items-center gap-2 p-3 text-sm text-violet-300 hover:bg-violet-500/10 hover:text-violet-200 transition-colors bg-black/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus className="w-4 h-4" />
                  {hasValidCampaignId ? "Créer un nouveau PNJ" : "Campagne invalide (création désactivée)"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* PNJWizard en modale */}
        {showWizard && (
          <PNJWizard
            campaignId={campaignId}
            onClose={() => setShowWizard(false)}
            onSuccess={(pnj) => {
              if (pnj) {
                onChange({ npcId: pnj.id, nom: pnj.name, imageUrl: pnj.image_url ?? undefined });
              }
              setShowWizard(false);
            }}
          />
        )}
      </>
    );
  }

  // Si le PNJ est sélectionné, on affiche l'interface du bloc
  return (
    <div className="flex border border-violet-500/20 bg-violet-500/5 rounded-2xl overflow-hidden shadow-lg relative group/block">
      
      {/* Bouton pour changer de PNJ */}
      <button 
        onClick={() => onChange({ npcId: undefined, nom: undefined, imageUrl: undefined, contexte: undefined, informations: undefined })}
        className="absolute top-3 right-3 p-1.5 bg-black/40 hover:bg-red-500/80 text-white rounded-lg opacity-0 group-hover/block:opacity-100 transition-all z-10"
        title="Changer de PNJ (réinitialise le bloc)"
      >
        <X className="w-4 h-4" />
      </button>

      {/* GAUCHE : MagicCard avatar */}
      <div className="shrink-0 p-4">
        <MagicCard
          imageUrl={data.imageUrl}
          title={data.nom}
        />
      </div>

      {/* DROITE : Header + zones de texte */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-violet-500/10">
          <span className="text-[10px] uppercase tracking-widest text-violet-400/80 font-medium">Personnage non-joueur</span>
          <h3 className="text-lg font-serif text-white tracking-wide mt-1">{data.nom}</h3>
        </div>

        {/* Zones de texte */}
        <div className="p-4 md:p-5 flex flex-col gap-4">
          
          {/* Contexte de la rencontre */}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4 text-violet-300/80" />
            </div>
            <div className="flex-1">
              <h4 className="text-[11px] uppercase tracking-widest text-white/50 mb-1.5">Contexte / Attitude</h4>
              <textarea
                value={data.contexte || ""}
                onChange={(e) => onChange({ contexte: e.target.value })}
                placeholder="Que fait-il quand les joueurs arrivent ? Quelle est son humeur ?"
                className="w-full bg-transparent text-white/80 text-[13px] leading-relaxed outline-none resize-none overflow-hidden min-h-10 placeholder:text-white/20 focus:bg-white/5 p-2 -ml-2 rounded-lg transition-colors"
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = `${target.scrollHeight}px`;
                }}
              />
            </div>
          </div>

          <div className="w-full h-px bg-violet-500/10" />

          {/* Informations détenues */}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
              <Info className="w-4 h-4 text-violet-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-[11px] uppercase tracking-widest text-violet-300 mb-1.5 font-medium">Informations clés</h4>
              <textarea
                value={data.informations || ""}
                onChange={(e) => onChange({ informations: e.target.value })}
                placeholder="Quels secrets détient-il ? Que peut-il révéler aux joueurs ?"
                className="w-full bg-transparent text-violet-100/90 text-[13px] leading-relaxed outline-none resize-none overflow-hidden min-h-15 placeholder:text-violet-200/30 focus:bg-violet-500/10 p-2 -ml-2 rounded-lg transition-colors"
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = `${target.scrollHeight}px`;
                }}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}