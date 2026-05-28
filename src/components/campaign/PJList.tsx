
import { usePJs } from '@/hooks/usePJs';
import { useEffect, useState } from 'react';
import type { Peuple } from '@/types/compendium';
import { fetchPlayers } from '@/hooks/usePJs';
import { supabase } from '@/lib/supabase';

interface PJListProps {
  campaignId: string;
}

export function PJList({ campaignId }: PJListProps) {
  const { data: pjs, isLoading } = usePJs(campaignId);
  const [peuples, setPeuples] = useState<Peuple[]>([]);
  const [players, setPlayers] = useState<{ id: string; pseudo: string }[]>([]);
  const [profils, setProfils] = useState<{ id: string; nom: string }[]>([]);

  useEffect(() => {
    // Charge les peuples, profils et joueurs
    (async () => {
      const { data: peuplesData, error: peuplesError } = await supabase
        .from('peuples')
        .select('id, nom, image_url');
      if (!peuplesError && peuplesData) setPeuples(peuplesData);
      const { data: profilsData, error: profilsError } = await supabase
        .from('profils')
        .select('id, nom');
      if (!profilsError && profilsData) setProfils(profilsData);
    })();
    fetchPlayers().then(setPlayers);
  }, []);

  if (isLoading) return <div className="text-white/60">Chargement des personnages...</div>;
  if (!pjs?.length) return <div className="text-white/40 italic">Aucun personnage joueur.</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-10">
      {pjs.map((pj) => {
        const peuple = peuples.find((p) => p.id === pj.peuple_id);
        const player = players.find((pl) => pl.id === pj.player_id);
        // Profil : soit via pj.profils_id, soit via stats.profils_id, soit via pathways
        let profilId = pj.profils_id || pj.stats?.profils_id;
        if (!profilId && Array.isArray(pj.pathways)) {
          const voieProfil = pj.pathways.find((v: any) => v.type === 'profil' || v.isProfil);
          if (voieProfil && voieProfil.profils_id) profilId = voieProfil.profils_id;
        }
        const profil = profils.find((pr) => pr.id === profilId);
        return (
          <div key={pj.id} className="bg-[#1E1941]/70 border border-white/10 rounded-xl shadow-lg overflow-hidden flex flex-col items-center p-4 group hover:scale-[1.03] transition-transform">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#E3CCCD]/30 mb-3 bg-white/10">
              <img src={pj.image_url || '/default-avatar.png'} alt={pj.name} className="object-cover w-full h-full" />
            </div>
            <div className="text-lg font-serif text-white mb-1 truncate w-full text-center">{pj.name}</div>
            <div className="text-[12px] text-[#E3CCCD]/80 mb-1">{peuple?.nom || <span className="italic text-white/30">Peuple inconnu</span>}</div>
            <div className="text-[12px] text-[#E3CCCD]/60 mb-1">{profil?.nom || <span className="italic text-white/30">Profil inconnu</span>}</div>
            <div className="text-[11px] text-white/50">{player?.pseudo || <span className="italic text-white/30">Joueur inconnu</span>}</div>
          </div>
        );
      })}
    </div>
  );
}
