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
  const actionButtonClip = "polygon(10px 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 10px 100%, 0 50%)";

  const actionButtonClass =
    "relative w-full h-9 border-none cursor-pointer transition-all duration-200 hover:opacity-100 opacity-95 active:scale-[0.99]";

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-3 pb-22 lg:hidden">
      <div className="mx-auto w-full max-w-sm space-y-3">
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setIsJoinOpen(true)}
            className={actionButtonClass}
            style={{ clipPath: actionButtonClip, background: "#E3CCCD" }}
          >
            <span
              className="absolute inset-px"
              style={{
                clipPath: actionButtonClip,
                background: "linear-gradient(to right, rgba(18, 24, 62, 0.92), rgba(87, 105, 214, 0.92))",
              }}
            />
            <span className="relative z-10 h-full flex items-center justify-between px-3 whitespace-nowrap">
              <span className="w-1 h-1 rotate-45 bg-white/70 shrink-0" />
              <span className="flex items-center justify-center gap-1.5">
                <Ticket className="w-3 h-3 text-indigo-200" />
                <span className="text-[10px] font-serif tracking-[0.12em] text-[#E3CCCD]">Rejoindre une campagne</span>
              </span>
              <span className="w-1 h-1 rotate-45 bg-white/70 shrink-0" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className={actionButtonClass}
            style={{ clipPath: actionButtonClip, background: "#E3CCCD" }}
          >
            <span
              className="absolute inset-px"
              style={{
                clipPath: actionButtonClip,
                background: "linear-gradient(to right, rgba(18, 24, 62, 0.92), rgba(87, 105, 214, 0.92))",
              }}
            />
            <span className="relative z-10 h-full flex items-center justify-between px-3 whitespace-nowrap">
              <span className="w-1 h-1 rotate-45 bg-white/70 shrink-0" />
              <span className="flex items-center justify-center gap-1.5">
                <Plus className="w-3 h-3 text-indigo-200" />
                <span className="text-[10px] font-serif tracking-[0.12em] text-[#E3CCCD]">Créer une campagne</span>
              </span>
              <span className="w-1 h-1 rotate-45 bg-white/70 shrink-0" />
            </span>
          </button>
        </div>

        <section className="space-y-2.5">
          {campaigns.map((campaign) => {
            const isOwner = !!currentUserId && campaign.owner_id === currentUserId;
            const canLeave = !isOwner && campaign.access_type === "member";

            return (
              <article
                key={campaign.id}
                className="relative rounded-xl overflow-hidden border border-white/12 bg-[#1E1941]/55 backdrop-blur-lg"
              >
                {canLeave && (
                  <button
                    onClick={() => onLeaveCampaign(campaign)}
                    className="absolute top-2 right-2 z-20 h-7 w-7 rounded-full bg-linear-to-b from-[#4B2757]/95 to-[#372A84]/95 backdrop-blur-sm border border-[#E3CCCD]/35 text-white shadow-[0_4px_12px_rgba(55,42,132,0.45)] flex items-center justify-center"
                    aria-label="Quitter la campagne"
                    title="Quitter la campagne"
                  >
                    <LogOut className="w-3 h-3" />
                  </button>
                )}

                <button
                  onClick={() => onSelectCampaign(campaign)}
                  className="w-full text-left"
                >
                  <div
                    className="h-24 bg-cover bg-center"
                    style={{ backgroundImage: `url(${campaign.image_url || "/default-bg.jpg"})` }}
                  />
                  <div className="px-3.5 py-2.5 border-t border-white/10">
                    <h3 className="font-serif text-base text-white truncate">{campaign.nom}</h3>
                    <p className="text-[10px] text-white/45 uppercase tracking-[0.14em] mt-0.5">
                      {isOwner ? "Proprietaire" : campaign.access_type === "member" ? "Membre" : "PJ"}
                    </p>
                  </div>
                </button>

                <div className="px-2.5 pb-2.5 flex gap-1.5">
                  {isOwner && (
                    <>
                      <button
                        onClick={() => onEditCampaign(campaign)}
                        className="h-8 flex-1 rounded-lg border border-white/15 text-white/70 flex items-center justify-center gap-1 text-[10px]"
                      >
                        <Pencil className="w-3 h-3" />
                        Modifier
                      </button>
                      <button
                        onClick={() => onDuplicateCampaign(campaign)}
                        className="h-8 flex-1 rounded-lg border border-sky-400/25 text-sky-300 flex items-center justify-center gap-1 text-[10px]"
                      >
                        <Copy className="w-3 h-3" />
                        Dupliquer
                      </button>
                      <button
                        onClick={() => onDeleteCampaign(campaign)}
                        className="h-8 w-9 rounded-lg border border-red-400/30 text-red-300 flex items-center justify-center"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}

                </div>
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
