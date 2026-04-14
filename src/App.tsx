import { useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import { Login } from '@/components/auth/Login'
import { Button } from '@/components/ui/button'
import { Wiki} from '@/pages/Wiki'

function App() {
  // On récupère l'état et les actions depuis notre store Zustand
  const { session, isLoading, initializeAuth, signOut } = useAuthStore()

  useEffect(() => {
    // On lance l'écouteur Supabase au chargement de l'app
    const unsubscribe = initializeAuth()
    
    // Nettoyage à la destruction du composant
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [initializeAuth])

  // 1. Écran de chargement le temps que Supabase vérifie le token
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 font-serif text-amber-200/50 animate-pulse tracking-widest uppercase">
        Consultation des astres...
      </div>
    )
  }

  // 2. Si pas de session, on affiche l'écran de connexion HoYoverse-style
  if (!session) {
    return <Login />
  }

  // 3. Si connecté, on affiche le tableau de bord (temporaire pour le test)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 font-sans p-4 relative overflow-hidden flex flex-col">
      {/* Navbar temporaire */}
      <header className="w-full max-w-7xl mx-auto flex justify-between items-center py-4 px-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl">
        <div className="text-xl font-serif text-amber-300 tracking-widest uppercase">
          Spellbound <span className="text-xs text-slate-400 normal-case tracking-normal ml-2">Connecté en tant que {session.user.email}</span>
        </div>
        <Button 
          onClick={signOut} 
          variant="ghost"
          className="text-red-400 hover:text-red-300 hover:bg-red-950/50"
        >
          Se déconnecter
        </Button>
      </header>

      {/* Contenu principal */}
      <Wiki />
    </div>
  )
}

export default App