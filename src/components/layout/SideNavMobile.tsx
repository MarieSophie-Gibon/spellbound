import { BookMarked, Skull, Telescope, ScrollText, Users, ArrowLeft, LayoutDashboard, House } from "lucide-react";
import { theme } from "@/lib/theme";
import type { ElementType } from "react";
import { useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, UserStar, Pencil, LogOut } from "lucide-react";

type NavTab = "grimoire" | "compendium" | "bestiaire" | "scenarios" | "personnages" | "none";

interface SideNavMobileProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onBackToLobby: () => void;
  showBackToLobbyButton?: boolean;
  onGoHome?: () => void;
  showHomeButton?: boolean;
  onGoToCampaignDashboard: () => void;
  showCampaignDashboardButton?: boolean;
  showProfileMenuButton?: boolean;
  showMenuTitles?: boolean;
  tabs?: string[];
}

interface Item {
  key: NavTab;
  label: string;
  icon: ElementType;
}

const ALL_ITEMS: Item[] = [
  { key: "grimoire", label: "Grimoire", icon: BookMarked },
  { key: "compendium", label: "Compendium", icon: Telescope },
  { key: "bestiaire", label: "Bestiaire", icon: Skull },
  { key: "personnages", label: "Persos", icon: Users },
  { key: "scenarios", label: "Scenarios", icon: ScrollText },
];

export function SideNavMobile({
  activeTab,
  onTabChange,
  onBackToLobby,
  showBackToLobbyButton = false,
  onGoHome,
  showHomeButton = false,
  onGoToCampaignDashboard,
  showCampaignDashboardButton = false,
  showProfileMenuButton = false,
  showMenuTitles = false,
  tabs = ["grimoire", "compendium", "bestiaire", "scenarios", "personnages"],
}: SideNavMobileProps) {
  const { session, signOut, role } = useAuthStore();
  const profile = useProfile();
  const isMJ = role === "mj" || profile?.role === "mj";
  const displayName = profile?.pseudo?.trim() || session?.user?.email?.split("@")[0] || "Profil";

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profilePseudoDraft, setProfilePseudoDraft] = useState("");
  const [profileEmailDraft, setProfileEmailDraft] = useState("");
  const [newPasswordDraft, setNewPasswordDraft] = useState("");
  const [confirmPasswordDraft, setConfirmPasswordDraft] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileFormError, setProfileFormError] = useState<string | null>(null);
  const [profileFormInfo, setProfileFormInfo] = useState<string | null>(null);

  const visible = ALL_ITEMS.filter((item) => tabs.includes(item.key));

  const openEditProfile = () => {
    setProfilePseudoDraft(profile?.pseudo?.trim() || session?.user?.email?.split("@")[0] || "");
    setProfileEmailDraft(session?.user?.email ?? "");
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
      setProfileFormError("Le mot de passe doit contenir au moins 8 caracteres.");
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
            role: profile?.role === "mj" ? "mj" : "joueur",
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
        setProfileFormInfo("Un email de confirmation a ete envoye.");
      } else {
        setIsEditProfileOpen(false);
      }
    } catch {
      setProfileFormError("Impossible de mettre a jour le profil.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-3 pb-3 pointer-events-none">
      <div className="pointer-events-auto rounded-2xl border border-white/12 backdrop-blur-xl shadow-[0_12px_32px_rgba(0,0,0,0.42)] overflow-hidden" style={theme.gradientNav}>
        <div className="flex items-stretch gap-1 p-2">
          {showBackToLobbyButton && (
            <button
              onClick={onBackToLobby}
              aria-label="Retour au lobby"
              title="Retour au lobby"
              className={`flex-1 rounded-xl border border-[#E3CCCD]/30 bg-[#E3CCCD]/14 text-white flex items-center justify-center ${
                showMenuTitles ? "h-14 px-2.5 flex-col gap-1" : "h-12 px-2"
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              {showMenuTitles && <span className="text-[8px] uppercase tracking-wide leading-none">Lobby</span>}
            </button>
          )}

          {showHomeButton && (
            <button
              onClick={onGoHome}
              aria-label="Accueil"
              title="Accueil"
              className={`flex-1 rounded-xl border flex items-center justify-center ${
                showMenuTitles ? "h-14 px-2.5 flex-col gap-1" : "h-12 px-2"
              } ${
                activeTab === "none"
                  ? "border-[#E3CCCD]/35 bg-[#E3CCCD]/16 text-white"
                  : "border-transparent bg-white/4 text-white/60 active:bg-white/10"
              }`}
            >
              <House className="w-4 h-4" />
              <span className="text-[8px] uppercase tracking-wide leading-none">LOBBY</span>
            </button>
          )}

          {showCampaignDashboardButton && (
            <button
              onClick={onGoToCampaignDashboard}
              aria-label="Dashboard campagne"
              title="Dashboard campagne"
              className={`flex-1 h-12 px-2 rounded-xl border flex items-center justify-center ${
                activeTab === "none"
                  ? "border-[#E3CCCD]/35 bg-[#E3CCCD]/16 text-white"
                  : "border-transparent bg-white/4 text-white/60 active:bg-white/10"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>
          )}

          {visible.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;

            return (
              <button
                key={item.key}
                onClick={() => onTabChange(item.key)}
                aria-label={item.label}
                title={item.label}
                className={`flex-1 rounded-xl border transition-all flex items-center justify-center ${
                  showMenuTitles ? "h-14 px-2.5 flex-col gap-1" : "h-12 px-2"
                } ${
                  isActive
                    ? "border-[#E3CCCD]/35 bg-[#E3CCCD]/16 text-white"
                    : "border-transparent bg-white/4 text-white/60 active:bg-white/10"
                }`}
              >
                <Icon className="w-4 h-4" />
                {showMenuTitles && (
                  <span className="text-[8px] uppercase tracking-wide leading-none">{item.label}</span>
                )}
              </button>
            );
          })}

          {showProfileMenuButton && session && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Profil"
                  title={displayName}
                  className={`flex-1 rounded-xl border border-transparent bg-white/4 text-white/70 active:bg-white/10 flex items-center justify-center ${
                    showMenuTitles ? "h-14 px-2.5 flex-col gap-1" : "h-12 px-2"
                  }`}
                >
                  {isMJ ? <UserStar className="w-4 h-4 text-amber-200" /> : <User className="w-4 h-4" />}
                  {showMenuTitles && <span className="text-[8px] uppercase tracking-wide leading-none">Profil</span>}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-[#1E1941]/95 backdrop-blur-xl border-[#E3CCCD]/20 text-slate-200 mb-2 rounded-xl">
                <div className="px-2 py-1.5 text-[11px] text-white/60 truncate">{displayName}</div>
                <DropdownMenuItem onClick={openEditProfile} className="cursor-pointer hover:bg-white/10 text-xs focus:bg-white/10 flex items-center gap-2">
                  <Pencil className="w-3.5 h-3.5 text-white/50" />
                  Editer le profil
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={signOut}
                  className="cursor-pointer text-amber-200/80 hover:bg-white/10 hover:text-amber-200 text-xs focus:bg-white/10 focus:text-amber-200 flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Se deconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className="max-w-sm border-white/10 text-white bg-[#1E1941]/95">
          <DialogHeader>
            <DialogTitle className="font-serif text-base">Editer le profil</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {profileFormError && <p className="text-[11px] text-red-300">{profileFormError}</p>}
            {profileFormInfo && <p className="text-[11px] text-emerald-300">{profileFormInfo}</p>}

            <div>
              <label className="text-[11px] text-white/70">Pseudo</label>
              <Input
                value={profilePseudoDraft}
                onChange={(e) => setProfilePseudoDraft(e.target.value)}
                className="mt-1 bg-white/5 border-white/15 text-white"
                placeholder="Pseudo"
              />
            </div>

            <div>
              <label className="text-[11px] text-white/70">Email</label>
              <Input
                value={profileEmailDraft}
                onChange={(e) => setProfileEmailDraft(e.target.value)}
                className="mt-1 bg-white/5 border-white/15 text-white"
                placeholder="Email"
                type="email"
              />
            </div>

            <div>
              <label className="text-[11px] text-white/70">Nouveau mot de passe</label>
              <Input
                value={newPasswordDraft}
                onChange={(e) => setNewPasswordDraft(e.target.value)}
                className="mt-1 bg-white/5 border-white/15 text-white"
                placeholder="Laisser vide pour conserver"
                type="password"
              />
            </div>

            <div>
              <label className="text-[11px] text-white/70">Confirmer le mot de passe</label>
              <Input
                value={confirmPasswordDraft}
                onChange={(e) => setConfirmPasswordDraft(e.target.value)}
                className="mt-1 bg-white/5 border-white/15 text-white"
                placeholder="Confirmer"
                type="password"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditProfileOpen(false)} className="text-white/60 hover:text-white">
              Annuler
            </Button>
            <Button onClick={saveProfile} disabled={isSavingProfile} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              {isSavingProfile ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
