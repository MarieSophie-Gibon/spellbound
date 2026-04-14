import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthState {
  session: Session | null
  user: User | null
  isLoading: boolean
  initializeAuth: () => (() => void)
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true, // true par défaut le temps que Supabase vérifie la session active

  initializeAuth: () => {
    // 1. Récupération de la session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, user: session?.user ?? null, isLoading: false })
    })

    // 2. Écoute des événements (connexion, déconnexion, expiration du token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, isLoading: false })
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