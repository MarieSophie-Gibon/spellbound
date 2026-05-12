import { useState } from "react";
import { useCampaigns, useDeleteCampaign } from "@/hooks/useCampaigns";
import type { Campaign } from "@/hooks/useCampaigns";
import { MagicCard } from "@/components/ui/MagicCard";
import { CreateCampaign } from "@/components/lobby/CreateCampaign";
import { DeleteConfirmModal } from "@/components/compendium/DeleteConfirmModal";
import { Loader2 } from "lucide-react";

interface LobbyProps {
  onSelectCampaign: (campaign: Campaign) => void;
  onCreateCampaign: () => void;
}

export function Lobby({ onSelectCampaign, onCreateCampaign }: LobbyProps) {
  const { data: campaigns, isLoading } = useCampaigns();
  const deleteCampaign = useDeleteCampaign();
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);

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
    </>
  );
}
