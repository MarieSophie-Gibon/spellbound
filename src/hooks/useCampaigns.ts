import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Campaign {
  id: string
  nom: string
  description: string
  image_url: string | null
  owner_id?: string | null
  created_at?: string | null
  access_type?: 'owner' | 'member' | 'pj'
}

function isMissingTableError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === '42P01'
}

function isMissingColumnError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === '42703'
}

function createInviteCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let code = ''
  for (let i = 0; i < length; i += 1) {
    code += chars[bytes[i] % chars.length]
  }
  return code
}

export function useCampaigns(role?: 'mj' | 'player') {
  return useQuery({
    queryKey: ['campaigns', role],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const mergeAndSort = (...lists: Campaign[][]): Campaign[] => {
        const byId = new Map<string, Campaign>()
        for (const list of lists) {
          for (const campaign of list) {
            const existing = byId.get(campaign.id)
            if (!existing) {
              byId.set(campaign.id, campaign)
              continue
            }
            const rank = (t?: Campaign['access_type']) => (t === 'owner' ? 3 : t === 'member' ? 2 : 1)
            if (rank(campaign.access_type) > rank(existing.access_type)) {
              byId.set(campaign.id, campaign)
            }
          }
        }
        return Array.from(byId.values()).sort(
          (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
        )
      }

      // 1. Campagnes dont l'utilisateur est propriétaire
      const { data: ownedData, error: ownedError } = await supabase
        .from('campagnes')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
      if (ownedError && !isMissingColumnError(ownedError)) throw ownedError
      const ownedCampaigns = ((ownedData ?? []) as Campaign[]).map((c) => ({ ...c, access_type: 'owner' as const }))

      // 2. Campagnes rejointes via invitation (campaign_members)
      let memberCampaigns: Campaign[] = []
      const { data: memberRows, error: memberErr } = await supabase
        .from('campaign_members')
        .select('campaign_id')
        .eq('user_id', user.id)
      if (memberErr && !isMissingTableError(memberErr)) throw memberErr
      const memberIds = (memberRows ?? []).map((r) => r.campaign_id).filter(Boolean) as string[]
      if (memberIds.length > 0) {
        const { data: mData, error: mErr } = await supabase
          .from('campagnes')
          .select('*')
          .in('id', memberIds)
        if (mErr) throw mErr
        memberCampaigns = ((mData ?? []) as Campaign[]).map((c) => ({ ...c, access_type: 'member' as const }))
      }

      // 3. Campagnes liées via un PJ (accès joueur ancien format)
      let pjCampaigns: Campaign[] = []
      const { data: pjRows, error: pjErr } = await supabase
        .from('pj')
        .select('campaign_id')
        .eq('user_id', user.id)
      if (pjErr) throw pjErr
      const pjIds = (pjRows ?? []).map((r) => r.campaign_id).filter(Boolean) as string[]
      // Exclure les campagnes déjà couvertes
      const knownIds = new Set([...ownedCampaigns.map(c => c.id), ...memberIds])
      const remainingPjIds = pjIds.filter(id => !knownIds.has(id))
      if (remainingPjIds.length > 0) {
        const { data: pjData, error: pjCErr } = await supabase
          .from('campagnes')
          .select('*')
          .in('id', remainingPjIds)
        if (pjCErr) throw pjCErr
        pjCampaigns = ((pjData ?? []) as Campaign[]).map((c) => ({ ...c, access_type: 'pj' as const }))
      }

      return mergeAndSort(ownedCampaigns, memberCampaigns, pjCampaigns)
    }
  })
}

export interface CampaignInvitation {
  id: string
  campaign_id: string
  code: string
  expires_at: string | null
}

export function useCreateCampaignInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ campaignId, expiresInHours = 72 }: { campaignId: string; expiresInHours?: number }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non connecté')

      const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()

      for (let i = 0; i < 3; i += 1) {
        const code = createInviteCode()
        const { data, error } = await supabase
          .from('campaign_invitations')
          .insert({
            campaign_id: campaignId,
            code,
            created_by: user.id,
            expires_at: expiresAt,
          })
          .select('id, campaign_id, code, expires_at')
          .single()

        if (!error && data) return data as CampaignInvitation
        if (error && !String(error.message).toLowerCase().includes('duplicate')) throw error
      }

      throw new Error("Impossible de générer un code d'invitation unique")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}

export function useJoinCampaignByCode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ code }: { code: string }) => {
      const normalized = code.trim().toUpperCase()
      if (!normalized) throw new Error('Code invitation vide')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non connecté')

      const { data: invitation, error: inviteErr } = await supabase
        .from('campaign_invitations')
        .select('id, campaign_id, code, expires_at')
        .eq('code', normalized)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (inviteErr || !invitation) {
        throw new Error("Code d'invitation invalide")
      }

      if (invitation.expires_at && new Date(invitation.expires_at).getTime() < Date.now()) {
        throw new Error("Ce code d'invitation a expiré")
      }

      const { error: memberErr } = await supabase
        .from('campaign_members')
        .upsert({ campaign_id: invitation.campaign_id, user_id: user.id }, { onConflict: 'campaign_id,user_id' })

      if (memberErr) throw memberErr

      const { data: campaign, error: campaignErr } = await supabase
        .from('campagnes')
        .select('*')
        .eq('id', invitation.campaign_id)
        .limit(1)
        .maybeSingle()

      if (campaignErr) throw campaignErr
      if (!campaign) throw new Error('Campagne introuvable')
      return campaign as Campaign
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}

export function useCreateCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (campaign: Omit<Campaign, 'id'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non connecté')

      const { data, error } = await supabase
        .from('campagnes')
        .insert([{ ...campaign, owner_id: user.id }])
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

export function useLeaveCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non connecté')

      const { error } = await supabase
        .from('campaign_members')
        .delete()
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id)

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

export interface CampaignProgress {
  totalChapitres: number
  completedChapitres: number
  totalScenarios: number
}

export function useCampaignProgress(campaignId: string) {
  return useQuery({
    queryKey: ['campaignProgress', campaignId],
    queryFn: async (): Promise<CampaignProgress> => {
      const { data: scenarios } = await supabase
        .from('scenarios')
        .select('id')
        .eq('campaign_id', campaignId)

      const totalScenarios = scenarios?.length ?? 0
      if (totalScenarios === 0) return { totalChapitres: 0, completedChapitres: 0, totalScenarios: 0 }

      const scenarioIds = scenarios!.map((s) => s.id)
      const { data: chapitres } = await supabase
        .from('chapitres')
        .select('id, completed')
        .in('scenario_id', scenarioIds)

      const totalChapitres = chapitres?.length ?? 0
      const completedChapitres = chapitres?.filter((c) => c.completed).length ?? 0

      return { totalChapitres, completedChapitres, totalScenarios }
    },
  })
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

export interface RevealedPnj {
  id: string
  name: string
  image_url: string | null
  description: string | null
  revealed_at: string
}

export function useRevealedPnjs(campaignId: string) {
  return useQuery({
    queryKey: ['revealedPnjs', campaignId],
    queryFn: async (): Promise<RevealedPnj[]> => {
      const { data, error } = await supabase
        .from('campaign_revealed_pnjs')
        .select('revealed_at, pnj:pnj_id(id, name, image_url, description)')
        .eq('campaign_id', campaignId)
        .order('revealed_at', { ascending: true })

      if (error) throw error

      return (data ?? []).map((row: any) => ({
        id: row.pnj.id,
        name: row.pnj.name,
        image_url: row.pnj.image_url,
        description: row.pnj.description,
        revealed_at: row.revealed_at,
      }))
    },
    enabled: !!campaignId,
  })
}