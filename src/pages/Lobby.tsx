import { useState } from "react";
import { useCampaigns, useDeleteCampaign, useDuplicateCampaign } from "@/hooks/useCampaigns";
import type { Campaign } from "@/hooks/useCampaigns";
import { MagicCard } from "@/components/ui/MagicCard";
import { CreateCampaign } from "@/components/lobby/CreateCampaign";
import { DeleteConfirmModal } from "@/components/compendium/DeleteConfirmModal";
import { Loader2, Copy } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LobbyProps {
  onSelectCampaign: (campaign: Campaign) => void;
  onCreateCampaign: () => void;
}

export function Lobby({ onSelectCampaign, onCreateCampaign }: LobbyProps) {
  const { data: campaigns, isLoading } = useCampaigns();
  const deleteCampaign = useDeleteCampaign();
  const duplicateCampaign = useDuplicateCampaign();
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);
  const [duplicatingCampaign, setDuplicatingCampaign] = useState<Campaign | null>(null);
  const [duplicateName, setDuplicateName] = useState("");

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
        <div className="flex flex-wrap items-center justify-center gap-8">
          <MagicCard
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

          {campaigns?.map((campaign) => (
            <MagicCard
              key={campaign.id}
              onClick={() => onSelectCampaign(campaign)}
              imageUrl={campaign.image_url}
              title={campaign.nom}
              onEdit={(e) => { e.stopPropagation(); setEditingCampaign(campaign); }}
              onDuplicate={(e) => { e.stopPropagation(); setDuplicateName(`Copie de ${campaign.nom}`); setDuplicatingCampaign(campaign); }}
              onDelete={(e) => { e.stopPropagation(); setDeletingCampaign(campaign); }}
            />
          ))}
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
