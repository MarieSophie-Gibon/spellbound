import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Campaign {
  id: string
  nom: string
  description: string
  image_url: string | null
  created_at?: string | null
}

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campagnes')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as Campaign[]
    }
  })
}

export function useCreateCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (campaign: Omit<Campaign, 'id'>) => {
      const { data, error } = await supabase
        .from('campagnes')
        .insert([campaign])
        .select()
      
      if (error) throw error
      return data[0]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    }
  })
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...fields }: Partial<Omit<Campaign, 'id'>> & { id: string }) => {
      const { data, error } = await supabase
        .from('campagnes')
        .update(fields)
        .eq('id', id)
        .select()

      if (error) throw error
      return data[0] as Campaign
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    }
  })
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('campagnes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    }
  })
}

export interface CampaignStats {
  pj: number
  monstres: number
  profils: number
}

export function useCampaignStats(campaignId: string) {
  return useQuery({
    queryKey: ['campaignStats', campaignId],
    queryFn: async (): Promise<CampaignStats> => {
      const [pjRes, monstresRes, profilsRes] = await Promise.all([
        supabase.from('pj').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId),
        supabase.from('bestiaire').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId),
        supabase.from('profils').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId),
      ])
      return {
        pj: pjRes.count ?? 0,
        monstres: monstresRes.count ?? 0,
        profils: profilsRes.count ?? 0,
      }
    },
  })
}

export function useDuplicateCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ sourceId, newNom }: { sourceId: string; newNom: string }) => {
      const { data, error } = await supabase.rpc('duplicate_campaign', {
        source_id: sourceId,
        new_nom: newNom,
      })
      if (error) throw error
      return data as string // returns new campaign id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}