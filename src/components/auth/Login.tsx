import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Mail, MoreHorizontal, Zap } from 'lucide-react'
import { theme } from '@/lib/theme'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError("Les astres ne reconnaissent pas ces identifiants.")
    setLoading(false)
  }

  return (
    // Le pr-24 compense la SideNav pour un centrage parfait
    <div className="flex-1 flex items-center justify-center w-full h-full p-4 md:pr-24 font-sans">
      <div className="w-full max-w-sm relative">
        
        {/* Glow effect subtil derrière la carte */}
        <div className="absolute -inset-0.5 bg-linear-to-r from-indigo-500/10 to-purple-500/10 rounded-2xl blur-lg opacity-50 pointer-events-none"></div>
        
        {/* Carte principale avec le gradient du footer */}
        <div 
          className="relative rounded-2xl p-7 overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] border border-white/20"
          style={theme.gradientFooter}
        >
          
          <div className={theme.stroke} />

          <form onSubmit={handleLogin} className="relative z-10 space-y-5">
            {error && (
              <div className="p-2 text-[10px] font-medium text-amber-200 bg-red-950/40 border border-red-900/50 rounded text-center backdrop-blur-sm uppercase tracking-wider">
                {error}
              </div>
            )}
            
            {/* Input Email */}
            <div className="relative flex items-center bg-black/20 border border-white/10 rounded-lg overflow-hidden focus-within:border-white/40 transition-colors">
              <div className="pl-3 pr-2 py-2.5 text-slate-300">
                <Mail className="w-4 h-4" />
              </div>
              <input 
                type="email" 
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none py-2.5"
                required 
              />
            </div>
            
            {/* Input Mot de passe */}
            <div className="relative flex items-center bg-black/20 border border-white/10 rounded-lg overflow-hidden focus-within:border-white/40 transition-colors">
              <div className="pl-3 pr-2 py-2.5 text-slate-300">
                <MoreHorizontal className="w-4 h-4" />
              </div>
              <input 
                type="password" 
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none py-2.5"
                required 
              />
            </div>

            {/* Se souvenir de moi */}
            <div className="flex items-center justify-end space-x-2">
              <input 
                type="checkbox" 
                id="remember" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 rounded-sm border-white/30 bg-transparent text-indigo-300 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <label htmlFor="remember" className="text-[11px] text-slate-300 font-light cursor-pointer select-none">
                Se souvenir de moi
              </label>
            </div>
            
            {/* Bouton Connexion */}
            <div className="flex justify-end pt-2">
              <Button 
                type="submit" 
                variant="outline"
                className="h-8 px-6 bg-white/5 border-white/30 hover:bg-white/20 text-white text-[11px] font-light tracking-[0.15em] uppercase rounded-lg transition-all flex items-center"
                disabled={loading}
              >
                <Zap className="w-3.5 h-3.5 mr-2" />
                {loading ? '...' : 'Connexion'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}