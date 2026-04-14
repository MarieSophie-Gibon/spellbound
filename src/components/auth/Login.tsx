import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError("Les astres ne reconnaissent pas ces identifiants.")
    }
    
    setLoading(false)
  }

  return (
    // Fond astral avec dégradé subtil
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 p-4 font-sans overflow-hidden">
      
      {/* Effets de lueur magique en arrière-plan (Orbes) */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Carte effet "Glassmorphism" (Verre dépoli) */}
      <Card className="relative w-full max-w-md bg-white/5 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden">
        
        {/* Petit accent doré en haut de la carte */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent opacity-50" />

        <CardHeader className="space-y-3 pb-8 pt-8">
          <CardTitle className="text-4xl font-serif text-center tracking-wide text-transparent bg-clip-text bg-gradient-to-b from-amber-50 to-amber-300 drop-shadow-sm">
            Spellbound
          </CardTitle>
          <CardDescription className="text-center text-slate-300/80 text-sm tracking-widest uppercase">
            Passerelle Astrale
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 text-sm font-medium text-amber-200 bg-red-950/40 border border-red-900/50 rounded-lg text-center backdrop-blur-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200 font-medium tracking-wide">
                Email
              </Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="voyageur@teyvat.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-black/20 border-white/10 text-slate-100 placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-amber-400/50 focus-visible:border-amber-400/50 transition-all rounded-lg h-12"
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200 font-medium tracking-wide">
                Mot de passe
              </Label>
              <Input 
                id="password" 
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-black/20 border-white/10 text-slate-100 placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-amber-400/50 focus-visible:border-amber-400/50 transition-all rounded-lg h-12"
                required 
              />
            </div>
          </CardContent>
          
          <CardFooter className="pt-4 pb-8">
            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-amber-100 via-amber-200 to-amber-400 text-amber-950 hover:opacity-90 font-bold tracking-widest uppercase rounded-full shadow-[0_0_20px_rgba(251,191,36,0.3)] transition-all" 
              disabled={loading}
            >
              {loading ? 'Résonance...' : 'Se Connecter'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}