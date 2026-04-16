import { useCampaigns } from "@/hooks/useCampaigns";
import type { Campaign } from "@/hooks/useCampaigns";
import { MagicCard } from "@/components/ui/MagicCard";
import { Loader2 } from "lucide-react";

interface LobbyProps {
  onSelectCampaign: (campaign: Campaign) => void;
  onCreateCampaign: () => void;
}

export function Lobby({ onSelectCampaign, onCreateCampaign }: LobbyProps) {
  const { data: campaigns, isLoading } = useCampaigns();

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
            opacity: 0; /* Invisible par défaut avant l'animation */
            animation: fadeInUpCard 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          }
        `}
      </style>
      <div className="flex-1 flex items-center justify-center w-full h-full p-8 md:pr-24">
        <div className="flex flex-wrap items-center justify-center gap-8">
          {/* CARTE : CRÉER UNE NOUVELLE CAMPAGNE */}
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

          {/* CARTES : CAMPAGNES EXISTANTES */}
          {campaigns?.map((campaign) => (
            <MagicCard
              key={campaign.id}
              onClick={() => onSelectCampaign(campaign)}
              imageUrl={campaign.image_url}
              title={campaign.nom}
            />
          ))}
        </div>
      </div>
    </>
  );
}
