import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Campaign {
  id: string
  nom: string
  description: string
  image_url: string | null
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