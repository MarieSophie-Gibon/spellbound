import { Eye, EyeOff, Mail, MoreHorizontal, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoginMobileProps {
  mode: "login" | "signup" | "forgot" | "reset";
  pseudo: string;
  email: string;
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  showConfirmPassword: boolean;
  rememberMe: boolean;
  loading: boolean;
  error: string | null;
  info: string | null;
  cooldownSeconds: number;
  onSubmit: (e: React.FormEvent) => void;
  setMode: (mode: "login" | "signup" | "forgot" | "reset") => void;
  setPseudo: (value: string) => void;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  setShowPassword: (value: boolean) => void;
  setShowConfirmPassword: (value: boolean) => void;
  setRememberMe: (value: boolean) => void;
  clearMessages: () => void;
}

export function LoginMobile({
  mode,
  pseudo,
  email,
  password,
  confirmPassword,
  showPassword,
  showConfirmPassword,
  rememberMe,
  loading,
  error,
  info,
  cooldownSeconds,
  onSubmit,
  setMode,
  setPseudo,
  setEmail,
  setPassword,
  setConfirmPassword,
  setShowPassword,
  setShowConfirmPassword,
  setRememberMe,
  clearMessages,
}: LoginMobileProps) {
  return (
    <div className="flex-1 min-h-0 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Glass card */}
        <div className="rounded-2xl border border-[#F0EAD6]/22 bg-[#1a1640]/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.55),inset_0_0_0_1px_rgba(240,234,214,0.10)] p-5">
          <div className="flex items-center justify-center mb-2">
            {/* Logo */}
            <img
              src="/spellbound.svg"
              alt="Spellbound"
              className="h-20 w-auto"
            />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div className="p-2.5 text-[11px] font-medium text-amber-200 bg-red-950/45 border border-red-900/50 rounded-xl text-center">
                {error}
              </div>
            )}

            {info && (
              <div className="p-2.5 text-[11px] font-medium text-emerald-200 bg-emerald-950/35 border border-emerald-900/60 rounded-xl text-center">
                {info}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/12 bg-black/20 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  clearMessages();
                }}
                className={`rounded-lg text-[10px] uppercase tracking-wider transition-colors ${
                  mode === "login" || mode === "forgot" || mode === "reset"
                    ? "bg-white/15 text-white"
                    : "text-white/50"
                }`}
              >
                Connexion
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  clearMessages();
                }}
                className={`h-10 rounded-lg text-[11px] uppercase tracking-wider transition-colors ${
                  mode === "signup" ? "bg-white/15 text-white" : "text-white/50"
                }`}
              >
                Inscription
              </button>
            </div>

            {mode === "signup" && (
              <div className="relative flex items-center bg-black/20 border border-white/12 rounded-xl overflow-hidden focus-within:border-white/35 transition-colors">
                <div className="pl-3 pr-2 py-3 text-slate-300">
                  <Zap className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Pseudo"
                  value={pseudo}
                  onChange={(e) => setPseudo(e.target.value)}
                  className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none py-3"
                  required={mode === "signup"}
                />
              </div>
            )}

            <div className="relative flex items-center bg-black/20 border border-white/12 rounded-xl overflow-hidden focus-within:border-white/35 transition-colors">
              <div className="pl-3 pr-2 py-3 text-slate-300">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none py-3"
                required
              />
            </div>

            <div className="relative flex items-center bg-black/20 border border-white/12 rounded-xl overflow-hidden focus-within:border-white/35 transition-colors">
              <div className="pl-3 pr-2 py-3 text-slate-300">
                <MoreHorizontal className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none py-3"
                required={mode !== "forgot"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="px-3 py-3 text-slate-300"
                aria-label={
                  showPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {(mode === "signup" || mode === "reset") && (
              <div className="relative flex items-center bg-black/20 border border-white/12 rounded-xl overflow-hidden focus-within:border-white/35 transition-colors">
                <div className="pl-3 pr-2 py-3 text-slate-300">
                  <MoreHorizontal className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none py-3"
                  required={mode === "signup" || mode === "reset"}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="px-3 py-3 text-slate-300"
                  aria-label={
                    showConfirmPassword
                      ? "Masquer la confirmation du mot de passe"
                      : "Afficher la confirmation du mot de passe"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            )}

            {mode === "login" && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-[12px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-white/30 bg-transparent"
                  />
                  Se souvenir de moi
                </label>
              </div>
            )}

            {(mode === "login" || mode === "forgot") && (
              <div className="flex justify-end">
                {mode === "login" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      clearMessages();
                    }}
                    className="text-[11px] text-slate-300/80"
                  >
                    Mot de passe oublie ?
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      clearMessages();
                    }}
                    className="text-[11px] text-slate-300/80"
                  >
                    Retour a la connexion
                  </button>
                )}
              </div>
            )}

            <Button
              type="submit"
              variant="outline"
              className="w-full h-11 bg-white/5 border-white/25 hover:bg-white/20 text-white text-[12px] font-medium tracking-widest uppercase rounded-xl"
              disabled={loading || (mode === "forgot" && cooldownSeconds > 0)}
            >
              <Zap className="w-4 h-4 mr-2" />
              {loading
                ? "..."
                : mode === "login"
                  ? "Connexion"
                  : mode === "signup"
                    ? "Inscription"
                    : mode === "forgot"
                      ? cooldownSeconds > 0
                        ? `Attendre ${cooldownSeconds}s`
                        : "Envoyer le lien"
                      : "Reinitialiser"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
