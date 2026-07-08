import { useState, useRef } from "react";
import { theme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfile } from "@/hooks/useProfile";
import { User, UserStar, BookOpen, LogOut, Pencil, Trash2, ArrowLeft, RefreshCw, Copy } from "lucide-react";
import { useCampaigns } from "@/hooks/useCampaigns";
import type { Campaign } from "@/hooks/useCampaigns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface FooterProps {
  activeCampaign?: { id: string; nom: string } | null;
  onCampaignClick?: () => void;
  onEditCampaign?: () => void;
  onDeleteCampaign?: () => void;
  onDuplicateCampaign?: () => void;
  onSwitchCampaign?: (campaign: Campaign) => void;
}


export function Footer({ activeCampaign, onCampaignClick, onEditCampaign, onDeleteCampaign, onDuplicateCampaign, onSwitchCampaign }: FooterProps) {
  const { session, signOut, role } = useAuthStore();
  const profile = useProfile();

  const isMJ = role === "mj" || profile?.role === "mj";
  const effectiveRole: 'mj' | 'player' = isMJ ? 'mj' : 'player';
  const displayName = profile?.pseudo?.trim() || session?.user?.email?.split("@")[0] || "Voyageur";
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profilePseudoDraft, setProfilePseudoDraft] = useState("");
  const [profileEmailDraft, setProfileEmailDraft] = useState("");
  const [profileRoleDraft, setProfileRoleDraft] = useState<"joueur" | "mj">("joueur");
  const [newPasswordDraft, setNewPasswordDraft] = useState("");
  const [confirmPasswordDraft, setConfirmPasswordDraft] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileFormError, setProfileFormError] = useState<string | null>(null);
  const [profileFormInfo, setProfileFormInfo] = useState<string | null>(null);

  // --- Gestion du Hover + Click pour profil ---
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleProfileMouseEnter = () => {
    if (profileTimeoutRef.current) clearTimeout(profileTimeoutRef.current);
    setIsProfileOpen(true);
  };
  const handleProfileMouseLeave = () => {
    profileTimeoutRef.current = setTimeout(() => {
      setIsProfileOpen(false);
    }, 200);
  };

  // --- Gestion du Hover + Click pour campagne ---
  const [isCampaignOpen, setIsCampaignOpen] = useState(false);
  const campaignTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleCampaignMouseEnter = () => {
    if (campaignTimeoutRef.current) clearTimeout(campaignTimeoutRef.current);
    setIsCampaignOpen(true);
  };
  const handleCampaignMouseLeave = () => {
    campaignTimeoutRef.current = setTimeout(() => {
      setIsCampaignOpen(false);
    }, 200);
  };

  const { data: campaigns } = useCampaigns(effectiveRole);

  const openEditProfile = () => {
    setProfilePseudoDraft(profile?.pseudo?.trim() || session?.user?.email?.split("@")[0] || "");
    setProfileEmailDraft(session?.user?.email ?? "");
    setProfileRoleDraft(profile?.role === "mj" ? "mj" : "joueur");
    setNewPasswordDraft("");
    setConfirmPasswordDraft("");
    setProfileFormError(null);
    setProfileFormInfo(null);
    setIsEditProfileOpen(true);
  };

  const saveProfile = async () => {
    if (!session?.user?.id) return;
    const pseudo = profilePseudoDraft.trim();
    const email = profileEmailDraft.trim().toLowerCase();
    const nextPassword = newPasswordDraft;

    setProfileFormError(null);
    setProfileFormInfo(null);

    if (!pseudo) {
      setProfileFormError("Le pseudo est requis.");
      return;
    }
    if (!email) {
      setProfileFormError("L'email est requis.");
      return;
    }
    if (nextPassword && nextPassword.length < 8) {
      setProfileFormError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (nextPassword && nextPassword !== confirmPasswordDraft) {
      setProfileFormError("La confirmation du mot de passe ne correspond pas.");
      return;
    }

    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from("utilisateurs")
        .upsert(
          {
            id: session.user.id,
            pseudo,
            role: profileRoleDraft,
          },
          { onConflict: "id" }
        );

      if (error) throw error;

      const authPatch: { email?: string; password?: string } = {};
      const emailChanged = email !== (session.user.email ?? "").toLowerCase();
      if (emailChanged) authPatch.email = email;
      if (nextPassword) authPatch.password = nextPassword;

      if (Object.keys(authPatch).length > 0) {
        const { error: authError } = await supabase.auth.updateUser(authPatch);
        if (authError) throw authError;
      }

      window.dispatchEvent(new CustomEvent("spellbound:profile-updated"));

      if (emailChanged) {
        setProfileFormInfo("Un email de confirmation a ete envoye pour valider le changement d'adresse.");
      } else {
        setIsEditProfileOpen(false);
        setIsProfileOpen(false);
      }
    } catch (err) {
      console.error("Erreur mise a jour profil:", err);
      setProfileFormError("Impossible de mettre a jour le profil.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <footer
      className="relative h-15 border-t border-white/10 shrink-0 flex items-center justify-between px-6 shadow-[0_-4px_24px_rgba(0,0,0,0.2)]"
      style={theme.gradientFooter}
    >
      <div className={theme.strokeTop} />
      <img
        src="/spellbound.svg"
        alt="Spellbound Logo"
        className="relative z-5 w-24 h-24 object-contain"
      />

      {/* Onglet campagne placé à gauche du profil avec 1.5rem de gap */}
      {activeCampaign && (
        <div
          className="absolute top-0 right-70 -translate-y-1/2 z-20"
          onMouseEnter={handleCampaignMouseEnter}
          onMouseLeave={handleCampaignMouseLeave}
        >
          <DropdownMenu open={isCampaignOpen} onOpenChange={setIsCampaignOpen} modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                className="relative flex items-center justify-center h-8 px-6 cursor-pointer group outline-none border-none opacity-90 hover:opacity-100 transition-opacity"
                style={{
                  clipPath:
                    "polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0 50%)",
                  background: theme.colors.blanc,
                }}
              >
                <div
                  className="absolute inset-px"
                  style={{
                    clipPath:
                      "polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0 50%)",
                    background: theme.gradientTab.background,
                  }}
                />
                <div className="relative z-10 flex items-center gap-2 whitespace-nowrap">
                  <BookOpen className="w-3 h-3 text-indigo-200 shrink-0" />
                  <span className="text-[11px] font-serif text-white tracking-widest px-1">
                    {activeCampaign.nom}
                  </span>
                  <div className="w-1 h-1 rotate-45 bg-white/70 shrink-0" />
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" onMouseEnter={handleCampaignMouseEnter} onMouseLeave={handleCampaignMouseLeave} className="w-56 bg-[#1E1941]/95 backdrop-blur-xl border-[#E3CCCD]/20 text-slate-200 mb-2 rounded-xl">
              <DropdownMenuItem onClick={onCampaignClick} className="cursor-pointer hover:bg-white/10 text-xs focus:bg-white/10 flex items-center gap-2">
                <ArrowLeft className="w-3.5 h-3.5 text-white/50" />
                Revenir au lobby
              </DropdownMenuItem>
              {onEditCampaign && (
                <DropdownMenuItem onClick={onEditCampaign} className="cursor-pointer hover:bg-white/10 text-xs focus:bg-white/10 flex items-center gap-2">
                  <Pencil className="w-3.5 h-3.5 text-white/50" />
                  Modifier la campagne
                </DropdownMenuItem>
              )}
              {onDuplicateCampaign && (
                <DropdownMenuItem onClick={onDuplicateCampaign} className="cursor-pointer hover:bg-white/10 text-xs focus:bg-white/10 flex items-center gap-2">
                  <Copy className="w-3.5 h-3.5 text-white/50" />
                  Dupliquer la campagne
                </DropdownMenuItem>
              )}
              {onDeleteCampaign && (
                <DropdownMenuItem onClick={onDeleteCampaign} className="cursor-pointer text-red-400/80 hover:bg-red-500/10 hover:text-red-400 text-xs focus:bg-red-500/10 focus:text-red-400 flex items-center gap-2">
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer la campagne
                </DropdownMenuItem>
              )}
              {campaigns && campaigns.length > 1 && (
                <>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuLabel className="text-xs text-white/60 flex items-center gap-2">
                    <RefreshCw className="w-3 h-3" />
                    Changer de campagne
                  </DropdownMenuLabel>
                  {campaigns.map((c) => (
                    <DropdownMenuItem
                      key={c.id}
                      onClick={() => {
                        if (c.id !== activeCampaign.id) {
                          onSwitchCampaign?.(c);
                        }
                      }}
                      className={`cursor-pointer text-xs focus:bg-white/10 ${c.id === activeCampaign.id ? 'opacity-60 pointer-events-none' : ''}`}
                    >
                      {c.nom}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Onglet profil (toujours à droite) */}
      {session && (
        <div
          className="absolute top-0 right-10 -translate-y-1/2 z-20"
          onMouseEnter={handleProfileMouseEnter}
          onMouseLeave={handleProfileMouseLeave}
        >
          <DropdownMenu open={isProfileOpen} onOpenChange={setIsProfileOpen} modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.preventDefault()}
                className="relative flex items-center justify-center h-8 px-6 cursor-pointer group outline-none border-none opacity-90 hover:opacity-100 transition-opacity"
              >
                <div
                  className="absolute inset-0"
                  style={{
                    clipPath:
                      "polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0 50%)",
                    background: theme.colors.blanc,
                  }}
                />
                <div
                  className="absolute inset-px"
                  style={{
                    clipPath:
                      "polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0 50%)",
                    background: theme.gradientTab.background,
                  }}
                />
                <div className="relative z-10 flex items-center gap-2 whitespace-nowrap">
                  {isMJ ? (
                    <UserStar className="w-3 h-3 text-amber-200 shrink-0" />
                  ) : (
                    <User className="w-3 h-3 text-white/90 shrink-0" />
                  )}
                  <span className="text-[11px] font-serif text-white tracking-widest capitalize px-1">
                    {displayName}
                  </span>
                  <div className="w-1 h-1 rotate-45 bg-white/70 shrink-0" />
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onMouseEnter={handleProfileMouseEnter}
              onMouseLeave={handleProfileMouseLeave}
              className="w-48 bg-[#1E1941]/95 backdrop-blur-xl border-[#E3CCCD]/20 text-slate-200 mb-2 rounded-xl"
            >
              <DropdownMenuItem onClick={openEditProfile} className="cursor-pointer hover:bg-white/10 hover:text-white text-xs focus:bg-white/10 flex items-center gap-2">
                <Pencil className="w-3.5 h-3.5 text-white/50" />
                Éditer le profil
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={signOut}
                className="cursor-pointer text-amber-200/80 hover:bg-white/10 hover:text-amber-200 text-xs focus:bg-white/10 focus:text-amber-200 flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className="max-w-md border-white/10 text-white overflow-hidden p-0 bg-transparent">
          <div className="relative rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden" style={{ background: "linear-gradient(160deg, rgba(80,95,200,0.38) 0%, rgba(55,48,130,0.42) 50%, rgba(70,80,175,0.38) 100%)" }}>
            <div className="absolute inset-0 backdrop-blur-3xl -z-10" />
            <div className="absolute inset-0 bg-white/3 -z-10" />
            <div className="absolute inset-px rounded-2xl border border-white/10 pointer-events-none z-0" />

          <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/10 bg-black/10">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/55 mb-1">Compte</p>
            <DialogTitle className="font-serif text-2xl tracking-wide">Modifier le profil</DialogTitle>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60 mb-1.5 block">Pseudo</label>
              <Input
                value={profilePseudoDraft}
                onChange={(e) => setProfilePseudoDraft(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                placeholder="Votre pseudo"
                autoFocus
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60 mb-1.5 block">Email</label>
              <Input
                value={profileEmailDraft}
                onChange={(e) => setProfileEmailDraft(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                placeholder="vous@domaine.fr"
                type="email"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60 mb-1.5 block">Rôle</label>
              <select
                value={profileRoleDraft}
                onChange={(e) => setProfileRoleDraft(e.target.value === "mj" ? "mj" : "joueur")}
                className="w-full h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white outline-none"
              >
                <option value="joueur" className="bg-[#1E1941] text-white">Joueur</option>
                <option value="mj" className="bg-[#1E1941] text-white">MJ</option>
              </select>
            </div>

            <div className="h-px bg-white/10" />

            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60 mb-1.5 block">Nouveau mot de passe</label>
              <Input
                value={newPasswordDraft}
                onChange={(e) => setNewPasswordDraft(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                placeholder="Laisser vide pour ne pas changer"
                type="password"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60 mb-1.5 block">Confirmer le mot de passe</label>
              <Input
                value={confirmPasswordDraft}
                onChange={(e) => setConfirmPasswordDraft(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                placeholder="Confirmez le nouveau mot de passe"
                type="password"
                disabled={!newPasswordDraft}
              />
            </div>

            {profileFormError && (
              <p className="text-xs text-red-300 bg-red-500/10 border border-red-400/20 rounded-lg px-3 py-2">{profileFormError}</p>
            )}
            {profileFormInfo && (
              <p className="text-xs text-emerald-200 bg-emerald-500/10 border border-emerald-400/20 rounded-lg px-3 py-2">{profileFormInfo}</p>
            )}
          </div>

          <DialogFooter className="px-6 pb-6 pt-0">
            <Button variant="ghost" onClick={() => setIsEditProfileOpen(false)} className="text-white/60 hover:text-white hover:bg-white/10">
              Annuler
            </Button>
            <Button
              onClick={() => { void saveProfile(); }}
              disabled={isSavingProfile || !profilePseudoDraft.trim() || !profileEmailDraft.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {isSavingProfile ? "Sauvegarde..." : "Enregistrer"}
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </footer>
  );
}
