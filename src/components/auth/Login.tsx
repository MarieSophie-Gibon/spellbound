import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Mail, MoreHorizontal, Zap } from 'lucide-react'
import { theme } from '@/lib/theme'

export function Login() {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login')
  const [pseudo, setPseudo] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [forgotCooldownUntil, setForgotCooldownUntil] = useState<number>(0)

  const cooldownSeconds = Math.max(0, Math.ceil((forgotCooldownUntil - Date.now()) / 1000))

  useEffect(() => {
    // Gère les retours Supabase de récupération (success + erreurs de lien expiré/invalide).
    if (typeof window === 'undefined') return
    const hash = window.location.hash || ''

    if (hash.includes('error=')) {
      const params = new URLSearchParams(hash.replace(/^#/, ''))
      const errorCode = params.get('error_code')
      const errorDescription = params.get('error_description')

      setMode('forgot')
      setInfo(null)
      if (errorCode === 'otp_expired') {
        setError("Ce lien de réinitialisation est expiré ou déjà utilisé. Demandez-en un nouveau.")
      } else {
        setError(errorDescription?.replace(/\+/g, ' ') || "Le lien de réinitialisation est invalide.")
      }

      window.history.replaceState({}, document.title, window.location.pathname)
      return
    }

    if (hash.includes('type=recovery')) {
      setMode('reset')
      setError(null)
      setInfo("Définissez un nouveau mot de passe pour finaliser la récupération.")
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem('spellbound:forgot-cooldown-until')
    const parsed = Number(raw)
    if (Number.isFinite(parsed) && parsed > Date.now()) {
      setForgotCooldownUntil(parsed)
    }
  }, [])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)

    if (mode === 'forgot') {
      if (forgotCooldownUntil > Date.now()) {
        setError(`Trop de demandes. Réessaie dans ${cooldownSeconds}s.`)
        return
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}`,
      })
      if (error) {
        const isRateLimited = /rate limit/i.test(error.message)
        if (isRateLimited) {
          const until = Date.now() + 60_000
          setForgotCooldownUntil(until)
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('spellbound:forgot-cooldown-until', String(until))
          }
          setError("Trop de tentatives d'envoi. Attendez 60 secondes puis réessayez.")
        } else {
          setError(error.message)
        }
      } else {
        const until = Date.now() + 60_000
        setForgotCooldownUntil(until)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('spellbound:forgot-cooldown-until', String(until))
        }
        setInfo("Email de réinitialisation envoyé. Vérifiez votre boîte mail.")
      }
      setLoading(false)
      return
    }

    if (mode === 'reset') {
      if (password.length < 6) {
        setError("Le mot de passe doit contenir au moins 6 caractères.")
        return
      }
      if (password !== confirmPassword) {
        setError("La confirmation du mot de passe ne correspond pas.")
        return
      }
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError(error.message)
      } else {
        setInfo("Mot de passe mis à jour. Vous pouvez maintenant vous connecter.")
        setMode('login')
        setPassword('')
        setConfirmPassword('')
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, document.title, window.location.pathname)
        }
      }
      setLoading(false)
      return
    }

    if (mode === 'signup') {
      if (pseudo.trim().length < 2) {
        setError("Le pseudo doit contenir au moins 2 caractères.")
        return
      }
      if (password.length < 6) {
        setError("Le mot de passe doit contenir au moins 6 caractères.")
        return
      }
      if (password !== confirmPassword) {
        setError("La confirmation du mot de passe ne correspond pas.")
        return
      }
    }

    setLoading(true)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError("Les astres ne reconnaissent pas ces identifiants.")
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          pseudo: pseudo.trim(),
          role: 'player',
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.user?.id) {
      // Meilleur effort: créer le profil applicatif si la policy le permet.
      await supabase.from('utilisateurs').upsert({
        id: data.user.id,
        pseudo: pseudo.trim(),
        role: 'joueur',
      })
    }

    setInfo("Compte créé. Vérifiez votre email pour confirmer l'inscription, puis connectez-vous.")
    setMode('login')
    setPassword('')
    setConfirmPassword('')
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

          <form onSubmit={handleAuth} className="relative z-10 space-y-5">
            {error && (
              <div className="p-2 text-[10px] font-medium text-amber-200 bg-red-950/40 border border-red-900/50 rounded text-center backdrop-blur-sm uppercase tracking-wider">
                {error}
              </div>
            )}

            {info && (
              <div className="p-2 text-[10px] font-medium text-emerald-200 bg-emerald-950/35 border border-emerald-900/60 rounded text-center backdrop-blur-sm uppercase tracking-wider">
                {info}
              </div>
            )}

            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 p-1">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); setInfo(null) }}
                className={`flex-1 rounded-md px-3 py-1.5 text-[11px] uppercase tracking-wider transition-colors ${mode === 'login' || mode === 'forgot' || mode === 'reset' ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/80'}`}
              >
                Connexion
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(null); setInfo(null) }}
                className={`flex-1 rounded-md px-3 py-1.5 text-[11px] uppercase tracking-wider transition-colors ${mode === 'signup' ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/80'}`}
              >
                Inscription
              </button>
            </div>

            {mode === 'signup' && (
              <div className="relative flex items-center bg-black/20 border border-white/10 rounded-lg overflow-hidden focus-within:border-white/40 transition-colors">
                <div className="pl-3 pr-2 py-2.5 text-slate-300">
                  <Zap className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Pseudo"
                  value={pseudo}
                  onChange={(e) => setPseudo(e.target.value)}
                  className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none py-2.5"
                  required={mode === 'signup'}
                />
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
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none py-2.5"
                required={mode !== 'forgot'}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="px-3 py-2.5 text-slate-300 hover:text-white transition-colors"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {(mode === 'signup' || mode === 'reset') && (
              <div className="relative flex items-center bg-black/20 border border-white/10 rounded-lg overflow-hidden focus-within:border-white/40 transition-colors">
                <div className="pl-3 pr-2 py-2.5 text-slate-300">
                  <MoreHorizontal className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none py-2.5"
                  required={mode === 'signup' || mode === 'reset'}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="px-3 py-2.5 text-slate-300 hover:text-white transition-colors"
                  aria-label={showConfirmPassword ? 'Masquer la confirmation du mot de passe' : 'Afficher la confirmation du mot de passe'}
                  title={showConfirmPassword ? 'Masquer la confirmation du mot de passe' : 'Afficher la confirmation du mot de passe'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}

            {/* Se souvenir de moi */}
            {mode === 'login' && (
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
            )}

            {(mode === 'login' || mode === 'forgot') && (
              <div className="flex justify-end">
                {mode === 'login' ? (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(null); setInfo(null) }}
                    className="text-[11px] text-slate-300/80 hover:text-white transition-colors"
                  >
                    Mot de passe oublié ?
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(null); setInfo(null) }}
                    className="text-[11px] text-slate-300/80 hover:text-white transition-colors"
                  >
                    Retour à la connexion
                  </button>
                )}
              </div>
            )}
            
            {/* Bouton Connexion */}
            <div className="flex justify-end pt-2">
              <Button 
                type="submit" 
                variant="outline"
                className="h-8 px-6 bg-white/5 border-white/30 hover:bg-white/20 text-white text-[11px] font-light tracking-[0.15em] uppercase rounded-lg transition-all flex items-center"
                disabled={loading || (mode === 'forgot' && cooldownSeconds > 0)}
              >
                <Zap className="w-3.5 h-3.5 mr-2" />
                {loading
                  ? '...'
                  : mode === 'login'
                    ? 'Connexion'
                    : mode === 'signup'
                      ? 'Inscription'
                      : mode === 'forgot'
                        ? (cooldownSeconds > 0 ? `Attendre ${cooldownSeconds}s` : 'Envoyer le lien')
                        : 'Réinitialiser'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}