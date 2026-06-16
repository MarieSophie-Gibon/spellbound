
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface PeupleRef { id: string; nom: string; image_url: string | null; }

interface PNJListProps {
  campaignId: string;
}

interface PNJ {
  id: string;
  name: string;
  image_url: string | null;
  peuple_id?: string | null;
  profils_id?: string | null;
  stats: any;
  pathways: any;
  inventory: any;
}

export function PNJList({ campaignId }: PNJListProps) {
  const [pnjs, setPnjs] = useState<PNJ[]>([]);
  const [peuples, setPeuples] = useState<PeupleRef[]>([]);
  const [profils, setProfils] = useState<{ id: string; nom: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data: pnjsData } = await supabase
        .from('pnj')
        .select('id, name, image_url, peuple_id, stats, pathways, inventory, profils_id')
        .eq('campaign_id', campaignId)
        .order('name');
      setPnjs(pnjsData || []);
      const { data: peuplesData } = await supabase
        .from('peuples')
        .select('id, nom, image_url');
      setPeuples(peuplesData || []);
      const { data: profilsData } = await supabase
        .from('profils')
        .select('id, nom');
      setProfils(profilsData || []);
    })();
  }, [campaignId]);

  if (!pnjs.length) return <div className="text-white/40 italic">Aucun PNJ.</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-10">
      {pnjs.map((pnj) => {
        const peuple = peuples.find((p) => p.id === pnj.peuple_id);
        // Profil : soit via pnj.profils_id, soit via stats.profils_id, soit via pathways
        let profilId = pnj.profils_id || pnj.stats?.profils_id;
        if (!profilId && Array.isArray(pnj.pathways)) {
          const voieProfil = pnj.pathways.find((v: any) => v.type === 'profil' || v.isProfil);
          if (voieProfil && voieProfil.profils_id) profilId = voieProfil.profils_id;
        }
        const profil = profils.find((pr) => pr.id === profilId);
        return (
          <div key={pnj.id} className="bg-[#1E1941]/70 border border-white/10 rounded-xl shadow-lg overflow-hidden flex flex-col items-center p-4 group hover:scale-[1.03] transition-transform">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#E3CCCD]/30 mb-3 bg-white/10">
              <img src={pnj.image_url || '/default-avatar.png'} alt={pnj.name} className="object-cover w-full h-full" />
            </div>
            <div className="text-lg font-serif text-white mb-1 truncate w-full text-center">{pnj.name}</div>
            <div className="text-[12px] text-[#E3CCCD]/80 mb-1">{peuple?.nom || <span className="italic text-white/30">Peuple inconnu</span>}</div>
            <div className="text-[12px] text-[#E3CCCD]/60 mb-1">{profil?.nom || <span className="italic text-white/30">Profil inconnu</span>}</div>
          </div>
        );
      })}
    </div>
  );
}
