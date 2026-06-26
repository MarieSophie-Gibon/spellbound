import { useState } from "react";
import { useCampaigns, useDeleteCampaign, useDuplicateCampaign, useJoinCampaignByCode } from "@/hooks/useCampaigns";
import type { Campaign } from "@/hooks/useCampaigns";
import { MagicCard } from "@/components/ui/MagicCard";
import { CreateCampaign } from "@/components/lobby/CreateCampaign";
import { DeleteConfirmModal } from "@/components/compendium/DeleteConfirmModal";
import { Loader2, Copy, Ticket } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";

interface LobbyProps {
  onSelectCampaign: (campaign: Campaign) => void;
  onCreateCampaign: () => void;
}

export function Lobby({ onSelectCampaign, onCreateCampaign }: LobbyProps) {
  const role = useAuthStore((s) => s.role);
  const isMJ = role === 'mj';
  const { data: campaigns, isLoading } = useCampaigns(role);
  const joinByCode = useJoinCampaignByCode();
  const deleteCampaign = useDeleteCampaign();
  const duplicateCampaign = useDuplicateCampaign();
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);
  const [duplicatingCampaign, setDuplicatingCampaign] = useState<Campaign | null>(null);
  const [duplicateName, setDuplicateName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
      </div>
    );
  }

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
      <div className="flex-1 flex items-center justify-center w-full h-full p-8 md:pr-24">
        <div className="w-full max-w-6xl flex flex-col items-center gap-6">
          {!isMJ && (
            <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-black/20 backdrop-blur-md px-4 py-4">
              <div className="flex items-center gap-2 mb-2 text-white/85">
                <Ticket className="w-4 h-4 text-amber-300" />
                <p className="text-xs uppercase tracking-widest">Rejoindre une campagne</p>
              </div>
              <div className="flex gap-2">
                <Input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Code invitation (ex: A7K2M9QX)"
                  className="bg-white/5 border-white/15 text-white placeholder:text-white/35"
                />
                <Button
                  disabled={!inviteCode.trim() || joinByCode.isPending}
                  onClick={() => {
                    setJoinError(null);
                    joinByCode.mutate(
                      { code: inviteCode },
                      {
                        onSuccess: (campaign) => {
                          setInviteCode("");
                          onSelectCampaign(campaign);
                        },
                        onError: (err: any) => {
                          setJoinError(err?.message ?? "Impossible de rejoindre la campagne");
                        },
                      }
                    );
                  }}
                  className="bg-amber-600 hover:bg-amber-500 text-white"
                >
                  {joinByCode.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Rejoindre"}
                </Button>
              </div>
              {joinError && <p className="text-xs text-red-300 mt-2">{joinError}</p>}
            </div>
          )}

          <div className="w-full overflow-x-auto
            scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            <div className="flex items-stretch gap-5 pt-6 pb-10 px-4 w-max mx-auto">
          {isMJ && (
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
          )}

          {[...(campaigns ?? [])]
            .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
            .map((campaign) => (
            <div key={campaign.id} className="shrink-0">
              <MagicCard
                size="compact"
                onClick={() => onSelectCampaign(campaign)}
                imageUrl={campaign.image_url}
                title={campaign.nom}
                onEdit={isMJ ? (e) => { e.stopPropagation(); setEditingCampaign(campaign); } : undefined}
                onDuplicate={isMJ ? (e) => { e.stopPropagation(); setDuplicateName(`Copie de ${campaign.nom}`); setDuplicatingCampaign(campaign); } : undefined}
                onDelete={isMJ ? (e) => { e.stopPropagation(); setDeletingCampaign(campaign); } : undefined}
              />
            </div>
          ))}
            </div>
          </div>
        </div>
      </div>

      {editingCampaign && (
        <CreateCampaign
          open={true}
          onOpenChange={(open) => { if (!open) setEditingCampaign(null); }}
          onCreated={(updated) => { onSelectCampaign(updated); setEditingCampaign(null); }}
          initialData={editingCampaign}
        />
      )}

      {deletingCampaign && (
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

      <Dialog open={!!duplicatingCampaign} onOpenChange={(open) => { if (!open) setDuplicatingCampaign(null); }}>
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
