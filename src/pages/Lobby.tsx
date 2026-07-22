import { useState } from "react";
import { useCampaigns, useDeleteCampaign, useDuplicateCampaign, useJoinCampaignByCode, useLeaveCampaign } from "@/hooks/useCampaigns";
import type { Campaign } from "@/hooks/useCampaigns";
import { MagicCard } from "@/components/ui/MagicCard";
import { CreateCampaign } from "@/components/lobby/CreateCampaign";
import { DeleteConfirmModal } from "@/components/compendium/DeleteConfirmModal";
import { Loader2, Copy, Ticket } from "lucide-react";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { useIsMobile } from "@/hooks/useIsMobile";
import { LobbyMobile } from "@/components/lobby/LobbyMobile";

interface LobbyProps {
  onSelectCampaign: (campaign: Campaign) => void;
  onCreateCampaign: () => void;
}

export function Lobby({ onSelectCampaign, onCreateCampaign }: LobbyProps) {
  const isMobile = useIsMobile();
  const isMobileReadOnly = isMobile;
  const session = useAuthStore((s) => s.session);
  const currentUserId = session?.user?.id;
  const { data: campaigns, isLoading } = useCampaigns();
  const joinByCode = useJoinCampaignByCode();
  const deleteCampaign = useDeleteCampaign();
  const leaveCampaign = useLeaveCampaign();
  const duplicateCampaign = useDuplicateCampaign();
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);
  const [leavingCampaign, setLeavingCampaign] = useState<Campaign | null>(null);
  const [duplicatingCampaign, setDuplicatingCampaign] = useState<Campaign | null>(null);
  const [duplicateName, setDuplicateName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

  const handleJoinByCode = () => {
    setJoinError(null);
    joinByCode.mutate(
      { code: inviteCode },
      {
        onSuccess: (campaign) => {
          setInviteCode("");
          setIsJoinDialogOpen(false);
          onSelectCampaign(campaign);
        },
        onError: (err: any) => {
          setJoinError(err?.message ?? "Impossible de rejoindre la campagne");
        },
      }
    );
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <>
      <style>
        {`
          @keyframes fadeInUpCard {
            from { 
              opacity: 0; 
              transform: translateY(40px) scale(0.95); 
            }
            to { 
              opacity: 1; 
              transform: translateY(0) scale(1); 
            }
          }
          
          .animate-card-enter {
            opacity: 0;
            animation: fadeInUpCard 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          }
        `}
      </style>
      {isMobile ? (
        <LobbyMobile
          campaigns={[...(campaigns ?? [])].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())}
          currentUserId={currentUserId}
          readOnly={isMobileReadOnly}
          inviteCode={inviteCode}
          joinError={joinError}
          isJoining={joinByCode.isPending}
          onInviteCodeChange={setInviteCode}
          onJoin={handleJoinByCode}
          onSelectCampaign={onSelectCampaign}
          onCreateCampaign={() => {
            if (isMobileReadOnly) return;
            onCreateCampaign();
          }}
          onEditCampaign={(campaign) => {
            if (isMobileReadOnly) return;
            setEditingCampaign(campaign);
          }}
          onDuplicateCampaign={(campaign) => {
            if (isMobileReadOnly) return;
            setDuplicateName(`Copie de ${campaign.nom}`);
            setDuplicatingCampaign(campaign);
          }}
          onDeleteCampaign={(campaign) => {
            if (isMobileReadOnly) return;
            setDeletingCampaign(campaign);
          }}
          onLeaveCampaign={(campaign) => {
            if (isMobileReadOnly) return;
            setLeavingCampaign(campaign);
          }}
        />
      ) : (
        <>
          <div className="hidden xl:block fixed top-4 right-4 w-80 rounded-xl border border-white/12 bg-black/25 backdrop-blur-md px-3 py-3 z-40">
            <div className="flex items-center gap-2 mb-2 text-white/80">
              <Ticket className="w-3.5 h-3.5 text-amber-300" />
              <p className="text-[10px] uppercase tracking-[0.18em]">Rejoindre une campagne</p>
            </div>
            <div className="flex gap-2">
              <Input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Code invitation (ex: A7K2M9QX)"
                className="h-8 text-xs bg-white/5 border-white/15 text-white placeholder:text-white/35"
              />
              <Button
                disabled={!inviteCode.trim() || joinByCode.isPending}
                onClick={handleJoinByCode}
                className="h-8 px-2.5 text-xs bg-amber-600 hover:bg-amber-500 text-white"
              >
                {joinByCode.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Rejoindre"}
              </Button>
            </div>
            {joinError && <p className="text-[11px] text-red-300 mt-2">{joinError}</p>}
          </div>

          <div className="xl:hidden fixed top-3 right-3 z-40">
            <Button
              onClick={() => {
                setJoinError(null);
                setIsJoinDialogOpen(true);
              }}
              className="h-8 px-2.5 text-xs bg-amber-600 hover:bg-amber-500 text-white"
            >
              <Ticket className="w-3.5 h-3.5 mr-1.5" />
              Rejoindre
            </Button>
          </div>

          <div className="flex-1 flex items-center justify-center w-full h-full p-4 sm:p-6 md:p-8 md:pr-24">
            <div className="w-full max-w-6xl relative h-full flex items-center justify-center">
              <div className="w-full overflow-x-auto
                scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                <div className="flex items-stretch gap-5 py-6 px-4 w-max mx-auto">
                  <div className="shrink-0">
                    <MagicCard
                      size="compact"
                      onClick={onCreateCampaign}
                      title={
                        <>
                          Créer une
                          <br />
                          nouvelle
                          <br />
                          campagne
                        </>
                      }
                    />
                  </div>

                  {[...(campaigns ?? [])]
                    .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
                    .map((campaign) => (
                      <div key={campaign.id} className="shrink-0">
                        {(() => {
                          const isOwner = !!currentUserId && campaign.owner_id === currentUserId;
                          const canLeave = !isOwner && campaign.access_type === "member";
                          return (
                            <MagicCard
                              size="compact"
                              onClick={() => onSelectCampaign(campaign)}
                              imageUrl={campaign.image_url}
                              title={campaign.nom}
                              onEdit={isOwner ? (e) => { e.stopPropagation(); setEditingCampaign(campaign); } : undefined}
                              onDuplicate={isOwner ? (e) => { e.stopPropagation(); setDuplicateName(`Copie de ${campaign.nom}`); setDuplicatingCampaign(campaign); } : undefined}
                              onDelete={isOwner ? (e) => { e.stopPropagation(); setDeletingCampaign(campaign); } : undefined}
                              onLeave={canLeave ? (e) => { e.stopPropagation(); setLeavingCampaign(campaign); } : undefined}
                            />
                          );
                        })()}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
        <DialogContent className="bg-[#1E1941]/95 border border-amber-300/30 rounded-2xl shadow-2xl p-8 max-w-sm w-full flex flex-col items-center gap-5 text-white animate-in zoom-in-95 duration-200">
          <div className="w-12 h-12 rounded-full bg-amber-300/10 border border-amber-300/30 flex items-center justify-center">
            <Ticket className="w-5 h-5 text-amber-300" />
          </div>

          <div className="text-center w-full">
            <h3 className="font-serif text-lg text-white mb-2">Rejoindre une campagne</h3>
            <p className="text-[13px] text-white/50 leading-relaxed mb-3">
              Entrez le code d'invitation partagé par votre MJ.
            </p>

            <Input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Ex: A7K2M9QX"
              className="h-10 text-sm bg-white/5 border-white/15 focus-visible:border-amber-300/60 text-white placeholder:text-white/35 uppercase tracking-[0.08em]"
              autoFocus
            />
            {joinError && <p className="text-[11px] text-red-300 mt-2 text-left">{joinError}</p>}
          </div>

          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={() => setIsJoinDialogOpen(false)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-white/15 text-white/60 hover:text-white hover:border-white/30 text-[13px] transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={!inviteCode.trim() || joinByCode.isPending}
              onClick={handleJoinByCode}
              className="flex-1 px-4 py-2.5 rounded-xl bg-amber-300/15 border border-amber-300/40 hover:bg-amber-300/25 text-amber-200 text-[13px] transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {joinByCode.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Rejoindre"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {!isMobileReadOnly && editingCampaign && (
        <CreateCampaign
          open={true}
          onOpenChange={(open) => { if (!open) setEditingCampaign(null); }}
          onCreated={(updated) => { onSelectCampaign(updated); setEditingCampaign(null); }}
          initialData={editingCampaign}
        />
      )}

      {!isMobileReadOnly && deletingCampaign && (
        <DeleteConfirmModal
          name={deletingCampaign.nom}
          isDeleting={deleteCampaign.isPending}
          title="Supprimer cette campagne ?"
          description={`Toutes les données liées à "${deletingCampaign.nom}" seront définitivement supprimées : personnages, articles du grimoire, éléments du compendium personnalisés, et tout le contenu associé.`}
          onConfirm={() => {
            deleteCampaign.mutate(deletingCampaign.id, {
              onSuccess: () => setDeletingCampaign(null),
            });
          }}
          onCancel={() => setDeletingCampaign(null)}
        />
      )}

      {!isMobileReadOnly && leavingCampaign && (
        <DeleteConfirmModal
          name={leavingCampaign.nom}
          isDeleting={leaveCampaign.isPending}
          title="Quitter cette campagne ?"
          description={`Vous allez quitter la campagne "${leavingCampaign.nom}". Vous pourrez la rejoindre à nouveau uniquement avec un code d'invitation ou si le MJ vous réinvite.`}
          onConfirm={() => {
            leaveCampaign.mutate(leavingCampaign.id, {
              onSuccess: () => setLeavingCampaign(null),
            });
          }}
          onCancel={() => setLeavingCampaign(null)}
        />
      )}

      <Dialog open={!isMobileReadOnly && !!duplicatingCampaign} onOpenChange={(open) => { if (!open) setDuplicatingCampaign(null); }}>
        <DialogContent className="bg-[#1E1941] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg flex items-center gap-2">
              <Copy className="w-4 h-4 text-sky-300" />
              Dupliquer la campagne
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <label className="text-xs text-white/60 mb-1.5 block">Nom de la nouvelle campagne</label>
            <Input
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && duplicateName.trim() && duplicatingCampaign) {
                  duplicateCampaign.mutate(
                    { sourceId: duplicatingCampaign.id, newNom: duplicateName.trim() },
                    { onSuccess: () => setDuplicatingCampaign(null) }
                  );
                }
              }}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              placeholder="Nom de la copie..."
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDuplicatingCampaign(null)} className="text-white/60 hover:text-white">
              Annuler
            </Button>
            <Button
              disabled={!duplicateName.trim() || duplicateCampaign.isPending}
              onClick={() => {
                if (!duplicatingCampaign) return;
                duplicateCampaign.mutate(
                  { sourceId: duplicatingCampaign.id, newNom: duplicateName.trim() },
                  { onSuccess: () => setDuplicatingCampaign(null) }
                );
              }}
              className="bg-sky-600 hover:bg-sky-500 text-white"
            >
              {duplicateCampaign.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Dupliquer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
