import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

function mapRole(value: unknown): 'mj' | 'player' {
  const raw = String(value ?? '').toLowerCase()
  if (raw === 'mj' || raw === 'gm' || raw === 'admin') return 'mj'
  return 'player'
}

async function resolveRole(user: User | null): Promise<'mj' | 'player'> {
  if (!user) return 'player'

  const metaRole = user.app_metadata?.role ?? user.user_metadata?.role
  const mappedMeta = mapRole(metaRole)
  if (mappedMeta === 'mj') return 'mj'

  // Fallback DB: table applicative des profils utilisateur
  const { data } = await supabase
    .from('utilisateurs')
    .select('role')
    .eq('id', user.id)
    .single()

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