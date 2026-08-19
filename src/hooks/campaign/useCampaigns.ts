/* eslint-disable @typescript-eslint/no-explicit-any */
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
  system?: 'COF' | 'DAGGERHEART' | 'DND5E'
}

function isMissingTableError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === '42P01'
}

function isMissingColumnError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === '42703'
}

function isMissingRelationError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null || !('code' in err)) return false
  const code = (err as { code?: string }).code
  return code === 'PGRST200' || code === 'PGRST201' || code === 'PGRST204'
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
      // Compat legacy: certains environnements n'ont pas encore la colonne `role`.
      let memberCampaigns: Campaign[] = []
      type MemberRow = { campaign_id: string | null; role?: string | null }
      let memberRows: MemberRow[] = []

      const { data: memberRowsWithRole, error: memberErr } = await supabase
        .from('campaign_members')
        .select('campaign_id, role')
        .eq('user_id', user.id)

      if (memberErr) {
        if (isMissingColumnError(memberErr)) {
          const { data: fallbackRows, error: fallbackErr } = await supabase
            .from('campaign_members')
            .select('campaign_id')
            .eq('user_id', user.id)
          if (fallbackErr && !isMissingTableError(fallbackErr)) throw fallbackErr
          memberRows = (fallbackRows ?? []) as MemberRow[]
        } else if (!isMissingTableError(memberErr)) {
          throw memberErr
        }
      } else {
        memberRows = (memberRowsWithRole ?? []) as MemberRow[]
      }

      const memberIds = memberRows.map((r) => r.campaign_id).filter(Boolean) as string[]
      if (memberIds.length > 0) {
        const { data: mData, error: mErr } = await supabase
          .from('campagnes')
          .select('*')
          .in('id', memberIds)
        if (mErr) throw mErr
        // Co-DMs (role OWNER in campaign_members) get access_type 'owner' so canManageActiveCampaign is true.
        memberCampaigns = ((mData ?? []) as Campaign[]).map((c) => {
          const row = memberRows?.find((r) => r.campaign_id === c.id)
          return { ...c, access_type: row?.role === 'OWNER' ? 'owner' as const : 'member' as const }
        })
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
    mutationFn: async ({
      campaignId,
      expiresInHours = 72,
      forceRegenerate = false,
    }: {
      campaignId: string
      expiresInHours?: number
      forceRegenerate?: boolean
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non connecté')

      const now = Date.now()

      // Cleanup best-effort des invitations expirées pour cette campagne.
      await supabase
        .from('campaign_invitations')
        .delete()
        .eq('campaign_id', campaignId)
        .lt('expires_at', new Date(now).toISOString())

      const { data: existingRows, error: existingErr } = await supabase
        .from('campaign_invitations')
        .select('id, campaign_id, code, expires_at')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })

      if (existingErr) throw existingErr

      const validExisting = (existingRows ?? []).find((row) => {
        if (!row.expires_at) return true
        return new Date(row.expires_at).getTime() >= now
      })

      if (validExisting && !forceRegenerate) {
        return validExisting as CampaignInvitation
      }

      const expiresAt = new Date(now + expiresInHours * 60 * 60 * 1000).toISOString()
      const candidateRow = (existingRows ?? [])[0]

      for (let i = 0; i < 3; i += 1) {
        const code = createInviteCode()

        const writeQuery = candidateRow
          ? supabase
              .from('campaign_invitations')
              .update({ code, created_by: user.id, expires_at: expiresAt })
              .eq('id', candidateRow.id)
              .select('id, campaign_id, code, expires_at')
              .single()
          : supabase
              .from('campaign_invitations')
              .insert({
                campaign_id: campaignId,
                code,
                created_by: user.id,
                expires_at: expiresAt,
              })
              .select('id, campaign_id, code, expires_at')
              .single()

        const { data, error } = await writeQuery

        if (!error && data) {
          // Best-effort: conserver une seule ligne par campagne.
          await supabase
            .from('campaign_invitations')
            .delete()
            .eq('campaign_id', campaignId)
            .neq('id', data.id)

          return data as CampaignInvitation
        }
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
        // Cleanup best-effort d'un code expiré.
        await supabase.from('campaign_invitations').delete().eq('id', invitation.id)
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

      // Supprimer les PJ liés à ce joueur (nouveau + ancien schéma)
      const { error: pjErrorByUserId } = await supabase
        .from('pj')
        .delete()
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id)

      if (pjErrorByUserId) throw pjErrorByUserId

      const { error: pjErrorByPlayerId } = await supabase
        .from('pj')
        .delete()
        .eq('campaign_id', campaignId)
        .eq('player_id', user.id)

      if (pjErrorByPlayerId) throw pjErrorByPlayerId

      // Supprimer la membership
      const { data: removedMembers, error } = await supabase
        .from('campaign_members')
        .delete()
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id)
        .select('campaign_id')

      if (error) throw error

      // Si aucune ligne n'a été supprimée, on évite un faux positif UI.
      if (!removedMembers || removedMembers.length === 0) {
        throw new Error('Impossible de quitter cette campagne (membre introuvable).')
      }
    },
    onSuccess: (_data, campaignId) => {
      // Retirer la campagne du cache immédiatement pour toutes les variantes de clé.
      queryClient.setQueriesData({ queryKey: ['campaigns'] }, (old: any) =>
        Array.isArray(old) ? old.filter((c: Campaign) => c.id !== campaignId) : old
      )

      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['pjs', campaignId] })
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
  stats?: Record<string, unknown> | null
  pathways?: Array<{ voie_id: string; rangs_acquis?: number[] }> | null
  revealed_at: string
}

export function useRevealedPnjs(campaignId: string) {
  return useQuery({
    queryKey: ['revealedPnjs', campaignId],
    queryFn: async (): Promise<RevealedPnj[]> => {
      const { data, error } = await supabase
        .from('campaign_revealed_pnjs')
        .select('revealed_at, pnj:pnj_id(id, name, image_url, description, stats, pathways)')
        .eq('campaign_id', campaignId)
        .order('revealed_at', { ascending: true })

      if (error) {
        if (isMissingTableError(error)) {
          return []
        }

        if (!isMissingColumnError(error) && !isMissingRelationError(error)) {
          throw error
        }

        // Compat local schema: fallback without FK embed and without optional columns.
        const { data: revealRows, error: revealErr } = await supabase
          .from('campaign_revealed_pnjs')
          .select('revealed_at, pnj_id')
          .eq('campaign_id', campaignId)
          .order('revealed_at', { ascending: true })

        if (revealErr) {
          if (isMissingTableError(revealErr)) return []
          throw revealErr
        }

        const pnjIds = (revealRows ?? [])
          .map((row: { pnj_id?: string | null }) => row.pnj_id)
          .filter(Boolean) as string[]

        if (pnjIds.length === 0) return []

        let pnjRows: Array<{
          id: string
          name: string | null
          image_url: string | null
          description: string | null
          stats?: Record<string, unknown> | null
          pathways?: Array<{ voie_id: string; rangs_acquis?: number[] }> | null
        }> = []

        const { data: fullPnjRows, error: fullPnjErr } = await supabase
          .from('pnj')
          .select('id, name, image_url, description, stats, pathways')
          .in('id', pnjIds)

        if (fullPnjErr) {
          if (!isMissingColumnError(fullPnjErr)) throw fullPnjErr

          const { data: basePnjRows, error: basePnjErr } = await supabase
            .from('pnj')
            .select('id, name, image_url, description')
            .in('id', pnjIds)

          if (basePnjErr) throw basePnjErr
          pnjRows = (basePnjRows ?? []) as typeof pnjRows
        } else {
          pnjRows = (fullPnjRows ?? []) as typeof pnjRows
        }

        const byId = new Map(pnjRows.map((pnj) => [pnj.id, pnj]))
        return (revealRows ?? [])
          .map((row: { revealed_at: string; pnj_id: string }) => {
            const pnj = byId.get(row.pnj_id)
            if (!pnj) return null
            return {
              id: pnj.id,
              name: pnj.name ?? 'PNJ',
              image_url: pnj.image_url ?? null,
              description: pnj.description ?? null,
              stats: pnj.stats ?? null,
              pathways: pnj.pathways ?? null,
              revealed_at: row.revealed_at,
            }
          })
          .filter(Boolean) as RevealedPnj[]
      }

      return (data ?? [])
        .filter((row: any) => {
          if (!row?.pnj) return false
          // Si Supabase renvoie un tableau au lieu d'un objet unique
          return Array.isArray(row.pnj) ? row.pnj.length > 0 : true
        })
        .map((row: any) => {
          // Gère le cas où Supabase renvoie un tableau au lieu d'un objet unique
          const pnj = Array.isArray(row.pnj) ? row.pnj[0] : row.pnj
          return {
            id: pnj.id,
            name: pnj.name,
            image_url: pnj.image_url,
            description: pnj.description,
            stats: pnj.stats,
            pathways: pnj.pathways,
            revealed_at: row.revealed_at,
          }
        })
    },
    enabled: !!campaignId,
    retry: false,
  })
}

// ── Monstres révélés aux joueurs ──────────────────────────────────────────────

/** Retourne uniquement les IDs des PNJ révélés (sans join FK, compatible avec tout schéma) */
export function useRevealedPnjIds(campaignId: string) {
  return useQuery({
    queryKey: ['revealedPnjIds', campaignId],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('campaign_revealed_pnjs')
        .select('pnj_id')
        .eq('campaign_id', campaignId)
      if (error) throw error
      return (data ?? []).map((row: { pnj_id: string }) => row.pnj_id)
    },
    enabled: !!campaignId,
  })
}

export function useRevealedMonstres(campaignId: string) {
  return useQuery({
    queryKey: ['revealedMonstres', campaignId],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('campaign_revealed_monstres')
        .select('monstre_id')
        .eq('campaign_id', campaignId)

      if (error) throw error
      return (data ?? []).map((row: { monstre_id: string }) => row.monstre_id)
    },
    enabled: !!campaignId,
  })
}

export function useToggleRevealedMonstre() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      campaignId,
      monstreId,
      isRevealed,
    }: {
      campaignId: string
      monstreId: string
      isRevealed: boolean
    }) => {
      if (isRevealed) {
        const { error } = await supabase
          .from('campaign_revealed_monstres')
          .delete()
          .eq('campaign_id', campaignId)
          .eq('monstre_id', monstreId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('campaign_revealed_monstres')
          .insert({ campaign_id: campaignId, monstre_id: monstreId })
        if (error) throw error
      }
    },
    onSuccess: (_data, { campaignId }) => {
      queryClient.invalidateQueries({ queryKey: ['revealedMonstres', campaignId] })
    },
  })
}

export function useToggleRevealedPnj() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      campaignId,
      pnjId,
      isRevealed,
    }: {
      campaignId: string
      pnjId: string
      isRevealed: boolean
    }) => {
      if (isRevealed) {
        const { error } = await supabase
          .from('campaign_revealed_pnjs')
          .delete()
          .eq('campaign_id', campaignId)
          .eq('pnj_id', pnjId)
        if (error) throw error
      } else {
        // Check first to avoid 409 duplicate-key errors when the row was
        // already inserted automatically (e.g. via scenario chapter completion)
        const { data: existing } = await supabase
          .from('campaign_revealed_pnjs')
          .select('pnj_id')
          .eq('campaign_id', campaignId)
          .eq('pnj_id', pnjId)
          .maybeSingle()
        if (!existing) {
          const { error } = await supabase
            .from('campaign_revealed_pnjs')
            .insert({ campaign_id: campaignId, pnj_id: pnjId })
          if (error) throw error
        }
      }
    },
    onSuccess: (_data, { campaignId }) => {
      queryClient.invalidateQueries({ queryKey: ['revealedPnjIds', campaignId] })
      queryClient.invalidateQueries({ queryKey: ['revealedPnjs', campaignId] })
    },
  })
}

// ── Co-DM (multi-owner) ───────────────────────────────────────────────────────

export interface CampaignMemberFull {
  id: string
  user_id: string
  role: 'OWNER' | 'PLAYER'
  pseudo: string
}

export function useCampaignMembers(campaignId: string) {
  return useQuery({
    queryKey: ['campaignMembers', campaignId],
    queryFn: async (): Promise<CampaignMemberFull[]> => {
      // Fetch explicit members (with role). Compat legacy if `role` is missing.
      type MemberRow = { id: string; user_id: string; role?: 'OWNER' | 'PLAYER' | null }
      let memberRows: MemberRow[] = []

      const { data: rowsWithRole, error: memberErr } = await supabase
        .from('campaign_members')
        .select('id, user_id, role')
        .eq('campaign_id', campaignId)

      if (memberErr) {
        if (isMissingColumnError(memberErr)) {
          const { data: legacyRows, error: legacyErr } = await supabase
            .from('campaign_members')
            .select('id, user_id')
            .eq('campaign_id', campaignId)
          if (legacyErr) throw legacyErr
          memberRows = (legacyRows ?? []) as MemberRow[]
        } else if (isMissingTableError(memberErr)) {
          memberRows = []
        } else {
          throw memberErr
        }
      } else {
        memberRows = (rowsWithRole ?? []) as MemberRow[]
      }

      // Also include users linked via PJ (legacy format, no campaign_members row)
      const { data: pjRows } = await supabase
        .from('pj')
        .select('user_id, player_id')
        .eq('campaign_id', campaignId)

      // Merge: explicit members first, then any pj-only users not already covered
      const memberMap = new Map<string, { id: string; user_id: string; role: 'OWNER' | 'PLAYER' }>(
        (memberRows ?? []).map((r) => [r.user_id, { id: r.id, user_id: r.user_id, role: (r.role ?? 'PLAYER') as 'OWNER' | 'PLAYER' }])
      )
      for (const pj of pjRows ?? []) {
        const linkedUserId = (pj.user_id ?? pj.player_id) as string | null
        if (linkedUserId && !memberMap.has(linkedUserId)) {
          memberMap.set(linkedUserId, { id: linkedUserId, user_id: linkedUserId, role: 'PLAYER' })
        }
      }

      if (memberMap.size === 0) return []

      const ids = Array.from(memberMap.keys())
      const { data: users, error: usersError } = await supabase
        .from('utilisateurs')
        .select('id, pseudo')
        .in('id', ids)

      // Ne pas bloquer l'affichage de la liste si les profils utilisateurs sont inaccessibles.
      if (usersError) {
        return Array.from(memberMap.values()).map((entry) => ({
          id: entry.id,
          user_id: entry.user_id,
          role: entry.role,
          pseudo: entry.user_id.slice(0, 8),
        }))
      }

      return Array.from(memberMap.values()).map((entry) => ({
        id: entry.id,
        user_id: entry.user_id,
        role: entry.role,
        pseudo: users?.find((u) => u.id === entry.user_id)?.pseudo ?? 'Inconnu',
      }))
    },
    enabled: !!campaignId,
    retry: false,
  })
}

export function usePromoteToCoDM() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ campaignId, userId }: { campaignId: string; userId: string }) => {
      const { error } = await supabase
        .from('campaign_members')
        .update({ role: 'OWNER' })
        .eq('campaign_id', campaignId)
        .eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: (_, { campaignId }) => {
      queryClient.invalidateQueries({ queryKey: ['campaignMembers', campaignId] })
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}

export function useDemoteToPlayer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ campaignId, userId }: { campaignId: string; userId: string }) => {
      const { error } = await supabase
        .from('campaign_members')
        .update({ role: 'PLAYER' })
        .eq('campaign_id', campaignId)
        .eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: (_, { campaignId }) => {
      queryClient.invalidateQueries({ queryKey: ['campaignMembers', campaignId] })
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}