import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

function mapRole(value: unknown): 'mj' | 'player' {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  const compact = raw.replace(/[\s_-]+/g, '')

  if (
    raw === 'mj' ||
    raw === 'gm' ||
    raw === 'dm' ||
    raw === 'admin' ||
    compact === 'maitredujeu' ||
    compact === 'master'
  ) {
    return 'mj'
  }

  if (raw === 'joueur' || raw === 'player') return 'player'
  return 'player'
}

function hasMjFlag(meta: unknown): boolean {
  if (!meta || typeof meta !== 'object') return false
  const record = meta as Record<string, unknown>

  const directFlags = ['is_mj', 'isMj', 'mj', 'gm', 'is_admin', 'isAdmin', 'admin']
  for (const key of directFlags) {
    if (record[key] === true) return true
  }

  const candidateKeys = ['role', 'user_role', 'type']
  for (const key of candidateKeys) {
    const mapped = mapRole(record[key])
    if (mapped === 'mj') return true
  }

  const claims = record['claims']
  if (claims && typeof claims === 'object') {
    const claimsRecord = claims as Record<string, unknown>
    const mappedClaimsRole = mapRole(claimsRecord['role'] ?? claimsRecord['user_role'])
    if (mappedClaimsRole === 'mj') return true
  }

  return false
}

async function resolveRole(user: User | null): Promise<'mj' | 'player'> {
  if (!user) return 'player'

  if (hasMjFlag(user.app_metadata) || hasMjFlag(user.user_metadata)) return 'mj'

  const metaRole = user.app_metadata?.role ?? user.user_metadata?.role
  const mappedMeta = mapRole(metaRole)
  if (mappedMeta === 'mj') return 'mj'

  // Fallback DB: table applicative des profils utilisateur
  const { data, error } = await supabase
    .from('utilisateurs')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  // Si le profil applicatif est absent/inaccessible (RLS), ne pas casser l'auth.
  if (error) return 'player'

  return mapRole(data?.role)
}

interface AuthState {
  session: Session | null
  user: User | null
  role: 'mj' | 'player'
  isLoading: boolean
  isMJ: () => boolean
  initializeAuth: () => (() => void)
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  role: 'player',
  isLoading: true, // true par défaut le temps que Supabase vérifie la session active

  isMJ: () => get().role === 'mj',

  initializeAuth: () => {
    // 1. Récupération de la session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      void (async () => {
        const user = session?.user ?? null
        const role = await resolveRole(user)
        set({
          session,
          user,
          role,
          isLoading: false,
        })
      })()
    })

    // 2. Écoute des événements (connexion, déconnexion, expiration du token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        const user = session?.user ?? null
        const role = await resolveRole(user)
        set({
          session,
          user,
          role,
          isLoading: false,
        })
      })()
    })

    // Cleanup de la souscription si besoin (optionnel dans un store global, mais bonne pratique)
    return () => {
      subscription.unsubscribe()
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
  },
}))