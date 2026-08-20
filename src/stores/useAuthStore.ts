import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

async function resolveIsSuperAdmin(user: User | null): Promise<boolean> {
  if (!user) return false

  const { data, error } = await supabase
    .from('utilisateurs')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (error) return false
  return data?.role === 'super_admin'
}

interface AuthState {
  session: Session | null
  user: User | null
  isSuperAdmin: boolean
  isLoading: boolean
  isPasswordRecovery: boolean
  initializeAuth: () => (() => void)
  clearPasswordRecovery: () => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isSuperAdmin: false,
  isLoading: true,
  isPasswordRecovery: false,

  clearPasswordRecovery: () => set({ isPasswordRecovery: false }),

  initializeAuth: () => {
    // 1. Récupération de la session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      void (async () => {
        const user = session?.user ?? null
        const isSuperAdmin = await resolveIsSuperAdmin(user)
        set({
          session,
          user,
          isSuperAdmin,
          isLoading: false,
        })
      })()
    })

    // 2. Écoute des événements (connexion, déconnexion, expiration du token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      void (async () => {
        const user = session?.user ?? null
        const isSuperAdmin = await resolveIsSuperAdmin(user)
        set({
          session,
          user,
          isSuperAdmin,
          isLoading: false,
          // Active le flag à la réception d'un lien de récupération.
          // Le formulaire de reset l'effacera explicitement après succès.
          isPasswordRecovery: event === 'PASSWORD_RECOVERY'
            ? true
            : (event === 'USER_UPDATED' || event === 'SIGNED_IN' || event === 'SIGNED_OUT')
              ? false
              : get().isPasswordRecovery,
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