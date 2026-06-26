import { usePJs } from '@/hooks/usePJs';
import { useEffect, useState } from 'react';
import type { Peuple } from '@/types/compendium';
import { fetchPlayers } from '@/hooks/usePJs';
import { supabase } from '@/lib/supabase';
import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PJListProps {
  campaignId: string;
}

export function PJList({ campaignId }: PJListProps) {
  const { data: pjs, isLoading } = usePJs(campaignId);
  const [peuples, setPeuples] = useState<Peuple[]>([]);
  const [players, setPlayers] = useState<{ id: string; pseudo: string }[]>([]);
  const [profils, setProfils] = useState<{ id: string; nom: string }[]>([]);
  
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: peuplesData, error: peuplesError } = await supabase
        .from('peuples')
        .select('id, nom, image_url, description, data');
      if (!peuplesError && peuplesData) setPeuples(peuplesData);
      
      const { data: profilsData, error: profilsError } = await supabase
        .from('profils')
        .select('id, nom');
      if (!profilsError && profilsData) setProfils(profilsData);
    })();
    
    fetchPlayers().then(setPlayers);
  }, []);

  if (isLoading) return <div className="text-white/60 mt-10 ml-16 text-sm italic">Chargement des personnages...</div>;
  if (!pjs?.length) return <div className="text-white/40 text-sm italic mt-10 ml-16">Aucun personnage n'a rejoint la compagne.</div>;

  // Forme de la bannière
  const bannerShape = "polygon(50% 0%, 100% 7%, 100% 93%, 50% 100%, 0% 93%, 0% 7%)";

  return (
    <div className="flex flex-col w-full relative pl-10 lg:pl-15 z-5">
      {/* Conteneur des bannières */}
      <div className="flex flex-wrap gap-1">
        {pjs.map((pj) => {
          const peuple = peuples.find((p) => p.id === pj.peuple_id);
          const player = players.find((pl) => pl.id === pj.player_id);
          
          let profilId = pj.profils_id || pj.stats?.profils_id;
          if (!profilId && Array.isArray(pj.pathways)) {
            const voieProfil = pj.pathways.find((v: any) => v.type === 'profil' || v.isProfil);
            if (voieProfil && voieProfil.profils_id) profilId = voieProfil.profils_id;
          }
          const profil = profils.find((pr) => pr.id === profilId);

          return (
            <button 
              key={pj.id} 
              onClick={() => navigate('/campaign/personnages')}
              className="group relative flex flex-col w-30 h-65 focus:outline-none hover:-translate-y-3 transition-transform duration-500 drop-shadow-2xl bg-gradient-to-b from-[#E3CCCD] via-[#E3CCCD]/50 to-[#E3CCCD] p-[2px]"
              style={{ clipPath: bannerShape, WebkitClipPath: bannerShape }}
            >
              {/* Conteneur principal intérieur */}
              <div 
                className="relative w-full h-full bg-[#1E1941] flex flex-col overflow-hidden"
                style={{ clipPath: bannerShape, WebkitClipPath: bannerShape }}
              >
                
                {/* Liseré fin interne (Tracé en SVG pour épouser la découpe parfaite) */}
                <svg 
                  className="absolute inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)] pointer-events-none z-20" 
                  viewBox="0 0 100 100" 
                  preserveAspectRatio="none"
                >
                  <polygon 
                    points="50,0 100,7 100,93 50,100 0,93 0,7" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                    className="text-[#E3CCCD]/30 group-hover:text-[#E3CCCD]/60 transition-colors duration-500"
                  />
                </svg>

                {/* 1. Losange décoratif du haut */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 drop-shadow-md">
                  <div className="w-1.5 h-1.5 rotate-45 bg-[#E3CCCD]/90 group-hover:bg-[#E3CCCD] transition-colors" />
                </div>

                {/* 2. Image en plein écran (Background) */}
                <div className="absolute inset-0 z-0">
                  <img 
                    src={pj.image_url || '/default-avatar.png'} 
                    alt={pj.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                  />
                </div>

                {/* 3. Dégradé ascendant pour lisibilité du texte */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1E1941] via-[#1E1941]/70 to-transparent opacity-90 group-hover:opacity-80 transition-opacity duration-500 z-10" />

                {/* 4. Textes et Infos */}
                <div className="relative z-30 mt-auto flex flex-col items-center px-2 pb-8">
                  
                  <h4 className="text-[17px] font-serif text-white group-hover:text-[#E3CCCD] transition-colors truncate w-full text-center drop-shadow-lg">
                    {pj.name}
                  </h4>
                  
                  <div className="w-6 h-px bg-[#E3CCCD]/60 my-1.5 group-hover:w-10 transition-all duration-500" />
                  
                  <span className="text-[10px] uppercase tracking-widest text-[#E3CCCD] truncate w-full text-center drop-shadow-md font-medium">
                    {peuple?.nom || 'Inconnu'}
                  </span>
                  
                  <span className="text-[12px] text-white/90 truncate w-full text-center mt-0.5 drop-shadow-md">
                    {profil?.nom || 'Profil'}
                  </span>

                  {/* Badge du Joueur */}
                  <div className="mt-3 bg-black/40 backdrop-blur-md border border-white/20 rounded-full px-2.5 py-1 flex items-center justify-center gap-1.5 w-[90%] group-hover:bg-black/60 transition-colors shadow-lg">
                    <User className="w-3 h-3 text-[#E3CCCD]" />
                    <span className="text-[9px] text-white/90 truncate">{player?.pseudo || 'Joueur'}</span>
                  </div>

                </div>

                {/* 5. Losange décoratif du bas */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 drop-shadow-md">
                    <div className="w-1.5 h-1.5 rotate-45 bg-[#E3CCCD]/90 group-hover:bg-[#E3CCCD] transition-colors" />
                </div>

              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}