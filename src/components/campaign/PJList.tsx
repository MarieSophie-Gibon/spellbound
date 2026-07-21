import { usePJs } from '@/hooks/usePJs';
import { useEffect, useState } from 'react';
import type { Peuple } from '@/types/compendium';
import { fetchPlayers } from '@/hooks/usePJs';
import { supabase } from '@/lib/supabase';
import { Lock, Star, User } from 'lucide-react';
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
    return (
      <div className="flex flex-col gap-2.5 w-full">
        {sortedPjs.map((pj) => {
          const peuple = peuples.find((p) => p.id === pj.peuple_id);

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
              className={`group relative w-full text-left rounded-xl overflow-hidden border transition-all ${
                canAccess
                  ? 'border-white/28 bg-[#4A4588]/52 hover:border-[#E3CCCD]/55 hover:bg-[#59529A]/58'
                  : 'border-white/18 bg-[#45407B]/42 opacity-90'
              }`}
            >
              <div className="absolute inset-0 z-0">
                <img
                  src={pj.image_url || '/default-avatar.png'}
                  alt={pj.name}
                  className="w-full h-full object-cover opacity-72 group-hover:opacity-78 transition-opacity"
                  style={{ objectPosition: 'center 20%' }}
                />
              </div>
              <div className="absolute inset-0 z-10 bg-linear-to-r from-[#1E1941]/68 via-[#1E1941]/34 to-[#1E1941]/52" />

              <div className="relative z-20 flex items-center gap-3 p-2">
                <div className="w-12 h-12 rounded-md overflow-hidden border border-[#E3CCCD]/45 bg-white/18 shrink-0">
                  <img
                    src={pj.image_url || '/default-avatar.png'}
                    alt={pj.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 justify-between">
                    <h4 className="font-serif text-[14px] text-white truncate">{pj.name}</h4>
                    {isOwnPJ && (
                      <Star className="w-3 h-3 text-[#E3CCCD]" />
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 min-w-0 text-[10px]">
                    <span className="uppercase tracking-[0.12em] text-[#E3CCCD]/85 truncate">{peuple?.nom || 'Inconnu'}</span>
                    <span className="text-white/45">•</span>
                    <span className="text-white/92 truncate">{profil?.nom || 'Profil'}</span>
                  </div>
                </div>
              </div>

              {!canAccess && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/32">
                  <Lock className="w-4 h-4 text-white" />
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