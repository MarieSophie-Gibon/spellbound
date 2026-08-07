import type { Campaign } from "@/hooks/campaign/useCampaigns";

/** A user is a campaign manager if they are the primary owner OR hold an OWNER row in campaign_members. */
export function isManager(
  campaign: Campaign | null | undefined,
  userId: string | undefined,
): boolean {
  if (!campaign || !userId) return false;
  return campaign.owner_id === userId || campaign.access_type === "owner";
}
