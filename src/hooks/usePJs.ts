import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface PJ {
  id: string;
  name: string;
  image_url: string | null;
  stats: any;
  pathways: any;
  inventory: any;
  peuple_id?: string | null;
  player_id?: string | null;
  user_id?: string | null;
  profils_id?: string | null;
}

export function usePJs(campaignId: string) {
  return useQuery({
    queryKey: ['pjs', campaignId],
    queryFn: async (): Promise<PJ[]> => {
      const { data, error } = await supabase
        .from('pj')
        .select('id, name, image_url, stats, pathways, inventory, peuple_id, player_id, user_id, profils_id')
        .eq('campaign_id', campaignId)
        .order('name');
      if (error) throw error;
      return data as PJ[];
    },
  });
}

export async function fetchPlayers(): Promise<{ id: string; pseudo: string }[]> {
  const { data, error } = await supabase.from('utilisateurs').select('id, pseudo');
  if (error) throw error;
  return data || [];
}
