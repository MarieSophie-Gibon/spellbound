import { useState } from "react";
import { Loader2, LogOut, Pencil, Plus, Ticket, Trash2, Copy, User, UserStar } from "lucide-react";
import type { Campaign } from "@/hooks/useCampaigns";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface LobbyMobileProps {
  campaigns: Campaign[];
  currentUserId?: string;
  readOnly?: boolean;
  inviteCode: string;
  joinError: string | null;
  isJoining: boolean;
  onInviteCodeChange: (value: string) => void;
  onJoin: () => void;
  onSelectCampaign: (campaign: Campaign) => void;
  onCreateCampaign: () => void;
  onEditCampaign: (campaign: Campaign) => void;
  onDuplicateCampaign: (campaign: Campaign) => void;
  onDeleteCampaign: (campaign: Campaign) => void;
  onLeaveCampaign: (campaign: Campaign) => void;
}

export function LobbyMobile({
  campaigns,
  currentUserId,
  readOnly = false,
  inviteCode,
  joinError,
  isJoining,
  onInviteCodeChange,
  onJoin,
  onSelectCampaign,
  onCreateCampaign,
  onEditCampaign,
  onDuplicateCampaign,
  onDeleteCampaign,
  onLeaveCampaign,
}: LobbyMobileProps) {
  const { session, signOut, role } = useAuthStore();
  const profile = useProfile();
  const isMJ = role === "mj" || profile?.role === "mj";
  const displayName = profile?.pseudo?.trim() || session?.user?.email?.split("@")[0] || "Profil";

  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profilePseudoDraft, setProfilePseudoDraft] = useState("");
  const [profileEmailDraft, setProfileEmailDraft] = useState("");
  const [newPasswordDraft, setNewPasswordDraft] = useState("");
  const [confirmPasswordDraft, setConfirmPasswordDraft] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileFormError, setProfileFormError] = useState<string | null>(null);
  const [profileFormInfo, setProfileFormInfo] = useState<string | null>(null);

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
    <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-3 pb-28 lg:hidden">
      <div className="mx-auto w-full max-w-sm space-y-3">
        <header className="rounded-xl border border-[#F0EAD6]/22 bg-[#1a1640]/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.55),inset_0_0_0_1px_rgba(240,234,214,0.10)] px-1 py-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <img src="/spellbound.svg" alt="Spellbound" className="h-12 w-auto shrink-0" />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Profil"
                title={displayName}
                className="h-9 min-w-0 max-w-42 px-2.5 text-left hover:bg-white/12 transition-colors"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {isMJ ? <UserStar className="w-3.5 h-3.5 text-amber-200 shrink-0" /> : <User className="w-3.5 h-3.5 text-white/70 shrink-0" />}
                  <p className="text-[11px] text-white/70 truncate leading-tight">{displayName}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-[#1E1941]/95 backdrop-blur-xl border-[#E3CCCD]/20 text-slate-200 rounded-xl">
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
        </header>

        {!readOnly && (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="group relative overflow-hidden rounded-xl border border-[#E3CCCD]/30 bg-[#312C69]/72 p-3 text-left transition-all hover:border-[#E3CCCD]/45 hover:bg-[#3A347A]/82"
          >
            <div className="absolute inset-0 bg-linear-to-r from-[#E3CCCD]/10 via-transparent to-[#E3CCCD]/6" />
            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.14em] text-[#E3CCCD]/75">Creation</p>
                <p className="text-[10px] text-white/55 mt-0.5">Créer une campagne</p>
              </div>
              <div className="h-9 w-9 rounded-lg border border-[#E3CCCD]/35 bg-[#E3CCCD]/14 flex items-center justify-center shrink-0">
                <Plus className="w-4 h-4 text-[#F3DCDD]" />
              </div>
            </div>
          </button>
        )}

        <div className="flex items-center gap-2 px-1">
          <div className="h-px flex-1 bg-white/12" />
          <span className="text-[9px] uppercase tracking-[0.16em] text-white/45">Campagnes</span>
          <div className="h-px flex-1 bg-white/12" />
        </div>

        <section className="space-y-2.5">
          {campaigns.map((campaign) => {
            const isOwner = !!currentUserId && campaign.owner_id === currentUserId;
            const canLeave = !isOwner && campaign.access_type === "member";

            return (
              <article
                key={campaign.id}
                className="group relative rounded-xl overflow-hidden border border-white/18 bg-[#2A2558]/48 backdrop-blur-lg"
              >
                {canLeave && !readOnly && (
                  <button
                    onClick={() => onLeaveCampaign(campaign)}
                    className="absolute top-2.5 right-2.5 z-30 h-7 w-7 rounded-full bg-black/35 backdrop-blur-sm border border-white/25 text-white shadow-[0_4px_12px_rgba(0,0,0,0.35)] flex items-center justify-center"
                    aria-label="Quitter la campagne"
                    title="Quitter la campagne"
                  >
                    <LogOut className="w-3 h-3" />
                  </button>
                )}

                <button
                  onClick={() => onSelectCampaign(campaign)}
                  className="relative w-full text-left overflow-hidden"
                >
                  <div className="absolute inset-0 z-0">
                    <img
                      src={campaign.image_url || "/default-bg.jpg"}
                      alt={campaign.nom}
                      className="w-full h-full object-cover opacity-72 group-hover:opacity-80 transition-opacity"
                    />
                  </div>
                  <div className="absolute inset-0 z-10 bg-linear-to-r from-[#1E1941]/72 via-[#1E1941]/40 to-[#1E1941]/58" />

                  <div className="relative z-20 px-3.5 py-3.5">
                    <div className="inline-flex items-center rounded-full border border-white/25 bg-black/25 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-white/78">
                      {isOwner ? "Proprietaire" : campaign.access_type === "member" ? "Membre" : "PJ"}
                    </div>
                    <h3 className="font-serif text-[16px] text-white truncate mt-2">{campaign.nom}</h3>
                    {campaign.description && (
                      <p className="text-[11px] text-white/68 mt-1 line-clamp-2 leading-relaxed">
                        {campaign.description}
                      </p>
                    )}
                  </div>
                </button>

                {isOwner && !readOnly && (
                  <div className="px-2.5 pb-2.5 pt-2 border-t border-white/10 bg-white/6 flex gap-1.5">
                    <button
                      onClick={() => onEditCampaign(campaign)}
                      className="h-8 flex-1 rounded-lg border border-white/18 text-white/82 hover:bg-white/10 transition-colors flex items-center justify-center gap-1 text-[10px]"
                    >
                      <Pencil className="w-3 h-3" />
                      Modifier
                    </button>
                    <button
                      onClick={() => onDuplicateCampaign(campaign)}
                      className="h-8 flex-1 rounded-lg border border-sky-300/32 text-sky-200 hover:bg-sky-400/10 transition-colors flex items-center justify-center gap-1 text-[10px]"
                    >
                      <Copy className="w-3 h-3" />
                      Dupliquer
                    </button>
                    <button
                      onClick={() => onDeleteCampaign(campaign)}
                      className="h-8 w-9 rounded-lg border border-red-300/38 text-red-200 hover:bg-red-400/10 transition-colors flex items-center justify-center"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </article>
            );
          })}

          {campaigns.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/3 p-4 text-center text-white/45 text-[11px]">
              Aucune campagne pour le moment.
            </div>
          )}
        </section>

        <Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
          <DialogContent className="bg-[#1E1941]/95 border border-amber-300/25 rounded-xl shadow-2xl p-4 max-w-[20rem] w-full text-white">
            <DialogHeader>
              <DialogTitle className="font-serif text-base flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-amber-300" />
                Rejoindre une campagne
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-2.5 mt-1.5">
              <Input
                value={inviteCode}
                onChange={(e) => onInviteCodeChange(e.target.value.toUpperCase())}
                placeholder="Code invitation"
                className="h-9 text-xs bg-white/5 border-white/15 text-white placeholder:text-white/35 uppercase tracking-[0.08em]"
                autoFocus
              />
              {joinError && <p className="text-[11px] text-red-300">{joinError}</p>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsJoinOpen(false)}
                  className="flex-1 h-9 rounded-lg border border-white/15 text-white/70 hover:text-white hover:bg-white/10 transition-colors text-[11px]"
                >
                  Annuler
                </button>
                <Button
                  disabled={!inviteCode.trim() || isJoining}
                  onClick={onJoin}
                  className="flex-1 h-9 text-[11px] bg-amber-600 hover:bg-amber-500 text-white"
                >
                  {isJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : "Rejoindre"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!readOnly && isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="bg-[#1E1941]/95 border border-[#E3CCCD]/25 rounded-xl shadow-2xl p-4 max-w-[20rem] w-full text-white">
            <DialogHeader>
              <DialogTitle className="font-serif text-base flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-[#E3CCCD]" />
                Nouvelle campagne
              </DialogTitle>
            </DialogHeader>

            <p className="text-[11px] text-white/55 leading-relaxed mt-1.5">
              Ouvrir l'assistant de creation pour preparer une nouvelle campagne.
            </p>

            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="flex-1 h-9 rounded-lg border border-white/15 text-white/70 hover:text-white hover:bg-white/10 transition-colors text-[11px]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreateOpen(false);
                  onCreateCampaign();
                }}
                className="flex-1 h-9 rounded-lg border border-[#E3CCCD]/30 bg-[#E3CCCD]/15 text-[#E3CCCD] hover:bg-[#E3CCCD]/22 transition-colors text-[11px] font-semibold"
              >
                Ouvrir
              </button>
            </div>
          </DialogContent>
        </Dialog>

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

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setIsEditProfileOpen(false)} className="text-white/60 hover:text-white">
                Annuler
              </Button>
              <Button onClick={saveProfile} disabled={isSavingProfile} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                {isSavingProfile ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="lg:hidden fixed bottom-3 inset-x-3 z-40">
        <button
          type="button"
          onClick={() => setIsJoinOpen(true)}
          className="w-full h-11 rounded-2xl border border-white/20 bg-[#1a1640]/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.10)] text-amber-100 flex items-center justify-center gap-2 hover:bg-[#1a1640]/75 hover:border-white/30 transition-all duration-200"
        >
          <Ticket className="w-4 h-4 drop-shadow-sm" />
          <span className="text-[12px] font-semibold tracking-wide drop-shadow-sm">Invitation</span>
        </button>
      </div>
    </div>
  );
}
