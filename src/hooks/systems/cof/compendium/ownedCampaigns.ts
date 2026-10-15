import { supabase } from "@/lib/supabase";

export interface ImportCampaign {
  id: string;
  nom: string;
}

/** Campagnes possédées par l'utilisateur courant (hors `excludeCampaignId`), pour l'import entre campagnes. */
export async function fetchOwnedCampaigns(excludeCampaignId?: string): Promise<ImportCampaign[]> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return [];

  const { data: campaigns, error } = await supabase
    .from("campagnes")
    .select("id, nom")
    .eq("owner_id", authData.user.id)
    .order("nom");

  if (error || !campaigns) return [];
  return (campaigns as ImportCampaign[]).filter((campaign) => campaign.id !== excludeCampaignId);
}
