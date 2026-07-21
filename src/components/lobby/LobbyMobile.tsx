import { useState } from "react";
import { Loader2, LogOut, Pencil, Plus, Ticket, Trash2, Copy } from "lucide-react";
import type { Campaign } from "@/hooks/useCampaigns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface LobbyMobileProps {
  campaigns: Campaign[];
  currentUserId?: string;
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
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-3 pb-22 lg:hidden">
      <div className="mx-auto w-full max-w-sm space-y-3">
        <div className="grid grid-cols-1 gap-1">
          <button
            type="button"
            onClick={() => setIsJoinOpen(true)}
            className="group relative overflow-hidden rounded-xl border border-amber-200/30 bg-[#2D2A63]/70 p-3 text-left transition-all hover:border-amber-200/45 hover:bg-[#353074]/80"
          >
            <div className="absolute inset-0 bg-linear-to-r from-amber-300/10 via-transparent to-amber-200/5" />
            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.14em] text-amber-100">Invitation</p>
                <p className="text-[10px] text-white/55 mt-0.5">Rejoindre une campagne</p>
              </div>
              <div className="h-9 w-9 rounded-lg border border-amber-200/35 bg-amber-300/14 flex items-center justify-center shrink-0">
                <Ticket className="w-4 h-4 text-amber-100" />
              </div>
            </div>
          </button>

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
        </div>

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
                {canLeave && (
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

                {isOwner && (
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

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
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
      </div>
    </div>
  );
}
