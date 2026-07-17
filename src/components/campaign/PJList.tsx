import { usePJs } from '@/hooks/usePJs';
import { useEffect, useState } from 'react';
import type { Peuple } from '@/types/compendium';
import { fetchPlayers } from '@/hooks/usePJs';
import { supabase } from '@/lib/supabase';
import { Lock, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useIsMobile } from '@/hooks/useIsMobile';

interface PJListProps {
  campaignId: string;
  isMJ?: boolean;
}

export function PJList({ campaignId, isMJ = false }: PJListProps) {
  const isMobile = useIsMobile();
  const { data: pjs, isLoading } = usePJs(campaignId);
  const currentUserId = useAuthStore((s) => s.session?.user?.id);
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

  if (isLoading) return <div className={`${isMobile ? 'text-white/60 text-xs italic px-1 py-2' : 'text-white/60 mt-10 ml-16 text-sm italic'}`}>Chargement des personnages...</div>;
  if (!pjs?.length) return <div className={`${isMobile ? 'text-white/40 text-xs italic px-1 py-2' : "text-white/40 text-sm italic mt-10 ml-16"}`}>Aucun personnage n'a rejoint la compagne.</div>;

  const sortedPjs = [...pjs].sort((a, b) => {
    const aOwn = a.user_id === currentUserId;
    const bOwn = b.user_id === currentUserId;
    if (aOwn && !bOwn) return -1;
    if (!aOwn && bOwn) return 1;
    return a.name.localeCompare(b.name, 'fr');
  });

  if (isMobile) {
    const mobileRibbonShape = "polygon(14px 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 14px 100%, 0 50%)";

    return (
      <div className="flex flex-col gap-2 w-full">
        {sortedPjs.map((pj) => {
          const peuple = peuples.find((p) => p.id === pj.peuple_id);
          const player = players.find((pl) => pl.id === pj.player_id);

          let profilId = pj.profils_id || pj.stats?.profils_id;
          if (!profilId && Array.isArray(pj.pathways)) {
            const voieProfil = pj.pathways.find((v: { type?: string; isProfil?: boolean; profils_id?: string }) => v.type === 'profil' || v.isProfil);
            if (voieProfil && voieProfil.profils_id) profilId = voieProfil.profils_id;
          }
          const profil = profils.find((pr) => pr.id === profilId);

          const isOwnPJ = pj.user_id === currentUserId;
          const canAccess = isMJ || isOwnPJ;

          return (
            <button
              key={pj.id}
              type="button"
              onClick={() => navigate(`/campaign/personnages?pjId=${pj.id}`)}
              className={`relative w-full p-px text-left overflow-hidden transition-all ${
                canAccess
                  ? 'bg-white/75 hover:bg-white'
                  : 'bg-white/40 opacity-85'
              }`}
              style={{ clipPath: mobileRibbonShape, WebkitClipPath: mobileRibbonShape }}
            >
              <div
                className="relative w-full bg-[#1E1941]/92"
                style={{ clipPath: mobileRibbonShape, WebkitClipPath: mobileRibbonShape }}
              >
                <div className="absolute inset-0 z-0">
                  <img src={pj.image_url || '/default-avatar.png'} alt={pj.name} className="w-full h-full object-cover" style={{ objectPosition: 'center 18%' }} />
                </div>
                <div className="absolute inset-0 z-10 bg-linear-to-r from-[#1E1941]/95 via-[#1E1941]/70 to-[#1E1941]/85" />

                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rotate-45 bg-white/70" />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rotate-45 bg-white/70" />

                <div className="relative z-20 flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-serif text-[14px] text-white truncate">{pj.name}</h4>
                      {isOwnPJ && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full border border-[#E3CCCD]/35 bg-[#E3CCCD]/15 text-[#E3CCCD] uppercase tracking-[0.08em]">Associe</span>
                      )}
                    </div>
                    <p className="text-[9px] text-[#E3CCCD]/80 uppercase tracking-[0.14em] truncate mt-0.5">{peuple?.nom || 'Inconnu'}</p>
                    <p className="text-[10px] text-white/75 truncate">{profil?.nom || 'Profil'}</p>
                    <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/25 px-2 py-0.5 max-w-full">
                      <User className="w-2.5 h-2.5 text-[#E3CCCD] shrink-0" />
                      <span className="text-[8px] text-white/80 truncate">{player?.pseudo || 'Joueur'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {!canAccess && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                  <Lock className="w-4 h-4 text-white/45" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Forme de la bannière
  const bannerShape = "polygon(50% 0%, 100% 7%, 100% 93%, 50% 100%, 0% 93%, 0% 7%)";

  return (
    <div className="flex flex-col w-full relative pl-10 lg:pl-15 z-5">
      {/* Conteneur des bannières */}
      <div className="flex flex-wrap gap-1">
        {sortedPjs.map((pj) => {
          const peuple = peuples.find((p) => p.id === pj.peuple_id);
          const player = players.find((pl) => pl.id === pj.player_id);
          
          let profilId = pj.profils_id || pj.stats?.profils_id;
          if (!profilId && Array.isArray(pj.pathways)) {
            const voieProfil = pj.pathways.find((v: { type?: string; isProfil?: boolean; profils_id?: string }) => v.type === 'profil' || v.isProfil);
            if (voieProfil && voieProfil.profils_id) profilId = voieProfil.profils_id;
          }
          const profil = profils.find((pr) => pr.id === profilId);

          const isOwnPJ = pj.user_id === currentUserId;
          const canAccess = isMJ || isOwnPJ;

          return (
            <button 
              key={pj.id} 
              onClick={() => navigate(`/campaign/personnages?pjId=${pj.id}`)}
              className={`group relative flex flex-col w-30 h-65 focus:outline-none transition-transform duration-500 drop-shadow-2xl bg-linear-to-b from-[#E3CCCD] via-[#E3CCCD]/50 to-[#E3CCCD] p-0.5 ${
                canAccess ? 'hover:-translate-y-3 cursor-pointer' : 'hover:-translate-y-1 cursor-pointer opacity-75'
              }`}
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
                <div className="absolute inset-0 bg-linear-to-t from-[#1E1941] via-[#1E1941]/70 to-transparent opacity-90 group-hover:opacity-80 transition-opacity duration-500 z-10" />

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

                {/* Overlay verrou pour PJ inaccessible */}
                {!canAccess && (
                  <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30">
                    <Lock className="w-5 h-5 text-white/40" />
                  </div>
                )}

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